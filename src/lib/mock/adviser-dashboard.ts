import { cache } from 'react';
import { getServerAuthenticatedUser, buildDisplayName } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdviserScheduleItemStatus, NotificationStatus } from '@/generated/prisma/client';
import { getLatestDefenseOutcomeTag, getNextMilestoneDueDate, getProjectProgressSummary } from '@/lib/milestone-checkpoint-tracking';

const now = '2026-04-06T00:00:00.000Z';

export type AdviserDashboardData = {
  profile: {
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    fullName: string;
    roleLabel: string;
    department: string;
    notificationCount: number;
    email?: string;
    contactNumber?: string;
    office?: string;
    accountSummary?: string;
    profileImage?: string;
    displayName?: string;
    rawRole?: string;
  };
  adviserActivity: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    icon: string;
    title: string;
    text: string;
    time: string;
    href?: string;
    meta?: string;
    tone?: 'primary' | 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  }>;
  panelActivity: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    icon: string;
    title: string;
    text: string;
    time: string;
    href?: string;
    meta?: string;
    tone?: 'primary' | 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  }>;
  groups: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    code: string;
    title: string;
    projectTitle: string;
    dept: string;
    department: string;
    members: number;
    students: string[];
    progress: number;
    statusLabel: string;
    statusClass: string;
    milestone: string;
    currentMilestone: string;
    finalDefenseResult: 'Passed' | 'Failed' | 'Pending' | 'Scheduled';
    finalManuscriptApproved: boolean;
    allRequiredMilestonesCompleted: boolean;
    completedAt: string | null;
    nextMilestoneDueAt: string | null;
    finalScore: number | null;
    finalRecommendation: string | null;
    leader: string | null;
    pendingStudents?: string[];
    defenseOutcomeTag?: { label: string; tone: 'success' | 'danger' } | null;
    progressDetail?: string | null;
    progressStage?: string | null;
  }>;
  panelProjects: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    title: string;
    dept: string;
    students: string;
    defenseDate: string;
    defenseTime: string;
    statusLabel: string;
    statusClass: string;
  }>;
  recentSubmissions: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    group: string;
    type: string;
    action: string;
  }>;
  upcomingSchedule: Array<{
    id: string;
    project_id: string;
    dateLabel: string;
    timeLabel: string;
    eventType: string;
    location: string;
    tone: 'warning' | 'info';
  }>;
  departmentPerformance: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    name: string;
    progress: number;
  }>;
  progressReports: {
    totalFiled: number;
    filedThisWeek: number;
    awaitingFeedback: number;
  };
};

export type AdviserDashboardAnalytics = {
  /** Oldest first, one row per week (weeks start Monday). */
  weeklyActivity: Array<{ weekStart: string; label: string; submitted: number; reviewed: number }>;
  turnaround: {
    reviewedCount: number;
    medianDays: number | null;
    buckets: Array<{ key: string; label: string; count: number }>;
  };
  /** Ordered by milestone sequence; counts required checkpoints across all advised projects. */
  milestoneCompletion: Array<{ id: string; title: string; completed: number; total: number }>;
  /** Top document categories by uploaded file count, largest first. */
  submissionTypes: Array<{ label: string; count: number }>;
};

const ACTIVITY_WEEKS = 8;
const TURNAROUND_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const TURNAROUND_BUCKETS = [
  { key: 'same-day', label: 'Same day', maxDays: 1 },
  { key: '1-3', label: '1–3 days', maxDays: 3 },
  { key: '4-7', label: '4–7 days', maxDays: 7 },
  { key: '7+', label: 'Over a week', maxDays: Infinity }
] as const;

