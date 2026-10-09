'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  DEFENSE_VOTING_STATUS_FILTER_OPTIONS,
  artifactTone,
  formatScheduleDate,
  getInitials,
  getLiveDefenseHref,
  getVotingStatusMeta,
  needsChairDecision,
  type DefenseChairDecision,
  type DefenseVotingRecord,
  type DefenseVotingStatusFilter
} from './defense-voting-data';

type DefenseVotingFiltersProps = {
  statusFilter: DefenseVotingStatusFilter;
  searchValue: string;
  onStatusChange: (value: DefenseVotingStatusFilter) => void;
  onSearchChange: (value: string) => void;
};

export function DefenseVotingFilters({ statusFilter, searchValue, onStatusChange, onSearchChange }: DefenseVotingFiltersProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl p-6 shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-blue-500 to-cyan-400 opacity-20" />
      <div className="grid gap-3 sm:grid-cols-[minmax(190px,1fr)_minmax(280px,1.6fr)]">
        <select
          className="min-h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 text-xs font-bold text-[var(--text)] shadow-sm outline-none transition-all hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/10 appearance-none cursor-pointer"
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value as DefenseVotingStatusFilter)}
        >
          {DEFENSE_VOTING_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--muted)]">
            <i className="fas fa-search text-sm" />
          </span>
          <input
            className="min-h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] pl-11 pr-4 text-sm font-bold text-[var(--text)] shadow-sm outline-none transition-all placeholder:font-medium placeholder:text-[var(--muted)] hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/10"
            placeholder="Search project or group"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

function getLiveDefenseLabel(record: DefenseVotingRecord) {
  if (record.isLive) return 'Join Live Defense';
  if (record.scheduleStatus === 'COMPLETED') return 'View Rating Results';
  return record.isChair ? 'Open & Start Defense' : 'Open Live Defense';
}

function LiveChip({ record }: { record: DefenseVotingRecord }) {
  if (!record.isLive) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-sm">
      <i className="fas fa-circle animate-pulse text-[7px]" /> Live
    </span>
  );
}

// The main card/drawer action for stages rated on the rating sheet.
function LiveDefenseLink({ record, className }: { record: DefenseVotingRecord; className: string }) {
  return (
    <Link href={getLiveDefenseHref(record.id)} className={className}>
      <i className={`fas ${record.isLive ? 'fa-tower-broadcast' : 'fa-clipboard-list'} text-xs`} /> {getLiveDefenseLabel(record)}
    </Link>
  );
}

