import { cache } from 'react';
import { NotificationStatus } from '@/generated/prisma/client';
import { getServerAuthenticatedUser, type PublicUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { AdviserNotificationRecord } from '@/components/adviser/shared/components/adviser-notifications';

function formatNotificationTime(value: Date) {
  const diffMs = Date.now() - value.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) return 'Just now';
  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diffMs < 7 * dayMs) {
    const days = Math.floor(diffMs / dayMs);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getNotificationVisual(type: string, entityType: string | null): Pick<AdviserNotificationRecord, 'icon' | 'tone'> {
  if (entityType === 'uploaded_file') {
    return { icon: 'fa-file-circle-plus', tone: 'warning' };
  }

  switch (type) {
    case 'success':
      return { icon: 'fa-circle-check', tone: 'success' };
    case 'feedback':
      return { icon: 'fa-comment-dots', tone: 'warning' };
    case 'deadline':
      return { icon: 'fa-hourglass-half', tone: 'danger' };
    case 'schedule':
      return { icon: 'fa-calendar-days', tone: 'info' };
    default:
      return { icon: 'fa-bell', tone: 'info' };
  }
}

function getNotificationHref(basePath: string, entityType: string | null) {
  if (entityType === 'uploaded_file' || entityType === 'review_comment') {
    return basePath.includes('/panel-mode') ? `${basePath}/evaluation-queue` : `${basePath}/submissions`;
  }
  
  if (entityType === 'project') {
    return basePath.includes('/panel-mode') ? `${basePath}/dashboard` : `${basePath}/title-approvals`;
  }

  // Compliance is reviewed only from Panel Mode, even when the panelist is an
  // adviser-role account reading this from the Adviser Mode shell.
  if (entityType === 'compliance_submission') {
    return '/adviser/panel-mode/compliance-review';
  }

  return `${basePath}/notifications`;
}

export async function getAdviserNotificationRecordsForUser(
  user: PublicUser | null,
  basePath: string,
  take = 50
) {
  if (!user) {
    return [];
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      status: true,
      createdAt: true,
      type: true,
      entityType: true,
      title: true,
      message: true
    }
  });

  return notifications.map((notification): AdviserNotificationRecord => {
    const visual = getNotificationVisual(notification.type, notification.entityType);

    return {
      id: notification.id,
      status: notification.status === NotificationStatus.READ ? 'read' : 'unread',
      created_at: notification.createdAt.toISOString(),
      icon: visual.icon,
      title: notification.title,
      text: notification.message,
      time: formatNotificationTime(notification.createdAt),
      href: getNotificationHref(basePath, notification.entityType),
      meta: notification.entityType?.replace(/[_-]+/g, ' ') || notification.type || 'Notification',
      entityType: notification.entityType,
      tone: visual.tone
    };
  });
}

export const getAdviserNotificationRecords = cache(async (basePath: string, take = 50) => {
  const user = await getServerAuthenticatedUser();
  return getAdviserNotificationRecordsForUser(user, basePath, take);
});
