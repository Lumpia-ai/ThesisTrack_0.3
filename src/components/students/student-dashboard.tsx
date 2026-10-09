'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState, useEffect } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import {
  fetchAcademicActivities,
  formatIsoDateLabel,
  type ApiAcademicActivity
} from '@/components/students/student-academic-activity.shared';
import { getProjectFileCategoryLabel } from '@/components/students/student-project-files.shared';
import {
  PROJECT_STAGES,
  getAdviserClearedLabel,
  getDefenseEventLabel,
  getStageForCheckpointKey,
  resolveStageKey,
  type ProjectStageKey
} from '@/lib/stage-labels';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type ShellTone =
  | 'completed'
  | 'current'
  | 'pending'
  | 'needs-revision'
  | 'overdue'
  | 'archived'
  | 'transfer-ready';
type WorkflowStatus = 'completed' | 'current' | 'pending' | 'delayed';
type DashboardWorkflowStep = {
  id: string;
  key: string;
  title: string;
  summary: string;
  status: WorkflowStatus;
  dateLabel: string;
  route: string;
  actionLabel?: string;
};
type PriorityTask = {
  id: string;
  title: string;
  label: string;
  tone: BadgeTone;
  description: string;
  href: string;
  actionLabel: string;
  meta?: string;
  icon?: string;
};

type StudentNotification = StudentDashboardData['notifications'][number];

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function sortByDateDesc<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

function createExcerpt(value: string, maxLength = 150) {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  const firstSentence = normalized.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? normalized;

  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function getStatusTone(status: string): BadgeTone {
  // Raw Prisma enum values (e.g. "UNDER_REVIEW", "DEFENSE_SCHEDULED") use
  // underscores, but several match keywords below are space-separated
  // multi-word phrases ("under review", "in development") — without this,
  // those specific keywords never matched an underscored enum value.
  const normalized = status.toLowerCase().replace(/_/g, ' ');

  if (
    // 'defense scheduled' is treated as an approved-equivalent status
    // throughout the backend (repository eligibility, tech-transfer,
    // document-file access) — the project's title has already been approved,
    // a defense is just now on the calendar for it. Without this, the
    // dashboard's title card fell back to the "pending approval" locked
    // state for every DEFENSE_SCHEDULED project, even ones with a long-since
    // approved title.
    ['approved', 'completed', 'resolved', 'confirmed', 'ready', 'success', 'defense scheduled'].some(kw => normalized.includes(kw))
  ) {
    return 'success';
  }

  if (
    ['needs revision', 'revision', 'delayed', 'high priority', 'overdue', 'needs action', 're-defense', 're-defend', 'rejected', 'failed'].some(kw => normalized.includes(kw))
  ) {
    return 'danger';
  }

  if (
    ['current', 'ongoing', 'in development', 'under review', 'upcoming', 'pending endorsement'].some(kw => normalized.includes(kw))
  ) {
    return 'warning';
  }

  if (['pending', 'submitted', 'normal', 'event schedule', 'consultation'].includes(normalized)) {
    return 'neutral';
  }

  return 'info';
}

function getShellToneFromWorkflowStatus(status: WorkflowStatus): ShellTone {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'current':
      return 'current';
    case 'delayed':
      return 'overdue';
    case 'pending':
    default:
      return 'pending';
  }
}

function getAttentionShellTone({
  attentionCount,
  overdueCount,
  dueSoonCount,
  highPriorityNotificationCount,
  unreadFeedbackCount,
  revisionCount,
  redefenseCount
}: {
  attentionCount: number;
  overdueCount: number;
  dueSoonCount: number;
  highPriorityNotificationCount: number;
  unreadFeedbackCount: number;
  revisionCount: number;
  redefenseCount: number;
}): ShellTone {
  if (!attentionCount) {
    return 'completed';
  }

  if (overdueCount || highPriorityNotificationCount) {
    return 'overdue';
  }

  if (revisionCount || redefenseCount || unreadFeedbackCount) {
    return 'needs-revision';
  }

  if (dueSoonCount) {
    return 'pending';
  }

  return 'current';
}

function getShellToneUi(tone: ShellTone) {
  switch (tone) {
    case 'completed':
      return { tone: 'success' as const, panelClassName: 'is-success', icon: 'fa-circle-check' };
    case 'current':
      return { tone: 'info' as const, panelClassName: 'is-info', icon: 'fa-compass' };
    case 'pending':
      return { tone: 'warning' as const, panelClassName: 'is-warning', icon: 'fa-hourglass-half' };
    case 'needs-revision':
      return { tone: 'danger' as const, panelClassName: 'is-danger', icon: 'fa-pen-to-square' };
    case 'overdue':
      return { tone: 'danger' as const, panelClassName: 'is-danger', icon: 'fa-triangle-exclamation' };
    case 'transfer-ready':
      return { tone: 'success' as const, panelClassName: 'is-success', icon: 'fa-rocket' };
    case 'archived':
    default:
      return { tone: 'neutral' as const, panelClassName: 'is-neutral', icon: 'fa-box-archive' };
  }
}

function getWorkflowStatusConfig(status: WorkflowStatus) {
  if (status === 'completed') {
    return { label: 'Completed', tone: 'success' as const };
  }

  if (status === 'current') {
    return { label: 'Current', tone: 'warning' as const };
  }

  if (status === 'delayed') {
    return { label: 'Delayed', tone: 'danger' as const };
  }

  return { label: 'Pending', tone: 'neutral' as const };
}

const DEFENSE_APPLICATION_STAGES = [
  { key: 'concept-defense-application', label: 'Concept' },
  { key: 'proposal-defense-application', label: 'Proposal' },
  { key: 'final-defense-application', label: 'Final' }
] as const;

