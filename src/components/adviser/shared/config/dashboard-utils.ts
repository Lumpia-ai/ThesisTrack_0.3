import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import {
  DASH_COLORS,
  type DashboardTone,
  type DashListItem,
  type DashProgressRow,
  type DashSlice,
  type WeeklyScheduleItem
} from '@/components/adviser/shared/config/dashboard-types';

export const WORKSPACE_META = {
  adviser: {
    pageTitle: 'Adviser Dashboard',
    pageCopy: 'Monitor groups, review submissions, and manage supervision tasks',
    navLabel: 'Dashboard',
    headerLabel: 'Adviser & Panel Portal',
    badgeLabel: 'Faculty Adviser',
    badgeIcon: 'fa-building',
    pillLabel: 'Adviser Workspace',
    primaryActionLabel: 'Review Submissions',
    primaryActionHref: '/adviser/adviser-mode/submissions',
    primaryActionIcon: 'fa-check-double'
  },
  panel: {
    pageTitle: 'Panel Dashboard',
    pageCopy: 'Track evaluations, defense assignments, and panel responsibilities in one workspace',
    navLabel: 'Panel Dashboard',
    headerLabel: 'Panel Workspace',
    badgeLabel: 'Panel Workspace',
    badgeIcon: 'fa-scale-balanced',
    pillLabel: 'Panel Workspace',
    primaryActionLabel: 'Open Evaluation Queue',
    primaryActionHref: '/adviser/panel-mode/evaluation-queue',
    primaryActionIcon: 'fa-clipboard-check'
  }
} as const;

export const WORKSPACE_MODE_STORAGE_KEY = 'thesisTrackAdviserWorkspaceMode';
export type WorkspaceMode = keyof typeof WORKSPACE_META;
export type AdviserGroupLifecycleStatus = 'active' | 'pending' | 'needs-revision' | 'at-risk' | 'completed';

export const ADVISER_GROUP_STATUS_META: Record<
  AdviserGroupLifecycleStatus,
  { label: string; className: string }
> = {
  active: { label: 'Active', className: 'status-active' },
  pending: { label: 'Pending', className: 'status-pending' },
  'needs-revision': { label: 'Needs Revision', className: 'status-revise' },
  'at-risk': { label: 'At Risk', className: 'status-warning' },
  completed: { label: 'Completed', className: 'status-completed' }
};

export function getWorkspaceBasePath(mode: WorkspaceMode): string {
  return mode === 'panel' ? '/adviser/panel-mode' : '/adviser/adviser-mode';
}

export function getWorkspaceDashboardPath(mode: WorkspaceMode): string {
  return `${getWorkspaceBasePath(mode)}/dashboard`;
}

