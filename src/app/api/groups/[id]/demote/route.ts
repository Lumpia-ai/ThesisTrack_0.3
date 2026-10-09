import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { resetGroupForNewTitle } from '@/lib/milestone-checkpoint-tracking';
import type { Prisma } from '@/generated/prisma/client';
import { withApiLogging } from '@/lib/api-logging';

const DEMOTE_ELEVATED_ROLES = new Set(['PROGRAM_HEAD', 'RESEARCH_HEAD', 'ADMIN', 'SYSTEM_ADMIN']);

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getServerAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!reason) {
      return NextResponse.json({ error: 'A reason is required to demote a group.' }, { status: 400 });
    }

    const { id: groupId } = await context.params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, userId: true, projectId: true, code: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isOwningAdviser = group.userId === authUser.id;
    if (!isOwningAdviser && !DEMOTE_ELEVATED_ROLES.has(authUser.role)) {
      return NextResponse.json({ error: 'You do not have permission to demote this group.' }, { status: 403 });
    }

    const project = group.projectId
      ? await prisma.project.findUnique({ where: { id: group.projectId }, select: { id: true, title: true, ownerId: true } })
      : null;

    await resetGroupForNewTitle(prisma, { groupId: group.id, projectId: group.projectId });

    await prisma.auditLog.create({
      data: {
        actorId: authUser.id,
        action: 'group.demoted',
        entityType: 'Group',
        entityId: group.id,
        metadata: {
          reason,
          projectId: group.projectId,
          projectTitle: project?.title ?? null,
          actorRole: authUser.role
        } as Prisma.InputJsonValue
      }
    });

    const notifyUserIds = new Set<string>();
    if (project?.ownerId) {
      notifyUserIds.add(project.ownerId);
    }

    // If someone other than the owning adviser did this, the adviser needs to know too —
    // they wouldn't otherwise find out except by noticing the group reset on its own.
    if (!isOwningAdviser && group.userId) {
      notifyUserIds.add(group.userId);
    }

    for (const userId of notifyUserIds) {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Project Reset: New Title Required',
          message: `"${project?.title || group.code}" has been reset by ${authUser.role === 'ADVISER' ? 'the adviser' : 'a program head'}. Reason: ${reason}`,
          type: 'warning',
          entityType: 'Group',
          entityId: group.id
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Group reset — the student will need to submit a new title.' });
  } catch (error) {
    console.error('Failed to demote group', error);
    return NextResponse.json({ error: 'Unable to demote this group.' }, { status: 500 });
  }
}

export const POST = withApiLogging('POST', '/api/groups/[id]/demote', handlePOST);
