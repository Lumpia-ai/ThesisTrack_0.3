'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartResponsiveContainer } from '@/components/shared/chart-responsive-container';
import { PROGRAM_HEAD_ADVISERS, PROGRAM_HEAD_PROJECTS, getProgramHeadAnalytics } from '@/components/program-head/program-head-data';
import { loadEvidenceItems } from '@/components/program-head/program-head-evidence';
import {
  PH_CARD_CLASS as CARD_CLASS,
  ProgramHeadAnimatedNumber as AnimatedNumber,
  ProgramHeadModal
} from '@/components/program-head/program-head-primitives';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';

/*
 * Plain four-colour palette, the same one the Research Head dashboard uses:
 * navy, light blue, gold and neutral gray. Each is derived from the system
 * branding tokens (see `.ph-dashboard-page` in program-head-portal.css), so the
 * charts follow the theme set in System Admin → Branding.
 *   navy  → main series / completed / on track
 *   light → secondary series / in progress
 *   gold  → the one thing to look at (pending, at risk, ready)
 *   gray  → inactive / not started
 */
const C = {
  navy: 'var(--ph-c-navy)',
  light: 'var(--ph-c-light)',
  gold: 'var(--ph-c-gold)',
  neutral: 'var(--ph-c-neutral)',
  grid: 'var(--ph-c-grid)',
  tick: 'var(--ph-c-tick)',
  brandText: 'var(--ph-brand-text)'
};

const AXIS_TICK = { fontSize: 11, fontWeight: 600, fill: C.tick };

const RISK_SERIES = [
  { key: 'Behind Schedule', color: C.gold },
  { key: 'At Risk', color: C.light },
  { key: 'On Track', color: C.navy }
] as const;
const RISK_COLORS: Record<string, string> = Object.fromEntries(RISK_SERIES.map((risk) => [risk.key, risk.color]));
const RISK_ORDER: Record<string, number> = Object.fromEntries(RISK_SERIES.map((risk, index) => [risk.key, index]));

const WORKLOAD_SERIES = [
  { key: 'onTrack', label: 'On track', color: C.navy },
  { key: 'atRisk', label: 'At risk', color: C.gold },
  { key: 'completed', label: 'Completed', color: C.light }
] as const;

const TRANSFER_STAGES = [
  { key: 'Pending', label: 'Not yet ready', color: C.neutral },
  { key: 'Ready for Transfer', label: 'Ready', color: C.gold },
  { key: 'Proposed', label: 'Proposed', color: C.light },
  { key: 'Deployed', label: 'Deployed', color: `color-mix(in srgb, ${C.navy} 55%, ${C.light})` },
  { key: 'In Use', label: 'In use', color: C.navy }
] as const;

function Widget({ title, action, children, className = '', bodyClassName = 'p-5' }: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`${CARD_CLASS} ${className}`}>
      <div className="px-5 h-12 shrink-0 border-b border-[var(--border)] flex justify-between items-center gap-3">
        <h3 className="text-[15px] font-bold text-[var(--text)] truncate">{title}</h3>
        {action}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function WidgetLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-xs font-bold hover:underline whitespace-nowrap" style={{ color: C.brandText }}>
      {children} <i className="fas fa-arrow-right text-[9px]"></i>
    </Link>
  );
}

function Legend({ items }: { items: ReadonlyArray<{ label: string; color: string }> }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>{item.label}
        </span>
      ))}
    </div>
  );
}

