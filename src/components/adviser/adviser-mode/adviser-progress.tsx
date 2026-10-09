'use client';

import { useCallback, useMemo, useState } from 'react';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import {
  MilestonePipeline,
  ProgressDetailDrawer,
  ProgressGroupList,
  ProgressReportsSummary,
  ProgressToolbar
} from '@/components/adviser/adviser-mode/data/progress-workspace-sections';
import {
  IT_PROGRESS_MILESTONES,
  PROGRESS_SORT_OPTIONS,
  sortProgressRecords,
  type ProgressMilestone,
  type ProgressSortOption,
  type ProgressStatus,
  type AdviserActionStatus,
  type AdviserProgressRecord
} from '@/components/adviser/adviser-mode/data/progress-workspace-data';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export function AdviserProgress({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, basePath } = useWorkspaceMode();
  const [statusFilter, setStatusFilter] = useState<ProgressStatus | 'all'>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<ProgressMilestone | 'all'>('all');
  const [searchValue, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState<ProgressSortOption>('nearest-deadline');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeDetails = useCallback(() => setSelectedId(null), []);

  const progressRecords = useMemo<AdviserProgressRecord[]>(() => {
    return data.groups.map((g) => {
      let mappedStatus: ProgressStatus = 'on-track';
      if (g.statusClass === 'status-warning' || g.statusLabel.toLowerCase().includes('risk')) mappedStatus = 'at-risk';
      else if (g.statusClass === 'status-revise' || g.statusLabel.toLowerCase().includes('delay')) mappedStatus = 'delayed';
      else if (g.statusClass === 'status-approved' || g.progress === 100) mappedStatus = 'completed';

      let mappedMilestone: ProgressMilestone = 'Proposal';
      const validMilestones = [...IT_PROGRESS_MILESTONES] as string[];
      if (validMilestones.includes(g.currentMilestone)) {
        mappedMilestone = g.currentMilestone as ProgressMilestone;
      } else if (g.progress > 80) {
        mappedMilestone = 'Final Defense';
      } else if (g.progress > 40) {
        mappedMilestone = 'Development';
      }

      let action: AdviserActionStatus = 'Waiting for submission';
      if (mappedStatus === 'at-risk' || mappedStatus === 'delayed') action = 'Needs review';
      else if (mappedStatus === 'completed') action = 'Ready for defense';

      return {
        id: g.id,
        projectId: g.project_id || null,
        groupId: g.code as `IT-2024-${string}`,
        projectTitle: g.projectTitle || g.title,
        department: g.department || g.dept || 'IT',
        progress: g.progress || 0,
        currentMilestone: mappedMilestone,
        status: mappedStatus,
        deadline: g.nextMilestoneDueAt,
        lastUpdate: g.updated_at || new Date().toISOString(),
        adviserAction: action,
        checkpointSummary: g.progressDetail ?? null,
        stageTitle: g.progressStage ?? null
      };
    });
  }, [data.groups]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    const filtered = progressRecords.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesMilestone = milestoneFilter === 'all' || record.currentMilestone === milestoneFilter;
      const matchesSearch =
        !normalizedSearch ||
        [record.groupId, record.projectTitle, record.currentMilestone].join(' ').toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesMilestone && matchesSearch;
    });

    return sortProgressRecords(filtered, sortBy);
  }, [milestoneFilter, progressRecords, searchValue, sortBy, statusFilter]);

  const averageProgress = useMemo(
    () => Math.round(progressRecords.reduce((total, record) => total + record.progress, 0) / Math.max(1, progressRecords.length)),
    [progressRecords]
  );
  const selectedRecord = useMemo(() => progressRecords.find((record) => record.id === selectedId) ?? null, [progressRecords, selectedId]);

  const countOf = (status: ProgressStatus) => progressRecords.filter((record) => record.status === status).length;
  const statusOptions: Array<{ value: ProgressStatus | 'all'; label: string; count: number }> = [
    { value: 'all', label: 'All', count: progressRecords.length },
    { value: 'on-track', label: 'On track', count: countOf('on-track') },
    { value: 'at-risk', label: 'At risk', count: countOf('at-risk') },
    { value: 'delayed', label: 'Delayed', count: countOf('delayed') }
  ];

  const hasFilters = statusFilter !== 'all' || milestoneFilter !== 'all' || searchValue.trim() !== '' || sortBy !== 'nearest-deadline';
  const clearFilters = () => {
    setStatusFilter('all');
    setMilestoneFilter('all');
    setSearchValue('');
    setSortBy('nearest-deadline');
  };

  return (
    <>
      <AdviserPageHeader
        title="Progress"
        description="Monitor project stage completion, detect delays, and track the performance of your assigned groups."
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

      <div className="adviser-dash adviser-progress-page">
        <div className="adviser-progress-top">
          <MilestonePipeline
            records={progressRecords}
            averageProgress={averageProgress}
            activeMilestone={milestoneFilter}
            onSelect={setMilestoneFilter}
          />
          <ProgressReportsSummary
            filedThisWeek={data.progressReports.filedThisWeek}
            awaitingFeedback={data.progressReports.awaitingFeedback}
            totalFiled={data.progressReports.totalFiled}
          />
        </div>

        <section className="adviser-dash-card adviser-groups-panel" aria-label="Group progress">
          <ProgressToolbar
            statusFilter={statusFilter}
            statusOptions={statusOptions}
            onStatusChange={setStatusFilter}
            searchValue={searchValue}
            sortBy={sortBy}
            sortOptions={PROGRESS_SORT_OPTIONS}
            resultCount={filteredRecords.length}
            totalCount={progressRecords.length}
            hasFilters={hasFilters}
            onSearchChange={setSearchValue}
            onSortChange={setSortBy}
            onClear={clearFilters}
          />
          <ProgressGroupList records={filteredRecords} onOpen={(record) => setSelectedId(record.id)} />
        </section>
      </div>

      {selectedRecord ? (
        <ProgressDetailDrawer record={selectedRecord} submissionsHref={`${basePath}/submissions`} onClose={closeDetails} />
      ) : null}
    </>
  );
}