function createEmptyAnalytics(): AdviserDashboardAnalytics {
  return {
    weeklyActivity: [],
    turnaround: { reviewedCount: 0, medianDays: null, buckets: TURNAROUND_BUCKETS.map(({ key, label }) => ({ key, label, count: 0 })) },
    milestoneCompletion: [],
    submissionTypes: []
  };
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function loadAdviserAnalytics(projectIds: string[]): Promise<AdviserDashboardAnalytics> {
  const now = new Date();
  const firstWeek = startOfWeek(new Date(now.getTime() - (ACTIVITY_WEEKS - 1) * 7 * DAY_MS));
  const turnaroundStart = new Date(now.getTime() - TURNAROUND_WINDOW_DAYS * DAY_MS);

  const [submissions, checkpoints, fileCategories] = await Promise.all([
    prisma.submission.findMany({
      where: {
        projectId: { in: projectIds },
        // Reviews reach back to the longer of the two windows so turnaround covers its full range.
        OR: [{ submittedAt: { gte: firstWeek } }, { reviewedAt: { gte: firstWeek < turnaroundStart ? firstWeek : turnaroundStart } }]
      },
      select: { submittedAt: true, reviewedAt: true }
    }),
    prisma.milestoneCheckpoint.findMany({
      where: { projectId: { in: projectIds }, required: true },
      select: { status: true, milestone: { select: { id: true, title: true, sequence: true } } }
    }),
    prisma.uploadedFile.groupBy({
      by: ['documentCategory'],
      where: { projectId: { in: projectIds } },
      _count: { _all: true }
    })
  ]);

  const weeklyActivity = Array.from({ length: ACTIVITY_WEEKS }, (_, index) => {
    const weekStart = new Date(firstWeek.getTime() + index * 7 * DAY_MS);
    return {
      weekStart: weekStart.toISOString(),
      label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekStart),
      submitted: 0,
      reviewed: 0
    };
  });
  const weekIndex = (value: Date) => Math.floor((startOfWeek(value).getTime() - firstWeek.getTime()) / (7 * DAY_MS));

  const turnaroundDays: number[] = [];
  submissions.forEach(({ submittedAt, reviewedAt }) => {
    const submittedWeek = weekIndex(submittedAt);
    if (submittedWeek >= 0 && submittedWeek < ACTIVITY_WEEKS) weeklyActivity[submittedWeek].submitted += 1;

    if (!reviewedAt) return;
    const reviewedWeek = weekIndex(reviewedAt);
    if (reviewedWeek >= 0 && reviewedWeek < ACTIVITY_WEEKS) weeklyActivity[reviewedWeek].reviewed += 1;
    if (reviewedAt >= turnaroundStart && reviewedAt >= submittedAt) {
      turnaroundDays.push((reviewedAt.getTime() - submittedAt.getTime()) / DAY_MS);
    }
  });

  const buckets = TURNAROUND_BUCKETS.map(({ key, label }) => ({ key, label, count: 0 }));
  turnaroundDays.forEach((days) => {
    // "Same day" is strictly under 24h; the other buckets include their upper bound.
    const index = TURNAROUND_BUCKETS.findIndex((bucket, position) => (position === 0 ? days < bucket.maxDays : days <= bucket.maxDays));
    buckets[index].count += 1;
  });
  const medianDays = median(turnaroundDays);

  const milestones = new Map<string, { id: string; title: string; sequence: number; completed: number; total: number }>();
  checkpoints.forEach(({ status, milestone }) => {
    // Titles repeat per project; group by stage (sequence + title) so the chart reads across groups.
    const key = `${milestone.sequence}:${milestone.title}`;
    const entry = milestones.get(key) ?? { id: key, title: milestone.title, sequence: milestone.sequence, completed: 0, total: 0 };
    entry.total += 1;
    if (status === 'APPROVED' || status === 'COMPLETED') entry.completed += 1;
    milestones.set(key, entry);
  });

  return {
    weeklyActivity,
    turnaround: {
      reviewedCount: turnaroundDays.length,
      medianDays: medianDays === null ? null : Math.round(medianDays * 10) / 10,
      buckets
    },
    milestoneCompletion: [...milestones.values()]
      .sort((left, right) => left.sequence - right.sequence)
      .map(({ id, title, completed, total }) => ({ id, title, completed, total })),
    submissionTypes: fileCategories
      .map((row) => ({ label: toTitleCase(row.documentCategory, 'Uncategorized'), count: row._count._all }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)
  };
}

const adviserDashboardData: AdviserDashboardData = {
  profile: {
    id: 'user-adviser-001',
    user_id: 'user-adviser-001',
    project_id: 'project-it-dashboard',
    status: 'active',
    created_at: now,
    updated_at: now,
    fullName: 'Dr. Ricardo M. Cruz',
    roleLabel: 'Adviser & Panel Portal',
    department: 'IT Department',
    notificationCount: 5
  },
  adviserActivity: [],
  panelActivity: [],
  groups: [
    {
      id: 'A1',
      user_id: 'user-adviser-001',
      project_id: 'project-it-001',
      status: 'active',
      created_at: now,
      updated_at: now,
      code: 'IT-2024-01',
      title: 'AI-Powered Learning System',
      projectTitle: 'AI-Powered Learning System',
      dept: 'IT',
      department: 'IT',
      members: 0,
      students: [],
      progress: 75,
      statusLabel: 'Active',
      statusClass: 'status-active',
      milestone: 'Chapter 3 revision',
      currentMilestone: 'Chapter 3 revision',
      finalDefenseResult: 'Scheduled',
      finalManuscriptApproved: false,
      allRequiredMilestonesCompleted: false,
      completedAt: null,
      nextMilestoneDueAt: null,
      finalScore: null,
      finalRecommendation: null,
      leader: null
    },
    {
      id: 'B2',
      user_id: 'user-adviser-001',
      project_id: 'project-it-002',
      status: 'pending',
      created_at: now,
      updated_at: now,
      code: 'IT-2024-02',
      title: 'Capstone Submission Platform',
      projectTitle: 'Capstone Submission Platform',
      dept: 'IT',
      department: 'IT',
      members: 0,
      students: [],
      progress: 45,
      statusLabel: 'Pending',
      statusClass: 'status-pending',
      milestone: 'Proposal refinement',
      currentMilestone: 'Proposal refinement',
      finalDefenseResult: 'Pending',
      finalManuscriptApproved: false,
      allRequiredMilestonesCompleted: false,
      completedAt: null,
      nextMilestoneDueAt: null,
      finalScore: null,
      finalRecommendation: null,
      leader: null
    },
    {
      id: 'C3',
      user_id: 'user-adviser-001',
      project_id: 'project-it-003',
      status: 'needs-revision',
      created_at: now,
      updated_at: now,
      code: 'IT-2024-03',
      title: 'Campus Safety Tracker',
      projectTitle: 'Campus Safety Tracker',
      dept: 'IT',
      department: 'IT',
      members: 0,
      students: [],
      progress: 60,
      statusLabel: 'Needs Revision',
      statusClass: 'status-revise',
      milestone: 'Security testing review',
      currentMilestone: 'Security testing review',
      finalDefenseResult: 'Pending',
      finalManuscriptApproved: false,
      allRequiredMilestonesCompleted: false,
      completedAt: null,
      nextMilestoneDueAt: null,
      finalScore: null,
      finalRecommendation: 'Resubmit the security validation report before final scheduling.',
      leader: null
    },
    {
      id: 'D4',
      user_id: 'user-adviser-001',
      project_id: 'project-it-004',
      status: 'active',
      created_at: now,
      updated_at: now,
      code: 'IT-2024-04',
      title: 'Smart Inventory Assistant',
      projectTitle: 'Smart Inventory Assistant',
      dept: 'IT',
      department: 'IT',
      members: 0,
      students: [],
      progress: 100,
      statusLabel: 'Active',
      statusClass: 'status-active',
      milestone: 'Final archive endorsement',
      currentMilestone: 'Final archive endorsement',
      finalDefenseResult: 'Passed',
      finalManuscriptApproved: true,
      allRequiredMilestonesCompleted: true,
      completedAt: '2026-04-04T00:00:00.000Z',
      nextMilestoneDueAt: null,
      finalScore: 96,
      finalRecommendation: 'Ready for archiving and alumni showcase endorsement.',
      leader: null
    },
    {
      id: 'E5',
      user_id: 'user-adviser-001',
      project_id: 'project-it-005',
      status: 'at-risk',
      created_at: now,
      updated_at: now,
      code: 'IT-2024-05',
      title: 'Smart Barangay Response Hub',
      projectTitle: 'Smart Barangay Response Hub',
      dept: 'IT',
      department: 'IT',
      members: 0,
      students: [],
      progress: 32,
      statusLabel: 'At Risk',
      statusClass: 'status-warning',
      milestone: 'Prototype recovery sprint',
      currentMilestone: 'Prototype recovery sprint',
      finalDefenseResult: 'Pending',
      finalManuscriptApproved: false,
      allRequiredMilestonesCompleted: false,
      completedAt: null,
      nextMilestoneDueAt: null,
      finalScore: null,
      finalRecommendation: 'Prioritize system stabilization and document the recovery plan.',
      leader: null
    }
  ],
  panelProjects: [
    {
      id: 'panel-project-001',
      user_id: 'user-adviser-001',
      project_id: 'project-panel-001',
      status: 'pending',
      created_at: now,
      updated_at: now,
      title: 'Blockchain for Supply Chain',
      dept: 'IT',
      students: 'No students assigned',
      defenseDate: 'Apr 3, 2026',
      defenseTime: '9:00 AM',
      statusLabel: 'Pending',
      statusClass: 'status-pending'
    },
    {
      id: 'panel-project-002',
      user_id: 'user-adviser-001',
      project_id: 'project-panel-002',
      status: 'scheduled',
      created_at: now,
      updated_at: now,
      title: 'Campus Safety Tracker',
      dept: 'IT',
      students: 'No students assigned',
      defenseDate: 'Apr 5, 2026',
      defenseTime: '1:30 PM',
      statusLabel: 'Scheduled',
      statusClass: 'status-warning'
    },
    {
      id: 'panel-project-003',
      user_id: 'user-adviser-001',
      project_id: 'project-panel-003',
      status: 'completed',
      created_at: now,
      updated_at: now,
      title: 'Smart Inventory Assistant',
      dept: 'IT',
      students: 'No students assigned',
      defenseDate: 'Mar 18, 2026',
      defenseTime: '3:30 PM',
      statusLabel: 'Completed',
      statusClass: 'status-approved'
    }
  ],
  recentSubmissions: [],
  upcomingSchedule: [],
  departmentPerformance: [
    {
      id: 'department-it',
      user_id: 'user-adviser-001',
      project_id: 'project-it-dashboard',
      status: 'active',
      created_at: now,
      updated_at: now,
      name: 'IT',
      progress: 68
    }
  ],
  progressReports: {
    totalFiled: 0,
    filedThisWeek: 0,
    awaitingFeedback: 0
  }
};

function cloneAdviserDashboardData() {
  return JSON.parse(JSON.stringify(adviserDashboardData)) as AdviserDashboardData;
}

function toIsoString(value: Date | string | null | undefined, fallback = now) {
  if (value instanceof Date) return value.toISOString();
  return value || fallback;
}

function formatScheduleDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

function formatScheduleTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(value);
}

