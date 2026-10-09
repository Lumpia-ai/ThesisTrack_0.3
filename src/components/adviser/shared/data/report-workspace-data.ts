import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import { getComputedGroupStatus, getGroupProjectTitle, isGroupCompleted } from '@/components/adviser/shared/config/dashboard-utils';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

// This used to be a hardcoded date, which silently broke every "last 30/90 days" and
// "current cycle" filter once real time moved past it — always use the real current date.
export function getReportReferenceDate() {
  return new Date().toISOString();
}

export type ReportDateRange = 'current-cycle' | 'last-30-days' | 'last-90-days' | 'academic-year';
export type ReportType = 'all' | 'evaluation' | 'progress' | 'completed-projects' | 'supervision';
export type ReportStatusFilter = 'all' | 'open' | 'attention' | 'completed';

export type ReportSummaryMetric = {
  id: string;
  label: string;
  value: string;
  helperText: string;
  icon: string;
  iconClassName: string;
};

export type EvaluationSummary = {
  averageScore: number;
  scoredGroups: number;
  passedGroups: number;
  withRevision: number;
  failedGroups: number;
  totalReviewedGroups: number;
};

export type ProgressIndicator = {
  id: string;
  label: string;
  count: number;
  percentage: number;
  barClassName: string;
};

export type ProgressSummary = {
  averageCompletion: number;
  onTrackGroups: number;
  atRiskGroups: number;
  delayedGroups: number;
  indicators: ProgressIndicator[];
};

export type CompletedProjectRecord = {
  id: string;
  groupId: string;
  projectTitle: string;
  finalScore: number | null;
  recommendation: string;
  completedAt: string;
};

export type SupervisionSummary = {
  totalGroupsHandled: number;
  upcomingDefenses: number;
  evaluationsThisWeek: number;
  supervisionLevel: 'Light' | 'Moderate' | 'High';
  helperText: string;
  badgeClassName: string;
};

export type AdviserReportsModule = {
  department: string;
  totalGroups: number;
  completedGroups: number;
  averageProgress: number;
  pendingEvaluations: number;
  summaryMetrics: ReportSummaryMetric[];
  evaluationSummary: EvaluationSummary;
  progressSummary: ProgressSummary;
  completedProjects: CompletedProjectRecord[];
  supervisionSummary: SupervisionSummary;
};

export const REPORT_DATE_RANGE_OPTIONS: Array<{ value: ReportDateRange; label: string }> = [
  { value: 'current-cycle', label: 'Current Cycle' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'last-90-days', label: 'Last 90 Days' },
  { value: 'academic-year', label: 'Academic Year' }
];

export const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: 'all', label: 'All Reports' },
  { value: 'evaluation', label: 'Evaluation Summary' },
  { value: 'progress', label: 'Progress Overview' },
  { value: 'completed-projects', label: 'Completed Projects' },
  { value: 'supervision', label: 'Supervision Summary' }
];

export const REPORT_STATUS_OPTIONS: Array<{ value: ReportStatusFilter; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open Records' },
  { value: 'attention', label: 'Needs Attention' },
  { value: 'completed', label: 'Completed' }
];

type ReportsFilterInput = {
  dateRange: ReportDateRange;
  status: ReportStatusFilter;
};

type AdviserGroup = AdviserDashboardData['groups'][number];
type PanelProject = AdviserDashboardData['panelProjects'][number];
type ProgressBucket = 'on-track' | 'at-risk' | 'delayed' | 'completed';

function startOfUtcDay(value: string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseDateValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}T/.test(value) ? value : `${value} UTC`;
  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateToUtcDay(value: string | null | undefined) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return null;
  }

  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function matchesDateRange(value: string | null | undefined, range: ReportDateRange, referenceDate = getReportReferenceDate()) {
  const reportDay = dateToUtcDay(value);
  if (reportDay === null) {
    return false;
  }

  const referenceDay = startOfUtcDay(referenceDate);

  if (range === 'current-cycle') {
    return reportDay >= Date.UTC(2026, 2, 1) && reportDay <= referenceDay;
  }

  if (range === 'last-30-days') {
    return reportDay >= referenceDay - 29 * DAY_IN_MS && reportDay <= referenceDay;
  }

  if (range === 'last-90-days') {
    return reportDay >= referenceDay - 89 * DAY_IN_MS && reportDay <= referenceDay;
  }

  return reportDay >= Date.UTC(2025, 5, 1) && reportDay <= referenceDay;
}

