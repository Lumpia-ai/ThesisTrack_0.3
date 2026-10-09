import { ComplianceStatus, DefenseStatus, Prisma, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { getMimeTypeForFile } from '@/lib/storage/file-preview';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import { assertCanUploadDocument } from '@/lib/storage/document-authorization';
import {
  assertValidDocumentFile,
  deleteFile,
  generateUniqueFilePath,
  uploadFile
} from '@/lib/storage/supabase-storage';
import {
  COMPLIANCE_DOCUMENT_CATEGORY_BY_SCHEDULE_TYPE,
  COMPLIANCE_ENTITY_TYPE,
  COMPLIANCE_SCHEDULE_TYPES,
  complianceDefenseInclude,
  getPersonName,
  getSubmitBlockedReason,
  toComplianceDefensePayload
} from '@/lib/compliance';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// Anyone the Program Head can seat on a panel (see POST /api/defense-schedules).
const PANEL_REVIEWER_ROLES: UserRole[] = [UserRole.ADVISER, UserRole.PANEL, UserRole.PROGRAM_HEAD];
const COMPLIANCE_VIEWER_ROLES: UserRole[] = [UserRole.STUDENT, ...PANEL_REVIEWER_ROLES];

function studentProjectWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { group: { groupMembers: { some: { userId, isActive: true } } } }
    ]
  };
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, COMPLIANCE_VIEWER_ROLES);
    const isStudent = user.role === UserRole.STUDENT;

    // Panel access is decided purely by the defense's Evaluation rows — i.e.
    // who the Program Head seated on that panel — never by the viewer's role
    // or by being the group's adviser. That's what lets invited panel-only
    // accounts and adviser-role faculty share one rule, and keeps every
    // panelist limited to the groups they actually sat on.
    const schedules = await prisma.defenseSchedule.findMany({
      where: {
        title: { in: [...COMPLIANCE_SCHEDULE_TYPES] },
        status: DefenseStatus.COMPLETED,
        ...(isStudent
          ? { project: studentProjectWhere(user.id) }
          : { evaluations: { some: { evaluatorId: user.id } } })
      },
      include: complianceDefenseInclude,
      orderBy: { scheduledAt: 'desc' },
      take: 100
    });

    const defenses = schedules
      .map((schedule) => toComplianceDefensePayload(schedule, isStudent ? undefined : user.id))
      // A student has nothing to act on for a defense that didn't pass; the
      // panel still sees it so the list matches what they sat on.
      .filter((defense) => !isStudent || defense.defensePassed || defense.submissions.length > 0);

    return successResponse({ defenses });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const formData = await request.formData();
    const file = formData.get('file');
    const scheduleId = normalizeText(formData.get('defenseScheduleId'));
    const notes = normalizeText(formData.get('notes'));

    if (!scheduleId) {
      throw new HttpError('Choose the defense this compliance is for.', 400, {
        defenseScheduleId: 'Choose a defense.'
      });
    }

    if (!(file instanceof File)) {
      throw new HttpError('Attach your compliance document.', 400, {
        file: 'Attach your compliance document.'
      });
    }

    const schedule = await prisma.defenseSchedule.findFirst({
      where: {
        id: scheduleId,
        title: { in: [...COMPLIANCE_SCHEDULE_TYPES] },
        project: studentProjectWhere(user.id)
      },
      include: complianceDefenseInclude
    });

    if (!schedule) {
      throw new HttpError('Defense was not found for your group.', 404);
    }

    const blockedReason = getSubmitBlockedReason(schedule);

    if (blockedReason) {
      throw new HttpError(blockedReason, 409);
    }

    const bucketName = DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS;
    // Compliance proof is often a signed matrix or photo of one, so images are allowed.
    assertValidDocumentFile(file, bucketName, true);
    await assertCanUploadDocument({ user, bucketName, projectId: schedule.projectId });

    const filePath = generateUniqueFilePath({
      bucketName,
      projectId: schedule.projectId,
      userId: user.id,
      fileName: file.name
    });

    await uploadFile({ bucketName, filePath, file, allowImages: true });

    const documentCategory = COMPLIANCE_DOCUMENT_CATEGORY_BY_SCHEDULE_TYPE[schedule.title] ?? 'defense-compliance';
    const nextVersion = (schedule.complianceSubmissions[0]?.version ?? 0) + 1;
    const reviewerIds = schedule.evaluations
      .map((evaluation) => evaluation.evaluatorId)
      .filter((id): id is string => Boolean(id));

    const compliance = await prisma.$transaction(async (tx) => {
      const savedFile = await tx.uploadedFile.create({
        data: {
          fileName: file.name,
          filePath,
          bucketName,
          fileType: file.type || getMimeTypeForFile(file.name),
          documentCategory,
          category: documentCategory,
          visibility: 'private',
          size: file.size,
          userId: user.id,
          projectId: schedule.projectId
        }
      });

      return tx.complianceSubmission.create({
        data: {
          projectId: schedule.projectId,
          defenseScheduleId: schedule.id,
          submittedById: user.id,
          fileId: savedFile.id,
          version: nextVersion,
          notes: notes || null,
          status: ComplianceStatus.UNDER_REVIEW,
          reviews: {
            create: reviewerIds.map((reviewerId) => ({ reviewerId }))
          }
        }
      });
    }).catch(async (error) => {
      await deleteFile(bucketName, filePath).catch((cleanupError) => {
        console.error(`Failed to remove orphaned compliance upload ${filePath}:`, cleanupError);
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError('Another member of your group just submitted compliance for this defense. Refresh to see it.', 409);
      }

      throw error;
    });

    const groupLabel = schedule.project.group?.code || schedule.project.title;
    const submitterName = getPersonName(user) || 'A student';

    if (reviewerIds.length) {
      await prisma.notification.createMany({
        data: reviewerIds.map((userId) => ({
          userId,
          title: nextVersion > 1 ? 'Compliance Resubmitted' : 'Compliance Submitted',
          message: `${submitterName} (${groupLabel}) submitted ${nextVersion > 1 ? `revised compliance (v${nextVersion})` : 'compliance'} for their ${schedule.title}.`,
          type: 'info',
          entityType: COMPLIANCE_ENTITY_TYPE,
          entityId: compliance.id
        }))
      });
    }

    return successResponse({ message: 'Compliance submitted to your panel.', complianceId: compliance.id }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/compliance', handleGET);
export const POST = withApiLogging('POST', '/api/compliance', handlePOST);