function formatRelativeTime(isoValue: string) {
  const then = new Date(isoValue).getTime();
  if (Number.isNaN(then)) {
    return 'Recently';
  }

  const diffMs = Date.now() - then;
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(then));
}

function getFacultyRoleLabel(role: unknown) {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('panel')) return 'Panel';
  if (normalized.includes('adviser')) return 'Faculty Adviser';
  return 'Faculty';
}

function getStatusClass(value: unknown) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('complete') || normalized.includes('approve') || normalized.includes('pass')) return 'status-approved';
  if (normalized.includes('schedule') || normalized.includes('pending')) return 'status-pending';
  if (normalized.includes('risk') || normalized.includes('revision') || normalized.includes('changes')) return 'status-warning';
  return 'status-active';
}

function toTitleCase(value: unknown, fallback = 'Pending') {
  const normalized = String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  if (!normalized) return fallback;

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toFinalDefenseResult(value: string): AdviserDashboardData['groups'][number]['finalDefenseResult'] {
  const normalized = toTitleCase(value);

  if (normalized === 'Passed' || normalized === 'Failed' || normalized === 'Scheduled') {
    return normalized;
  }

  return 'Pending';
}

function formatDefenseDate(value: Date | string | null | undefined) {
  if (!value) return 'Not scheduled';
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDefenseTime(value: Date | string | null | undefined) {
  if (!value) return 'Time TBA';
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Time TBA';
  }

  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

const ADVISER_DASHBOARD_GROUP_LIMIT = 40;
const ADVISER_DASHBOARD_PANEL_LIMIT = 40;

const adviserDashboardGroupSelect = {
  id: true,
  userId: true,
  projectId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  code: true,
  title: true,
  projectTitle: true,
  dept: true,
  department: true,
  members: true,
  students: true,
  progress: true,
  statusLabel: true,
  statusClass: true,
  milestone: true,
  currentMilestone: true,
  finalDefenseResult: true,
  finalManuscriptApproved: true,
  allRequiredMilestonesCompleted: true,
  completedAt: true,
  finalScore: true,
  finalRecommendation: true,
  leader: true
} as const;

const adviserDashboardEvaluationSelect = {
  id: true,
  projectId: true,
  recommendation: true,
  createdAt: true,
  updatedAt: true,
  defenseSchedule: {
    select: {
      status: true,
      scheduledAt: true
    }
  },
  project: {
    select: {
      id: true,
      title: true,
      status: true,
      group: {
        select: {
          dept: true,
          department: true,
          students: true
        }
      }
    }
  }
} as const;

export const getAdviserDashboardData = cache(async function getAdviserDashboardData() {
  const data = cloneAdviserDashboardData();

  try {
    const dbUser = await getServerAuthenticatedUser();

    if (!dbUser) {
      return { data };
    }

    const userName = buildDisplayName(dbUser);
    const createdAt = toIsoString(dbUser.createdAt, data.profile.created_at);
    const updatedAt = toIsoString(dbUser.updatedAt, data.profile.updated_at);

    data.profile = {
      ...data.profile,
      id: dbUser.id,
      user_id: dbUser.id,
      status: 'active',
      created_at: createdAt,
      updated_at: updatedAt,
      fullName: userName,
      roleLabel: getFacultyRoleLabel(dbUser.role),
      department: dbUser.department || '',
      notificationCount: 0,
      email: dbUser.email || '',
      contactNumber: dbUser.contactNumber || '',
      office: dbUser.office || '',
      accountSummary: dbUser.accountSummary || '',
      profileImage: dbUser.profileImage || '',
      displayName: dbUser.displayName || '',
      rawRole: dbUser.role
    };

    // Ensure mock data groups belong to the logged-in user so they aren't filtered out
    data.groups = data.groups.map(g => ({ ...g, user_id: dbUser.id }));
    data.panelProjects = data.panelProjects.map(p => ({ ...p, user_id: dbUser.id }));


    try {
      const [groups, panelEvaluations, unreadNotificationCount] = await Promise.all([
        prisma.group.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: 'desc' },
          take: ADVISER_DASHBOARD_GROUP_LIMIT,
          select: adviserDashboardGroupSelect
        }),
        prisma.evaluation.findMany({
          where: { evaluatorId: dbUser.id },
          orderBy: { createdAt: 'desc' },
          take: ADVISER_DASHBOARD_PANEL_LIMIT,
          select: adviserDashboardEvaluationSelect
        }),
        prisma.notification.count({
          where: {
            userId: dbUser.id,
            status: NotificationStatus.UNREAD
          }
        })
      ]);

      data.profile.notificationCount = unreadNotificationCount;
      
      const groupsWithPendingTask = Promise.all(groups.map(async (group) => {
        // One parallel batch per group (members + progress lookups) instead of two sequential rounds.
        const [groupMembers, defenseOutcomeTag, progressSummary, nextMilestoneDueAt] = await Promise.all([
          prisma.groupMember.findMany({
            where: { groupId: group.id },
            select: {
              user: {
                select: {
                  name: true,
                  displayName: true,
                  firstName: true,
                  lastName: true,
                  notifications: {
                    where: {
                      title: { in: ['Group Assignment Updated', 'New Group Assignment'] },
                      status: 'UNREAD'
                    },
                    select: { id: true },
                    take: 1
                  }
                }
              }
            }
          }),
          getLatestDefenseOutcomeTag(prisma, group.projectId),
          getProjectProgressSummary(prisma, group.projectId),
          getNextMilestoneDueDate(prisma, group.projectId)
        ]);

        const pendingUserNames = groupMembers
          .filter((gm) => gm.user && gm.user.notifications && gm.user.notifications.length > 0)
          .map((gm) => [gm.user.name, gm.user.displayName, [gm.user.firstName, gm.user.lastName].filter(Boolean).join(' ')].map(name => typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').toLowerCase() : '').filter(Boolean)).flat();

        const pendingNamesInGroup = group.students.filter((studentName) => {
          const norm = typeof studentName === 'string' ? studentName.trim().replace(/\s+/g, ' ').toLowerCase() : '';
          return pendingUserNames.includes(norm);
        });

        return {
          ...group,
          pendingStudents: pendingNamesInGroup,
          defenseOutcomeTag,
          liveProgress: progressSummary.percent,
          progressStage: progressSummary.currentStageTitle,
          progressDetail: `${progressSummary.completedCheckpoints} of ${progressSummary.totalCheckpoints} checkpoints complete`,
          nextMilestoneDueAt
        };
      }));

      // Recent activity only needs the project ids, so it runs alongside the per-group
      // lookups instead of waiting for them (one round trip fewer on every adviser page).
      const adviserProjectIds = groups.map((group) => group.projectId).filter((id): id is string => Boolean(id));
      const recentActivityTask = (async () => {
        if (!adviserProjectIds.length) return;
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          // Runs alongside the recent-activity batch below rather than before it.
          const progressReportsTask = (async () => {
            const progressReportRows = await prisma.progressReport.findMany({
              where: { projectId: { in: adviserProjectIds } },
              select: { id: true, submissionId: true, createdAt: true }
            });

            const progressReportSubmissionIds = progressReportRows.map((r) => r.submissionId).filter((id): id is string => Boolean(id));
            const reviewedSubmissionIds = progressReportSubmissionIds.length
              ? new Set(
                  (
                    await prisma.reviewComment.findMany({
                      where: { submissionId: { in: progressReportSubmissionIds } },
                      select: { submissionId: true }
                    })
                  ).map((comment) => comment.submissionId)
                )
              : new Set<string>();

            return {
              totalFiled: progressReportRows.length,
              filedThisWeek: progressReportRows.filter((r) => r.createdAt >= sevenDaysAgo).length,
              awaitingFeedback: progressReportRows.filter((r) => !r.submissionId || !reviewedSubmissionIds.has(r.submissionId)).length
            };
          })();

          const groupCodeByProjectId = new Map(groups.map((group) => [group.projectId, group.code] as const));
          const adviserScheduleDelegate = 'adviserScheduleItem' in prisma ? prisma.adviserScheduleItem : null;

          const [progressReports, recentFiles, recentComments, upcomingDefenses, upcomingAdviserItems] = await Promise.all([
            progressReportsTask,
            prisma.uploadedFile.findMany({
              where: { projectId: { in: adviserProjectIds } },
              orderBy: { createdAt: 'desc' },
              take: 6,
              select: {
                id: true, projectId: true, fileName: true, documentCategory: true, category: true, createdAt: true,
                submission: { select: { status: true } }
              }
            }),
            prisma.reviewComment.findMany({
              where: { authorId: dbUser.id, submission: { projectId: { in: adviserProjectIds } } },
              orderBy: { createdAt: 'desc' },
              take: 6,
              select: {
                id: true, body: true, createdAt: true,
                submission: { select: { projectId: true, title: true } }
              }
            }),
            prisma.defenseSchedule.findMany({
              where: { projectId: { in: adviserProjectIds }, scheduledAt: { gte: new Date() } },
              orderBy: { scheduledAt: 'asc' },
              take: 6,
              select: { id: true, projectId: true, title: true, scheduledAt: true, location: true }
            }),
            adviserScheduleDelegate
              ? adviserScheduleDelegate.findMany({
                  where: { projectId: { in: adviserProjectIds }, scheduledAt: { gte: new Date() }, status: { not: AdviserScheduleItemStatus.CANCELLED } },
                  orderBy: { scheduledAt: 'asc' },
                  take: 6,
                  select: { id: true, projectId: true, title: true, type: true, scheduledAt: true, location: true }
                })
              : Promise.resolve([])
          ]);

          data.progressReports = progressReports;

          data.recentSubmissions = recentFiles.map((file) => ({
            id: file.id,
            user_id: dbUser.id,
            project_id: file.projectId || '',
            status: file.submission?.status || 'PENDING',
            created_at: toIsoString(file.createdAt),
            updated_at: toIsoString(file.createdAt),
            group: (file.projectId && groupCodeByProjectId.get(file.projectId)) || 'Your group',
            type: toTitleCase(file.documentCategory || file.category, file.fileName),
            action: file.id
          }));

          const fileActivity = recentFiles.slice(0, 4).map((file) => ({
            id: `activity-file-${file.id}`,
            user_id: dbUser.id,
            project_id: file.projectId || '',
            status: file.submission?.status || 'pending',
            created_at: toIsoString(file.createdAt),
            updated_at: toIsoString(file.createdAt),
            icon: 'fa-file-arrow-up',
            title: `${(file.projectId && groupCodeByProjectId.get(file.projectId)) || 'A group'} uploaded ${toTitleCase(file.documentCategory || file.category, file.fileName)}`,
            text: `${file.fileName} was added to the project workspace and is waiting for your review.`,
            time: toIsoString(file.createdAt)
          }));

          const commentActivity = recentComments.map((comment) => ({
            id: `activity-comment-${comment.id}`,
            user_id: dbUser.id,
            project_id: comment.submission.projectId || '',
            status: 'completed',
            created_at: toIsoString(comment.createdAt),
            updated_at: toIsoString(comment.createdAt),
            icon: 'fa-comment-dots',
            title: `Feedback sent - ${(comment.submission.projectId && groupCodeByProjectId.get(comment.submission.projectId)) || comment.submission.title}`,
            text: comment.body.length > 140 ? `${comment.body.slice(0, 140)}...` : comment.body,
            time: toIsoString(comment.createdAt)
          }));

          data.adviserActivity = [...fileActivity, ...commentActivity]
            .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
            .slice(0, 6)
            .map((item) => ({ ...item, time: formatRelativeTime(item.time) }));

          data.upcomingSchedule = [
            ...upcomingDefenses.map((session) => ({
              id: session.id,
              project_id: session.projectId,
              sortKey: session.scheduledAt.getTime(),
              dateLabel: formatScheduleDate(session.scheduledAt),
              timeLabel: formatScheduleTime(session.scheduledAt),
              eventType: session.title || 'Defense',
              location: session.location || 'TBA',
              tone: 'warning' as const
            })),
            ...upcomingAdviserItems.map((item) => ({
              id: item.id,
              project_id: item.projectId,
              sortKey: item.scheduledAt.getTime(),
              dateLabel: formatScheduleDate(item.scheduledAt),
              timeLabel: formatScheduleTime(item.scheduledAt),
              eventType: item.title || toTitleCase(item.type, 'Consultation'),
              location: item.location || 'TBA',
              tone: 'info' as const
            }))
          ]
            .sort((left, right) => left.sortKey - right.sortKey)
            .slice(0, 6)
            .map(({ sortKey, ...item }) => item);
      })();

      const [groupsWithPending] = await Promise.all([groupsWithPendingTask, recentActivityTask]);

      data.groups = groupsWithPending.map((group) => ({
        id: group.id,
        user_id: group.userId,
        project_id: group.projectId || '',
        status: group.status,
        created_at: toIsoString(group.createdAt),
        updated_at: toIsoString(group.updatedAt),
        code: group.code,
        title: group.title,
        projectTitle: group.projectTitle,
        dept: group.dept,
        department: group.department,
        members: group.members,
        students: group.students,
        progress: group.liveProgress,
        statusLabel: group.statusLabel,
        statusClass: group.statusClass,
        milestone: group.milestone,
        currentMilestone: group.currentMilestone,
        finalDefenseResult: toFinalDefenseResult(group.finalDefenseResult),
        finalManuscriptApproved: group.finalManuscriptApproved,
        allRequiredMilestonesCompleted: group.allRequiredMilestonesCompleted,
        completedAt: group.completedAt ? toIsoString(group.completedAt) : null,
        nextMilestoneDueAt: group.nextMilestoneDueAt,
        finalScore: group.finalScore,
        finalRecommendation: group.finalRecommendation,
        leader: group.leader,
        pendingStudents: group.pendingStudents,
        defenseOutcomeTag: group.defenseOutcomeTag,
        progressDetail: group.progressDetail,
        progressStage: group.progressStage
      }));

      data.panelProjects = panelEvaluations.map((evaluation) => {
        const project = evaluation.project;
        const group = project.group;
        const statusValue = evaluation.defenseSchedule?.status || evaluation.recommendation || project.status;

        return {
          id: evaluation.id,
          user_id: dbUser.id,
          project_id: project.id,
          status: String(statusValue || '').toLowerCase(),
          created_at: toIsoString(evaluation.createdAt),
          updated_at: toIsoString(evaluation.updatedAt),
          title: project.title,
          dept: group?.dept || group?.department || dbUser.department || '',
          students: group?.students?.length ? group.students.join(', ') : 'No students assigned',
          defenseDate: formatDefenseDate(evaluation.defenseSchedule?.scheduledAt),
          defenseTime: formatDefenseTime(evaluation.defenseSchedule?.scheduledAt),
          statusLabel: toTitleCase(statusValue),
          statusClass: getStatusClass(statusValue)
        };
      });

      data.panelActivity = panelEvaluations
        .filter((evaluation) => evaluation.recommendation || evaluation.defenseSchedule?.status)
        .map((evaluation) => {
          const project = evaluation.project;
          const isScored = Boolean(evaluation.recommendation);

          return {
            id: `panel-activity-${evaluation.id}`,
            user_id: dbUser.id,
            project_id: project.id,
            status: isScored ? 'completed' : 'scheduled',
            created_at: toIsoString(evaluation.updatedAt),
            updated_at: toIsoString(evaluation.updatedAt),
            icon: isScored ? 'fa-check-double' : 'fa-calendar-day',
            title: isScored ? `Evaluation submitted - ${project.title}` : `Defense scheduled - ${project.title}`,
            text: isScored
              ? `Recommendation recorded: ${toTitleCase(evaluation.recommendation)}.`
              : `Defense session scheduled for ${formatDefenseDate(evaluation.defenseSchedule?.scheduledAt)}.`,
            time: toIsoString(evaluation.updatedAt)
          };
        })
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .slice(0, 6)
        .map((item) => ({ ...item, time: formatRelativeTime(item.time) }));
    } catch (e) {
      console.error('Failed to load real data in adviser dashboard:', e);
      // Fallback to mock data if database fails
    }
  } catch {
    return { data };
  }

  return { data };
});

/**
 * Dashboard-only chart data. Kept out of getAdviserDashboardData so the other adviser pages
 * don't pay for these queries; the dashboard streams it in behind a Suspense boundary.
 */
export const getAdviserDashboardAnalytics = cache(async function getAdviserDashboardAnalytics(): Promise<AdviserDashboardAnalytics> {
  const { data } = await getAdviserDashboardData();
  const projectIds = data.groups.map((group) => group.project_id).filter(Boolean);
  if (!projectIds.length) return createEmptyAnalytics();

  try {
    return await loadAdviserAnalytics(projectIds);
  } catch (error) {
    // Charts fall back to their empty states; the rest of the dashboard is unaffected.
    console.error('Failed to load adviser dashboard analytics:', error);
    return createEmptyAnalytics();
  }
});
