'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import type { LiveDefenseState } from '@/lib/live-defense';
import {
  CONCEPT_RATING_LEVEL_LABELS,
  getSectionMaxPoints,
  scoreRatingSheet,
  type RatingForm,
  type RatingSection,
  type RatingSheetScores
} from '@/lib/defense-rating-forms';
import { getDefenseEventLabel } from '@/lib/stage-labels';
import { formatScheduleDate } from './data/defense-voting-data';

// While a defense is live, every viewer polls so the chair's board, the
// panelists' "rating opened" state, and the minutes stay current.
const LIVE_POLL_MS = 5000;
const IDLE_POLL_MS = 20000;

const MINUTES_TEMPLATE = `Attendance:
-

Presentation summary:


Questions and answers:
-

Required revisions:
1.

Verdict / remarks:
`;

type LivePanelist = LiveDefenseState['panelists'][number];

function emptySheet(form: RatingForm): RatingSheetScores {
  return { stage: form.stage, formVersion: form.version, group: {}, individual: {}, sectionRemarks: {}, recommendations: '' };
}

function formatTotal(form: RatingForm, value: number) {
  return form.passingBasis === 'percent' ? `${value}%` : `${value} pts`;
}

async function postLiveAction(id: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/defense-schedules/${id}/live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const fieldMessages = payload?.errors ? Object.values(payload.errors as Record<string, string>).slice(0, 3).join(' ') : '';
    throw new Error([payload?.message || 'The action could not be completed.', fieldMessages].filter(Boolean).join(' '));
  }
  return (payload?.defense ?? payload?.data?.defense) as LiveDefenseState;
}