function getDefenseEvidenceStatusConfig(status: string, stageLabel: string) {
  const normalized = status.toUpperCase();

  if (normalized === 'APPROVED' || normalized === 'COMPLETED') {
    return { label: getAdviserClearedLabel({ stage: stageLabel }), tone: 'success' as const, hint: 'The adviser verified this evidence and forwarded your group to the Program Head for scheduling.' };
  }

  if (normalized === 'NEEDS_REVISION') {
    return { label: 'Revise', tone: 'danger' as const, hint: 'Upload a corrected copy of the signed form.' };
  }

  if (normalized === 'REJECTED') {
    return { label: 'Rejected', tone: 'danger' as const, hint: 'Check adviser remarks and re-submit.' };
  }

  if (normalized === 'SUBMITTED' || normalized === 'IN_REVIEW') {
    return { label: 'Pending Review', tone: 'warning' as const, hint: 'Waiting for the adviser to review your evidence.' };
  }

  return { label: 'Not Uploaded', tone: 'neutral' as const, hint: 'Upload a photo of the signed application form.' };
}

// A bare "Approved" never says WHAT was approved. Name the badge after the last
// gate the group cleared: an adviser clearance readies them for that stage's
// defense ("Ready for Concept Presentation"); a panel decision passes it.
const ADVISER_GATE_KEYS = new Set([
  'concept-adviser-approval',
  'concept-defense-application',
  'proposal-adviser-review',
  'proposal-defense-application',
  'development-adviser-monitoring',
  'final-defense-application',
  'completion-repository-submission',
  'completion-archive-confirmation'
]);
const PANEL_GATE_KEYS = new Set([
  'concept-panel-approval',
  'proposal-panel-evaluation',
  'proposal-final-approval',
  'mock-panel-comments',
  'mock-revisions-completed',
  'final-panel-approval',
  'final-revisions-submitted'
]);

function getDefenseName(stage: ProjectStageKey) {
  const entry = PROJECT_STAGES.find((item) => item.key === stage);
  return entry?.defenseLabel ?? entry?.label ?? 'Defense';
}

function getProjectStatusBadge(
  status: string,
  checkpoints: StudentDashboardData['milestoneCheckpoints'],
  currentStage: ProjectStageKey | null
): { label: string; tone: BadgeTone } {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral' };
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return { label: 'Under Adviser Review', tone: 'warning' };
    case 'NEEDS_REVISION':
      return { label: 'Needs Revision', tone: 'danger' };
    case 'DEFENSE_SCHEDULED':
      return {
        label: currentStage ? getDefenseEventLabel(getDefenseName(currentStage), 'scheduled') : 'Defense Scheduled',
        tone: 'warning'
      };
    case 'COMPLETED':
      return { label: 'Completed', tone: 'success' };
    case 'ARCHIVED':
      return { label: 'Archived', tone: 'neutral' };
  }

  const lastGate = [...checkpoints]
    .reverse()
    .find(
      (item) =>
        item.status.toUpperCase() === 'COMPLETED' && (ADVISER_GATE_KEYS.has(item.key) || PANEL_GATE_KEYS.has(item.key))
    );
  const gateStage = lastGate ? getStageForCheckpointKey(lastGate.key) : null;

  if (lastGate && gateStage && PANEL_GATE_KEYS.has(lastGate.key)) {
    return { label: getDefenseEventLabel(getDefenseName(gateStage), 'passed'), tone: 'success' };
  }

  // An approved project with no gate recorded yet means the adviser approved
  // the title, which readies the group for the Concept Presentation.
  return { label: getAdviserClearedLabel({ stage: gateStage ?? 'concept' }), tone: 'success' };
}

// Which stage a file belongs to, from its upload category. Generic categories
// (slides, supporting docs) fall back to the project's current stage.
function getStageForFileCategory(category: string, currentStage: ProjectStageKey | null): ProjectStageKey | null {
  const key = category.toLowerCase();

  if (key.startsWith('concept') || key.startsWith('title')) return 'concept';
  if (key.startsWith('proposal') || ['chapter-1', 'chapter-2', 'chapter-3'].includes(key)) return 'proposal';
  if (key === 'system-files') return 'development';
  if (key.startsWith('final') || ['chapter-4', 'chapter-5'].includes(key)) return 'final-defense';
  return currentStage;
}

function getFileReviewLabel(reviewStatus: string, category: string, currentStage: ProjectStageKey | null) {
  return reviewStatus === 'Approved'
    ? getAdviserClearedLabel({ stage: getStageForFileCategory(category, currentStage) })
    : reviewStatus;
}

function getToneVisual(tone: BadgeTone) {
  switch (tone) {
    case 'danger':
      return { bar: 'bg-red-500', iconBg: 'bg-red-50 text-red-600' };
    case 'warning':
      return { bar: 'bg-amber-500', iconBg: 'bg-amber-50 text-amber-600' };
    case 'success':
      return { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 text-emerald-600' };
    case 'info':
      return { bar: 'bg-blue-500', iconBg: 'bg-blue-50 text-blue-600' };
    default:
      return { bar: 'bg-slate-400', iconBg: 'bg-slate-100 text-slate-600' };
  }
}

function getFeedbackStatusConfig(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'resolved') {
    return { label: 'Resolved', tone: 'success' as const };
  }

  if (normalized === 'revised') {
    return { label: 'Updated', tone: 'warning' as const };
  }

  // Student-facing: the comment is still open for the group to act on.
  return { label: 'Open', tone: 'warning' as const };
}

function getNotificationRoute(item: StudentNotification) {
  if (item.route) {
    return {
      href: item.route,
      label: item.actionLabel ?? 'Open update'
    };
  }

  if (item.type === 'feedback') {
    return {
      href: '/students/faculty-feedback',
      label: 'Open feedback'
    };
  }

  if (item.type === 'deadline' || item.type === 'schedule') {
    return {
      href: '/students/schedule',
      label: 'Open schedule'
    };
  }

  if (item.type === 'approval') {
    return {
      href: '/students/project-files',
      label: 'Open files'
    };
  }

  return {
    href: '/students/project-overview',
    label: 'Open project'
  };
}

