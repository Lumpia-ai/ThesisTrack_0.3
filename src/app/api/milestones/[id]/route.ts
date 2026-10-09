import { UserRole } from '@/generated/prisma/client';

import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

const DEADLINE_MANAGER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD
];

async function handlePATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: milestoneId } = await props.params;
    const user = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => ({}));

    if (!('dueAt' in body)) {
      return Response.json({ success: false, message: 'dueAt is required (an ISO date string, or null to clear it).' }, { status: 400 });
    }

    const dueAt = body.dueAt ? new Date(body.dueAt) : null;

    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return Response.json({ success: false, message: 'dueAt must be a valid date.' }, { status: 400 });
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { id: true, projectId: true, project: { select: { adviserId: true } } }
    });

    if (!milestone) {
      return Response.json({ success: false, message: 'Milestone was not found.' }, { status: 404 });
    }

    const isAssignedAdviser = milestone.project.adviserId === user.id;
    const isDeadlineManager = DEADLINE_MANAGER_ROLES.includes(user.role);

    if (!isAssignedAdviser && !isDeadlineManager) {
      return Response.json(
        { success: false, message: 'You do not have permission to set deadlines for this project.' },
        { status: 403 }
      );
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { dueAt },
      select: { id: true, title: true, sequence: true, status: true, dueAt: true }
    });

    return successResponse({ milestone: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withApiLogging('PATCH', '/api/milestones/[id]', handlePATCH);