export function LiveDefense({ data, scheduleId }: { data: AdviserDashboardData; scheduleId: string }) {
  const { workspaceMode, switchWorkspace, basePath } = useWorkspaceMode();
  const [defense, setDefense] = useState<LiveDefenseState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/defense-schedules/${scheduleId}/live`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'Unable to load this defense.');
      setDefense((payload?.defense ?? payload?.data?.defense) as LiveDefenseState);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load this defense.');
    }
  }, [scheduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const status = defense?.status;
  useEffect(() => {
    if (!status || status === 'COMPLETED' || status === 'CANCELLED') return;
    const timer = window.setInterval(load, status === 'IN_PROGRESS' ? LIVE_POLL_MS : IDLE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, load]);

  async function runAction(action: string, body: Record<string, unknown> = {}) {
    setBusyAction(action);
    setActionError(null);
    try {
      const next = await postLiveAction(scheduleId, { action, ...body });
      setDefense(next);
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The action could not be completed.');
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <AdviserPageHeader
        title="Live Defense"
        description="Pre-read the defense packet, rate on the department's rating sheet, and record the minutes."
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
        <Link href={`${basePath}/defense-voting`} className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-dark">
          <i className="fas fa-arrow-left" /> Back to Defense Voting
        </Link>

        {loadError && !defense ? (
          <div className="project-files-state is-danger">
            <i className="fas fa-circle-exclamation" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        ) : !defense ? (
          <div className="project-files-state">
            <span className="project-files-spinner" aria-hidden="true" />
            <span>Loading defense...</span>
          </div>
        ) : (
          <>
            <DefenseHeaderCard defense={defense} busyAction={busyAction} onStart={() => runAction('start')} />

            {actionError ? (
              <div className="project-files-state is-danger">
                <i className="fas fa-circle-exclamation" aria-hidden="true" />
                <span>{actionError}</span>
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0 space-y-6">
                {defense.viewer.role === 'adviser' ? <AdviserNotice /> : null}

                {(defense.viewer.role === 'chair' || defense.viewer.role === 'member') && defense.form ? (
                  <RatingSheetCard
                    key={`${defense.id}-${defense.status}`}
                    defense={defense}
                    form={defense.form}
                    busyAction={busyAction}
                    onSave={(sheet, remarks, submit) => runAction('save-sheet', { sheet, remarks, submit })}
                  />
                ) : null}

                {(defense.viewer.role === 'chair' || defense.viewer.role === 'member') && !defense.form ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600 shadow-sm">
                    The {defense.scheduleType} has no rating sheet. Cast your vote from Defense Voting.
                  </section>
                ) : null}

                <DefensePacketCard defense={defense} />
              </div>

              <div className="min-w-0 space-y-6">
                <PanelBoardCard
                  defense={defense}
                  busyAction={busyAction}
                  onFinalize={() => runAction('finalize')}
                />
                <MinutesCard
                  key={`${defense.id}-minutes-${defense.minutesConfirmedAt ?? 'open'}`}
                  defense={defense}
                  busyAction={busyAction}
                  onSave={(minutes) => runAction('save-minutes', { minutes })}
                  onConfirm={() => runAction('confirm-minutes')}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// -- Header ------------------------------------------------------------------

function statusMeta(defense: LiveDefenseState) {
  if (defense.status === 'IN_PROGRESS') {
    return { label: getDefenseEventLabel(defense.scheduleType, 'in-progress'), className: 'bg-rose-50 text-rose-700 ring-rose-200', icon: 'fa-circle animate-pulse' };
  }
  if (defense.status === 'COMPLETED') {
    return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'fa-circle-check' };
  }
  if (defense.status === 'CANCELLED') {
    return { label: getDefenseEventLabel(defense.scheduleType, 'cancelled'), className: 'bg-slate-100 text-slate-600 ring-slate-200', icon: 'fa-ban' };
  }
  return { label: getDefenseEventLabel(defense.scheduleType, 'scheduled'), className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: 'fa-hourglass-half' };
}

const VIEWER_ROLE_LABELS: Record<LiveDefenseState['viewer']['role'], string> = {
  chair: 'You are the Panel Chair',
  member: 'You are a Panel Member',
  secretary: 'You are the Secretary',
  adviser: 'You are the Adviser',
  observer: 'Observing'
};

function DefenseHeaderCard({ defense, busyAction, onStart }: { defense: LiveDefenseState; busyAction: string | null; onStart: () => void }) {
  const meta = statusMeta(defense);
  const date = new Date(defense.scheduledAt);
  const time = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <section className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">
            <i className="fas fa-gavel opacity-70" /> {defense.scheduleType}
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-900">{defense.projectTitle}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {defense.groupCode ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/8 px-3 py-1 text-xs font-bold text-brand ring-1 ring-inset ring-brand/20">
                <i className="fas fa-users-rectangle text-[10px]" /> {defense.groupCode}
              </span>
            ) : null}
            <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200/80">
              {formatScheduleDate(defense.scheduledAt)}{time ? ` • ${time}` : ''}{defense.room ? ` • ${defense.room}` : ''}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ring-1 ring-inset ${meta.className}`}>
              <i className={`fas ${meta.icon} text-[8px]`} /> {meta.label}
            </span>
            <span className="inline-flex rounded-lg bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-200/80">
              {VIEWER_ROLE_LABELS[defense.viewer.role]}
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Adviser: {defense.adviserName || 'Not set'} · Secretary: {defense.secretary?.name || 'Not assigned'}
          </p>
        </div>

        {defense.viewer.role === 'chair' && defense.status === 'SCHEDULED' ? (
          <button
            type="button"
            onClick={onStart}
            disabled={busyAction !== null}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-black text-white shadow-md transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className={`fas ${busyAction === 'start' ? 'fa-circle-notch animate-spin' : 'fa-play'}`} />
            Start Defense
          </button>
        ) : null}
      </div>

      {defense.status === 'SCHEDULED' && defense.viewer.role !== 'chair' ? (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          <i className="fas fa-book-open mr-1.5" />
          Pre-read the defense packet below. Rating opens when the panel chair starts the defense.
        </p>
      ) : null}
    </section>
  );
}

function AdviserNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-800">
      <i className="fas fa-user-lock mr-1.5" />
      You are this group&apos;s adviser, so you follow the defense here but don&apos;t rate it. Scores are shown once the chair finalizes.
    </section>
  );
}

// -- Defense packet ----------------------------------------------------------