export const NAV_ITEMS = {
  adviser: [
    { href: '/adviser/adviser-mode/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { href: '/adviser/adviser-mode/groups', icon: 'fa-users', label: 'My Groups' },
    { href: '/adviser/adviser-mode/submissions', icon: 'fa-check-double', label: 'Submissions' },
    { href: '/adviser/adviser-mode/progress', icon: 'fa-chart-line', label: 'Progress Monitoring' },
    { href: '/adviser/adviser-mode/title-approvals', icon: 'fa-file-signature', label: 'Title & Evidence Approval' },
    { href: '/adviser/adviser-mode/evaluations', icon: 'fa-star', label: 'Evaluations' },
    { href: '/adviser/adviser-mode/schedule', icon: 'fa-calendar', label: 'Schedule' },
    { href: '/adviser/adviser-mode/reports', icon: 'fa-chart-bar', label: 'Reports & Analytics' }
  ],
  panel: [
    { href: '/adviser/panel-mode/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { href: '/adviser/panel-mode/evaluation-queue', icon: 'fa-clipboard-check', label: 'Evaluation Queue' },
    { href: '/adviser/panel-mode/defense-schedule', icon: 'fa-calendar-days', label: 'Defense Schedule' },
    { href: '/adviser/panel-mode/defense-voting', icon: 'fa-check-to-slot', label: 'Defense Verdict' },
    { href: '/adviser/panel-mode/compliance-review', icon: 'fa-list-check', label: 'Compliance Review' },
    { href: '/adviser/panel-mode/review-history', icon: 'fa-folder-open', label: 'Review History' }
  ]
} as const;

/** Derive workspace mode from the current URL pathname. */
export function getWorkspaceModeFromPathname(pathname: string): WorkspaceMode {
  if (pathname.startsWith('/adviser/panel-mode')) return 'panel';
  return 'adviser';
}

/** Check whether a sidebar nav item should be marked active for the given pathname. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function getToastIcon(type: 'success' | 'error' | 'info') {
  if (type === 'success') {
    return 'fa-check-circle';
  }

  if (type === 'error') {
    return 'fa-exclamation-circle';
  }

  return 'fa-info-circle';
}

export function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function getShortName(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).join(' ') || value;
}

export function getGroupProjectTitle(group: AdviserDashboardData['groups'][number]) {
  if (group.projectTitle && group.projectTitle !== 'Pending Student Submission') return group.projectTitle;
  if (group.title && group.title !== 'Pending Student Submission') return group.title;
  return 'Pending Title Approval';
}

export function getGroupDepartmentLabel(group: AdviserDashboardData['groups'][number]) {
  return group.department || group.dept;
}

export function getGroupMilestoneLabel(group: AdviserDashboardData['groups'][number]) {
  return group.currentMilestone || group.milestone;
}

export function isGroupCompleted(group: AdviserDashboardData['groups'][number]) {
  return (
    group.finalDefenseResult === 'Passed' &&
    group.finalManuscriptApproved === true &&
    group.allRequiredMilestonesCompleted === true
  );
}

function normalizeLifecycleStatus(status: string, progress?: number): AdviserGroupLifecycleStatus {
  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'needs-revision' || status === 'revise') {
    return 'needs-revision';
  }

  if (status === 'at-risk' || status === 'overdue') {
    return 'at-risk';
  }

  if (status === 'pending') {
    return 'pending';
  }

  if (status === 'active') {
    return 'active';
  }

  if (typeof progress === 'number' && progress < 35) {
    return 'at-risk';
  }

  return 'active';
}

export function getComputedGroupStatus(group: AdviserDashboardData['groups'][number]): AdviserGroupLifecycleStatus {
  if (isGroupCompleted(group)) {
    return 'completed';
  }

  return normalizeLifecycleStatus(group.status, group.progress);
}

export function getComputedGroupStatusLabel(group: AdviserDashboardData['groups'][number]) {
  return ADVISER_GROUP_STATUS_META[getComputedGroupStatus(group)].label;
}

export function getToneFromStatus(status: string, progress?: number): DashboardTone {
  if (
    status === 'needs-revision' ||
    status === 'at-risk' ||
    status === 'revise' ||
    status === 'reject' ||
    status === 'overdue'
  ) {
    return 'danger';
  }

  if (status === 'pending' || status === 'pending-review' || status === 'scheduled') {
    return 'warning';
  }

  if (status === 'approved' || status === 'completed') {
    return 'success';
  }

  if (status === 'under-review' || status === 'confirmed') {
    return 'info';
  }

  if (typeof progress === 'number') {
    if (progress < 50) {
      return 'danger';
    }

    if (progress < 70) {
      return 'warning';
    }

    if (progress >= 85) {
      return 'success';
    }
  }

  return 'primary';
}

export function buildAdviserScheduleItems(items: AdviserDashboardData['upcomingSchedule'], groups: AdviserDashboardData['groups']): WeeklyScheduleItem[] {
  const groupsByProject = new Map(groups.map((group) => [group.project_id, group]));

  return items.map((item) => {
    const group = groupsByProject.get(item.project_id);
    return {
      id: item.id,
      dateLabel: item.dateLabel,
      timeLabel: item.timeLabel,
      groupName: group?.code ?? 'Adviser session',
      eventType: item.eventType,
      location: item.location,
      tone: item.tone,
      projectId: item.project_id
    };
  });
}

export function buildPanelScheduleItems(panelProjects: AdviserDashboardData['panelProjects']): WeeklyScheduleItem[] {
  return panelProjects.filter((project) => project.status !== 'completed').map((project) => ({ id: `panel-schedule-${project.id}`, dateLabel: project.defenseDate, timeLabel: project.defenseTime, groupName: project.title, eventType: 'Defense evaluation', location: 'Panel Review Room', tone: getToneFromStatus(project.status) }));
}

/* ---------- Dashboard analytics ---------- */

type SubmissionBucket = 'awaiting' | 'revision' | 'approved' | 'rejected' | 'other';

// One meaning per color across the whole dashboard: done = success, waiting on you = warning,
// sent back = danger, terminal failure = deep danger.
const SUBMISSION_BUCKETS: Array<{ key: SubmissionBucket; label: string; color: string }> = [
  { key: 'approved', label: 'Approved', color: DASH_COLORS.good },
  { key: 'awaiting', label: 'Awaiting review', color: DASH_COLORS.warning },
  { key: 'revision', label: 'Needs revision', color: DASH_COLORS.critical },
  { key: 'rejected', label: 'Rejected', color: DASH_COLORS.criticalStrong },
  { key: 'other', label: 'Archived', color: DASH_COLORS.neutral }
];

/** Collapse raw SubmissionStatus values (any casing, `_`/`-`) into dashboard buckets. */
function getSubmissionBucket(status: string): SubmissionBucket {
  const value = status.toLowerCase().replace(/[\s-]+/g, '_');
  if (value === 'submitted' || value === 'under_review' || value === 'pending' || value === 'pending_review') return 'awaiting';
  if (value === 'needs_revision' || value === 'revise') return 'revision';
  if (value === 'approved' || value === 'completed') return 'approved';
  if (value === 'rejected' || value === 'reject') return 'rejected';
  return 'other';
}

export function isAwaitingAdviserReview(status: string) {
  return getSubmissionBucket(status) === 'awaiting';
}

export function buildSubmissionStatusSlices(submissions: AdviserDashboardData['recentSubmissions']): DashSlice[] {
  const counts = new Map<SubmissionBucket, number>();
  submissions.forEach((item) => {
    const bucket = getSubmissionBucket(item.status);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });

  return SUBMISSION_BUCKETS
    .filter((bucket) => bucket.key !== 'other' || counts.get('other'))
    .map((bucket) => ({ ...bucket, value: counts.get(bucket.key) ?? 0 }));
}

/** Blue-ramp color per lifecycle status, shared by the dashboard and My Groups. */
export const GROUP_STATUS_COLORS: Record<AdviserGroupLifecycleStatus, string> = {
  active: DASH_COLORS.series,
  pending: DASH_COLORS.warning,
  'needs-revision': DASH_COLORS.critical,
  'at-risk': DASH_COLORS.criticalStrong,
  completed: DASH_COLORS.good
};

export function buildGroupStatusSlices(groups: AdviserDashboardData['groups']): DashSlice[] {
  const counts = new Map<AdviserGroupLifecycleStatus, number>();
  groups.forEach((group) => {
    const status = getComputedGroupStatus(group);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  return (Object.keys(ADVISER_GROUP_STATUS_META) as AdviserGroupLifecycleStatus[]).map((status) => ({
    key: status,
    label: ADVISER_GROUP_STATUS_META[status].label,
    value: counts.get(status) ?? 0,
    color: GROUP_STATUS_COLORS[status]
  }));
}

/** Progress bands shared by the gauge, the group meters and the band counts. */
export const PROGRESS_BANDS = [
  { key: 'on-track', label: 'On track', hint: '70% and up', min: 70, color: DASH_COLORS.good },
  { key: 'progressing', label: 'Progressing', hint: '50–69%', min: 50, color: DASH_COLORS.series },
  { key: 'behind', label: 'Behind', hint: 'Below 50%', min: 0, color: DASH_COLORS.warning }
] as const;

export function getProgressBand(progress: number) {
  return PROGRESS_BANDS.find((band) => progress >= band.min) ?? PROGRESS_BANDS[PROGRESS_BANDS.length - 1];
}

export function buildGroupProgressRows(groups: AdviserDashboardData['groups'], limit = 6): DashProgressRow[] {
  return [...groups]
    .sort((left, right) => right.progress - left.progress || left.code.localeCompare(right.code))
    .slice(0, limit)
    .map((group) => {
      const status = getComputedGroupStatus(group);
      const progress = status === 'completed' ? 100 : group.progress;
      return {
        id: group.id,
        name: group.code,
        title: getGroupProjectTitle(group),
        progress,
        progressColor: getProgressBand(progress).color,
        detail: getGroupMilestoneLabel(group),
        status: { label: ADVISER_GROUP_STATUS_META[status].label, color: GROUP_STATUS_COLORS[status] }
      };
    });
}

function toDateBadge(dateLabel: string) {
  const match = /^([A-Za-z]{3})\w*\s+(\d{1,2})/.exec(dateLabel);
  return match ? { month: match[1], day: match[2] } : undefined;
}

function formatShortDate(isoValue: string) {
  const date = new Date(isoValue);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function buildPendingReviewItems(
  submissions: AdviserDashboardData['recentSubmissions'],
  groups: AdviserDashboardData['groups'],
  basePath: string,
  limit = 4
): DashListItem[] {
  const codeByProject = new Map(groups.map((group) => [group.project_id, group.code]));

  return submissions
    .filter((item) => isAwaitingAdviserReview(item.status))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.type,
      subtitle: [codeByProject.get(item.project_id) ?? item.group, formatShortDate(item.created_at)].filter(Boolean).join(' · '),
      // action is the UploadedFile id — deep-link straight to its review workspace.
      href: `${basePath}/submissions/${item.action}`
    }));
}

export function buildAdviserScheduleList(
  items: AdviserDashboardData['upcomingSchedule'],
  groups: AdviserDashboardData['groups'],
  basePath: string,
  limit = 4
): DashListItem[] {
  const codeByProject = new Map(groups.map((group) => [group.project_id, group.code]));

  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: item.eventType,
    subtitle: [codeByProject.get(item.project_id), item.timeLabel].filter(Boolean).join(' · '),
    href: `${basePath}/schedule`,
    date: toDateBadge(item.dateLabel)
  }));
}

