'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import {
  DefenseVoteDrawer,
  DefenseVotingFilters,
  DefenseVotingList
} from './data/defense-voting-sections';
import {
  buildDefenseVotingRecord,
  getIdentityDisplayName,
  matchesVotingStatusFilter,
  type DefenseAssignment,
  type DefenseVotingRecord,
  type DefenseVotingStatusFilter,
  type UserIdentity
} from './data/defense-voting-data';
import { TitleSummaryCards, type TitleSummaryMetric } from '@/components/adviser/adviser-mode/data/title-workspace-sections';

export function DefenseVoting({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, basePath } = useWorkspaceMode();
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(null);
  const [assignments, setAssignments] = useState<DefenseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DefenseVotingStatusFilter>('all');
  const [searchValue, setSearchValue] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadAssignments() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [userResult, schedulesResult] = await Promise.allSettled([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/defense-schedules?limit=50', { cache: 'no-store' })
      ]);

      let loadedUser = false;

      if (userResult.status === 'fulfilled' && userResult.value.ok) {
        const payload = (await userResult.value.json().catch(() => null)) as { user?: UserIdentity; data?: { user?: UserIdentity } } | null;
        const user = payload?.user ?? payload?.data?.user;
        if (user && getIdentityDisplayName(user)) {
          setCurrentUser(user);
          loadedUser = true;
        }
      }

      if (!loadedUser) {
        const { getStoredUser } = await import('@/lib/mock/auth');
        const stored = getStoredUser() as UserIdentity | null;
        if (stored && getIdentityDisplayName(stored)) {
          setCurrentUser(stored);
        }
      }

      if (schedulesResult.status === 'fulfilled' && schedulesResult.value.ok) {
        const payload = (await schedulesResult.value.json().catch(() => null)) as { assignments?: DefenseAssignment[] } | null;
        setAssignments(payload?.assignments ?? []);
      } else {
        setLoadError('Unable to load your assigned defenses.');
      }
    } catch {
      setLoadError('Unable to load your assigned defenses.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  const records = useMemo<DefenseVotingRecord[]>(
    () => assignments.map((assignment) => buildDefenseVotingRecord(assignment, currentUser)),
    [assignments, currentUser]
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return records.filter((record) => {
      const matchesStatus = matchesVotingStatusFilter(record, statusFilter);
      const matchesSearch =
        !normalizedSearch ||
        [record.projectTitle, record.groupCode, record.scheduleType].join(' ').toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [records, searchValue, statusFilter]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedScheduleId) ?? null,
    [records, selectedScheduleId]
  );

  useEffect(() => {
    setRemarksDraft('');
  }, [selectedScheduleId]);

  const summaryMetrics = useMemo<TitleSummaryMetric[]>(
    () => [
      {
        id: 'awaiting-vote',
        label: 'Awaiting Your Verdict',
        value: records.filter((record) => record.votingStatus === 'awaiting-vote').length,
        helperText: 'Assigned defenses where you have not yet given a verdict.',
        icon: 'fa-hourglass-half',
        iconClassName: 'bg-amber-50 text-amber-600'
      },
      {
        id: 'awaiting-others',
        label: 'Awaiting Other Panelists',
        value: records.filter((record) => record.votingStatus === 'awaiting-others').length,
        helperText: 'Verdict given — waiting on the rest of the panel to decide the outcome.',
        icon: 'fa-user-clock',
        iconClassName: 'bg-blue-50 text-blue-600'
      },
      {
        id: 'passed',
        label: 'Passed',
        value: records.filter((record) => record.votingStatus === 'passed').length,
        helperText: 'Everyone approved — the defense stage is complete.',
        icon: 'fa-circle-check',
        iconClassName: 'bg-emerald-50 text-emerald-600'
      },
      {
        id: 'needs-redefense',
        label: 'Needs Re-Defense',
        value: records.filter((record) => record.votingStatus === 'needs-redefense').length,
        helperText: 'At least one Reject verdict — a decision from the chair is needed.',
        icon: 'fa-rotate-left',
        iconClassName: 'bg-rose-50 text-rose-600'
      }
    ],
    [records]
  );

  async function castVote(record: DefenseVotingRecord, vote: 'yes' | 'no') {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/defense-schedules/${record.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: remarksDraft, vote })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to submit your verdict.');
      }

      await loadAssignments();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to submit your verdict.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitChairDecision(
    record: DefenseVotingRecord,
    decision: 'approve' | 'redefense' | 'new_title' | 'new_title_approved',
    remarks: string,
    replacementTitle?: { title: string; description?: string; keywords?: string[]; backupDraftId?: string }
  ) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/defense-schedules/${record.id}/chair-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, remarks, ...replacementTitle })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to record your decision.');
      }

      await loadAssignments();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to record your decision.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AdviserPageHeader
        title="Defense Verdict"
        description="Your assigned defenses. Concept, Proposal, and Final defenses are rated on the rating sheet in Live Defense."
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

      <div className="mx-auto max-w-[1600px] space-y-6">
        <TitleSummaryCards metrics={summaryMetrics} />

        <DefenseVotingFilters
          statusFilter={statusFilter}
          searchValue={searchValue}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchValue}
        />

        {loadError ? (
          <div className="project-files-state is-danger">
            <i className="fas fa-circle-exclamation" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="project-files-state">
            <span className="project-files-spinner" aria-hidden="true" />
            <span>Loading your assigned defenses...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-[1.75rem] bg-gradient-to-br from-slate-50 to-blue-50/40 px-6 py-16 text-center shadow-sm border border-slate-100/50">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-brand/10 to-brand/5 text-brand shadow-sm">
              <i className="fas fa-calendar-xmark text-2xl" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-[var(--text-dark)]">No Defenses Scheduled</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--text-light)]">
              You have no defense schedules assigned right now. You&apos;ll be notified when the Program Head assigns you to a panel.
            </p>
            <Link
              href={`${basePath}/dashboard`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              <i className="fas fa-arrow-left" />
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <DefenseVotingList records={filteredRecords} onViewDetails={(record) => setSelectedScheduleId(record.id)} />
        )}
      </div>

      <DefenseVoteDrawer
        record={selectedRecord}
        remarksDraft={remarksDraft}
        onRemarksChange={setRemarksDraft}
        onClose={() => setSelectedScheduleId(null)}
        onCastVote={castVote}
        onChairDecision={submitChairDecision}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
