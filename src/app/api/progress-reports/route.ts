import { ProjectStatus, SubmissionStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { recordCheckpointSubmission } from '@/lib/milestone-checkpoint-tracking';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(max, Math.floor(parsed));
}

function getPersonName(person?: { name?: string | null; firstName?: string | null; lastName?: string | null; displayName?: string | null } | null) {
  if (!person) {
    return '';
  }
  return person.displayName || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.name || '';
}

function clampPercentage(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

async function findStudentGroup(userId: string) {
  const groupByMembership = await prisma.group.findFirst({
    where: { groupMembers: { some: { userId, isActive: true } } },
    orderBy: { updatedAt: 'desc' }
  });

  return groupByMembership;
}

async function resolveGroupProject(group: { id: string; projectId: string | null }) {
  if (group.projectId) {
    const project = await prisma.project.findUnique({ where: { id: group.projectId } });
    if (project && project.status !== ProjectStatus.ARCHIVED) {
      return project;
    }
  }

  return prisma.project.findFirst({
    where: { groupId: group.id, status: { not: ProjectStatus.ARCHIVED } },
    orderBy: { createdAt: 'desc' }
  });
}

type ProgressReportFeedback = { id: string; body: string; authorName: string; createdAt: string };

function toReportPayload(
  report: {
    id: string;
    projectId: string;
    submittedById: string | null;
    submissionId: string | null;
    progressNote: string;
    accomplishments: string[];
    problemsEncountered: string | null;
    nextSteps: string | null;
    percentageCompleted: number;
    createdAt: Date;
    updatedAt: Date;
    submittedBy?: { name: string } | null;
  },
  feedback: ProgressReportFeedback[] = []
) {
  return {
    id: report.id,
    user_id: report.submittedById || '',
    project_id: report.projectId,
    submissionId: report.submissionId,
    status: 'submitted',
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
    title: `Progress Report — ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(report.createdAt)}`,
    date: report.createdAt.toISOString(),
    dateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(report.createdAt),
    progressDescription: report.progressNote,
    accomplishments: report.accomplishments,
    problemsEncountered: report.problemsEncountered || '',
    nextSteps: report.nextSteps || '',
    percentageCompleted: report.percentageCompleted,
    submittedByName: report.submittedBy?.name || 'Group member',
    feedback
  };
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [
      UserRole.STUDENT,
      UserRole.ADVISER,
      UserRole.PANEL,
      UserRole.RESEARCH_HEAD,
      UserRole.PROGRAM_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.ADMIN
    ]);
    const { searchParams } = new URL(request.url);
    const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const projectIdParam = searchParams.get('projectId');

    let projectId = projectIdParam;

    if (!projectId) {
      if (user.role !== UserRole.STUDENT) {
        throw new HttpError('A projectId is required for this role.', 400);
      }

      const group = await findStudentGroup(user.id);
      if (!group) {
        return successResponse({ reports: [] });
      }

      const project = await resolveGroupProject(group);
      if (!project) {
        return successResponse({ reports: [] });
      }

      projectId = project.id;
    }

    const reports = await prisma.progressReport.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { submittedBy: { select: { name: true } } }
    });

    const submissionIds = reports.map((report) => report.submissionId).filter((id): id is string => Boolean(id));
    const comments = submissionIds.length
      ? await prisma.reviewComment.findMany({
          where: { submissionId: { in: submissionIds } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, body: true, createdAt: true, submissionId: true, author: { select: { name: true } } }
        })
      : [];

    const feedbackBySubmission = new Map<string, ProgressReportFeedback[]>();
    comments.forEach((comment) => {
      const list = feedbackBySubmission.get(comment.submissionId) || [];
      list.push({ id: comment.id, body: comment.body, authorName: comment.author?.name || 'Adviser', createdAt: comment.createdAt.toISOString() });
      feedbackBySubmission.set(comment.submissionId, list);
    });

    return successResponse({
      reports: reports.map((report) => toReportPayload(report, report.submissionId ? feedbackBySubmission.get(report.submissionId) : undefined))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const body = await request.json();

    const progressNote = normalizeText(body.progressNote);
    if (!progressNote) {
      throw new HttpError('A progress summary is required.', 400, { progressNote: 'This field is required.' });
    }

    const accomplishments = Array.isArray(body.accomplishments)
      ? body.accomplishments.map((item: unknown) => normalizeText(item)).filter(Boolean)
      : [];
    const problemsEncountered = normalizeText(body.problemsEncountered) || null;
    const nextSteps = normalizeText(body.nextSteps) || null;
    const percentageCompleted = clampPercentage(body.percentageCompleted);

    const group = await findStudentGroup(user.id);
    if (!group) {
      throw new HttpError('You are not assigned to a group yet.', 400);
    }

    const project = await resolveGroupProject(group);
    if (!project) {
      throw new HttpError('Your group does not have an active project yet.', 400);
    }

    const report = await prisma.$transaction(async (tx) => {
      const submission = await tx.submission.create({
        data: {
          projectId: project.id,
          submittedById: user.id,
          title: 'Development Progress Report',
          description: progressNote,
          status: SubmissionStatus.SUBMITTED
        }
      });

      await recordCheckpointSubmission(tx, {
        projectId: project.id,
        checkpointKey: 'development-progress-report',
        submissionId: submission.id
      });

      const created = await tx.progressReport.create({
        data: {
          projectId: project.id,
          submittedById: user.id,
          submissionId: submission.id,
          progressNote,
          accomplishments,
          problemsEncountered,
          nextSteps,
          percentageCompleted
        },
        include: { submittedBy: { select: { name: true } } }
      });

      if (project.adviserId) {
        await tx.notification.create({
          data: {
            userId: project.adviserId,
            title: 'New Progress Report Submitted',
            message: `${getPersonName(user) || 'A student'} submitted a progress report (${percentageCompleted}% complete) for "${project.title}".`,
            type: 'info',
            entityType: 'project',
            entityId: project.id
          }
        });
      }

      return created;
    });

    return successResponse({ report: toReportPayload(report) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/progress-reports', handleGET);
export const POST = withApiLogging('POST', '/api/progress-reports', handlePOST);