/** Circular gauge that fills in on mount. */
function GaugeRing({ pct: target, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPct(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--surface-alt)' }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, pct)) / 100)}
          style={{ stroke: color, transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-[var(--text)] tabular-nums">{Math.round(target)}%</div>
    </div>
  );
}

function KpiTile({ label, value, suffix, caption, pct, color, icon, href }: {
  label: string;
  value: number | null; // null while loading
  suffix?: string;
  caption: string;
  pct: number;
  color: string;
  icon: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="min-w-0 flex items-center gap-3">
        <span
          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm"
          style={{ backgroundColor: `color-mix(in srgb, ${C.navy} 10%, transparent)`, color: C.brandText }}
        >
          <i className={`fas ${icon}`}></i>
        </span>
        <div className="min-w-0">
        <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-3xl font-extrabold text-[var(--text)] tracking-tight tabular-nums leading-none">
          {value === null ? <span className="text-[var(--muted)]">—</span> : <AnimatedNumber value={value} />}
          {suffix && value !== null && <span className="text-lg text-[var(--muted)] ml-0.5">{suffix}</span>}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-[var(--muted)]">{caption}</p>
        </div>
      </div>
      <GaugeRing pct={pct} color={color} />
    </>
  );

  const className = `${CARD_CLASS} relative !flex-row items-center justify-between gap-3 p-4 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-shadow duration-200`;
  return href ? <Link href={href} className={className}>{body}</Link> : <div className={className}>{body}</div>;
}

type TooltipEntry = { name?: string; value?: number; color?: string; payload?: Record<string, unknown> & { fill?: string } };

function WorkloadTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.payload?.score as number | null | undefined;
  return (
    <div className="rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)] shadow-lg px-3 py-2 text-xs min-w-[170px]">
      <p className="font-bold text-[var(--text)] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-[var(--muted)]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
          <span>{entry.name}</span>
          <strong className="ml-auto pl-3 text-[var(--text)] tabular-nums">{entry.value}</strong>
        </p>
      ))}
      {typeof score === 'number' && (
        <p className="flex items-center gap-2 text-[var(--muted)] mt-1 pt-1 border-t border-[var(--border)]">
          <i className="fas fa-star text-[9px]" style={{ color: C.gold }}></i>
          <span>Performance score</span>
          <strong className="ml-auto pl-3 text-[var(--text)] tabular-nums">{score}%</strong>
        </p>
      )}
    </div>
  );
}

type DefenseAssignment = {
  id: string;
  groupCode: string;
  groupTitle: string;
  projectTitle: string;
  scheduleType: string;
  scheduledAt: string;
  time: string;
  room: string;
  status: string;
  chairDecision: string | null;
};

type DefenseSummary =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; upcoming: DefenseAssignment[]; scheduled: number; awaitingSchedule: number; awaitingDecision: number };

const UPCOMING_LIMIT = 4;

