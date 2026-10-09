import {
  AdviserScheduleItemStatus,
  AdviserScheduleItemType,
  UserRole
} from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  handleApiError,
  normalizeText,
  parseJsonBody,
  successResponse
} from '@/lib/utils';
import { recordCheckpointSchedule, syncMilestoneDueDateFromDeadline } from '@/lib/milestone-checkpoint-tracking';
import { sendScheduleNotificationEmail } from '@/lib/mailer';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const ADVISER_SCHEDULE_ROLES = [
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.PROGRAM_HEAD,
  UserRole.RESEARCH_HEAD,
  UserRole.ADMIN,
  UserRole.SYSTEM_ADMIN
];

const DEFAULT_SCHEDULE_LIMIT = 50;
const DEFAULT_SCHEDULE_PROJECT_LIMIT = 100;
const MAX_SCHEDULE_LIMIT = 100;

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

const scheduleTypeLabels: Record<AdviserScheduleItemType, string> = {
  [AdviserScheduleItemType.CONSULTATION]: 'Consultation',
  [AdviserScheduleItemType.DEADLINE]: 'Deadline',
  [AdviserScheduleItemType.MEETING]: 'Meeting',
  [AdviserScheduleItemType.REMINDER]: 'Reminder',
  [AdviserScheduleItemType.EVENT]: 'Event',
  [AdviserScheduleItemType.REVIEW]: 'Review'
};

function parseScheduleType(value: unknown) {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'consultation':
      return AdviserScheduleItemType.CONSULTATION;
    case 'deadline':
    case 'due_date':
      return AdviserScheduleItemType.DEADLINE;
    case 'meeting':
      return AdviserScheduleItemType.MEETING;
    case 'reminder':
      return AdviserScheduleItemType.REMINDER;
    case 'event':
      return AdviserScheduleItemType.EVENT;
    case 'review':
    case 'milestone_review':
      return AdviserScheduleItemType.REVIEW;
    default:
      throw new HttpError('Choose a valid schedule type.', 400, {
        type: 'Choose consultation, deadline, meeting, reminder, event, or review.'
      });
  }
}