type PanelBucket = 'pending' | 'scheduled' | 'completed' | 'other';

function getPanelBucket(status: string): PanelBucket {
  if (status === 'pending') return 'pending';
  if (status === 'scheduled' || status === 'confirmed') return 'scheduled';
  if (status === 'completed') return 'completed';
  return 'other';
}

export function buildPanelStatusSlices(panelProjects: AdviserDashboardData['panelProjects']): DashSlice[] {
  const counts = new Map<PanelBucket, number>();
  panelProjects.forEach((project) => {
    const bucket = getPanelBucket(project.status);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });

  const slices: DashSlice[] = [
    { key: 'pending', label: 'Awaiting scoring', value: counts.get('pending') ?? 0, color: DASH_COLORS.warning },
    { key: 'scheduled', label: 'Scheduled', value: counts.get('scheduled') ?? 0, color: DASH_COLORS.series },
    { key: 'completed', label: 'Completed', value: counts.get('completed') ?? 0, color: DASH_COLORS.good }
  ];
  const other = counts.get('other') ?? 0;
  return other ? [...slices, { key: 'other', label: 'Other', value: other, color: DASH_COLORS.neutral }] : slices;
}

export function buildPanelQueueItems(panelProjects: AdviserDashboardData['panelProjects'], basePath: string, limit = 4): DashListItem[] {
  return panelProjects
    .filter((project) => project.status !== 'completed')
    .slice(0, limit)
    .map((project) => ({
      id: project.id,
      title: project.title,
      subtitle: project.dept || project.statusLabel,
      // Panel items are real Evaluation ids — deep-link straight to that record.
      href: `${basePath}/evaluation-queue?recordId=${encodeURIComponent(project.id)}`
    }));
}

export function buildPanelScheduleList(panelProjects: AdviserDashboardData['panelProjects'], basePath: string, limit = 4): DashListItem[] {
  return panelProjects
    .filter((project) => project.status !== 'completed' && project.defenseDate !== 'Not scheduled')
    .slice(0, limit)
    .map((project) => ({
      id: `panel-schedule-${project.id}`,
      title: project.title,
      subtitle: project.defenseTime,
      href: `${basePath}/defense-schedule`,
      date: toDateBadge(project.defenseDate)
    }));
}