/** Next defenses from the Defense Scheduler (live data from /api/defense-schedules). */
function UpcomingDefenses() {
  const [summary, setSummary] = useState<DefenseSummary>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/defense-schedules?limit=100', { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) throw new Error('Unable to load schedules');
        const payload = await response.json() as {
          assignments?: DefenseAssignment[];
          scheduleProjects?: Array<{ code: string; isEligible: boolean }>;
        };
        const assignments = payload.assignments ?? [];
        const now = Date.now();
        const scheduled = assignments
          .filter((item) => item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS')
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        const scheduledCodes = new Set(scheduled.map((item) => item.groupCode));
        if (cancelled) return;
        setSummary({
          state: 'ready',
          upcoming: scheduled.filter((item) => new Date(item.scheduledAt).getTime() >= now - 60 * 60 * 1000).slice(0, UPCOMING_LIMIT),
          scheduled: scheduled.length,
          // Has an approved title (so it can be scheduled) but nothing on the calendar yet.
          awaitingSchedule: (payload.scheduleProjects ?? []).filter((group) => group.isEligible && !scheduledCodes.has(group.code)).length,
          // Defense held, panel voted, chair has not recorded a decision.
          awaitingDecision: assignments.filter((item) => item.status === 'COMPLETED' && !item.chairDecision).length
        });
      } catch {
        if (!cancelled) setSummary({ state: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = summary.state === 'ready'
    ? [
        { label: 'Scheduled', value: summary.scheduled, color: C.navy },
        { label: 'To schedule', value: summary.awaitingSchedule, color: C.gold },
        { label: 'To decide', value: summary.awaitingDecision, color: C.light }
      ]
    : [];

  return (
    <Widget title="Upcoming Defenses" action={<WidgetLink href="/program-head/schedule">Scheduler</WidgetLink>} bodyClassName="flex flex-col">
      {summary.state === 'loading' ? (
        <div className="p-5 space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl ph-shimmer"></div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded ph-shimmer"></div>
                <div className="h-2.5 w-1/2 rounded ph-shimmer"></div>
              </div>
            </div>
          ))}
        </div>
      ) : summary.state === 'error' ? (
        <p className="p-5 text-sm text-[var(--muted)]">Schedule data is unavailable right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 border-b border-[var(--border)]">
            {stats.map((stat, index) => (
              <div key={stat.label} className={`px-3 py-3 text-center ${index > 0 ? 'border-l border-[var(--border)]' : ''}`}>
                <p className="text-xl font-extrabold tabular-nums leading-none" style={{ color: stat.value ? stat.color : 'var(--muted)' }}>
                  <AnimatedNumber value={stat.value} />
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>

          {summary.upcoming.length === 0 ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `color-mix(in srgb, ${C.navy} 10%, transparent)`, color: C.brandText }}>
                <i className="fas fa-calendar"></i>
              </span>
              <p className="text-sm font-bold text-[var(--text)]">No upcoming defenses</p>
            </div>
          ) : (
            <ul className="py-1 ph-stagger">
              {summary.upcoming.map((item) => {
                const date = new Date(item.scheduledAt);
                return (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span
                      className="w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center leading-none"
                      style={{ backgroundColor: `color-mix(in srgb, ${C.navy} 10%, transparent)`, color: C.brandText }}
                    >
                      <span className="text-[9px] font-bold uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-base font-extrabold">{date.getDate()}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text)] truncate" title={item.projectTitle || item.groupTitle}>
                        {item.projectTitle || item.groupTitle || item.groupCode}
                      </p>
                      <p className="text-[11px] text-[var(--muted)] truncate">
                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {item.room && ` · ${item.room}`}
                        {item.scheduleType && ` · ${item.scheduleType}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Widget>
  );
}

function ProgressTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const row = payload?.[0]?.payload as { title?: string; code?: string; progress?: number; risk?: string; stage?: string } | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)] shadow-lg px-3 py-2 text-xs max-w-[260px]">
      <p className="font-bold text-[var(--text)] leading-snug">{row.title}</p>
      <p className="text-[var(--muted)] mb-1"><span className="font-mono">{row.code}</span> · {row.stage}</p>
      <p className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[row.risk ?? ''] }}></span>
        <span className="text-[var(--muted)]">{row.risk}</span>
        <strong className="ml-auto pl-3 text-[var(--text)] tabular-nums">{row.progress}%</strong>
      </p>
    </div>
  );
}

export function ProgramHeadDashboard() {
  const [exportOpen, setExportOpen] = useState(false);

  const itProjects = useMemo(() => PROGRAM_HEAD_PROJECTS.filter((project) => project.department === 'IT'), []);
  const itAnalytics = useMemo(() => getProgramHeadAnalytics(itProjects), [itProjects]);

  const total = itAnalytics.totalProjects;
  const pctOf = (value: number) => (total ? (value / total) * 100 : 0);

  // Cumulative: how many projects have reached each stage, so bars narrow like a funnel.
  const funnel = itAnalytics.stageTracking;

  // Most urgent first, so the chart doubles as the "needs attention" list.
  const progressData = useMemo(() => [...itProjects]
    .sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel] || a.progress - b.progress)
    .map((project) => ({
      code: project.code,
      title: project.title,
      progress: project.progress,
      risk: project.riskLevel,
      stage: project.currentStage
    })), [itProjects]);

  const workloadData = useMemo(() => itAnalytics.adviserWorkload.map((load) => ({
    name: load.adviser,
    // Segments must not overlap: an at-risk project is counted once, as at risk.
    onTrack: Math.max(0, load.projects - load.completed - load.riskLoad),
    atRisk: load.riskLoad,
    completed: load.completed,
    score: PROGRAM_HEAD_ADVISERS.find((adviser) => adviser.name === load.adviser)?.overallScore ?? null
  })), [itAnalytics]);

  // Real accreditation evidence, same source and rules as the Accreditation & Evidence page.
  const [evidence, setEvidence] = useState<{ state: 'loading' | 'error' } | { state: 'ready'; ready: number; total: number }>({ state: 'loading' });
  useEffect(() => {
    let cancelled = false;
    loadEvidenceItems()
      .then((items) => {
        if (!cancelled) setEvidence({ state: 'ready', ready: items.filter((item) => item.status === 'ready').length, total: items.length });
      })
      .catch(() => {
        if (!cancelled) setEvidence({ state: 'error' });
      });
    return () => { cancelled = true; };
  }, []);
  const evidencePct = evidence.state === 'ready' && evidence.total ? Math.round((evidence.ready / evidence.total) * 100) : 0;

  const transfer = useMemo(() => TRANSFER_STAGES.map((stage) => ({
    ...stage,
    count: itProjects.filter((project) => project.transferStatus === stage.key).length
  })), [itProjects]);

  return (
    <ProgramHeadShell
      activeNav="dashboard"
      title="Program Head Dashboard"
      description="IT Department | Monitoring and accreditation"
      notificationCount={3}
    >
      <div className="ph-dashboard-page space-y-4">
        {/* Header */}
        <section className="flex flex-wrap items-center justify-between gap-3 ph-anim-fade-in">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">IT Department · AY 2025-2026</p>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: C.brandText }}>Department Overview</h1>
          </div>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white shadow-sm hover:brightness-110 transition-all flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-primary, #003A8F)' }}
          >
            <i className="fas fa-download text-xs"></i> Export
          </button>
        </section>

        {/* KPI gauges */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 ph-stagger">
          <KpiTile
            label="Projects"
            icon="fa-folder-open"
            color={C.navy}
            value={total}
            caption={`${itAnalytics.activeProjects} active · ${itAnalytics.pendingProjects} pending`}
            pct={pctOf(itAnalytics.activeProjects)}
          />
          <KpiTile
            label="Completion"
            icon="fa-flag-checkered"
            color={C.light}
            value={itAnalytics.completionRate}
            suffix="%"
            caption={`${itAnalytics.completedProjects} of ${total} completed`}
            pct={itAnalytics.completionRate}
          />
          <KpiTile
            label="At Risk"
            icon="fa-triangle-exclamation"
            color={C.gold}
            value={itAnalytics.riskExposureCount}
            caption={`${itAnalytics.behindScheduleProjects} behind schedule`}
            pct={itAnalytics.riskExposureRate}
            href="/program-head/progress"
          />
          <KpiTile
            label="Evidence"
            icon="fa-certificate"
            color={C.navy}
            value={evidence.state === 'ready' ? evidencePct : null}
            suffix="%"
            caption={
              evidence.state === 'ready'
                ? `${evidence.ready} of ${evidence.total} files ready`
                : evidence.state === 'error' ? 'unavailable' : 'loading…'
            }
            pct={evidencePct}
            href="/program-head/evidence"
          />
        </div>

        {/* Where projects are · which ones need attention */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 ph-stagger">
          <Widget title="Project Stages Funnel" bodyClassName="p-5 flex flex-col justify-center gap-2.5">
            {funnel.map((stage, index) => (
              <div key={stage.name} className="flex items-center gap-3" title={`${stage.done} of ${stage.total} projects reached ${stage.name}`}>
                <span className="w-20 shrink-0 text-xs font-semibold text-[var(--muted)] truncate">{stage.name}</span>
                <div className="flex-1 flex justify-center">
                  <div
                    className="h-6 rounded-md ph-anim-grow-x"
                    style={{
                      width: `${Math.max(6, stage.pct)}%`,
                      backgroundColor: `color-mix(in srgb, ${C.navy} ${100 - index * 22}%, ${C.light})`,
                      transformOrigin: 'center',
                      ['--i' as string]: index
                    } as CSSProperties}
                  ></div>
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-bold text-[var(--text)] tabular-nums">{stage.done}/{stage.total}</span>
              </div>
            ))}
          </Widget>

          <Widget
            title="Project Progress & Risk"
            className="xl:col-span-2"
            action={<Legend items={RISK_SERIES.map((risk) => ({ label: risk.key, color: risk.color }))} />}
            bodyClassName="px-3 py-3"
          >
            <div style={{ height: Math.max(190, progressData.length * 30 + 30) }}>
              <ChartResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={7}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={C.grid} style={{ stroke: C.grid }} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <YAxis type="category" dataKey="code" width={92} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <RechartsTooltip cursor={{ fill: 'var(--surface-alt)' }} content={<ProgressTooltip />} />
                  <Bar dataKey="progress" radius={[0, 6, 6, 0]} animationDuration={1000} background={{ fill: 'var(--surface-alt)' }}>
                    {progressData.map((row) => {
                      const color = RISK_COLORS[row.risk];
                      // No inline style here: Recharts spreads Cell props onto the background track too,
                      // and a style.fill would paint the full-width track in the bar colour.
                      return <Cell key={row.code} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ChartResponsiveContainer>
            </div>
          </Widget>
        </div>

        {/* What's next · who carries the load · where outputs go */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 ph-stagger">
          <UpcomingDefenses />

          <Widget
            title="Adviser Workload"
            action={<Legend items={WORKLOAD_SERIES} />}
            bodyClassName="px-3 py-3"
          >
            <div style={{ height: Math.max(150, workloadData.length * 32 + 10) }}>
              <ChartResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap={8}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <RechartsTooltip cursor={{ fill: 'var(--surface-alt)' }} content={<WorkloadTooltip />} />
                  {WORKLOAD_SERIES.map((series, index) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.label}
                      stackId="load"
                      fill={series.color}
                      radius={index === WORKLOAD_SERIES.length - 1 ? [0, 6, 6, 0] : 0}
                      animationDuration={900}
                      animationBegin={index * 150}
                    />
                  ))}
                </BarChart>
              </ChartResponsiveContainer>
            </div>
          </Widget>

          <Widget
            title="Technology Transfer Pipeline"
            action={<WidgetLink href="/program-head/transfer">Transfer</WidgetLink>}
            bodyClassName="p-5 flex flex-col justify-center gap-4"
          >
            <div className="flex h-10 w-full rounded-xl overflow-hidden gap-0.5 bg-[var(--surface-alt)] ph-anim-grow-x">
              {transfer.filter((stage) => stage.count > 0).map((stage) => (
                <div
                  key={stage.key}
                  className="h-full hover:brightness-110 transition-[filter]"
                  style={{ width: `${pctOf(stage.count)}%`, backgroundColor: stage.color }}
                  title={`${stage.label}: ${stage.count}`}
                ></div>
              ))}
            </div>
            <ul className="space-y-2">
              {transfer.map((stage) => (
                <li key={stage.key} className="flex items-center gap-2.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: stage.color }}></span>
                  <span className="flex-1 truncate text-[var(--muted)]">{stage.label}</span>
                  <span className="font-bold text-[var(--text)] tabular-nums"><AnimatedNumber value={stage.count} /></span>
                </li>
              ))}
            </ul>
          </Widget>
        </div>
      </div>

      {/* The modal is portalled outside .ph-dashboard-page, so it reads the global branding token directly. */}
      <ProgramHeadModal open={exportOpen} title="Export Department Report" onClose={() => setExportOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--text)] mb-1.5" htmlFor="ph-dashboard-report">Report Type</label>
            <select className="w-full h-11 px-4 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none" id="ph-dashboard-report" defaultValue="Department dashboard summary">
              <option>Department dashboard summary</option>
              <option>IT project inventory</option>
              <option>Accreditation readiness overview</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--text)] mb-1.5" htmlFor="ph-dashboard-format">Format</label>
            <select className="w-full h-11 px-4 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none" id="ph-dashboard-format" defaultValue="PDF Document">
              <option>PDF Document</option>
              <option>Excel Spreadsheet</option>
              <option>CSV Data</option>
            </select>
          </div>
          <div>
            <span className="block text-sm font-bold text-[var(--text)] mb-2">Include Sections</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['KPI summary', 'Project stages funnel', 'Project progress & risk', 'Upcoming defenses', 'Adviser workload', 'Tech-transfer pipeline'].map((section) => (
                <label key={section} className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl ring-1 ring-inset ring-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors">
                  <input defaultChecked type="checkbox" className="w-4 h-4 rounded border-slate-300" style={{ accentColor: 'var(--color-primary)' }} />
                  <span className="text-sm font-medium text-[var(--text)]">{section}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex gap-3 justify-end">
          <button type="button" onClick={() => setExportOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors">Cancel</button>
          <button
            type="button"
            onClick={() => setExportOpen(false)}
            className="px-5 py-2.5 rounded-xl font-bold text-white shadow-md hover:brightness-110 transition-all"
            style={{ backgroundColor: 'var(--color-primary, #003A8F)' }}
          >
            Generate Report
          </button>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
