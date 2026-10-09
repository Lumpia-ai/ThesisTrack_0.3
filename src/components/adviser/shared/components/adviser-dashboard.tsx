'use client';

import { useRouter } from 'next/navigation';
import { memo, Suspense, use, useEffect, useMemo, useRef } from 'react';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import {
  ActivityChart,
  AgendaList,
  DashCard,
  DashHero,
  GroupProgressList,
  MilestoneCompletion,
  ProgressGauge,
  StatusBars,
  StatusDonut,
  SubmissionTypes,
  TurnaroundChart,
  type HeroStat
} from '@/components/adviser/shared/config/dashboard-sections';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';
import {
  buildAdviserScheduleList,
  buildGroupProgressRows,
  buildGroupStatusSlices,
  buildPanelQueueItems,
  buildPanelScheduleList,
  buildPanelStatusSlices,
  buildPendingReviewItems,
  buildSubmissionStatusSlices,
  getComputedGroupStatus,
  getProgressBand,
  isAwaitingAdviserReview,
  PROGRESS_BANDS,
  WORKSPACE_META
} from '@/components/adviser/shared/config/dashboard-utils';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardAnalytics, AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

/** How often the dashboard re-fetches its server data while the tab is visible. */
const LIVE_REFRESH_MS = 60_000;
/** Returning to the tab refreshes only if the data is at least this old. */
const MIN_REFRESH_GAP_MS = 30_000;

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** A count that is good at zero: success when clear, `alertColor` when anything is waiting. */
function countTone(count: number, alertColor: string) {
  return count > 0 ? alertColor : DASH_COLORS.good;
}

/** Re-runs the server component on an interval and when the tab becomes visible again (throttled). */
function useLiveRefresh() {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    lastRefresh.current = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefresh.current < MIN_REFRESH_GAP_MS) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(refresh, LIVE_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router]);
}

/** Skeleton rows shown while the analytics query streams in. */
function AnalyticsFallback() {
  return (
    <>
      {[0, 1].map((row) => (
        <div key={row} className="adviser-dash-row is-charts" aria-hidden="true">
          <div className="adviser-dash-card is-wide adviser-dash-skeleton" />
          <div className="adviser-dash-card adviser-dash-skeleton" />
        </div>
      ))}
    </>
  );
}

function AnalyticsRows({ analyticsPromise, basePath }: { analyticsPromise: Promise<AdviserDashboardAnalytics>; basePath: string }) {
  const analytics = use(analyticsPromise);

  return (
    <>
      <div className="adviser-dash-row is-charts">
        <DashCard title="Submission activity" meta="Last 8 weeks" linkHref={`${basePath}/submissions`} className="is-wide">
          <ActivityChart weeks={analytics.weeklyActivity} />
        </DashCard>
        <DashCard title="Review turnaround" meta="Last 90 days" linkHref={`${basePath}/submissions`}>
          <TurnaroundChart turnaround={analytics.turnaround} />
        </DashCard>
      </div>

      <div className="adviser-dash-row is-charts">
        <DashCard title="Project stage completion" meta="Checkpoints done, all groups" linkHref={`${basePath}/progress`} className="is-wide">
          <MilestoneCompletion milestones={analytics.milestoneCompletion} />
        </DashCard>
        <DashCard title="Submissions by type" linkHref={`${basePath}/submissions`}>
          <SubmissionTypes types={analytics.submissionTypes} />
        </DashCard>
      </div>
    </>
  );
}

const AdviserWorkspace = memo(function AdviserWorkspace({
  data,
  basePath,
  analyticsPromise
}: {
  data: AdviserDashboardData;
  basePath: string;
  analyticsPromise?: Promise<AdviserDashboardAnalytics>;
}) {
  const { groups, recentSubmissions, upcomingSchedule } = data;

  const summary = useMemo(() => {
    const awaiting = recentSubmissions.filter((item) => isAwaitingAdviserReview(item.status)).length;
    const flagged = groups
      .map(getComputedGroupStatus)
      .filter((status) => status === 'at-risk' || status === 'needs-revision' || status === 'pending').length;
    const average = groups.length ? Math.round(groups.reduce((total, group) => total + group.progress, 0) / groups.length) : 0;
    const bandCounts = PROGRESS_BANDS.map((band) => ({
      ...band,
      count: groups.filter((group) => getProgressBand(group.progress).key === band.key).length
    }));

    return { awaiting, flagged, average, bandCounts };
  }, [groups, recentSubmissions]);

  const heroStats: HeroStat[] = [
    { id: 'groups', icon: 'fa-users', label: 'Groups supervised', value: String(groups.length), href: `${basePath}/groups`, color: DASH_COLORS.series },
    { id: 'awaiting', icon: 'fa-inbox', label: 'Awaiting review', value: String(summary.awaiting), href: `${basePath}/submissions`, color: countTone(summary.awaiting, DASH_COLORS.warning) },
    { id: 'flagged', icon: 'fa-flag', label: 'Groups flagged', value: String(summary.flagged), href: `${basePath}/progress`, color: countTone(summary.flagged, DASH_COLORS.critical) },
    { id: 'upcoming', icon: 'fa-calendar-check', label: 'Upcoming sessions', value: String(upcomingSchedule.length), href: `${basePath}/schedule`, color: DASH_COLORS.series }
  ];

  const progressRows = useMemo(() => buildGroupProgressRows(groups), [groups]);
  const submissionSlices = useMemo(() => buildSubmissionStatusSlices(recentSubmissions), [recentSubmissions]);
  const groupSlices = useMemo(() => buildGroupStatusSlices(groups), [groups]);
  const agenda = useMemo(
    () => [
      { id: 'review', label: 'Awaiting review', icon: 'fa-file-lines', items: buildPendingReviewItems(recentSubmissions, groups, basePath) },
      { id: 'upcoming', label: 'Upcoming', icon: 'fa-calendar', items: buildAdviserScheduleList(upcomingSchedule, groups, basePath) }
    ],
    [recentSubmissions, groups, upcomingSchedule, basePath]
  );

  return (
    <>
      <DashHero stats={heroStats} />

      <div className="adviser-dash-row is-charts">
        <DashCard title="Average progress" linkHref={`${basePath}/progress`}>
          <ProgressGauge
            value={summary.average}
            color={groups.length ? getProgressBand(summary.average).color : DASH_COLORS.neutral}
            caption={`of ${plural(groups.length, 'group')}`}
            facts={summary.bandCounts.map((band) => ({ label: band.label, hint: band.hint, value: String(band.count), color: band.color }))}
          />
        </DashCard>
        <DashCard title="Submission status" meta={`Latest ${recentSubmissions.length}`} linkHref={`${basePath}/submissions`}>
          <StatusDonut slices={submissionSlices} totalLabel="files" emptyMessage="No submissions yet." />
        </DashCard>
        <DashCard title="Groups by status" linkHref={`${basePath}/groups`}>
          <StatusBars slices={groupSlices} />
        </DashCard>
      </div>

      {analyticsPromise ? (
        <Suspense fallback={<AnalyticsFallback />}>
          <AnalyticsRows analyticsPromise={analyticsPromise} basePath={basePath} />
        </Suspense>
      ) : null}

      <div className="adviser-dash-row">
        <DashCard title="Group progress" meta={plural(groups.length, 'group')} linkHref={`${basePath}/progress`} className="is-wide">
          <GroupProgressList rows={progressRows} />
        </DashCard>
        <DashCard title="Agenda">
          <AgendaList sections={agenda} emptyMessage="No reviews or sessions coming up." />
        </DashCard>
      </div>
    </>
  );
});