function DefensePacketCard({ defense }: { defense: LiveDefenseState }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
        <i className="fas fa-folder-open" /> Defense Packet
      </p>
      {defense.packet.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">The group has no files uploaded for this stage yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {defense.packet.map((file) => (
            <li key={file.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/8 text-brand">
                <i className="fas fa-file-lines" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{file.label}</p>
                <p className="truncate text-xs font-semibold text-slate-400">
                  {file.fileName} · {formatScheduleDate(file.uploadedAt)}
                </p>
              </div>
              <a
                href={file.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-brand/40 hover:text-brand"
              >
                Open
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// -- Rating sheet ------------------------------------------------------------

function RatingSheetCard({
  defense,
  form,
  busyAction,
  onSave
}: {
  defense: LiveDefenseState;
  form: RatingForm;
  busyAction: string | null;
  onSave: (sheet: RatingSheetScores, remarks: string, submit: boolean) => Promise<boolean>;
}) {
  const me = defense.panelists.find((panelist) => panelist.isMe);
  const [sheet, setSheet] = useState<RatingSheetScores>(() => (me?.sheet as RatingSheetScores | null) ?? emptySheet(form));
  const [remarks, setRemarks] = useState(me?.remarks ?? '');
  const [dirty, setDirty] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const isSubmitted = me?.progress === 'submitted';
  const isOpen = defense.status === 'IN_PROGRESS' && !isSubmitted;
  const studentIds = useMemo(() => defense.students.map((student) => student.id), [defense.students]);
  const result = useMemo(() => scoreRatingSheet(form, sheet, studentIds), [form, sheet, studentIds]);

  function setGroupScore(sectionKey: string, criterionKey: string, value: number | null) {
    setDirty(true);
    setSheet((current) => {
      const section = { ...(current.group[sectionKey] ?? {}) };
      if (value === null) delete section[criterionKey];
      else section[criterionKey] = value;
      return { ...current, group: { ...current.group, [sectionKey]: section } };
    });
  }

  function setIndividualScore(studentId: string, sectionKey: string, criterionKey: string, value: number | null) {
    setDirty(true);
    setSheet((current) => {
      const student = { ...(current.individual[studentId] ?? {}) };
      const section = { ...(student[sectionKey] ?? {}) };
      if (value === null) delete section[criterionKey];
      else section[criterionKey] = value;
      student[sectionKey] = section;
      return { ...current, individual: { ...current.individual, [studentId]: student } };
    });
  }

  function setSectionRemark(sectionKey: string, value: string) {
    setDirty(true);
    setSheet((current) => ({ ...current, sectionRemarks: { ...(current.sectionRemarks ?? {}), [sectionKey]: value } }));
  }

  async function save(submit: boolean) {
    const ok = await onSave(sheet, remarks, submit);
    if (ok) {
      setDirty(false);
      setConfirmingSubmit(false);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-brand/20 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand">
            <i className="fas fa-clipboard-list" /> Rating Sheet
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-900">{form.title}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {form.passVerdict.label}: {form.passingBasis === 'percent' ? `${form.passingMinimum} – ${form.maxTotal}%` : `${form.passingMinimum} – ${form.maxTotal} pts`}
            {' · '}
            {form.failVerdict.label}: below {formatTotal(form, form.passingMinimum)}
          </p>
        </div>
        <ScoreBadge form={form} total={result.total} passed={result.passed} />
      </div>

      {isSubmitted ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
          <i className="fas fa-circle-check mr-1.5" /> You submitted this rating sheet. It can no longer be edited.
        </p>
      ) : defense.status !== 'IN_PROGRESS' ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
          <i className="fas fa-lock mr-1.5" />
          {defense.status === 'SCHEDULED' ? 'Rating opens when the chair starts the defense.' : 'Rating is closed for this defense.'}
        </p>
      ) : null}

      <div className="mt-5 space-y-6">
        {form.sections.map((section) => (
          <div key={section.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-black text-slate-800">
                {section.label}
                {section.weightPercent !== null ? <span className="ml-1.5 text-slate-400">({section.weightPercent}%)</span> : null}
                <span className="ml-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {section.scope === 'individual' ? 'Individual rating' : 'Group rating'}
                </span>
              </h4>
              {section.scope === 'group' ? (
                <span className="text-xs font-bold text-slate-500">
                  {sumSection(sheet.group[section.key])} / {getSectionMaxPoints(section)} pts
                  {section.weightPercent !== null ? ` → ${result.groupScores[section.key] ?? 0}%` : ''}
                </span>
              ) : null}
            </div>

            {section.scope === 'group' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {section.criteria.map((criterion) => (
                  <CriterionInput
                    key={criterion.key}
                    label={criterion.label}
                    maxPoints={criterion.maxPoints}
                    allowedPoints={criterion.allowedPoints}
                    value={sheet.group[section.key]?.[criterion.key]}
                    disabled={!isOpen}
                    onChange={(value) => setGroupScore(section.key, criterion.key, value)}
                  />
                ))}
              </div>
            ) : (
              <IndividualSectionTable
                section={section}
                students={defense.students}
                sheet={sheet}
                resultByStudent={Object.fromEntries(result.students.map((student) => [student.studentId, student.individualScores[section.key] ?? 0]))}
                disabled={!isOpen}
                onChange={setIndividualScore}
              />
            )}

            <textarea
              value={sheet.sectionRemarks?.[section.key] ?? ''}
              onChange={(event) => setSectionRemark(section.key, event.target.value)}
              disabled={!isOpen}
              placeholder={`Remarks on ${section.label.toLowerCase()}`}
              className="mt-3 h-16 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand/40 focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        ))}

        <div>
          <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">Recommendations</label>
          <textarea
            value={sheet.recommendations ?? ''}
            onChange={(event) => {
              setDirty(true);
              setSheet((current) => ({ ...current, recommendations: event.target.value }));
            }}
            disabled={!isOpen}
            placeholder="Recommendations for the proponents (required revisions go in the minutes)."
            className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand/40 focus:bg-white focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">Overall remarks</label>
          <textarea
            value={remarks}
            onChange={(event) => {
              setDirty(true);
              setRemarks(event.target.value);
            }}
            disabled={!isOpen}
            className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand/40 focus:bg-white focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
      </div>

      {isOpen ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            {dirty ? 'Unsaved changes.' : me?.progress === 'drafting' ? 'Draft saved.' : 'Not saved yet.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => save(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand/40 hover:text-brand disabled:opacity-60"
            >
              <i className={`fas ${busyAction === 'save-sheet' && !confirmingSubmit ? 'fa-circle-notch animate-spin' : 'fa-floppy-disk'}`} />
              Save Draft
            </button>
            {confirmingSubmit ? (
              <>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => setConfirmingSubmit(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => save(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <i className={`fas ${busyAction === 'save-sheet' ? 'fa-circle-notch animate-spin' : 'fa-check'}`} />
                  Confirm submit ({formatTotal(form, result.total)})
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => setConfirmingSubmit(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-brand-dark disabled:opacity-60"
              >
                <i className="fas fa-paper-plane" /> Submit Rating
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function sumSection(values: Record<string, number> | undefined) {
  return Object.values(values ?? {}).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
}

function ScoreBadge({ form, total, passed }: { form: RatingForm; total: number; passed: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-2 text-right ring-1 ring-inset ${passed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-70">Your total</p>
      <p className="text-xl font-black">
        {formatTotal(form, total)} <span className="text-xs font-bold opacity-60">/ {formatTotal(form, form.maxTotal)}</span>
      </p>
      <p className="text-[11px] font-bold">{passed ? form.passVerdict.label : form.failVerdict.label}</p>
    </div>
  );
}

function CriterionInput({
  label,
  maxPoints,
  allowedPoints,
  value,
  disabled,
  onChange
}: {
  label: string;
  maxPoints: number;
  allowedPoints?: number[];
  value: number | undefined;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <p className="text-xs font-bold leading-5 text-slate-700">
        {label} <span className="text-slate-400">({maxPoints} pts)</span>
      </p>
      {allowedPoints ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {allowedPoints.map((points) => (
            <button
              key={points}
              type="button"
              disabled={disabled}
              onClick={() => onChange(value === points ? null : points)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-black transition disabled:cursor-not-allowed ${
                value === points
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-brand/40 disabled:opacity-60'
              }`}
            >
              {CONCEPT_RATING_LEVEL_LABELS[points] ?? points}
              <span className="block text-[10px] font-bold opacity-80">{points}</span>
            </button>
          ))}
        </div>
      ) : (
        <PointsField value={value} maxPoints={maxPoints} disabled={disabled} onChange={onChange} className="mt-2 w-28" />
      )}
    </div>
  );
}

function PointsField({
  value,
  maxPoints,
  disabled,
  onChange,
  className = ''
}: {
  value: number | undefined;
  maxPoints: number;
  disabled: boolean;
  onChange: (value: number | null) => void;
  className?: string;
}) {
  const outOfRange = typeof value === 'number' && (value < 0 || value > maxPoints);
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={maxPoints}
      step="any"
      value={value ?? ''}
      disabled={disabled}
      aria-invalid={outOfRange}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(raw === '' ? null : Number(raw));
      }}
      className={`rounded-lg border bg-white px-3 py-1.5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${
        outOfRange ? 'border-rose-400' : 'border-slate-200 focus:border-brand/40'
      } ${className}`}
    />
  );
}

function IndividualSectionTable({
  section,
  students,
  sheet,
  resultByStudent,
  disabled,
  onChange
}: {
  section: RatingSection;
  students: LiveDefenseState['students'];
  sheet: RatingSheetScores;
  resultByStudent: Record<string, number>;
  disabled: boolean;
  onChange: (studentId: string, sectionKey: string, criterionKey: string, value: number | null) => void;
}) {
  if (!students.length) {
    return <p className="text-sm font-semibold text-slate-500">No students are linked to this group yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="py-2 pr-3 font-black">Student</th>
            {section.criteria.map((criterion) => (
              <th key={criterion.key} className="px-2 py-2 font-bold leading-4">
                {criterion.label} <span className="text-slate-400">({criterion.maxPoints})</span>
              </th>
            ))}
            <th className="px-2 py-2 font-black">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const values = sheet.individual[student.id]?.[section.key];
            return (
              <tr key={student.id}>
                <td className="py-2 pr-3 text-sm font-bold text-slate-800">{student.name}</td>
                {section.criteria.map((criterion) => (
                  <td key={criterion.key} className="px-2 py-2">
                    <PointsField
                      value={values?.[criterion.key]}
                      maxPoints={criterion.maxPoints}
                      disabled={disabled}
                      onChange={(value) => onChange(student.id, section.key, criterion.key, value)}
                      className="w-20"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-sm font-black text-slate-700">
                  {sumSection(values)}/{getSectionMaxPoints(section)}
                  {section.weightPercent !== null ? (
                    <span className="block text-[11px] font-bold text-slate-400">{resultByStudent[student.id] ?? 0}%</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -- Panel board -------------------------------------------------------------

const PROGRESS_META: Record<LivePanelist['progress'], { label: string; className: string }> = {
  'not-started': { label: 'Not started', className: 'bg-slate-100 text-slate-500' },
  drafting: { label: 'Rating…', className: 'bg-blue-50 text-blue-700' },
  submitted: { label: 'Submitted', className: 'bg-emerald-50 text-emerald-700' }
};

function PanelBoardCard({ defense, busyAction, onFinalize }: { defense: LiveDefenseState; busyAction: string | null; onFinalize: () => void }) {
  const form = defense.form;
  const submittedCount = defense.panelists.filter((panelist) => panelist.progress === 'submitted').length;
  const allSubmitted = defense.panelists.length > 0 && submittedCount === defense.panelists.length;
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
          <i className="fas fa-users" /> Panel
        </p>
        <span className="text-xs font-bold text-slate-500">
          {submittedCount}/{defense.panelists.length} submitted
        </span>
      </div>

      <ul className="space-y-2">
        {defense.panelists.map((panelist) => {
          const progress = PROGRESS_META[panelist.progress];
          return (
            <li key={panelist.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {panelist.name}
                  {panelist.isMe ? <span className="ml-1 text-xs text-slate-400">(you)</span> : null}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {panelist.role === 'chair' ? 'Panel Chair' : 'Panel Member'}
                </p>
              </div>
              {form && panelist.result && panelist.progress === 'submitted' ? (
                <span className={`text-sm font-black ${panelist.result.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatTotal(form, panelist.result.total)}
                </span>
              ) : null}
              <span className={`rounded-md px-2 py-1 text-[11px] font-black ${progress.className}`}>{progress.label}</span>
            </li>
          );
        })}
      </ul>

      {form && defense.aggregate ? (
        <div className={`mt-4 rounded-xl p-4 ring-1 ring-inset ${defense.aggregate.passed ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            Panel average ({defense.aggregate.panelistCount} sheet{defense.aggregate.panelistCount === 1 ? '' : 's'})
          </p>
          <p className={`mt-1 text-2xl font-black ${defense.aggregate.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatTotal(form, defense.aggregate.total)} · {defense.aggregate.verdict.label}
          </p>
          {defense.aggregate.students.length && form.sections.some((section) => section.scope === 'individual') ? (
            <ul className="mt-3 space-y-1">
              {defense.aggregate.students.map((student) => (
                <li key={student.studentId} className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{defense.students.find((entry) => entry.id === student.studentId)?.name ?? 'Student'}</span>
                  <span className={student.passed ? 'text-emerald-700' : 'text-rose-700'}>{formatTotal(form, student.total)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {defense.viewer.role === 'chair' && defense.status === 'IN_PROGRESS' ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {!allSubmitted ? (
            <p className="text-xs font-semibold text-slate-500">You can finalize once every panelist, including you, has submitted.</p>
          ) : confirming ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Finalizing closes rating and applies the {form ? 'panel average' : 'panel verdicts'} as the result. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={onFinalize}
                  className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-black text-white shadow-md hover:bg-brand-dark disabled:opacity-60"
                >
                  {busyAction === 'finalize' ? 'Finalizing…' : 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-black text-white shadow-md hover:bg-brand-dark"
            >
              <i className="fas fa-flag-checkered" /> Finalize Defense
            </button>
          )}
        </div>
      ) : null}

      {defense.status === 'COMPLETED' && defense.aggregate && !defense.aggregate.passed && !defense.chairDecision ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          The panel average is below passing. The chair records the next step (redefense, new title, or approve) from Defense Voting.
        </p>
      ) : null}
    </section>
  );
}

// -- Minutes -----------------------------------------------------------------

function MinutesCard({
  defense,
  busyAction,
  onSave,
  onConfirm
}: {
  defense: LiveDefenseState;
  busyAction: string | null;
  onSave: (minutes: string) => Promise<boolean>;
  onConfirm: () => void;
}) {
  const canEdit = (defense.viewer.role === 'secretary' || defense.viewer.role === 'chair') && !defense.minutesConfirmedAt;
  const [draft, setDraft] = useState(defense.minutes || (canEdit ? MINUTES_TEMPLATE : ''));
  const [dirty, setDirty] = useState(false);

  // Pull in the secretary's latest save while this viewer isn't typing.
  useEffect(() => {
    if (!dirty && defense.minutes !== null && defense.minutes !== '') {
      setDraft(defense.minutes);
    }
  }, [defense.minutes, dirty]);

  if (defense.minutes === null) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
          <i className="fas fa-pen-to-square" /> Minutes of the Defense
        </p>
        {defense.minutesConfirmedAt ? (
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">Confirmed by chair</span>
        ) : defense.minutesUpdatedAt ? (
          <span className="text-[11px] font-bold text-slate-400">
            Saved {new Date(defense.minutesUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        ) : null}
      </div>

      {canEdit ? (
        <>
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDirty(true);
            }}
            className="h-80 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] leading-6 text-slate-800 outline-none focus:border-brand/40 focus:bg-white focus:ring-4 focus:ring-brand/10"
          />
          <p className="mt-2 text-[11px] font-semibold text-slate-400">
            List required revisions as numbered items — the group addresses them in Compliance after the defense.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busyAction !== null || !dirty}
              onClick={async () => {
                if (await onSave(draft)) setDirty(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand/40 hover:text-brand disabled:opacity-50"
            >
              <i className={`fas ${busyAction === 'save-minutes' ? 'fa-circle-notch animate-spin' : 'fa-floppy-disk'}`} /> Save Minutes
            </button>
            {defense.viewer.role === 'chair' ? (
              <button
                type="button"
                disabled={busyAction !== null || dirty || !defense.minutes?.trim()}
                onClick={onConfirm}
                title={dirty ? 'Save your changes first.' : undefined}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <i className="fas fa-stamp" /> Confirm as Official
              </button>
            ) : null}
          </div>
        </>
      ) : defense.minutes ? (
        <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-mono text-[13px] leading-6 text-slate-700">
          {defense.minutes}
        </pre>
      ) : (
        <p className="text-sm font-semibold text-slate-500">
          {defense.secretary ? `${defense.secretary.name} hasn't recorded minutes yet.` : 'No secretary is assigned to this defense.'}
        </p>
      )}
    </section>
  );
}
