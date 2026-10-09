import { NextResponse } from 'next/server';
import { UserRole } from '@/generated/prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withApiLogging } from '@/lib/api-logging';

const DEFAULT_NOTIFICATION_LIMIT = 50;
const MAX_NOTIFICATION_LIMIT = 100;
const MAX_BATCH_NOTIFICATIONS = 100;

type BatchNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
};

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
}

// Recipients must be real accounts (this route never creates users). Students may only
// notify classmates they share an active group with; staff may notify any existing user.
async function findAllowedRecipientIds(sender: { id: string; role: UserRole }, recipientIds: string[]) {
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: recipientIds } },
    select: { id: true }
  });
  const existingIds = existingUsers.map((user) => user.id);

  if (sender.role !== UserRole.STUDENT) {
    return new Set(existingIds);
  }

  const groupmates = await prisma.groupMember.findMany({
    where: {
      userId: { in: existingIds },
      isActive: true,
      group: {
        groupMembers: {
          some: { userId: sender.id, isActive: true }
        }
      }
    },
    select: { userId: true }
  });

  return new Set(groupmates.map((member) => member.userId));
}

async function handlePOST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return unauthorizedResponse();
    }

    const data = await request.json();
    const batchNotifications = Array.isArray(data?.notifications) ? data.notifications : null;

    if (batchNotifications) {
      if (batchNotifications.length > MAX_BATCH_NOTIFICATIONS) {
        return NextResponse.json(
          { error: `Send at most ${MAX_BATCH_NOTIFICATIONS} notifications per request.` },
          { status: 400 }
        );
      }

      const notifications: BatchNotificationInput[] = batchNotifications
        .map((item: any): BatchNotificationInput => ({
          userId: typeof item?.userId === 'string' ? item.userId.trim() : '',
          title: typeof item?.title === 'string' ? item.title.trim() : '',
          message: typeof item?.message === 'string' ? item.message.trim() : '',
          type: typeof item?.type === 'string' ? item.type : 'info',
          entityType: typeof item?.entityType === 'string' ? item.entityType : null,
          entityId: typeof item?.entityId === 'string' ? item.entityId : null
        }))
        .filter((item: BatchNotificationInput) => item.userId && item.title && item.message);

      if (!notifications.length) {
        return NextResponse.json({ error: 'Missing required notification fields' }, { status: 400 });
      }

      const userIds = Array.from(new Set<string>(notifications.map((item) => item.userId)));
      const allowedRecipientIds = await findAllowedRecipientIds(authUser, userIds);

      if (userIds.some((userId) => !allowedRecipientIds.has(userId))) {
        return NextResponse.json(
          { error: 'You can only notify existing users you are allowed to contact.' },
          { status: 403 }
        );
      }

      const created = await prisma.notification.createMany({
        data: notifications.map((item) => ({
          userId: item.userId,
          title: item.title,
          message: item.message,
          type: item.type,
          status: 'UNREAD',
          entityType: item.entityType,
          entityId: item.entityId
        }))
      });

      return NextResponse.json({ success: true, count: created.count });
    }

    const { userId, title, message, type, entityType, entityId } = data;

    if (typeof userId !== 'string' || !userId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const allowedRecipientIds = await findAllowedRecipientIds(authUser, [userId]);

    if (!allowedRecipientIds.has(userId)) {
      return NextResponse.json(
        { error: 'You can only notify existing users you are allowed to contact.' },
        { status: 403 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info',
        status: 'UNREAD',
        entityType: entityType || null,
        entityId: entityId || null,
      }
    });

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error('[NOTIF POST] ❌ Failed to create notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

async function handleGET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_NOTIFICATION_LIMIT, MAX_NOTIFICATION_LIMIT);
    const status = searchParams.get('status')?.trim().toUpperCase();
    const entityType = searchParams.get('entityType')?.trim();
    const entityId = searchParams.get('entityId')?.trim();
    const title = searchParams.get('title')?.trim();

    if (userId && userId !== authUser.id) {
      return NextResponse.json({ error: 'You can only view your own notifications.' }, { status: 403 });
    }

    const where: any = {
      userId: authUser.id,
      ...(status && ['UNREAD', 'READ', 'ARCHIVED'].includes(status) ? { status } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(title ? { title } : {})
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        title: true,
        message: true,
        type: true,
        status: true,
        entityType: true,
        entityId: true,
        readAt: true,
        createdAt: true
      }
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

async function handlePATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { notificationId, notificationIds, userId, action } = body;

    if (action === 'read-all') {
      if (userId !== undefined && userId !== authUser.id) {
        return NextResponse.json({ error: 'You can only update your own notifications.' }, { status: 403 });
      }

      const updated = await prisma.notification.updateMany({
        where: { userId: authUser.id, status: 'UNREAD' },
        data: {
          status: 'READ',
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

    const ids = Array.isArray(notificationIds)
      ? notificationIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
      : [];

    if (ids.length) {
      if (action !== 'read') {
        return NextResponse.json({ error: 'Batch updates only support read action' }, { status: 400 });
      }

      const updated = await prisma.notification.updateMany({
        where: { id: { in: Array.from(new Set(ids)) }, userId: authUser.id },
        data: {
          status: 'READ',
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    // Someone else's notification is reported as missing rather than forbidden, so ids can't be probed.
    if (!notification || notification.userId !== authUser.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Split entityId into groupId and memberId if it is a composite ID
    let groupId = notification.entityId;
    let memberId = null;

    if (notification.entityId && notification.entityId.includes(':')) {
      [groupId, memberId] = notification.entityId.split(':');
    }

    // If action is "accept" and this is a permission request, notify the requesting member —
    // but only when they really are an active member of that group.
    if (action === 'accept' && notification.entityType === 'group' && memberId && groupId) {
      const requestingMember = await prisma.groupMember.findFirst({
        where: { groupId, userId: memberId, isActive: true },
        select: { userId: true }
      });

      if (requestingMember) {
        await prisma.notification.create({
          data: {
            userId: memberId,
            title: 'Upload Permission Granted',
            message: 'Your leader has approved your request to upload files.',
            type: 'success',
            status: 'UNREAD',
            entityType: 'permission',
            entityId: groupId,
          }
        });
      }
    }

    // If action is "reject", we can optionally notify them or just silently reject
    if (action === 'reject' && notification.entityType === 'group' && memberId) {
    }

    // Mark the notification as read
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[NOTIF PATCH] Failed:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export const POST = withApiLogging('POST', '/api/notifications', handlePOST);
export const GET = withApiLogging('GET', '/api/notifications', handleGET);
export const PATCH = withApiLogging('PATCH', '/api/notifications', handlePATCH);