export function DefenseVotingList({
  records,
  onViewDetails
}: {
  records: DefenseVotingRecord[];
  onViewDetails: (record: DefenseVotingRecord) => void;
}) {
  const awaitingCount = records.filter((record) => record.votingStatus === 'awaiting-vote').length;
  const decidedCount = records.filter((record) => ['passed', 'needs-redefense'].includes(record.votingStatus)).length;
  const chairDecisionsNeeded = records.filter(needsChairDecision).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 text-brand ring-1 ring-brand/20 shadow-sm">
            <i className="fas fa-check-to-slot text-lg" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">Assigned Defenses</h2>
            <p className="mt-1 text-sm font-medium text-[var(--muted)]">
              Open a defense to review the group and give your Approve/Reject verdict.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
            <i className="fas fa-list-check text-[10px] opacity-50" />
            {records.length} defense{records.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 ring-1 ring-inset ring-amber-100">
            <i className="fas fa-hourglass-half text-[10px]" />
            {awaitingCount} awaiting your vote
          </span>
          {chairDecisionsNeeded > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/20 px-3 py-1.5 text-amber-800 ring-1 ring-inset ring-brand-accent/50">
              <i className="fas fa-gavel text-[10px]" />
              {chairDecisionsNeeded} need your decision as Chair
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <i className="fas fa-check text-[10px]" />
            {decidedCount} decided
          </span>
        </div>
      </div>

      {records.length ? (
        <div className="space-y-4">
          {records.map((record) => (
            <DefenseVotingCard key={record.id} record={record} onViewDetails={onViewDetails} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

// Dispatches to a genuinely different card per role — a chair is juggling their
// own vote AND a possible redefense/new-title call, so their card leads with the
// panel-wide vote breakdown and surfaces that decision as the primary action. A
// member only ever needs to know "has everyone voted yet" and cast their own
// vote, so their card stays lean and never reveals how other panelists voted.
export function DefenseVotingCard({
  record,
  onViewDetails
}: {
  record: DefenseVotingRecord;
  onViewDetails: (record: DefenseVotingRecord) => void;
}) {
  return record.isChair
    ? <ChairDefenseCard record={record} onViewDetails={onViewDetails} />
    : <MemberDefenseCard record={record} onViewDetails={onViewDetails} />;
}

function ChairDefenseCard({
  record,
  onViewDetails
}: {
  record: DefenseVotingRecord;
  onViewDetails: (record: DefenseVotingRecord) => void;
}) {
  const statusMeta = getVotingStatusMeta(record.votingStatus);
  const yesCount = record.panelists.filter((panelist) => panelist.voteStatus === 'yes').length;
  const noCount = record.panelists.filter((panelist) => panelist.voteStatus === 'no').length;
  const totalVoted = yesCount + noCount;
  const decisionNeeded = needsChairDecision(record);
  const buttonLabel = decisionNeeded
    ? 'Record Chair Decision'
    : record.myVote === 'pending'
      ? 'Give Your Verdict'
      : 'View Details';

  return (
    <article
      className={`group relative overflow-hidden rounded-[2rem] border bg-[var(--surface)] backdrop-blur-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        decisionNeeded ? 'border-brand-accent/50 hover:border-brand-accent/70' : 'border-[var(--border)] hover:border-brand/30 hover:shadow-brand/5'
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b opacity-80 group-hover:opacity-100 transition-opacity ${
          decisionNeeded ? 'from-brand-accent to-amber-400' : 'from-brand to-blue-400'
        }`}
      />

      <div className="grid gap-6 p-6 pl-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)_220px] xl:items-stretch">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/50 bg-brand-accent/15 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-800">
              <i className="fas fa-user-shield text-[10px]" /> Panel Chair
            </span>
            <LiveChip record={record} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-brand-dark">
              {record.scheduleType}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm ${statusMeta.badgeClassName}`}>
              <i className={`fas ${statusMeta.icon} text-[10px]`} />
              {statusMeta.label}
            </span>
          </div>

          <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-[var(--text)] transition-colors group-hover:text-brand">
            {record.projectTitle}
          </h3>

          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand/8 px-3 py-2 text-brand ring-1 ring-inset ring-brand/15">
              <i className="fas fa-users-rectangle opacity-70" /> {record.groupCode}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-inset ring-slate-200">
              <i className="fas fa-calendar-day opacity-60" />
              {formatScheduleDate(record.date)} &bull; {record.time}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-inset ring-slate-200">
              <i className="fas fa-location-dot opacity-60" />
              {record.room}
            </span>
          </div>
        </div>

        {/* Chair sees the real breakdown up front — no need to open the drawer just to
            find out whether a decision is theirs to make. */}
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/80">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <i className="fas fa-user-group text-brand" /> {record.hasRatingSheet ? 'Rating Sheets' : 'Panel Verdicts'}
            </p>
            <span className="text-[11px] font-black text-slate-500">{totalVoted}/{record.panelists.length}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {record.panelists.map((panelist) => (
              <span
                key={panelist.id}
                title={`${panelist.name} — ${panelist.voteStatus === 'pending' ? 'Pending' : panelist.voteStatus === 'yes' ? 'Approved' : 'Rejected'}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black ${
                  panelist.voteStatus === 'yes'
                    ? 'bg-emerald-500 text-white'
                    : panelist.voteStatus === 'no'
                      ? 'bg-rose-500 text-white'
                      : panelist.isMe
                        ? 'bg-brand text-white'
                        : 'bg-slate-200 text-slate-500'
                }`}
              >
                {getInitials(panelist.name)}
              </span>
            ))}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            {totalVoted > 0 && (
              <div className="flex h-full w-full">
                <div className="h-full bg-emerald-500" style={{ width: `${(yesCount / record.panelists.length) * 100}%` }} />
                <div className="h-full bg-rose-500" style={{ width: `${(noCount / record.panelists.length) * 100}%` }} />
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 ${
            decisionNeeded
              ? 'border-brand-accent/40 bg-gradient-to-br from-brand-accent/10 via-white to-white'
              : 'border-brand/15 bg-gradient-to-br from-brand/5 via-white to-white'
          }`}
        >
          <div>
            <p className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest ${decisionNeeded ? 'text-amber-800' : 'text-brand'}`}>
              <i className={`fas ${decisionNeeded ? 'fa-gavel' : 'fa-route'}`} /> {decisionNeeded ? 'Action Needed' : 'Chair Status'}
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
              {decisionNeeded
                ? 'The panel did not pass this defense. Record whether the group re-defends or needs a new title.'
                : record.hasRatingSheet && record.scheduleStatus === 'SCHEDULED'
                  ? 'Start the defense from Live Defense when the panel is seated.'
                : record.hasRatingSheet && record.isLive
                  ? 'The defense is live. Rate, then finalize once every sheet is in.'
                : record.myVote === 'pending'
                  ? "You haven't given your own verdict yet."
                  : 'Your verdict is recorded. Monitoring the rest of the panel.'}
            </p>
          </div>
          {record.hasRatingSheet && !decisionNeeded ? (
            <LiveDefenseLink
              record={record}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-black text-white shadow-md shadow-brand/20 transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg"
            />
          ) : (
            <button
              className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${
                decisionNeeded ? 'bg-amber-600 shadow-amber-600/20 hover:bg-amber-700' : 'bg-brand shadow-brand/20 hover:bg-brand-dark'
              }`}
              type="button"
              onClick={() => onViewDetails(record)}
            >
              <i className={`fas ${decisionNeeded ? 'fa-gavel' : 'fa-up-right-from-square'} text-xs`} /> {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MemberDefenseCard({
  record,
  onViewDetails
}: {
  record: DefenseVotingRecord;
  onViewDetails: (record: DefenseVotingRecord) => void;
}) {
  const statusMeta = getVotingStatusMeta(record.votingStatus);
  const votedCount = record.panelists.filter((panelist) => panelist.voteStatus !== 'pending').length;
  const buttonLabel = record.myVote === 'pending' ? 'Review & Give Verdict' : 'View Result';

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand to-blue-400 opacity-80 group-hover:opacity-100 transition-opacity" />

      <div className="grid gap-6 p-6 pl-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(220px,0.7fr)_220px] xl:items-stretch">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-brand-dark">
              {record.scheduleType}
            </span>
            {record.isSecretary ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
                <i className="fas fa-pen-to-square text-[10px]" /> Secretary
              </span>
            ) : null}
            <LiveChip record={record} />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm ${statusMeta.badgeClassName}`}>
              <i className={`fas ${statusMeta.icon} text-[10px]`} />
              {statusMeta.label}
            </span>
          </div>

          <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-[var(--text)] transition-colors group-hover:text-brand">
            {record.projectTitle}
          </h3>

          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand/8 px-3 py-2 text-brand ring-1 ring-inset ring-brand/15">
              <i className="fas fa-users-rectangle opacity-70" /> {record.groupCode}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-inset ring-slate-200">
              <i className="fas fa-calendar-day opacity-60" />
              {formatScheduleDate(record.date)} &bull; {record.time}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-inset ring-slate-200">
              <i className="fas fa-location-dot opacity-60" />
              {record.room}
            </span>
          </div>
        </div>

        {/* Deliberately lighter than the chair's card — a member only needs to know how
            many panelists have voted, not who voted which way. */}
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/80">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <i className="fas fa-user-group text-brand" /> Panel Progress
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">{votedCount}/{record.panelists.length}</span>
            <span className="text-xs font-bold text-slate-500">{record.hasRatingSheet ? 'sheets submitted' : 'verdicts given'}</span>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-500">
            {record.isSecretary
              ? 'You record the minutes; you do not rate.'
              : record.myVote === 'pending'
                ? record.hasRatingSheet ? 'Your rating sheet is still needed.' : 'Your verdict is still needed.'
                : record.hasRatingSheet ? 'Your rating sheet is submitted.' : 'Your verdict is recorded.'}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-brand/15 bg-gradient-to-br from-brand/5 via-white to-white p-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand">
              <i className="fas fa-route" /> Your Status
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
              {record.isSecretary
                ? 'Record the minutes of this defense in Live Defense.'
                : record.isMyAdvisee
                ? "You're this group's adviser — giving a verdict is disabled."
                : record.hasRatingSheet && record.scheduleStatus === 'SCHEDULED'
                  ? 'Pre-read the defense packet. Rating opens when the chair starts the defense.'
                : record.hasRatingSheet && record.myVote === 'pending'
                  ? 'The defense is live — fill in your rating sheet.'
                : record.myVote === 'pending'
                  ? 'You have not given your verdict yet.'
                  : record.myVote === 'yes'
                    ? 'You approved this defense.'
                    : 'Your verdict was re-defense.'}
            </p>
          </div>
          {record.hasRatingSheet || record.isSecretary ? (
            <LiveDefenseLink
              record={record}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-black text-white shadow-md shadow-brand/20 transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg"
            />
          ) : (
            <button
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-black text-white shadow-md shadow-brand/20 transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg"
              type="button"
              onClick={() => onViewDetails(record)}
            >
              <i className="fas fa-up-right-from-square text-xs" /> {record.isMyAdvisee ? 'View Details' : buttonLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function EmptyState() {
  return (
    <div className="rounded-[1.75rem] bg-gradient-to-br from-slate-50 to-blue-50/40 px-6 py-16 text-center shadow-[0_18px_36px_rgba(15,23,42,0.05)] border border-slate-100/50">
      <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-brand/10 to-brand/5 text-brand shadow-sm">
        <i className="fas fa-check-to-slot text-2xl" />
      </div>
      <h3 className="mt-6 text-xl font-bold text-[var(--text-dark)]">No defenses match this view</h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--text-light)]">
        You have no assigned defense schedules matching the current filters. You&apos;ll be notified when the Program Head assigns you to a panel.
      </p>
    </div>
  );
}

type DefenseVoteDrawerProps = {
  record: DefenseVotingRecord | null;
  remarksDraft: string;
  onRemarksChange: (value: string) => void;
  onClose: () => void;
  onCastVote: (record: DefenseVotingRecord, vote: 'yes' | 'no') => Promise<void> | void;
  onChairDecision: (
    record: DefenseVotingRecord,
    decision: 'approve' | 'redefense' | 'new_title' | 'new_title_approved',
    remarks: string,
    replacementTitle?: { title: string; description?: string; keywords?: string[]; backupDraftId?: string }
  ) => Promise<void> | void;
  isSubmitting: boolean;
};

type DrawerBodyProps = {
  record: DefenseVotingRecord;
  remarksDraft: string;
  onRemarksChange: (value: string) => void;
  onCastVote: (record: DefenseVotingRecord, vote: 'yes' | 'no') => Promise<void> | void;
  onChairDecision: (
    record: DefenseVotingRecord,
    decision: 'approve' | 'redefense' | 'new_title' | 'new_title_approved',
    remarks: string,
    replacementTitle?: { title: string; description?: string; keywords?: string[]; backupDraftId?: string }
  ) => Promise<void> | void;
  isSubmitting: boolean;
};

// The modal shell (portal, header, escape/scroll-lock lifecycle) is shared, but
// the body is a genuinely different component per role — mounted fresh under a
// `key={record.id}` so each keeps its own local state without needing manual
// reset effects. A chair is juggling their own vote AND a possible redefense/
// new-title call, so ChairDrawerBody leads with the panel-wide breakdown and the
// decision tool. A member only ever casts one vote, so MemberDrawerBody leads
// with the group/packet/vote and never reveals how other panelists voted.
export function DefenseVoteDrawer({ record, remarksDraft, onRemarksChange, onClose, onCastVote, onChairDecision, isSubmitting }: DefenseVoteDrawerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = record ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [record]);
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!record || !isMounted) return null;

  const statusMeta = getVotingStatusMeta(record.votingStatus);

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div
        aria-label="Defense verdict modal"
        aria-modal="true"
        role="dialog"
        className="flex max-h-full w-full max-w-[880px] flex-col overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-3xl shadow-[0_24px_80px_rgba(15,23,42,0.28)] ring-1 ring-white/60"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] ${record.isChair ? 'text-amber-800' : 'text-brand'}`}>
                <i className={`fas ${record.isChair ? 'fa-user-shield' : 'fa-gavel'} opacity-70`} />
                {record.isChair ? 'Panel Chair' : record.scheduleType}
              </p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 leading-tight">{record.projectTitle}</h2>
            </div>
            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none"
              type="button"
              onClick={onClose}
            >
              <i className="fas fa-xmark text-lg" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {record.isChair && (
              <span className="inline-flex rounded-lg bg-brand-accent/15 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-brand-accent/40">
                {record.scheduleType}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/8 px-3 py-1 text-xs font-bold text-brand ring-1 ring-inset ring-brand/20">
              <i className="fas fa-users-rectangle text-[10px]" /> {record.groupCode}
            </span>
            <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200/80">
              {formatScheduleDate(record.date)} &bull; {record.time} &bull; {record.room}
            </span>
            <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-bold ring-1 ring-inset ring-current/20 ${statusMeta.badgeClassName}`}>
              {statusMeta.label}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-8 sm:py-6 custom-scrollbar">
          {record.isMyAdvisee ? (
            <AdviserConflictNotice />
          ) : record.isChair ? (
            <ChairDrawerBody
              key={record.id}
              record={record}
              remarksDraft={remarksDraft}
              onRemarksChange={onRemarksChange}
              onCastVote={onCastVote}
              onChairDecision={onChairDecision}
              isSubmitting={isSubmitting}
            />
          ) : (
            <MemberDrawerBody
              key={record.id}
              record={record}
              remarksDraft={remarksDraft}
              onRemarksChange={onRemarksChange}
              onCastVote={onCastVote}
              onChairDecision={onChairDecision}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function AdviserConflictNotice() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 bg-white text-2xl text-amber-700">
        <i className="fas fa-user-lock" />
      </div>
      <h3 className="text-lg font-black text-slate-900">Adviser Conflict</h3>
      <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-600">
        You are the adviser for this group. Policy prevents you from giving a verdict on your own advisees.
      </p>
    </div>
  );
}

function GroupMembersSection({ record }: { record: DefenseVotingRecord }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
        <i className="fas fa-user-group" /> Group Members
      </p>
      <div className="space-y-1.5">
        {record.students.map((student) => (
          <div key={student} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
              {getInitials(student)}
            </span>
            <span className="truncate text-sm font-bold text-slate-800">{student}</span>
            {student === record.leader && (
              <span className="ml-auto shrink-0 text-[0.6rem] font-black uppercase tracking-widest text-brand-dark">
                <i className="fas fa-crown mr-1 text-brand-accent" />Leader
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function DefensePacketSection({ record }: { record: DefenseVotingRecord }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
        <i className="fas fa-folder-open" /> Defense Packet
      </p>
      <div className="flex flex-wrap gap-2">
        {record.artifacts.map((artifact) => (
          <span key={artifact.label} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${artifactTone(artifact.status)}`}>
            {artifact.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function RemarksSection({
  remarksDraft,
  onRemarksChange,
  disabled
}: {
  remarksDraft: string;
  onRemarksChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <label className="mb-2.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand">
        <i className="fas fa-comment-dots" />
        Panel Remarks <span className="font-bold normal-case tracking-normal text-slate-400">(optional)</span>
      </label>
      <textarea
        disabled={disabled}
        value={remarksDraft}
        onChange={(event) => onRemarksChange(event.target.value)}
        placeholder="Notes for the record, required revisions, or feedback for the presenters..."
        className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-brand/40 focus:bg-white focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </section>
  );
}

function CastVoteSection({
  record,
  onCastVote,
  isSubmitting
}: {
  record: DefenseVotingRecord;
  onCastVote: (record: DefenseVotingRecord, vote: 'yes' | 'no') => Promise<void> | void;
  isSubmitting: boolean;
}) {
  const [pendingVote, setPendingVote] = useState<'yes' | 'no' | null>(null);

  return (
    <section className="rounded-2xl border-2 border-brand/20 bg-gradient-to-br from-brand/5 via-white to-white p-5 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand">
        <i className="fas fa-square-poll-vertical" /> Does This Presentation Pass?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPendingVote('yes')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3.5 text-[0.85rem] font-black transition-all ${
            pendingVote === 'yes'
              ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-500 ring-offset-2'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100'
          }`}
        >
          <i className="fas fa-thumbs-up" />
          Approve (Pass)
        </button>
        <button
          type="button"
          onClick={() => setPendingVote('no')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3.5 text-[0.85rem] font-black transition-all ${
            pendingVote === 'no'
              ? 'bg-rose-500 text-white shadow-md ring-2 ring-rose-500 ring-offset-2'
              : 'border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100'
          }`}
        >
          <i className="fas fa-thumbs-down" />
          Reject (Re-Defense)
        </button>
      </div>
      <button
        type="button"
        disabled={!pendingVote || isSubmitting}
        onClick={() => pendingVote && onCastVote(record, pendingVote)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-black text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
      >
        <i className={`fas ${isSubmitting ? 'fa-circle-notch animate-spin' : 'fa-paper-plane'}`} />
        {isSubmitting ? 'Submitting...' : 'Submit Verdict'}
      </button>
    </section>
  );
}

// `revealAllVotes` is the one real behavioral difference: a chair needs to see
// exactly who voted which way, since a single Reject changes the outcome; a
// member only gets to see their own vote plus a generic "Voted/Pending" for
// everyone else.
function PanelVoteSummarySection({ record, revealAllVotes }: { record: DefenseVotingRecord; revealAllVotes: boolean }) {
  const yesCount = record.panelists.filter((panelist) => panelist.voteStatus === 'yes').length;
  const noCount = record.panelists.filter((panelist) => panelist.voteStatus === 'no').length;
  const totalVoted = yesCount + noCount;
  const allVoted = totalVoted === record.panelists.length;
  // Unanimous Yes required to pass — a single No sends it to the chair's
  // decision instead.
  const passed = allVoted && noCount === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
          <i className="fas fa-chart-simple" /> Panel Vote Summary
        </p>
        <span className="text-[0.65rem] font-black text-slate-500">{totalVoted}/{record.panelists.length} voted</span>
      </div>
      <p className="mb-4 text-[0.65rem] font-bold text-slate-400">
        Passes only if every panelist gives a Yes verdict — a single No goes to the panel chair's decision.
      </p>

      <div className="mb-4 space-y-2">
        {record.panelists.map((panelist) => {
          const canSeeVote = revealAllVotes || panelist.isMe;
          return (
            <div key={panelist.id} className={`flex items-center gap-2 rounded-lg p-1.5 transition-colors ${panelist.isMe ? 'bg-brand/5 ring-1 ring-brand/10' : ''}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-black ${panelist.isMe ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>
                {getInitials(panelist.name)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[0.75rem] font-bold text-slate-900">{panelist.name}</span>
                {panelist.isMe && <span className="text-[0.55rem] font-black uppercase tracking-wider text-brand">You</span>}
              </div>
              {canSeeVote ? (
                <span className={`flex h-7 items-center justify-center rounded-md px-3 text-[0.65rem] font-black ${
                  panelist.voteStatus === 'yes' ? 'bg-emerald-100 text-emerald-700' : panelist.voteStatus === 'no' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-400'
                }`}>
                  {panelist.voteStatus === 'yes' ? <><i className="fas fa-thumbs-up mr-1" />Yes</> : panelist.voteStatus === 'no' ? <><i className="fas fa-thumbs-down mr-1" />No</> : 'Pending'}
                </span>
              ) : (
                <span className={`flex h-7 items-center justify-center rounded-md px-3 text-[0.65rem] font-black ${panelist.voteStatus !== 'pending' ? 'bg-brand/10 text-brand' : 'bg-slate-200 text-slate-400'}`}>
                  {panelist.voteStatus !== 'pending' ? <><i className="fas fa-check-circle mr-1" />Verdict given</> : 'Pending'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
          {totalVoted > 0 && (
            <>
              <div className="h-full float-left bg-emerald-500 transition-all duration-300" style={{ width: `${(yesCount / record.panelists.length) * 100}%` }} />
              <div className="h-full float-right bg-rose-500 transition-all duration-300" style={{ width: `${(noCount / record.panelists.length) * 100}%` }} />
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-[0.7rem] font-black">
        <span className="text-emerald-600"><i className="fas fa-thumbs-up mr-1" />{yesCount} Yes</span>
        <span className="text-rose-600"><i className="fas fa-thumbs-down mr-1" />{noCount} No</span>
      </div>

      {allVoted && (
        <div className={`mt-4 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-[0.85rem] font-black ${
          passed ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700'
        }`}>
          <i className={`fas ${passed ? 'fa-trophy' : 'fa-rotate-left'}`} />
          {passed ? 'Verdict: PASSED — Stage Complete' : 'Verdict: NOT PASSED — Re-Defense'}
        </div>
      )}
      {!allVoted && (
        <p className="mt-3 text-center text-[0.65rem] font-bold text-amber-600">
          <i className="fas fa-triangle-exclamation mr-1" />
          Waiting on the remaining panelists for their verdicts.
        </p>
      )}
    </section>
  );
}

// Shared read-only recap — both roles see exactly what was decided once the
// chair has recorded it; only the chair ever sees the editable tool that
// produces it (see ChairDecisionSection below).
const CHAIR_DECISION_META: Record<DefenseChairDecision, { label: string; icon: string; badgeClassName: string }> = {
  APPROVED: { label: 'Approved — Overrode the Panel Verdict', icon: 'fa-check', badgeClassName: 'bg-emerald-50 text-emerald-700' },
  REDEFENSE: { label: 'Redefense — Revise & Continue', icon: 'fa-rotate-left', badgeClassName: 'bg-blue-50 text-blue-700' },
  NEW_TITLE: { label: 'Requires New Title', icon: 'fa-file-circle-exclamation', badgeClassName: 'bg-amber-50 text-amber-700' },
  NEW_TITLE_APPROVED: { label: 'New Verdict on Backup Title', icon: 'fa-arrows-rotate', badgeClassName: 'bg-emerald-50 text-emerald-700' }
};

function ChairDecisionRecap({ record }: { record: DefenseVotingRecord }) {
  if (!record.chairDecision) return null;
  const meta = CHAIR_DECISION_META[record.chairDecision];

  return (
    <section className="rounded-2xl border border-brand-accent/40 bg-white p-5 shadow-sm">
      <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">Chair Decision</p>
      <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-black ${meta.badgeClassName}`}>
        <i className={`fas ${meta.icon}`} />
        {meta.label}
      </div>
      {record.chairDecisionRemarks && (
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{record.chairDecisionRemarks}</p>
      )}
    </section>
  );
}

function ChairDecisionSection({
  record,
  onChairDecision,
  isSubmitting
}: {
  record: DefenseVotingRecord;
  onChairDecision: (
    record: DefenseVotingRecord,
    decision: 'approve' | 'redefense' | 'new_title' | 'new_title_approved',
    remarks: string,
    replacementTitle?: { title: string; description?: string; keywords?: string[]; backupDraftId?: string }
  ) => Promise<void> | void;
  isSubmitting: boolean;
}) {
  const [pendingChairDecision, setPendingChairDecision] = useState<'approve' | 'redefense' | 'new_title' | 'new_title_approved' | null>(null);
  const [chairRemarks, setChairRemarks] = useState('');

  // Only fetched once the chair actually picks "New Title (Approved Now)" —
  // most decisions never need this, so no reason to load it eagerly.
  const [backupDrafts, setBackupDrafts] = useState<Array<{
    id: string;
    title: string;
    description: string;
    keywords: string[];
    reviewStatus: string;
    isPriority: boolean;
    files: Array<{ id: string; name: string; fileType: string; size: number }>;
  }>>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);

  if (record.chairDecision) {
    return <ChairDecisionRecap record={record} />;
  }

  // This decision only ever clears a backup the adviser already reviewed and
  // approved — no freeform typing, at Concept or Proposal+. Real vetting
  // already happened, it just wasn't live in the room (mirrors the
  // server-side check in chair-decision/route.ts).
  const approvedBackups = backupDrafts.filter((draft) => draft.reviewStatus === 'APPROVED');
  const selectedBackup = selectedBackupId ? approvedBackups.find((draft) => draft.id === selectedBackupId) ?? null : null;

  const selectDecision = (decision: 'approve' | 'redefense' | 'new_title' | 'new_title_approved') => {
    setPendingChairDecision(decision);

    if (decision === 'new_title_approved' && backupDrafts.length === 0 && !isLoadingBackups) {
      setIsLoadingBackups(true);
      fetch(`/api/defense-schedules/${record.id}/backup-titles`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((payload) => setBackupDrafts(payload?.drafts || []))
        .catch(() => {})
        .finally(() => setIsLoadingBackups(false));
    }
  };

  const canSubmit = pendingChairDecision === 'new_title_approved'
    ? Boolean(selectedBackup)
    : Boolean(pendingChairDecision);

  const handleSubmit = () => {
    if (!pendingChairDecision) return;

    if (pendingChairDecision === 'new_title_approved') {
      if (!selectedBackup) return;
      onChairDecision(record, pendingChairDecision, chairRemarks, {
        title: selectedBackup.title,
        description: selectedBackup.description || undefined,
        keywords: selectedBackup.keywords,
        backupDraftId: selectedBackup.id
      });
      return;
    }

    onChairDecision(record, pendingChairDecision, chairRemarks);
  };

  return (
    <section className="rounded-2xl border-2 border-brand-accent/50 bg-gradient-to-br from-brand-accent/10 via-white to-white p-5 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-800">
        <i className="fas fa-gavel" /> Chair Decision — What happens next?
      </p>
      <p className="mb-4 text-xs font-medium leading-relaxed text-slate-600">
        The panel did not pass this defense. Approve it anyway to override the panel&apos;s vote, record whether the
        student should revise and re-attempt this same title, require an entirely new one (scheduled separately
        later), or — if the group has a backup title their adviser already approved — pivot to it right now and have
        the panel vote again on it in this same sitting.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => selectDecision('approve')}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg py-3 text-[0.75rem] font-black transition-all ${
            pendingChairDecision === 'approve'
              ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-500 ring-offset-2'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100'
          }`}
        >
          <i className="fas fa-check text-base" />
          Approve
        </button>
        <button
          type="button"
          onClick={() => selectDecision('redefense')}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg py-3 text-[0.75rem] font-black transition-all ${
            pendingChairDecision === 'redefense'
              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-2'
              : 'border border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
          }`}
        >
          <i className="fas fa-rotate-left text-base" />
          Redefense
        </button>
        <button
          type="button"
          onClick={() => selectDecision('new_title')}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg py-3 text-[0.75rem] font-black transition-all ${
            pendingChairDecision === 'new_title'
              ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-600 ring-offset-2'
              : 'border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100'
          }`}
        >
          <i className="fas fa-file-circle-exclamation text-base" />
          New Title
        </button>
        <button
          type="button"
          onClick={() => selectDecision('new_title_approved')}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg py-3 text-[0.75rem] font-black transition-all ${
            pendingChairDecision === 'new_title_approved'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600 ring-offset-2'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100'
          }`}
        >
          <i className="fas fa-arrows-rotate text-base" />
          Vote Again — Backup Title
        </button>
      </div>

      {pendingChairDecision === 'new_title_approved' && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-emerald-800">
            Which adviser-approved backup is the group presenting?
          </p>
          {isLoadingBackups ? (
            <p className="text-xs font-semibold text-emerald-700">Loading saved backups…</p>
          ) : approvedBackups.length > 0 ? (
            <div className="mb-3 flex flex-col gap-1.5">
              {approvedBackups.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => setSelectedBackupId(draft.id)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                    selectedBackupId === draft.id
                      ? 'border-emerald-500 bg-white text-emerald-800 ring-2 ring-emerald-500/30'
                      : 'border-emerald-200 bg-white/70 text-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {draft.isPriority && <i className="fas fa-star text-amber-400" aria-hidden="true" />}
                    <span className="truncate">&quot;{draft.title}&quot;</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                    Adviser Approved
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-xs font-medium text-emerald-700">
              {backupDrafts.length > 0
                ? 'This group has backup titles, but none are adviser-approved yet. Use New Title instead, or have the adviser review a backup first.'
                : 'This group has no saved backup titles. Use New Title instead.'}
            </p>
          )}

          {selectedBackup && (
            <div className="rounded-lg border border-emerald-300 bg-white p-3">
              <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-emerald-800">
                Verdicts will reset for this backup — every panelist gives a new verdict
              </p>
              <p className="mb-2 text-sm font-bold text-slate-900">&quot;{selectedBackup.title}&quot;</p>
              {selectedBackup.description ? (
                <p className="mb-2 text-xs leading-relaxed text-slate-600">{selectedBackup.description}</p>
              ) : (
                <p className="mb-2 text-xs italic text-slate-400">No description saved for this backup.</p>
              )}
              {selectedBackup.keywords.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedBackup.keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <i className="fas fa-paperclip" aria-hidden="true" />
                {selectedBackup.files.length > 0
                  ? `${selectedBackup.files.length} file${selectedBackup.files.length === 1 ? '' : 's'} attached — will carry over, no re-upload needed`
                  : 'No files attached to this backup'}
              </p>
            </div>
          )}
        </div>
      )}

      <textarea
        value={chairRemarks}
        onChange={(event) => setChairRemarks(event.target.value)}
        placeholder="Explain the decision for the student..."
        className="mb-4 h-24 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-brand/40 focus:ring-4 focus:ring-brand/10"
      />
      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        <i className={`fas ${isSubmitting ? 'fa-circle-notch animate-spin' : 'fa-gavel'}`} />
        {isSubmitting ? 'Recording...' : 'Record Decision'}
      </button>
    </section>
  );
}

// Ordered by "what does the chair actually need to do right now": their own
// outstanding vote comes first (it's the one thing only they can do next),
// then the panel-wide monitoring view, then the redefense/new-title/approve
// call if it's come to that, then reference material (roster, packet,
// remarks) last.
function ChairDrawerBody({ record, remarksDraft, onRemarksChange, onCastVote, onChairDecision, isSubmitting }: DrawerBodyProps) {
  const hasVoted = record.myVote !== 'pending';
  const yesCount = record.panelists.filter((panelist) => panelist.voteStatus === 'yes').length;
  const noCount = record.panelists.filter((panelist) => panelist.voteStatus === 'no').length;
  const allVoted = yesCount + noCount === record.panelists.length;
  const notPassed = allVoted && noCount > 0;

  return (
    <div className="space-y-5">
      {record.hasRatingSheet ? (
        <LiveDefenseLinkSection record={record} />
      ) : !hasVoted && (
        <CastVoteSection record={record} onCastVote={onCastVote} isSubmitting={isSubmitting} />
      )}

      <PanelVoteSummarySection record={record} revealAllVotes />

      {notPassed && (
        <ChairDecisionSection record={record} onChairDecision={onChairDecision} isSubmitting={isSubmitting} />
      )}

      <GroupMembersSection record={record} />
      <DefensePacketSection record={record} />
      <RemarksSection remarksDraft={remarksDraft} onRemarksChange={onRemarksChange} disabled={hasVoted} />
    </div>
  );
}

// Leads with the group/packet/vote — a member's job here is simply to review and
// cast one vote, so the panel-wide summary comes after, and never reveals how
// anyone else voted.
function MemberDrawerBody({ record, remarksDraft, onRemarksChange, onCastVote, isSubmitting }: DrawerBodyProps) {
  const hasVoted = record.myVote !== 'pending';
  const yesCount = record.panelists.filter((panelist) => panelist.voteStatus === 'yes').length;
  const noCount = record.panelists.filter((panelist) => panelist.voteStatus === 'no').length;
  const allVoted = yesCount + noCount === record.panelists.length;
  const notPassed = allVoted && noCount > 0;

  return (
    <div className="space-y-5">
      <GroupMembersSection record={record} />
      <DefensePacketSection record={record} />
      <RemarksSection remarksDraft={remarksDraft} onRemarksChange={onRemarksChange} disabled={hasVoted} />

      {record.hasRatingSheet ? (
        <LiveDefenseLinkSection record={record} />
      ) : !hasVoted && (
        <CastVoteSection record={record} onCastVote={onCastVote} isSubmitting={isSubmitting} />
      )}

      <PanelVoteSummarySection record={record} revealAllVotes={false} />

      {notPassed && (
        record.chairDecision ? (
          <ChairDecisionRecap record={record} />
        ) : (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-xs font-bold text-amber-700">
              <i className="fas fa-hourglass-half mr-1.5" />
              Waiting on the panel chair's decision: approve, redefense, or new title.
            </p>
          </section>
        )
      )}
    </div>
  );
}

function LiveDefenseLinkSection({ record }: { record: DefenseVotingRecord }) {
  return (
    <section className="rounded-2xl border-2 border-brand/20 bg-gradient-to-br from-brand/5 via-white to-white p-5 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand">
        <i className="fas fa-clipboard-list" /> Rated on the Rating Sheet
      </p>
      <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
        The {record.scheduleType} is rated on the department rating sheet in Live Defense. The result is computed from the panel&apos;s scores.
      </p>
      <LiveDefenseLink
        record={record}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-black text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark"
      />
    </section>
  );
}
