import { RoleAssignmentStatus, type UserRole } from '@/generated/prisma/client';
import { toApiRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLE_CATALOG, toApiEnum } from '@/lib/rbac/catalog';
import { toDepartmentId } from '@/lib/rbac/departments';
import {
  canRevokeAssignment,
  canViewAccount,
  grantableRoles,
  type Actor
} from '@/lib/rbac/policy';
import { HttpError } from '@/lib/utils';

// Loading a person for role management (roles panel, history), with the view permission applied.

export async function loadManagedAccount(actor: Actor, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      role: true,
      accountStatus: true,
      isSuspended: true,
      roleAssignments: {
        orderBy: [{ status: 'asc' }, { grantedAt: 'asc' }],
        select: {
          id: true,
          userId: true,
          role: true,
          scope: true,
          departmentId: true,
          status: true,
          grantedAt: true,
          revokedAt: true,
          revokeReason: true,
          grantedBy: { select: { id: true, name: true } },
          revokedBy: { select: { id: true, name: true } }
        }
      },
      applications: {
        select: { requestedDepartmentId: true }
      }
    }
  });

  if (!user) {
    throw new HttpError('The selected user no longer exists.', 404);
  }

  const departmentId = toDepartmentId(user.department);
  const decision = canViewAccount(actor, {
    departmentIds: [departmentId, ...user.applications.map((application) => application.requestedDepartmentId)]
  });

  if (!decision.allowed) {
    throw new HttpError(decision.reason, 403);
  }

  return { ...user, departmentId };
}

export type ManagedAccount = Awaited<ReturnType<typeof loadManagedAccount>>;

/** The roles panel: every assignment (active and revoked), what the actor may revoke, and what they may grant. */
export function toRolesSummary(actor: Actor, account: ManagedAccount) {
  const heldRoles = account.roleAssignments
    .filter((assignment) => assignment.status === RoleAssignmentStatus.ACTIVE)
    .map((assignment) => assignment.role);
  const target = { userId: account.id, accountStatus: account.accountStatus, departmentId: account.departmentId, heldRoles };

  return {
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      department: account.department,
      departmentId: account.departmentId,
      defaultRole: toApiRole(account.role),
      accountStatus: toApiEnum(account.accountStatus),
      isSuspended: account.isSuspended
    },
    assignments: account.roleAssignments.map((assignment) => ({
      id: assignment.id,
      role: toApiRole(assignment.role),
      label: ROLE_CATALOG[assignment.role].label,
      scope: assignment.scope,
      departmentId: assignment.departmentId,
      status: toApiEnum(assignment.status),
      grantedAt: assignment.grantedAt,
      grantedBy: assignment.grantedBy,
      revokedAt: assignment.revokedAt,
      revokedBy: assignment.revokedBy,
      revokeReason: assignment.revokeReason,
      canRevoke: canRevokeAssignment(actor, account.id, assignment).allowed
    })),
    grantableRoles: grantableRoles(actor, target, heldRoles).map((role: UserRole) => ({
      role: toApiRole(role),
      label: ROLE_CATALOG[role].label
    }))
  };
}