function buildFallbackWorkflow(
  milestones: StudentDashboardData['milestones']
): DashboardWorkflowStep[] {
  const steps = milestones.map((item, index) => {
    const normalizedStatus = item.status.toLowerCase();
    
    let uiStatus: WorkflowStatus = 'pending';
    if (normalizedStatus === 'completed' || normalizedStatus === 'approved') {
      uiStatus = 'completed';
    } else if (
      normalizedStatus === 'ongoing' ||
      normalizedStatus === 'in_progress' ||
      normalizedStatus === 'needs_revision' ||
      normalizedStatus === 'under_review' ||
      normalizedStatus === 'current'
    ) {
      uiStatus = 'current';
    } else if (normalizedStatus === 'delayed' || normalizedStatus === 'overdue') {
      uiStatus = 'delayed';
    }

    return {
      id: item.id,
      key: `phase-${index + 1}`,
      title: item.title,
      summary: item.summary,
      status: uiStatus,
      dateLabel: item.dateLabel,
      route: item.route,
      actionLabel: item.actionLabel
    };
  });

  // Ensure there is at least one "current" step if the workflow isn't fully completed
  const hasCurrentStep = steps.some(step => step.status === 'current' || step.status === 'delayed');
  if (!hasCurrentStep) {
    const firstPendingIndex = steps.findIndex(step => step.status === 'pending');
    if (firstPendingIndex !== -1) {
      steps[firstPendingIndex].status = 'current';
    }
  }

  return steps;
}