function getGroupReportDate(group: AdviserGroup) {
  return group.completedAt ?? group.updated_at;
}

function getProgressBucket(group: AdviserGroup): ProgressBucket {
  if (isGroupCompleted(group)) {
    return 'completed';
  }

  const computedStatus = getComputedGroupStatus(group);

  if (computedStatus === 'at-risk' || group.progress < 40) {
    return 'delayed';
  }

  if (computedStatus === 'needs-revision' || computedStatus === 'pending') {
    return 'at-risk';
  }

  return 'on-track';
}

function matchesGroupStatus(group: AdviserGroup, status: ReportStatusFilter) {
  if (status === 'all') {
    return true;
  }

  const progressBucket = getProgressBucket(group);

  if (status === 'open') {
    return progressBucket !== 'completed';
  }

  if (status === 'attention') {
    return progressBucket === 'at-risk' || progressBucket === 'delayed';
  }

  return progressBucket === 'completed';
}

function matchesEvaluationStatus(project: PanelProject, status: ReportStatusFilter) {
  if (status === 'all') {
    return true;
  }

  if (status === 'open') {
    return project.status !== 'completed';
  }

  if (status === 'attention') {
    return project.status === 'pending' || project.status === 'scheduled';
  }

  return project.status === 'completed';
}

function getPanelProjectReportDate(project: PanelProject) {
  return project.defenseDate || project.updated_at;
}

// Only a real, recorded finalScore counts — no more backfilling a fake number from a
// formula when a group hasn't actually been scored yet.
function getRealEvaluationScore(group: AdviserGroup): number | null {
  return typeof group.finalScore === 'number' ? group.finalScore : null;
}

function isEvaluationReadyGroup(group: AdviserGroup) {
  return isGroupCompleted(group) || typeof group.finalScore === 'number' || Boolean(group.finalDefenseResult);
}

function classifyEvaluationResult(group: AdviserGroup): 'passed' | 'revision' | 'failed' {
  if (group.finalDefenseResult === 'Passed' || isGroupCompleted(group)) {
    return 'passed';
  }

  if (group.finalDefenseResult === 'Failed') {
    return 'failed';
  }

  return 'revision';
}

function formatPercentValue(value: number) {
  return `${value}%`;
}

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
}