const PanelWorkspace = memo(function PanelWorkspace({ data, basePath }: { data: AdviserDashboardData; basePath: string }) {
  const { panelProjects } = data;

  const slices = useMemo(() => buildPanelStatusSlices(panelProjects), [panelProjects]);
  const sliceFor = (key: string) => slices.find((slice) => slice.key === key);
  const count = (key: string) => sliceFor(key)?.value ?? 0;
  const pending = count('pending');
  const completionRate = panelProjects.length ? Math.round((count('completed') / panelProjects.length) * 100) : 0;

  const heroStats: HeroStat[] = [
    { id: 'assigned', icon: 'fa-users-viewfinder', label: 'Panel assignments', value: String(panelProjects.length), href: `${basePath}/evaluation-queue`, color: DASH_COLORS.series },
    { id: 'pending', icon: 'fa-clipboard-check', label: 'Awaiting scoring', value: String(pending), href: `${basePath}/evaluation-queue`, color: countTone(pending, DASH_COLORS.warning) },
    { id: 'scheduled', icon: 'fa-calendar-days', label: 'Scheduled defenses', value: String(count('scheduled')), href: `${basePath}/defense-schedule`, color: DASH_COLORS.series },
    { id: 'completed', icon: 'fa-check-double', label: 'Completed reviews', value: String(count('completed')), href: `${basePath}/review-history`, color: DASH_COLORS.good }
  ];

  const agenda = useMemo(
    () => [
      { id: 'queue', label: 'Evaluation queue', icon: 'fa-clipboard-check', items: buildPanelQueueItems(panelProjects, basePath) },
      { id: 'upcoming', label: 'Upcoming defenses', icon: 'fa-calendar', items: buildPanelScheduleList(panelProjects, basePath) }
    ],
    [panelProjects, basePath]
  );

  return (
    <>
      <DashHero stats={heroStats} />

      <div className="adviser-dash-row is-charts">
        <DashCard title="Completion rate" linkHref={`${basePath}/review-history`}>
          <ProgressGauge
            value={completionRate}
            color={panelProjects.length ? getProgressBand(completionRate).color : DASH_COLORS.neutral}
            caption="scored"
            facts={['pending', 'scheduled', 'completed'].map((key) => ({
              label: sliceFor(key)?.label ?? key,
              value: String(count(key)),
              color: sliceFor(key)?.color ?? DASH_COLORS.neutral
            }))}
          />
        </DashCard>
        {/* The gauge facts already break down the assignments, so no separate status donut here. */}
        <DashCard title="Agenda" className="is-wide">
          <AgendaList sections={agenda} emptyMessage="No evaluations or defenses coming up." />
        </DashCard>
      </div>
    </>
  );
});

export const AdviserDashboard = memo(function AdviserDashboard({
  data,
  analytics
}: {
  data: AdviserDashboardData;
  /** Adviser mode only: streamed chart data (see getAdviserDashboardAnalytics). */
  analytics?: Promise<AdviserDashboardAnalytics>;
}) {
  const { workspaceMode, switchWorkspace, basePath } = useWorkspaceMode();
  const meta = WORKSPACE_META[workspaceMode];
  useLiveRefresh();

  return (
    <>
      <AdviserPageHeader
        title={meta.pageTitle}
        description={meta.pageCopy}
        actions={
          <AdviserShellActions
            basePath={basePath}
            fullName={data.profile.fullName}
            notificationCount={data.profile.notificationCount}
            workspaceMode={workspaceMode}
            onSwitchWorkspace={switchWorkspace}
          />
        }
      />

      <div className="adviser-dashboard-workspace adviser-dash">
        {workspaceMode === 'adviser' ? (
          <AdviserWorkspace data={data} basePath={basePath} analyticsPromise={analytics} />
        ) : (
          <PanelWorkspace data={data} basePath={basePath} />
        )}
      </div>
    </>
  );
});
