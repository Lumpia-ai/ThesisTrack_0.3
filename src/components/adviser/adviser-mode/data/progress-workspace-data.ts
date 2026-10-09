export const IT_PROGRESS_MILESTONES = [
  'Concept',
  'Proposal',
  'Development',
  'Pre-Final Defense',
  'Final Defense',
  'Completion'
] as const;

export type ProgressMilestone = (typeof IT_PROGRESS_MILESTONES)[number];
export type ProgressStatus = 'on-track' | 'at-risk' | 'delayed' | 'completed';
export type AdviserActionStatus =
  | 'Waiting for submission'
  | 'Needs review'
  | 'Ready for approval'
  | 'Ready for defense';

export type AdviserProgressRecord = {
  id: string;
  projectId: string | null;
  groupId: `IT-2024-${string}`;
  projectTitle: string;
  // Not IT-only — see src/lib/landing/departments-data.ts for the full department list.
  department: string;
  progress: number;
  currentMilestone: ProgressMilestone;
  status: ProgressStatus;
  // null means no adviser/admin has set a milestone due date for this project yet
  // (see the "Set Deadlines" modal) — never fabricate a placeholder date here.
  deadline: string | null;
  lastUpdate: string;
  adviserAction: AdviserActionStatus;
  /** e.g. "8 of 28 checkpoints complete"; null before the workflow starts. */
  checkpointSummary: string | null;
  /** Workflow stage the group is actually in, from checkpoint tracking. */
  stageTitle: string | null;
};

export type ProgressSortOption =
  | 'nearest-deadline'
  | 'highest-progress'
  | 'lowest-progress'
  | 'latest-update';

const progressStatusMeta: Record<
  ProgressStatus,
  {
    label: string;
    badgeClassName: string;
    progressClassName: string;
    icon: string;
  }
> = {
  'on-track': {
    label: 'On Track',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    progressClassName: 'bg-emerald-500',
    icon: 'fa-circle-check'
  },
  'at-risk': {
    label: 'At Risk',
    badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    progressClassName: 'bg-amber-500',
    icon: 'fa-triangle-exclamation'
  },
  delayed: {
    label: 'Delayed',
    badgeClassName: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    progressClassName: 'bg-rose-500',
    icon: 'fa-clock'
  },
  completed: {
    label: 'Completed',
    badgeClassName: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    progressClassName: 'bg-[var(--primary)]',
    icon: 'fa-flag-checkered'
  }
};

export const PROGRESS_SORT_OPTIONS: Array<{ value: ProgressSortOption; label: string }> = [
  { value: 'nearest-deadline', label: 'Nearest Deadline' },
  { value: 'highest-progress', label: 'Highest Progress' },
  { value: 'lowest-progress', label: 'Lowest Progress' },
  { value: 'latest-update', label: 'Latest Update' }
];

const dayInMilliseconds = 1000 * 60 * 60 * 24;

function startOfUtcDay(value: string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function diffInDays(left: string, right: string) {
  return Math.round((startOfUtcDay(left) - startOfUtcDay(right)) / dayInMilliseconds);
}

export function getProgressStatusMeta(status: ProgressStatus) {
  return progressStatusMeta[status];
}

export function formatProgressDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
}

export function getDeadlineLabel(deadline: string | null, referenceDate = new Date().toISOString()) {
  if (!deadline) {
    return 'No deadline set';
  }

  const days = diffInDays(deadline, referenceDate);

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return `Overdue ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
  }

  if (days === 0) {
    return 'Due today';
  }

  if (days === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${days} days`;
}

export function getLastUpdateLabel(lastUpdate: string, referenceDate = new Date().toISOString()) {
  const days = Math.abs(diffInDays(referenceDate, lastUpdate));

  if (days === 0) {
    return 'Updated today';
  }

  if (days === 1) {
    return 'Updated yesterday';
  }

  return `Updated ${days} days ago`;
}

export function getAttentionReason(record: AdviserProgressRecord, referenceDate = new Date().toISOString()) {
  const deadlineDays = record.deadline ? diffInDays(record.deadline, referenceDate) : null;
  const inactivityDays = Math.abs(diffInDays(referenceDate, record.lastUpdate));

  if (record.status === 'delayed' && deadlineDays !== null && deadlineDays < 0) {
    return `Milestone overdue by ${Math.abs(deadlineDays)} day${Math.abs(deadlineDays) === 1 ? '' : 's'}.`;
  }

  if (inactivityDays >= 7) {
    return `No recent activity for ${inactivityDays} days.`;
  }

  if (record.progress < 60) {
    return 'Progress is below the expected project stage pace.';
  }

  if (record.status === 'at-risk') {
    return 'Review turnaround is needed before the next project stage slips.';
  }

  return 'Needs adviser attention before the next checkpoint.';
}

export function sortProgressRecords(records: AdviserProgressRecord[], sortBy: ProgressSortOption) {
  return [...records].sort((left, right) => {
    if (sortBy === 'highest-progress') {
      return right.progress - left.progress;
    }

    if (sortBy === 'lowest-progress') {
      return left.progress - right.progress;
    }

    if (sortBy === 'latest-update') {
      return new Date(right.lastUpdate).getTime() - new Date(left.lastUpdate).getTime();
    }

    // Records with no deadline set yet sort to the end rather than to
    // 1970 (which `new Date(null)` would otherwise put them at).
    if (!left.deadline && !right.deadline) return 0;
    if (!left.deadline) return 1;
    if (!right.deadline) return -1;

    return new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
  });
}