export function buildAdviserReportsModule(data: AdviserDashboardData, filters: ReportsFilterInput): AdviserReportsModule {
  // data.groups/panelProjects are already scoped to this adviser/panelist server-side —
  // filtering again by department === 'IT' here silently dropped every group and panel
  // project outside IT (Manufacturing Engineering Technology, Technology Communication
  // Management, Energy Systems, Naval Architecture) from the whole report.
  const adviserGroups = data.groups;
  const panelProjects = data.panelProjects;

  const filteredGroups = adviserGroups
    .filter((group) => matchesDateRange(getGroupReportDate(group), filters.dateRange))
    .filter((group) => matchesGroupStatus(group, filters.status));

  const filteredPanelProjects = panelProjects
    .filter((project) => matchesDateRange(getPanelProjectReportDate(project), filters.dateRange))
    .filter((project) => matchesEvaluationStatus(project, filters.status));

  const completedGroups = filteredGroups.filter((group) => isGroupCompleted(group));
  const averageProgress = filteredGroups.length
    ? Math.round(filteredGroups.reduce((sum, group) => sum + group.progress, 0) / filteredGroups.length)
    : 0;
  const pendingEvaluations = filteredPanelProjects.filter((project) => project.status !== 'completed').length;

  const evaluationGroups = filteredGroups.filter(isEvaluationReadyGroup);
  const scoredGroups = evaluationGroups.filter((group) => getRealEvaluationScore(group) !== null);
  const evaluationAverage = scoredGroups.length
    ? Math.round(scoredGroups.reduce((sum, group) => sum + (getRealEvaluationScore(group) as number), 0) / scoredGroups.length)
    : 0;

  const passedGroups = evaluationGroups.filter((group) => classifyEvaluationResult(group) === 'passed').length;
  const withRevision = evaluationGroups.filter((group) => classifyEvaluationResult(group) === 'revision').length;
  const failedGroups = evaluationGroups.filter((group) => classifyEvaluationResult(group) === 'failed').length;

  const progressBuckets = filteredGroups.map((group) => getProgressBucket(group));
  const onTrackGroups = progressBuckets.filter((bucket) => bucket === 'on-track').length;
  const atRiskGroups = progressBuckets.filter((bucket) => bucket === 'at-risk').length;
  const delayedGroups = progressBuckets.filter((bucket) => bucket === 'delayed').length;

  const completedProjects = completedGroups
    .sort((left, right) => {
      const leftTime = parseDateValue(left.completedAt)?.getTime() ?? 0;
      const rightTime = parseDateValue(right.completedAt)?.getTime() ?? 0;
      return rightTime - leftTime;
    })
    .map((group) => ({
      id: group.project_id,
      groupId: group.code,
      projectTitle: getGroupProjectTitle(group),
      finalScore: getRealEvaluationScore(group),
      recommendation: group.finalRecommendation ?? 'Completed and cleared for institutional archive.',
      completedAt: group.completedAt ?? group.updated_at
    }));

  const referenceDay = startOfUtcDay(getReportReferenceDate());
  const evaluationsThisWeek = filteredPanelProjects.filter((project) => {
    const defenseDay = dateToUtcDay(project.defenseDate);
    if (defenseDay === null) {
      return false;
    }

    return Math.abs(defenseDay - referenceDay) <= 6 * DAY_IN_MS;
  }).length;

  const attentionLoad = atRiskGroups + delayedGroups + pendingEvaluations;
  const supervisionLevel: SupervisionSummary['supervisionLevel'] =
    attentionLoad >= 4 || filteredGroups.length >= 5
      ? 'High'
      : attentionLoad >= 2 || filteredGroups.length >= 3
        ? 'Moderate'
        : 'Light';

  const supervisionMeta =
    supervisionLevel === 'High'
      ? {
          helperText: 'Multiple reviews, follow-ups, and defense checkpoints are competing for adviser time.',
          badgeClassName: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
        }
      : supervisionLevel === 'Moderate'
        ? {
            helperText: 'Current supervision load is steady, with manageable review and defense activity.',
            badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
          }
        : {
            helperText: 'The active queue is light enough for catch-up, consolidation, and archive work.',
            badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
          };

  return {
    department: 'All Departments',
    totalGroups: filteredGroups.length,
    completedGroups: completedGroups.length,
    averageProgress,
    pendingEvaluations,
    summaryMetrics: [
      {
        id: 'total-groups',
        label: 'Total Groups',
        value: String(filteredGroups.length),
        helperText: 'Groups currently included in the selected reporting scope.',
        icon: 'fa-users',
        iconClassName: 'bg-blue-50 text-blue-600'
      },
      {
        id: 'completed-projects',
        label: 'Completed Projects',
        value: String(completedGroups.length),
        helperText: 'Groups that already satisfy the same completion rule used in My Groups.',
        icon: 'fa-folder-open',
        iconClassName: 'bg-emerald-50 text-emerald-600'
      },
      {
        id: 'average-progress',
        label: 'Average Progress',
        value: formatPercentValue(averageProgress),
        helperText: 'Average completion across the selected adviser records.',
        icon: 'fa-chart-line',
        iconClassName: 'bg-sky-50 text-sky-600'
      },
      {
        id: 'pending-evaluations',
        label: 'Pending Evaluations',
        value: String(pendingEvaluations),
        helperText: 'Evaluation packets still waiting for adviser-side action or confirmation.',
        icon: 'fa-clipboard-check',
        iconClassName: 'bg-amber-50 text-amber-600'
      },
      {
        id: 'progress-reports-awaiting-feedback',
        label: 'Awaiting Feedback',
        value: String(data.progressReports.awaitingFeedback),
        helperText: `${data.progressReports.filedThisWeek} progress report${data.progressReports.filedThisWeek === 1 ? '' : 's'} filed by your groups this week.`,
        icon: 'fa-comment-medical',
        iconClassName: 'bg-violet-50 text-violet-600'
      }
    ],
    evaluationSummary: {
      averageScore: evaluationAverage,
      scoredGroups: scoredGroups.length,
      passedGroups,
      withRevision,
      failedGroups,
      totalReviewedGroups: evaluationGroups.length
    },
    progressSummary: {
      averageCompletion: averageProgress,
      onTrackGroups,
      atRiskGroups,
      delayedGroups,
      indicators: [
        {
          id: 'on-track',
          label: 'On Track Groups',
          count: onTrackGroups,
          percentage: filteredGroups.length ? Math.round((onTrackGroups / filteredGroups.length) * 100) : 0,
          barClassName: 'bg-emerald-500'
        },
        {
          id: 'at-risk',
          label: 'At Risk Groups',
          count: atRiskGroups,
          percentage: filteredGroups.length ? Math.round((atRiskGroups / filteredGroups.length) * 100) : 0,
          barClassName: 'bg-amber-500'
        },
        {
          id: 'delayed',
          label: 'Delayed Groups',
          count: delayedGroups,
          percentage: filteredGroups.length ? Math.round((delayedGroups / filteredGroups.length) * 100) : 0,
          barClassName: 'bg-rose-500'
        }
      ]
    },
    completedProjects,
    supervisionSummary: {
      totalGroupsHandled: filteredGroups.length,
      upcomingDefenses: filteredPanelProjects.filter((project) => project.status !== 'completed').length,
      evaluationsThisWeek,
      supervisionLevel,
      helperText: supervisionMeta.helperText,
      badgeClassName: supervisionMeta.badgeClassName
    }
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: Array<string | number>) {
  return values.map(csvCell).join(',');
}

export function buildReportsCsv(module: AdviserReportsModule) {
  const lines: string[] = [];

  lines.push('Summary Metrics');
  lines.push(csvRow(['Label', 'Value']));
  module.summaryMetrics.forEach((metric) => lines.push(csvRow([metric.label, metric.value])));
  lines.push('');

  lines.push('Evaluation Summary');
  lines.push(csvRow(['Average Score', 'Scored Groups', 'Total Reviewed', 'Passed', 'Revision', 'Failed']));
  lines.push(
    csvRow([
      module.evaluationSummary.scoredGroups ? module.evaluationSummary.averageScore : 'N/A',
      module.evaluationSummary.scoredGroups,
      module.evaluationSummary.totalReviewedGroups,
      module.evaluationSummary.passedGroups,
      module.evaluationSummary.withRevision,
      module.evaluationSummary.failedGroups
    ])
  );
  lines.push('');

  lines.push('Progress Summary');
  lines.push(csvRow(['Average Completion', 'On Track', 'At Risk', 'Delayed']));
  lines.push(
    csvRow([
      `${module.progressSummary.averageCompletion}%`,
      module.progressSummary.onTrackGroups,
      module.progressSummary.atRiskGroups,
      module.progressSummary.delayedGroups
    ])
  );
  lines.push('');

  lines.push('Completed Projects');
  lines.push(csvRow(['Group ID', 'Project Title', 'Final Score', 'Recommendation', 'Completed Date']));
  module.completedProjects.forEach((project) =>
    lines.push(
      csvRow([
        project.groupId,
        project.projectTitle,
        project.finalScore ?? 'Not yet scored',
        project.recommendation,
        formatReportDate(project.completedAt)
      ])
    )
  );
  lines.push('');

  lines.push('Supervision Summary');
  lines.push(csvRow(['Total Groups Handled', 'Upcoming Defenses', 'Evaluations This Week', 'Supervision Level']));
  lines.push(
    csvRow([
      module.supervisionSummary.totalGroupsHandled,
      module.supervisionSummary.upcomingDefenses,
      module.supervisionSummary.evaluationsThisWeek,
      module.supervisionSummary.supervisionLevel
    ])
  );

  return lines.join('\n');
}