function Badge({
  label,
  tone,
  icon
}: {
  label: string;
  tone?: BadgeTone;
  icon?: string;
}) {
  return (
    <span className={`ui-badge ${tone ? `is-${tone}` : ''}`}>
      {icon ? <i className={`fas ${icon}`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function EmptyState({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <i className={`fas ${icon} text-sm`} aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <strong className="text-[13px] font-bold text-[var(--text)]">{title}</strong>
        <span className="text-[11px] leading-relaxed text-[var(--muted)]">{description}</span>
      </div>
    </div>
  );
}

const CARD_CLASS =
  'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]';

function CardHeader({
  kicker,
  title,
  href,
  linkLabel,
  trailing
}: {
  kicker: string;
  title: string;
  href?: string;
  linkLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-meta)]">{kicker}</span>
        <h3 className="text-lg font-bold text-[var(--text)]">{title}</h3>
      </div>
      {trailing}
      {href && linkLabel ? (
        <Link
          prefetch={false}
          href={href}
          className="shrink-0 text-sm font-semibold text-[#003A8F] transition-colors hover:text-blue-700"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function StudentDashboard({ data }: { data: StudentDashboardData }) {
  const realGroup = data.group.id
    ? {
        id: data.group.id,
        title: data.group.groupName,
        projectTitle: data.project.title,
        leader: data.group.leaderName,
        allowMemberSubmission: data.group.allowMemberSubmission ?? false
      }
    : null;

  const realNotifications = useMemo(
    () =>
      (data.notifications || []).map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        status: notification.read ? 'READ' : 'UNREAD',
        createdAt: notification.created_at
      })),
    [data.notifications]
  );

  const projectId = data.project.project_id || data.project.id;
  const [activities, setActivities] = useState<ApiAcademicActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!projectId) {
      setIsLoadingActivities(false);
      return;
    }

    setIsLoadingActivities(true);
    fetchAcademicActivities(projectId)
      .then((items) => {
        if (!cancelled) {
          setActivities(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivities([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingActivities(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const recentActivities = useMemo(
    () =>
      [...activities]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 3),
    [activities]
  );

  // Surfaces whichever defense-application stage is currently relevant — the
  // first one the group has actually touched, so a Concept-stage project
  // doesn't show a premature "Not Uploaded" badge for Proposal/Final.
  const defenseApplicationStatus = useMemo(() => {
    const checkpoints = data.milestoneCheckpoints || [];

    for (const stage of DEFENSE_APPLICATION_STAGES) {
      const checkpoint = checkpoints.find((item) => item.key === stage.key);

      if (checkpoint && checkpoint.status !== 'PENDING') {
        return { label: stage.label, status: checkpoint.status };
      }
    }

    const firstStageCheckpoint = checkpoints.find((item) =>
      DEFENSE_APPLICATION_STAGES.some((stage) => stage.key === item.key)
    );

    if (!firstStageCheckpoint) {
      return null;
    }

    const stage = DEFENSE_APPLICATION_STAGES.find((item) => item.key === firstStageCheckpoint.key);
    return stage ? { label: stage.label, status: firstStageCheckpoint.status } : null;
  }, [data.milestoneCheckpoints]);

  const workflow = useMemo<DashboardWorkflowStep[]>(
    () => (data.dashboard?.workflow?.length ? data.dashboard.workflow : buildFallbackWorkflow(data.milestones)),
    [data.dashboard?.workflow, data.milestones]
  );

  const snapshotAt = data.dashboard?.snapshotAt ?? data.project.updated_at ?? data.profile.updated_at;
  const snapshotTimestamp = useMemo(() => {
    const parsed = new Date(snapshotAt).getTime();
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [snapshotAt]);

  const sortedSchedules = useMemo(
    () =>
      [...data.schedules].sort(
        (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
      ),
    [data.schedules]
  );

  const upcomingSchedules = useMemo(
    () => sortedSchedules.filter((item) => new Date(item.startDate).getTime() >= snapshotTimestamp),
    [snapshotTimestamp, sortedSchedules]
  );

  const nextSchedule = upcomingSchedules[0] ?? null;
  const schedulePreview = upcomingSchedules.slice(0, 3);
  const recentUploads = useMemo(() => sortByDateDesc(data.documents).slice(0, 3), [data.documents]);
  const revisionFiles = useMemo(
    () => sortByDateDesc(data.documents.filter((item) => item.reviewStatus === 'Needs Revision' && !item.isSuperseded)).slice(0, 2),
    [data.documents]
  );
  const recentFeedback = useMemo(() => sortByDateDesc(data.feedback).slice(0, 2), [data.feedback]);
  const latestFeedback = recentFeedback[0] ?? null;
  const mergedNotifications = useMemo(() => {
    const combined: any[] = [];
    if (realNotifications.length > 0) {
      realNotifications.forEach(notif => {
        combined.push({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          priority: notif.type === 'warning' || notif.type === 'danger' ? 'high' : 'normal',
          read: notif.status === 'READ',
          dateLabel: new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          route: '/students/notifications',
          timestamp: new Date(notif.createdAt).getTime()
        } as any);
      });
    }
    return combined.sort((a, b) => {
      const timeA = a.timestamp || new Date(a.dateLabel + ' ' + new Date().getFullYear()).getTime();
      const timeB = b.timestamp || new Date(b.dateLabel + ' ' + new Date().getFullYear()).getTime();
      return timeB - timeA;
    });
  }, [realNotifications]);

  const approvedCount = data.documents.filter((item) => item.reviewStatus === 'Approved').length;
  const pendingCount = data.documents.filter((item) => item.reviewStatus === 'Pending Review').length;
  const revisionCount = data.documents.filter((item) => item.reviewStatus === 'Needs Revision' && !item.isSuperseded).length;
  const unreadFeedbackCount = data.feedback.filter((item) => item.unread).length;
  const highPriorityNotificationCount = mergedNotifications.filter(
    (item) => !item.read && item.priority === 'high'
  ).length;
  const overdueCount = sortedSchedules.filter((item) => {
    const scheduleTimestamp = new Date(item.startDate).getTime();
    return scheduleTimestamp < snapshotTimestamp && item.status.toLowerCase() !== 'completed';
  }).length;
  const dueSoonCount = upcomingSchedules.filter((item) => {
    const dayDifference = Math.ceil(
      (new Date(item.startDate).getTime() - snapshotTimestamp) / (1000 * 60 * 60 * 24)
    );

    return dayDifference <= 7;
  }).length;

  const currentWorkflowIndex = workflow.findIndex(
    (item) => item.status === 'current' || item.status === 'delayed'
  );
  const currentWorkflowStep =
    (currentWorkflowIndex >= 0 ? workflow[currentWorkflowIndex] : null) ??
    workflow.find((item) => item.status === 'pending') ??
    workflow[workflow.length - 1] ??
    null;
  const nextWorkflowStep =
    workflow.find(
      (item, index) =>
        index > Math.max(currentWorkflowIndex, -1) &&
        (item.status === 'pending' || item.status === 'delayed')
    ) ??
    workflow.find((item) => item.status === 'pending' || item.status === 'delayed') ??
    null;
  const completedWorkflowCount = workflow.filter((item) => item.status === 'completed').length;
  const delayedWorkflowCount = workflow.filter((item) => item.status === 'delayed').length;
  // A failed defense flags its milestone NEEDS_REVISION, but buildFallbackWorkflow
  // maps that to the plain 'current' workflow status (not 'delayed', which reads
  // as a missed deadline) — so this needs its own count to actually surface it.
  const redefenseCount = data.milestones.filter((m) => m.status === 'NEEDS_REVISION').length;
  const currentPhaseTitle = currentWorkflowStep?.title ?? data.project.currentMilestone;
  const currentPhaseSummary =
    currentWorkflowStep?.summary ??
    'Your project is active and ready for the next academic review step.';

  const projectStatusTone = getStatusTone(data.project.status);
  const stageSource = currentWorkflowStep?.title ?? data.project.currentMilestone ?? '';
  const currentStageKey =
    resolveStageKey(stageSource) ??
    PROJECT_STAGES.find((stage) => stageSource.toLowerCase().startsWith(stage.label.toLowerCase()))?.key ??
    null;
  const projectStatusBadge = getProjectStatusBadge(
    data.project.status,
    data.milestoneCheckpoints || [],
    currentStageKey
  );

  // Dynamic progress calculation using checkpoints for granular tracking, fallback to milestones
  const totalCheckpoints = data.milestoneCheckpoints?.length || 0;
  const completedCheckpoints = data.milestoneCheckpoints?.filter(cp => cp.status === 'COMPLETED').length || 0;
  
  const calculatedProgress = totalCheckpoints > 0 
    ? Math.round((completedCheckpoints / totalCheckpoints) * 100)
    : Math.round((completedWorkflowCount / Math.max(workflow.length, 1)) * 100);
    
  const displayProgress = data.project.progressPercentage || calculatedProgress;

  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(displayProgress);
    }, 300);
    return () => clearTimeout(timer);
  }, [displayProgress]);

  // The full schedule lives in the Upcoming Activity card; only surface the
  // next event as a priority task when it's actually close.
  const nextScheduleIsDueSoon = nextSchedule
    ? new Date(nextSchedule.startDate).getTime() - snapshotTimestamp <= 7 * 24 * 60 * 60 * 1000
    : false;

  const priorityTasks = useMemo<PriorityTask[]>(() => {
    const tasks: PriorityTask[] = [];

    const delayedStep = workflow.find((item) => item.status === 'delayed');
    if (delayedStep) {
      tasks.push({
        id: `delayed-${delayedStep.id}`,
        title: delayedStep.title,
        label: 'Overdue',
        tone: 'danger',
        description: 'This project stage is past its due date and has not been marked complete.',
        href: delayedStep.route,
        actionLabel: 'Open Project Stages',
        meta: delayedStep.dateLabel,
        icon: 'fa-triangle-exclamation'
      });
    }

    const redefenseMilestone = data.milestones.find((m) => m.status === 'NEEDS_REVISION');
    if (redefenseMilestone) {
      tasks.push({
        id: `redefense-${redefenseMilestone.id}`,
        title: redefenseMilestone.title,
        label: 'Redefense Required',
        tone: 'danger',
        description: "Your panel did not pass this defense — check the chair's decision and adviser feedback before your next attempt.",
        href: '/students/faculty-feedback',
        actionLabel: 'Review Feedback',
        meta: redefenseMilestone.dateLabel,
        icon: 'fa-rotate-left'
      });
    }

    if (revisionFiles[0]) {
      tasks.push({
        id: `revision-${revisionFiles[0].id}`,
        title: `Revise ${getProjectFileCategoryLabel(revisionFiles[0].category)}`,
        label: 'Needs Revision',
        tone: 'danger',
        description: 'A submitted file still needs updates before the next review cycle can move forward.',
        href: '/students/project-files',
        actionLabel: 'Open Project Files',
        meta: revisionFiles[0].uploadDateLabel,
        icon: 'fa-rotate-right'
      });
    }

    if (latestFeedback?.unread) {
      tasks.push({
        id: `feedback-${latestFeedback.id}`,
        title: latestFeedback.title,
        label: 'Adviser Feedback',
        tone: getFeedbackStatusConfig(latestFeedback.status).tone,
        description: `${latestFeedback.facultyName} added a note that should be acknowledged before the next checkpoint.`,
        href: '/students/faculty-feedback',
        actionLabel: 'Review Feedback',
        meta: latestFeedback.dateLabel,
        icon: 'fa-comments'
      });
    }

    if (nextSchedule && nextScheduleIsDueSoon) {
      tasks.push({
        id: `schedule-${nextSchedule.id}`,
        title: nextSchedule.title,
        label: nextSchedule.type,
        tone:
          nextSchedule.type.toLowerCase().includes('deadline') ||
          nextSchedule.type.toLowerCase().includes('defense')
            ? 'warning'
            : 'neutral',
        description: createExcerpt(
          `${nextSchedule.startDateLabel} | ${nextSchedule.time} | ${nextSchedule.location}`,
          88
        ),
        href: '/students/schedule',
        actionLabel: 'Open Schedule',
        meta: nextSchedule.startDateLabel,
        icon: 'fa-calendar-check'
      });
    }

    return tasks.slice(0, 3);
  }, [data.milestones, latestFeedback, nextSchedule, nextScheduleIsDueSoon, revisionFiles, workflow]);

  const attentionCount =
    revisionCount + highPriorityNotificationCount + dueSoonCount + overdueCount + unreadFeedbackCount + delayedWorkflowCount + redefenseCount;
  const currentPhaseTone = getShellToneFromWorkflowStatus(currentWorkflowStep?.status ?? 'current');
  const attentionTone = getAttentionShellTone({
    attentionCount,
    overdueCount,
    dueSoonCount,
    highPriorityNotificationCount,
    unreadFeedbackCount,
    revisionCount,
    redefenseCount
  });
  // The badge sits next to the task list, so it counts the tasks actually
  // shown — otherwise it could read "2 items need attention" beside
  // "You're all caught up".
  const attentionLabel = priorityTasks.length
    ? `${priorityTasks.length} item${priorityTasks.length === 1 ? '' : 's'} need attention`
    : 'On track';
  const currentPhaseToneUi = getShellToneUi(currentPhaseTone);
  const attentionToneUi = getShellToneUi(priorityTasks.length ? attentionTone : 'completed');

  // "Not assigned" reads poorly as a "current focus" — swap in an actionable
  // message once there's genuinely no workflow step yet, instead of echoing
  // whatever placeholder the raw project record happens to hold.
  const hasAssignedFocus = Boolean(currentWorkflowStep) || Boolean(
    data.project.currentMilestone &&
      !['not assigned', 'n/a', ''].includes(data.project.currentMilestone.trim().toLowerCase())
  );
  const focusTitle = hasAssignedFocus ? currentPhaseTitle : 'Project stages not set up yet';
  const focusSummary = hasAssignedFocus
    ? currentPhaseSummary
    : "Your adviser hasn't initialized your project workflow yet. Check the Project Stages page for updates.";
  const focusRoute = currentWorkflowStep?.route ?? '/students/milestones';
  const focusActionLabel = hasAssignedFocus
    ? (currentWorkflowStep?.actionLabel ?? 'Continue Phase')
    : 'View Project Stages';

  const progressRingColors = (() => {
    switch (currentPhaseToneUi.tone) {
      case 'success':
        return { from: '#34D399', to: '#047857', glow: 'bg-emerald-500/10' };
      case 'danger':
        return { from: '#F87171', to: '#B91C1C', glow: 'bg-red-500/10' };
      case 'warning':
        return { from: '#FBBF24', to: '#B45309', glow: 'bg-amber-500/10' };
      default:
        return { from: '#60A5FA', to: '#003A8F', glow: 'bg-blue-500/10' };
    }
  })();
  const isTitlePending =
    projectStatusTone !== 'success' ||
    Boolean(
      realGroup &&
        ['Pending Student Submission', 'Awaiting Adviser Approval', 'Pending Concept Presentation'].includes(realGroup.title)
    );
  const titlePendingLabel =
    realGroup?.title === 'Pending Student Submission'
      ? 'Awaiting Title Submission'
      : realGroup?.title === 'Pending Concept Presentation'
        ? 'Pending Concept Presentation'
        : 'Awaiting Adviser Approval';
  const repositoryNote =
    data.project.technologyTransferStatus ?? data.technologyTransfer.transferabilityStatus ?? null;
  const documentCount = data.documents.length;

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Student Dashboard</span>
              </span>
            </div>
            <h1>Student Dashboard</h1>
          </div>
        </div>
      </header>

      <div className="page-body student-dashboard-page">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Project hero: identity + the one thing to do next */}
          <article className={`${CARD_CLASS} flex flex-col gap-5 lg:col-span-2`}>
            <div className="flex min-h-7 flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-meta)]">Project Workspace</span>
              <Badge label={projectStatusBadge.label} tone={projectStatusBadge.tone} />
            </div>

            {isTitlePending ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[var(--text)]">
                    <i className="fas fa-lock text-[var(--text-meta)]" aria-hidden="true" />
                    Project title pending approval
                  </h2>
                  <Badge label={titlePendingLabel} tone="warning" icon="fa-clock" />
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                  Your project title will appear here once the concept proposal has been submitted and approved by your adviser and panel.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                  {realGroup ? realGroup.projectTitle || realGroup.title : data.project.title}
                </h2>
                {data.project.description ? (
                  <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)] line-clamp-2">{data.project.description}</p>
                ) : null}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
              {[
                { icon: 'fa-hashtag', label: 'Project code', value: data.project.projectCode },
                { icon: 'fa-user-tie', label: 'Adviser', value: data.project.adviser },
                {
                  icon: 'fa-users',
                  label: 'Group',
                  value: data.group.groupCode !== 'N/A' ? data.group.groupCode : data.group.groupName
                },
                { icon: 'fa-box-archive', label: 'Repository', value: data.project.repositoryStatus, note: repositoryNote }
              ].map((item) => (
                <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)]">
                    <i className={`fas ${item.icon}`} aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="truncate font-semibold text-[var(--text)]" title={item.note ?? item.value}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 sm:flex-row sm:items-center">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getToneVisual(currentPhaseToneUi.tone).iconBg}`}>
                <i className={`fas ${currentPhaseToneUi.icon}`} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-grow flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--primary)]">Current focus</span>
                <strong className="text-[15px] font-bold leading-tight text-[var(--text)]">{focusTitle}</strong>
                <span className="text-[12px] leading-relaxed text-[var(--muted)] line-clamp-2">{focusSummary}</span>
              </div>
              <Link
                prefetch={false}
                href={focusRoute}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#003A8F] px-4 py-2.5 text-[12px] font-bold text-white shadow-md shadow-blue-900/20 transition-colors hover:bg-[#002c6b]"
              >
                {focusActionLabel}
                <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
              </Link>
            </div>
          </article>
          {/* Progress: the single place overall completion is shown */}
          <article className={`${CARD_CLASS} flex flex-col`}>
               <h3 className="flex min-h-7 items-center text-[11px] font-bold uppercase tracking-widest text-[var(--text-meta)]">Overall Progress</h3>

               <div className="flex flex-grow items-center justify-center py-2">
                 <div className="relative flex h-40 w-40 items-center justify-center">
                   <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                     <defs>
                       <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                         <stop offset="0%" stopColor={progressRingColors.from} />
                         <stop offset="100%" stopColor={progressRingColors.to} />
                       </linearGradient>
                     </defs>
                     {/* Track */}
                     <path
                       className="text-[var(--border)]"
                       d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth="1.5"
                     />
                     {/* Progress — only rendered once there's something to show; a
                         zero-length dash with a round linecap otherwise paints a
                         stray dot at the arc's start point. */}
                     {animatedProgress > 0 ? (
                       <path
                         className="transition-all duration-1000 ease-out"
                         strokeDasharray={`${animatedProgress}, 100`}
                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                         fill="none"
                         stroke="url(#progressGradient)"
                         strokeWidth="3"
                         strokeLinecap="round"
                       />
                     ) : null}
                   </svg>
                   <div className="absolute flex flex-col items-center justify-center">
                     <span className="text-4xl font-black tracking-tighter text-[var(--text)]">{animatedProgress}%</span>
                     <span className="mt-1 text-[10px] font-bold text-[var(--muted)]">
                       {totalCheckpoints > 0
                         ? `${completedCheckpoints} of ${totalCheckpoints} checkpoints`
                         : `${completedWorkflowCount} of ${workflow.length} stages`}
                     </span>
                   </div>
                 </div>
               </div>

               <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                 <div className="flex min-w-0 flex-col">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)]">Up next</span>
                   <strong className="truncate text-[13px] font-bold text-[var(--text)]">
                     {nextWorkflowStep?.title ?? 'Final review preparation'}
                   </strong>
                 </div>
                 <span className="shrink-0 text-[11px] font-semibold text-[var(--muted)]">
                   {nextWorkflowStep?.dateLabel ?? 'Not scheduled'}
                 </span>
               </div>
          </article>
        </section>

        <section className={CARD_CLASS}>
          <CardHeader
            kicker="Priority Actions"
            title="What needs your attention"
            trailing={<Badge label={attentionLabel} tone={attentionToneUi.tone} icon={attentionToneUi.icon} />}
          />

          {priorityTasks.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {priorityTasks.map((task) => {
                const visual = getToneVisual(task.tone);

                return (
                  <Link
                    prefetch={false}
                    key={task.id}
                    href={task.href}
                    className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 pl-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className={`absolute top-0 left-0 h-full w-1 ${visual.bar}`} aria-hidden="true" />
                    <div className="flex items-center justify-between gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${visual.iconBg}`}>
                        <i className={`fas ${task.icon || 'fa-circle-exclamation'} text-xs`} aria-hidden="true" />
                      </span>
                      <Badge label={task.label} tone={task.tone} />
                    </div>
                    <strong className="text-sm font-bold text-[var(--text)] leading-tight line-clamp-1">{task.title}</strong>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed line-clamp-2">{task.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      {task.meta ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-meta)]">{task.meta}</span>
                      ) : <span />}
                      <span className="text-[11px] font-bold text-[#003A8F] group-hover:text-blue-700 transition-colors flex items-center gap-1">
                        {task.actionLabel} <i className="fas fa-arrow-right text-[9px]" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <i className="fas fa-champagne-glasses text-sm" aria-hidden="true" />
              </span>
              <div className="flex flex-col">
                <strong className="text-[13px] font-bold text-[var(--text)]">You&apos;re all caught up</strong>
                <span className="text-[11px] text-[var(--muted)]">No pending revisions, unread feedback, or upcoming deadlines need action right now.</span>
              </div>
            </div>
          )}
        </section>

        {/* Row 1: where the project is — stages, files, team. Cards stretch to equal height. */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className={`${CARD_CLASS} flex flex-col`}>
            <CardHeader
              kicker="Project Stages"
              title={`${completedWorkflowCount} of ${workflow.length} stages done`}
              href="/students/milestones"
              linkLabel="Open stages"
            />
            {workflow.length > 0 ? (
              <ol className="flex flex-col">
                {workflow.map((item, index) => {
                  const workflowStatus = getWorkflowStatusConfig(item.status);
                  const isCurrent = item.status === 'current' || item.status === 'delayed';
                  const isDone = item.status === 'completed';
                  const hasDate = item.dateLabel && !['no date', 'n/a', 'tbd', ''].includes(item.dateLabel.trim().toLowerCase());

                  return (
                    <li key={item.id} className="relative flex gap-3 pb-3 last:pb-0">
                      {index < workflow.length - 1 ? (
                        <span
                          className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${isDone ? 'bg-emerald-300' : 'bg-[var(--border)]'}`}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                              ? item.status === 'delayed'
                                ? 'bg-red-500 text-white'
                                : 'bg-[#003A8F] text-white'
                              : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
                        }`}
                      >
                        {isDone ? <i className="fas fa-check text-[10px]" aria-hidden="true" /> : index + 1}
                      </span>
                      <div
                        className={`flex min-w-0 flex-grow flex-col rounded-lg ${
                          isCurrent ? 'border border-blue-100 bg-blue-50/50 px-3 py-2' : 'pt-1'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className={`text-[13px] leading-tight ${isDone || isCurrent ? 'font-bold text-[var(--text)]' : 'font-semibold text-[var(--muted)]'}`}>
                            {item.title}
                          </strong>
                          {isCurrent || item.status === 'delayed' ? (
                            <Badge label={workflowStatus.label} tone={workflowStatus.tone} />
                          ) : hasDate ? (
                            <small className="shrink-0 text-[10px] font-semibold text-[var(--text-meta)]">{item.dateLabel}</small>
                          ) : null}
                        </div>
                        {isCurrent ? (
                          <span className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">
                            {item.summary}
                            {hasDate ? <span className="font-semibold"> · Due {item.dateLabel}</span> : null}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                title="No project stages assigned"
                description="Your adviser hasn't initialized your project workflow yet."
                icon="fa-route"
              />
            )}
          </article>

          <article className={`${CARD_CLASS} flex flex-col`}>
            <CardHeader
              kicker="Document Submissions"
              title={`${documentCount} file${documentCount === 1 ? '' : 's'} submitted`}
              href="/students/project-files"
              linkLabel="Open files"
            />

            {documentCount ? (
              <>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Cleared', value: approvedCount, className: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                    { label: 'Pending', value: pendingCount, className: 'text-amber-700 bg-amber-50 border-amber-100' },
                    { label: 'Revise', value: revisionCount, className: 'text-red-700 bg-red-50 border-red-100' }
                  ].map((stat) => (
                    <div key={stat.label} className={`flex flex-col items-center rounded-xl border py-2 ${stat.className}`}>
                      <strong className="text-lg font-black leading-none">{stat.value}</strong>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                    </div>
                  ))}
                </div>

                <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)]">Latest uploads</span>
                <ul className="flex flex-col divide-y divide-[var(--border)]">
                  {recentUploads.map((item) => {
                    const tone = getStatusTone(item.reviewStatus);
                    const toneText =
                      tone === 'success' ? 'text-emerald-700' : tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-700' : 'text-[var(--muted)]';

                    return (
                      <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <i className="fas fa-file-lines text-sm" aria-hidden="true" />
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <strong className="truncate text-[12px] font-bold leading-tight text-[var(--text)]" title={item.fileName}>
                            {item.fileName}
                          </strong>
                          <span className="truncate text-[11px] text-[var(--muted)]">
                            {getProjectFileCategoryLabel(item.category)}
                            {' · '}
                            <span className={`font-semibold ${toneText}`}>
                              {getFileReviewLabel(item.reviewStatus, item.category, currentStageKey)}
                            </span>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyState
                title="No files yet"
                description="Upload your concept paper or manuscript from Submit Docs."
                icon="fa-file-arrow-up"
              />
            )}

            <div className="flex-grow" />
            <Link
              prefetch={false}
              href="/students/submit"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 py-2.5 text-[12px] font-bold text-[#003A8F] transition-colors hover:bg-blue-50"
            >
              <i className="fas fa-cloud-arrow-up" aria-hidden="true" />
              Submit a document
            </Link>
          </article>

          <article className={`${CARD_CLASS} flex flex-col`}>
            <CardHeader
              kicker="Project Team"
              title={data.group.groupName}
              href="/students/profile"
              linkLabel="Profile"
            />
            <ul className="flex flex-col gap-2">
              {data.group.members.map((member) => (
                <li
                  key={member.id}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                    member.isCurrent ? 'border-blue-200/60 bg-blue-50/30' : 'border-[var(--border)] bg-[var(--surface-alt)]'
                  }`}
                >
                  <span
                    className={`student-member-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold uppercase ${
                      member.isCurrent
                        ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-[var(--text)]'
                    }`}
                  >
                    {member.profileImage ? (
                      <img src={member.profileImage} alt={member.fullName} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(member.fullName)
                    )}
                  </span>
                  <div className="flex min-w-0 flex-grow flex-col">
                    <strong className="truncate text-[13px] font-bold leading-tight text-[var(--text)]">
                      {member.fullName}
                      {member.isCurrent ? <span className="ml-1.5 text-[11px] font-semibold text-[var(--muted)]">(You)</span> : null}
                    </strong>
                    <small className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{member.studentId}</small>
                  </div>
                  {member.isLeader ? <Badge label="Leader" tone="warning" icon="fa-crown" /> : null}
                </li>
              ))}
            </ul>

            <div className="flex-grow" />
            <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-[var(--border)] pt-4">
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <dt className="flex items-center gap-2 font-semibold text-[var(--muted)]">
                  <i className="fas fa-user-tie w-4 text-center text-[var(--text-meta)]" aria-hidden="true" />
                  Adviser
                </dt>
                <dd className="truncate font-bold text-[var(--text)]">{data.project.adviser}</dd>
              </div>
            </dl>
          </article>
        </section>

        {/* Row 2: what's happening — schedule, feedback, defense evidence & activities. */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className={`${CARD_CLASS} flex flex-col`}>
            <CardHeader kicker="Upcoming Activity" title="Next events" href="/students/schedule" linkLabel="Open schedule" />
            {schedulePreview.length ? (
              <ul className="flex flex-col gap-2">
                {schedulePreview.map((item) => {
                  const start = new Date(item.startDate);
                  const isValid = Number.isFinite(start.getTime());

                  return (
                    <li key={item.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-3">
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--surface)] text-[#003A8F] shadow-sm">
                        <span className="text-[9px] font-bold uppercase leading-none">
                          {isValid ? start.toLocaleDateString('en-US', { month: 'short' }) : '—'}
                        </span>
                        <span className="text-base font-black leading-tight">{isValid ? start.getDate() : ''}</span>
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <strong className="truncate text-[13px] font-bold leading-tight text-[var(--text)]">{item.title}</strong>
                        <span className="truncate text-[11px] text-[var(--muted)]">
                          {item.type} · {item.time}
                        </span>
                        <span className="truncate text-[11px] text-[var(--muted)]">
                          <i className="fas fa-location-dot mr-1 text-[var(--text-meta)]" aria-hidden="true" />
                          {item.location}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="No upcoming activity"
                description="Consultations, defenses, and academic events appear here once confirmed."
                icon="fa-calendar-check"
              />
            )}
          </article>

          <article className={`${CARD_CLASS} flex flex-col`}>
            <CardHeader
              kicker="Faculty Feedback"
              title={unreadFeedbackCount ? `${unreadFeedbackCount} unread comment${unreadFeedbackCount === 1 ? '' : 's'}` : 'Recent comments'}
              href="/students/faculty-feedback"
              linkLabel="Open feedback"
            />
            {recentFeedback.length ? (
              <ul className="flex flex-col gap-2">
                {recentFeedback.map((item) => {
                  const statusConfig = getFeedbackStatusConfig(item.status);

                  return (
                    <li key={item.id}>
                      <Link
                        prefetch={false}
                        href="/students/faculty-feedback"
                        className={`flex flex-col gap-1.5 rounded-xl border p-3 transition-colors hover:border-blue-200 ${
                          item.unread ? 'border-blue-100 bg-blue-50/40' : 'border-[var(--border)] bg-[var(--surface-alt)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <strong className="line-clamp-1 text-[13px] font-bold leading-tight text-[var(--text)]">
                            {item.unread ? <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-600 align-middle" aria-label="Unread" /> : null}
                            {item.title}
                          </strong>
                          <Badge label={statusConfig.label} tone={statusConfig.tone} />
                        </div>
                        <span className="text-[11px] text-[var(--muted)]">
                          {item.facultyName} · {item.mode} · {item.dateLabel}
                        </span>
                        <p className="line-clamp-2 border-l-2 border-[var(--border)] pl-2 text-[12px] italic leading-relaxed text-[var(--text)]">
                          {createExcerpt(item.content, 156)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="No feedback yet"
                description="Adviser and panel comments appear here after each review."
                icon="fa-comments"
              />
            )}
          </article>

          <article className={`${CARD_CLASS} flex flex-col`}>
            <CardHeader
              kicker="Defense & Activities"
              title="Evidence log"
              href="/students/compliance"
              linkLabel="Compliance"
            />

            {defenseApplicationStatus ? (() => {
              const statusConfig = getDefenseEvidenceStatusConfig(defenseApplicationStatus.status, defenseApplicationStatus.label);
              const toneClass =
                statusConfig.tone === 'success'
                  ? 'border-emerald-100 bg-emerald-50/60'
                  : statusConfig.tone === 'danger'
                    ? 'border-red-100 bg-red-50/60'
                    : statusConfig.tone === 'warning'
                      ? 'border-amber-100 bg-amber-50/60'
                      : 'border-[var(--border)] bg-[var(--surface-alt)]';

              return (
                <div className={`mb-4 flex items-start gap-3 rounded-xl border p-3 ${toneClass}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-blue-600 shadow-sm">
                    <i className="fas fa-file-signature text-sm" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <strong className="text-[12px] font-bold leading-tight text-[var(--text)]">
                      {defenseApplicationStatus.label} Defense Application
                    </strong>
                    <span className="text-[11px] font-bold text-[var(--text)]">{statusConfig.label}</span>
                    <span className="text-[11px] leading-snug text-[var(--muted)]">{statusConfig.hint}</span>
                  </div>
                </div>
              );
            })() : null}

            <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)]">Academic activities</span>
            {isLoadingActivities ? (
              <div className="py-3 text-[11px] font-semibold text-[var(--muted)]">Loading activity log...</div>
            ) : recentActivities.length ? (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <i className={`fas ${activity.markAsAchievement ? 'fa-award' : 'fa-diagram-project'} text-sm`} aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 flex-grow flex-col">
                      <strong className="truncate text-[12px] font-bold leading-tight text-[var(--text)]">{activity.eventName}</strong>
                      <small className="text-[11px] text-[var(--muted)]">
                        {activity.activityType} · {formatIsoDateLabel(activity.eventDate || activity.createdAt)}
                      </small>
                    </div>
                    {activity.markAsAchievement ? <Badge label="Achievement" tone="warning" icon="fa-award" /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No activities logged"
                description="Log awards, presentations, and other academic activities."
                icon="fa-award"
              />
            )}

            <div className="flex-grow" />
            <Link
              prefetch={false}
              href="/students/project-overview"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 py-2.5 text-[12px] font-bold text-[#003A8F] transition-colors hover:bg-blue-50"
            >
              <i className="fas fa-plus" aria-hidden="true" />
              Log an activity
            </Link>
          </article>
        </section>
      </div>
    </>
  );
}
