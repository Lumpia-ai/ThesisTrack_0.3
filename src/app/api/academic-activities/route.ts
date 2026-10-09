import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBestProjectAccessRecord } from '@/lib/storage/document-authorization';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const ACTIVITY_VIEWER_ROLES = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

// Evidence for an activity is always one of these two Document Submissions
// categories — anything else is ignored rather than linked, so an activity
// can't accidentally attach an unrelated chapter or proposal file.
const EVIDENCE_CATEGORIES = ['award-recognition', 'activity-evidence'];

function toActivityPayload(activity: any) {
  return {
    id: activity.id,
    projectId: activity.projectId,
    activityType: activity.activityType,
    eventName: activity.eventName,
    eventDate: activity.eventDate,
    venue: activity.venue,
    description: activity.description,
    scope: activity.scope,
    achievement: activity.achievement,
    status: activity.status,
    relatedMilestone: activity.relatedMilestone,
    participantsOrBeneficiary: activity.participantsOrBeneficiary,
    addToTimeline: activity.addToTimeline,
    markAsAchievement: activity.markAsAchievement,
    createdAt: activity.createdAt,
    createdByName: activity.createdBy?.displayName || activity.createdBy?.name || null,
    files: (activity.files || []).map((file: any) => ({
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      size: file.size,
      documentCategory: file.documentCategory,
      url: `/api/document-files/${file.id}/download`,
      previewUrl: `/api/document-files/${file.id}/preview`
    }))
  };
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, ACTIVITY_VIEWER_ROLES);
    const { searchParams } = new URL(request.url);
    const projectId = normalizeText(searchParams.get('projectId'));

    const project = await getBestProjectAccessRecord(user, projectId);

    if (!project) {
      return successResponse({ activities: [] });
    }

    const activities = await prisma.academicActivity.findMany({
      where: { projectId: project.id },
      orderBy: { eventDate: 'desc' },
      include: {
        createdBy: { select: { name: true, displayName: true } },
        files: {
          select: { id: true, fileName: true, fileType: true, size: true, documentCategory: true }
        }
      }
    });

    return successResponse({ activities: activities.map(toActivityPayload) });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const body = await request.json().catch(() => ({}));

    const projectId = normalizeText(body?.projectId);
    const activityType = normalizeText(body?.activityType) || 'Presentation';
    const eventName = normalizeText(body?.eventName);
    const eventDateRaw = normalizeText(body?.eventDate);
    const venue = normalizeText(body?.venue);
    const description = normalizeText(body?.description);
    const scope = normalizeText(body?.scope) || 'Local';
    const achievement = normalizeText(body?.achievement);
    const status = normalizeText(body?.status) || 'Completed';
    const relatedMilestone = normalizeText(body?.relatedMilestone);
    const participantsOrBeneficiary = normalizeText(body?.participantsOrBeneficiary);
    const addToTimeline = body?.addToTimeline !== false;
    const markAsAchievement = Boolean(body?.markAsAchievement);
    const fileIds = Array.isArray(body?.fileIds)
      ? body.fileIds.map((id: unknown) => normalizeText(id)).filter(Boolean)
      : [];

    if (!projectId || !eventName) {
      throw new HttpError('A project and an activity title are required.', 400, {
        ...(!eventName ? { eventName: 'Enter the academic activity title.' } : {})
      });
    }

    const project = await getBestProjectAccessRecord(user, projectId);

    if (!project) {
      throw new HttpError('No assigned thesis project was found for your account.', 400, {
        projectId: 'Ask your adviser to assign your group to a project first.'
      });
    }

    // Only files that are genuinely evidence-category and belong to this
    // project get linked — a stray or mismatched id is silently dropped
    // rather than erroring, since the picker only ever offers valid files.
    const evidenceFiles = fileIds.length
      ? await prisma.uploadedFile.findMany({
          where: {
            id: { in: fileIds },
            projectId: project.id,
            documentCategory: { in: EVIDENCE_CATEGORIES }
          },
          select: { id: true }
        })
      : [];

    const activity = await prisma.academicActivity.create({
      data: {
        projectId: project.id,
        createdById: user.id,
        activityType,
        eventName,
        eventDate: eventDateRaw ? new Date(eventDateRaw) : null,
        venue: venue || null,
        description: description || null,
        scope,
        achievement: markAsAchievement ? (achievement || 'Academic Achievement') : null,
        status,
        relatedMilestone: relatedMilestone || null,
        participantsOrBeneficiary: participantsOrBeneficiary || null,
        addToTimeline,
        markAsAchievement,
        files: evidenceFiles.length ? { connect: evidenceFiles.map((file) => ({ id: file.id })) } : undefined
      },
      include: {
        createdBy: { select: { name: true, displayName: true } },
        files: {
          select: { id: true, fileName: true, fileType: true, size: true, documentCategory: true }
        }
      }
    });

    return successResponse({ activity: toActivityPayload(activity) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/academic-activities', handleGET);
export const POST = withApiLogging('POST', '/api/academic-activities', handlePOST);
