import { UserRole, type Prisma } from '@/generated/prisma/client';
import { toApiRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  DOCUMENT_LABELS,
  ROLE_CATALOG,
  toApiEnum
} from '@/lib/rbac/catalog';
import { canReviewApplication, type Actor } from '@/lib/rbac/policy';
import { HttpError } from '@/lib/utils';

// Shared by the application review endpoints: what is loaded, what reviewers see, and which applications
// each reviewer's queue contains.

export const applicationSelect = {
  id: true,
  userId: true,
  requestedRole: true,
  requestedDepartmentId: true,
  documentType: true,
  status: true,
  decisionNote: true,
  reviewedAt: true,
  createdAt: true,
  requestedDepartment: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
  documentFile: { select: { id: true, fileName: true, fileType: true, size: true } },
  documentBackFile: { select: { id: true, fileName: true, fileType: true, size: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      studentId: true,
      yearLevel: true,
      department: true,
      role: true,
      accountStatus: true,
      isSuspended: true,
      createdAt: true
    }
  }
} as const satisfies Prisma.AccountApplicationSelect;

export type ApplicationRecord = Prisma.AccountApplicationGetPayload<{ select: typeof applicationSelect }>;

const rolesByAuthority = (authority: UserRole) =>
  (Object.keys(ROLE_CATALOG) as UserRole[]).filter((role) => ROLE_CATALOG[role].authority === authority);

/**
 * The applications an actor's review queue contains, as a database filter: a System Administrator sees
 * institution-level requests, a Program Head sees department requests for their own department. Nobody sees
 * their own application. Each row is still re-checked with canReviewApplication before it is returned.
 */
export function reviewQueueWhere(actor: Actor): Prisma.AccountApplicationWhereInput | null {
  if (actor.workspace.role === UserRole.SYSTEM_ADMIN) {
    return { requestedRole: { in: rolesByAuthority(UserRole.SYSTEM_ADMIN) }, userId: { not: actor.userId } };
  }

  if (actor.workspace.role === UserRole.PROGRAM_HEAD && actor.workspace.departmentId) {
    return {
      requestedRole: { in: rolesByAuthority(UserRole.PROGRAM_HEAD) },
      // Their own department plus any department that has no Program Head yet.
      requestedDepartmentId: { in: [actor.workspace.departmentId, ...(actor.coveredDepartmentIds ?? [])] },
      userId: { not: actor.userId }
    };
  }

  return null;
}

export function toApplicationSummary(application: ApplicationRecord) {
  return {
    id: application.id,
    status: toApiEnum(application.status),
    requestedRole: toApiRole(application.requestedRole),
    requestedRoleLabel: ROLE_CATALOG[application.requestedRole].label,
    department: application.requestedDepartment,
    documentType: toApiEnum(application.documentType),
    documentLabel: DOCUMENT_LABELS[application.documentType],
    document: application.documentFile
      ? { fileName: application.documentFile.fileName, fileType: application.documentFile.fileType, size: application.documentFile.size }
      : null,
    documentBack: application.documentBackFile
      ? { fileName: application.documentBackFile.fileName, fileType: application.documentBackFile.fileType, size: application.documentBackFile.size }
      : null,
    decisionNote: application.decisionNote,
    reviewedAt: application.reviewedAt,
    reviewedBy: application.reviewedBy,
    submittedAt: application.createdAt,
    applicant: {
      id: application.user.id,
      name: application.user.name,
      email: application.user.email,
      studentId: application.user.studentId,
      yearLevel: application.user.yearLevel,
      department: application.user.department,
      accountStatus: toApiEnum(application.user.accountStatus),
      isSuspended: application.user.isSuspended
    }
  };
}

/** Loads one application and confirms the actor may review it (404 if missing, 403 if not theirs to review). */
export async function loadReviewableApplication(actor: Actor, applicationId: string) {
  const application = await prisma.accountApplication.findUnique({
    where: { id: applicationId },
    select: applicationSelect
  });

  if (!application) {
    throw new HttpError('This application no longer exists.', 404);
  }

  const decision = canReviewApplication(actor, application);

  if (!decision.allowed) {
    throw new HttpError(decision.reason, 403);
  }

  return application;
}
