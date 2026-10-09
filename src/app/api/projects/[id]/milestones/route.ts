import { MilestoneCheckpointStatus, UserRole } from '@/generated/prisma/client';

import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse } from '@/lib/utils';
import { ensureProjectMilestoneWorkflow } from '@/lib/milestone-checkpoint-tracking';
import { withApiLogging } from '@/lib/api-logging';

const DEADLINE_MANAGER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD
];

async function handleGET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await props.params;
    const user = await requireAuthenticatedUser(request);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, adviserId: true, ownerId: true }
    });

    if (!project) {
      return Response.json({ success: false, message: 'Project was not found.' }, { status: 404 });
    }

    const isAssignedAdviser = project.adviserId === user.id;
    const isDeadlineManager = DEADLINE_MANAGER_ROLES.includes(user.role);

    if (!isAssignedAdviser && !isDeadlineManager) {
      return Response.json(
        { success: false, message: 'You do not have permission to view this project\'s milestones.' },
        { status: 403 }
      );
    }

    await ensureProjectMilestoneWorkflow(prisma, projectId);

    const milestoneRows = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        sequence: true,
        status: true,
        dueAt: true,
        completedAt: true,
        checkpoints: { where: { required: true }, select: { status: true } }
      }
    });

    // Per-stage checkpoint counts, counted the same way as getProjectProgressSummary (COMPLETED only).
    const milestones = milestoneRows.map(({ checkpoints, ...milestone }) => ({
      ...milestone,
      totalCheckpoints: checkpoints.length,
      completedCheckpoints: checkpoints.filter((checkpoint) => checkpoint.status === MilestoneCheckpointStatus.COMPLETED).length
    }));

    return successResponse({ project: { id: project.id, title: project.title }, milestones });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/projects/[id]/milestones', handleGET);