function parseScheduleDate(dateValue: unknown, timeValue: unknown) {
  const date = normalizeText(dateValue);
  const time = normalizeText(timeValue) || '08:00';

  if (!date) {
    throw new HttpError('Choose a schedule date.', 400, {
      date: 'Choose a schedule date.'
    });
  }

  const scheduledAt = new Date(`${date}T${time}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new HttpError('Choose a valid schedule date and time.', 400, {
      date: 'Choose a valid date.',
      time: 'Choose a valid time.'
    });
  }

  return scheduledAt;
}

function getProjectAccessWhere(user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.SYSTEM_ADMIN) {
    return {};
  }

  if ((user.role === UserRole.PROGRAM_HEAD || user.role === UserRole.RESEARCH_HEAD) && user.department) {
    return {
      OR: [
        { departmentId: user.department },
        { group: { department: user.department } }
      ]
    };
  }

  return {
    OR: [
      { adviserId: user.id },
      { group: { userId: user.id } }
    ]
  };
}

function getGroupAccessWhere(user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.SYSTEM_ADMIN) {
    return {};
  }

  if ((user.role === UserRole.PROGRAM_HEAD || user.role === UserRole.RESEARCH_HEAD) && user.department) {
    return {
      department: user.department
    };
  }

  return {
    userId: user.id
  };
}

function formatPersonName(user?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
} | null) {
  return normalizeText(user?.displayName)
    || normalizeText(user?.name)
    || normalizeText(`${user?.firstName || ''} ${user?.lastName || ''}`)
    || normalizeText(user?.email)
    || 'Student';
}

function formatScheduleItem(item: {
  id: string;
  projectId: string;
  type: AdviserScheduleItemType;
  status: AdviserScheduleItemStatus;
  title: string;
  scheduledAt: Date;
  endsAt: Date | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: {
    title: string;
    group: {
      code: string;
      title: string;
    } | null;
  };
}) {
  return {
    id: item.id,
    projectId: item.projectId,
    type: item.type,
    typeLabel: scheduleTypeLabels[item.type],
    status: item.status,
    title: item.title,
    scheduledAt: item.scheduledAt.toISOString(),
    endsAt: item.endsAt?.toISOString() || null,
    location: item.location || '',
    notes: item.notes || '',
    groupCode: item.project.group?.code || '',
    groupTitle: item.project.group?.title || item.project.title,
    projectTitle: item.project.title,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function formatGroupOption(group: {
  id: string;
  code: string;
  title: string;
  projectTitle: string;
  leader: string | null;
  groupMembers: Array<{
    userId: string;
    isActive: boolean;
    role: string;
    user: {
      id: string;
      name: string;
      firstName: string | null;
      lastName: string | null;
      displayName: string | null;
      email: string;
    };
  }>;
}) {
  const activeMembers = group.groupMembers.filter((member) => member.isActive) || [];

  return {
    id: group.id, // We use groupId here!
    title: group.projectTitle || group.title || 'Pending Title',
    groupCode: group.code,
    groupTitle: group.title || group.projectTitle || 'Pending Title',
    leaderName: group.leader || activeMembers.find((member) => member.role === 'LEADER')?.user.name || '',
    members: activeMembers.map((member) => ({
      userId: member.userId,
      name: formatPersonName(member.user),
      isLeader: member.role === 'LEADER'
    }))
  };
}

async function getGroupForSchedule(groupId: string, user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  return prisma.group.findFirst({
    where: {
      id: groupId,
      ...getGroupAccessWhere(user)
    },
    include: {
      projects: true,
      groupMembers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true
            }
          }
        }
      }
    }
  });
}

async function notifyGroupStudents({
  group,
  adviser,
  itemId,
  loginUrl,
  type,
  title,
  scheduledAt,
  location,
  notes
}: {
  group: Awaited<ReturnType<typeof getGroupForSchedule>>;
  adviser: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  itemId: string;
  loginUrl: string;
  type: AdviserScheduleItemType;
  title: string;
  scheduledAt: Date;
  location: string | null;
  notes: string | null;
}) {
  if (!group) {
    return;
  }

  const activeMembers = group.groupMembers.filter((member) => member.isActive);
  const recipientIds = Array.from(new Set(
    activeMembers
      .map((member) => member.userId)
      .filter(Boolean)
  ));

  if (!recipientIds.length) {
    return;
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(scheduledAt);
  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      title: 'Schedule Updated',
      message: `${scheduleTypeLabels[type]} scheduled: "${title}" on ${dateLabel}.`,
      type: type === AdviserScheduleItemType.DEADLINE ? 'deadline' : 'info',
      entityType: 'adviser_schedule_item',
      entityId: itemId
    }))
  });

  // Send email notifications
  
  const emailPromises = activeMembers.map(async (member) => {
    if (!member.user.email) return;
    try {
      await sendScheduleNotificationEmail({
        to: member.user.email,
        name: member.user.firstName || member.user.name,
        typeLabel: scheduleTypeLabels[type],
        title,
        dateLabel,
        location,
        notes,
        group: group.title || group.projectTitle || group.code,
        adviserName: formatPersonName(adviser),
        loginUrl
      });
      console.log(`[Schedule Email] Successfully sent to ${member.user.email}`);
    } catch (error) {
      console.error(`[Schedule Email] Failed to send to ${member.user.email}:`, error);
    }
  });

  await Promise.allSettled(emailPromises);
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, ADVISER_SCHEDULE_ROLES);
    const accessWhere = getProjectAccessWhere(user);
    const groupWhere = getGroupAccessWhere(user);
    const url = new URL(request.url);
    const itemLimit = parsePositiveInteger(url.searchParams.get('limit'), DEFAULT_SCHEDULE_LIMIT, MAX_SCHEDULE_LIMIT);
    const projectLimit = parsePositiveInteger(url.searchParams.get('projectLimit'), DEFAULT_SCHEDULE_PROJECT_LIMIT, MAX_SCHEDULE_LIMIT);

    const [items, groups] = await Promise.all([
      prisma.adviserScheduleItem.findMany({
        where: {
          project: { is: accessWhere }
        },
        include: {
          project: {
            select: {
              title: true,
              group: {
                select: {
                  code: true,
                  title: true
                }
              }
            }
          }
        },
        orderBy: { scheduledAt: 'asc' },
        take: itemLimit
      }),
      prisma.group.findMany({
        where: groupWhere,
        select: {
          id: true,
          code: true,
          title: true,
          projectTitle: true,
          leader: true,
          groupMembers: {
            where: { isActive: true },
            select: {
              userId: true,
              isActive: true,
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: projectLimit
      })
    ]);

    return successResponse({
      items: items.map(formatScheduleItem),
      projects: groups.map(formatGroupOption)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, ADVISER_SCHEDULE_ROLES);
    const body = await parseJsonBody<{
      projectId?: unknown;
      type?: unknown;
      title?: unknown;
      date?: unknown;
      time?: unknown;
      location?: unknown;
      notes?: unknown;
      notifyStudents?: unknown;
      requiredSubmission?: unknown;
    }>(request);

    const groupId = normalizeText(body.projectId); // UI sends groupId as projectId
    const type = parseScheduleType(body.type);
    const scheduledAt = parseScheduleDate(body.date, body.time);
    const location = normalizeText(body.location);
    const notes = normalizeText(body.notes);
    const title = normalizeText(body.title) || `${scheduleTypeLabels[type]} schedule`;
    const requiredSubmission = normalizeText(body.requiredSubmission);

    if (!groupId) {
      throw new HttpError('Choose a project or group for this schedule.', 400, {
        projectId: 'Choose a project or group.'
      });
    }

    if (groupId === 'ALL') {
      const allGroups = await prisma.group.findMany({
        where: getGroupAccessWhere(user),
        include: {
          projects: true,
          groupMembers: {
            include: {
              user: {
                select: { id: true, name: true, firstName: true, lastName: true, displayName: true, email: true }
              }
            }
          }
        }
      });

      if (allGroups.length === 0) {
        throw new HttpError('No groups found.', 404);
      }

      let firstItem = null;

      for (const group of allGroups) {
        let activeProjectId = group.projectId;
        if (!activeProjectId || group.projects.length === 0) {
          const draftProject = await prisma.project.create({
            data: {
              title: group.projectTitle || group.title || 'Pending Project',
              status: 'SUBMITTED',
              groupId: group.id,
              ownerId: group.leader ? await prisma.user.findFirst({ where: { name: group.leader } }).then(u => u?.id) : undefined,
              adviserId: group.userId
            }
          });
          activeProjectId = draftProject.id;
          
          await prisma.group.update({
            where: { id: group.id },
            data: { projectId: activeProjectId }
          });
        }

        const item = await prisma.adviserScheduleItem.create({
          data: {
            projectId: activeProjectId,
            scheduledById: user.id,
            type,
            title,
            scheduledAt,
            location: location || null,
            notes: notes || null
          },
          include: {
            project: {
              select: {
                title: true,
                group: { select: { code: true, title: true } }
              }
            }
          }
        });

        if (!firstItem) firstItem = item;

        await recordCheckpointSchedule(prisma, {
          projectId: activeProjectId,
          title,
          scheduledAt
        });

        if (type === AdviserScheduleItemType.DEADLINE) {
          await syncMilestoneDueDateFromDeadline(prisma, {
            projectId: activeProjectId,
            requiredSubmission,
            dueAt: scheduledAt
          });
        }

        if (body.notifyStudents !== false) {
          const host = request.headers.get('host') || 'localhost:3000';
          const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
          await notifyGroupStudents({
            group,
            adviser: user,
            itemId: item.id,
            loginUrl: `${protocol}://${host}/login`,
            type,
            title,
            scheduledAt,
            location: location || null,
            notes: notes || null
          });
        }
      }

      return successResponse({
        item: formatScheduleItem(firstItem!),
        message: `Mass schedule saved for all groups.`
      }, 201);
    }

    const group = await getGroupForSchedule(groupId, user);

    if (!group) {
      throw new HttpError('Group was not found or is not assigned to this adviser.', 404);
    }

    // Auto-create a Draft Project if this group doesn't have one yet
    let activeProjectId = group.projectId;
    if (!activeProjectId || group.projects.length === 0) {
      const draftProject = await prisma.project.create({
        data: {
          title: group.projectTitle || group.title || 'Pending Project',
          status: 'SUBMITTED', // Or DRAFT
          groupId: group.id,
          ownerId: group.leader ? await prisma.user.findFirst({ where: { name: group.leader } }).then(u => u?.id) : undefined,
          adviserId: group.userId
        }
      });
      activeProjectId = draftProject.id;
      
      await prisma.group.update({
        where: { id: group.id },
        data: { projectId: activeProjectId }
      });
    }

    const item = await prisma.adviserScheduleItem.create({
      data: {
        projectId: activeProjectId,
        scheduledById: user.id,
        type,
        title,
        scheduledAt,
        location: location || null,
        notes: notes || null
      },
      include: {
        project: {
          select: {
            title: true,
            group: {
              select: {
                code: true,
                title: true
              }
            }
          }
        }
      }
    });

    await recordCheckpointSchedule(prisma, {
      projectId: activeProjectId,
      title,
      scheduledAt
    });

    if (type === AdviserScheduleItemType.DEADLINE) {
      await syncMilestoneDueDateFromDeadline(prisma, {
        projectId: activeProjectId,
        requiredSubmission,
        dueAt: scheduledAt
      });
    }

    if (body.notifyStudents !== false) {
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      await notifyGroupStudents({
        group,
        adviser: user,
        itemId: item.id,
        loginUrl: `${protocol}://${host}/login`,
        type,
        title,
        scheduledAt,
        location: location || null,
        notes: notes || null
      });
    }

    return successResponse({
      item: formatScheduleItem(item),
      message: `${scheduleTypeLabels[type]} schedule saved.`
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/adviser-schedule-items', handleGET);
export const POST = withApiLogging('POST', '/api/adviser-schedule-items', handlePOST);
