'use client';

import Link from 'next/link';
import { memo, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartResponsiveContainer } from '@/components/shared/chart-responsive-container';
import { DASH_COLORS, type DashListItem, type DashProgressRow, type DashSlice } from '@/components/adviser/shared/config/dashboard-types';
import type { AdviserDashboardAnalytics } from '@/lib/mock/adviser-dashboard';

/** `color` is the stat's semantic tone, derived from its value (see the dashboard's color legend). */
export type HeroStat = { id: string; icon: string; label: string; value: string; href: string; color: string };

const toneStyle = (color: string) => ({ '--tone': color }) as CSSProperties;

/** False on the first paint, true right after: lets meters animate from zero to their value. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted;
}

export function DashHero({ stats }: { stats: HeroStat[] }) {
  return (
    <section className="adviser-dash-hero" aria-label="Overview">
      {stats.map((stat) => (
        <Link key={stat.id} href={stat.href} prefetch={false} style={toneStyle(stat.color)}>
          <span className="adviser-dash-hero-icon">
            <i aria-hidden="true" className={`fas ${stat.icon}`} />
          </span>
          <span className="adviser-dash-hero-copy">
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </span>
        </Link>
      ))}
    </section>
  );
}

export function DashCard({
  title,
  meta,
  linkHref,
  className,
  children
}: {
  title: string;
  meta?: string;
  linkHref?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className ? `adviser-dash-card ${className}` : 'adviser-dash-card'}>
      <header className="adviser-dash-card-head">
        <h2>{title}</h2>
        {meta ? <span className="adviser-dash-card-meta">{meta}</span> : null}
        {linkHref ? (
          <Link href={linkHref} prefetch={false} aria-label={`Open ${title}`}>
            View
            <i aria-hidden="true" className="fas fa-arrow-right" />
          </Link>
        ) : null}
      </header>
      <div className="adviser-dash-card-body">{children}</div>
    </section>
  );
}

function EmptyState({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="adviser-dash-empty">
      <span aria-hidden="true">
        <i className={`fas ${icon}`} />
      </span>
      <p>{children}</p>
    </div>
  );
}

/** Single-value radial meter: the hero figure for a card. */
export const ProgressGauge = memo(function ProgressGauge({
  value,
  color,
  caption,
  facts
}: {
  value: number;
  color: string;
  caption: string;
  facts: Array<{ label: string; hint?: string; value: string; color: string }>;
}) {
  const mounted = useMounted();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="adviser-dash-gauge">
      <div className="adviser-dash-gauge-ring" style={toneStyle(color)} role="img" aria-label={`${clamped}% ${caption}`}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle className="adviser-dash-gauge-track" cx="64" cy="64" r={radius} />
          <circle
            className="adviser-dash-gauge-fill"
            cx="64"
            cy="64"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - (mounted ? clamped : 0) / 100)}
          />
        </svg>
        <span>
          <strong>{clamped}%</strong>
          <small>{caption}</small>
        </span>
      </div>
      <dl className="adviser-dash-gauge-facts">
        {facts.map((fact) => (
          <div key={fact.label} title={fact.hint}>
            <dt>
              <span className="adviser-dash-swatch" style={{ background: fact.color }} aria-hidden="true" />
              {fact.label}
              {fact.hint ? <small>{fact.hint}</small> : null}
            </dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
});

type TooltipRow = Record<string, string | number>;

function ChartTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TooltipRow }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="adviser-dash-tooltip">
      <strong>{row.value}</strong>
      <span>{row.label}</span>
    </div>
  );
}

export const StatusDonut = memo(function StatusDonut({
  slices,
  totalLabel,
  emptyMessage
}: {
  slices: DashSlice[];
  totalLabel: string;
  emptyMessage: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (!total) return <EmptyState icon="fa-chart-pie">{emptyMessage}</EmptyState>;
  const visible = slices.filter((slice) => slice.value > 0);

  return (
    <div className="adviser-dash-donut">
      <div className="adviser-dash-donut-chart" role="img" aria-label={`${total} ${totalLabel}`}>
        <ChartResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={visible}
              dataKey="value"
              nameKey="label"
              innerRadius="74%"
              outerRadius="100%"
              paddingAngle={visible.length > 1 ? 3 : 0}
              cornerRadius={4}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={700}
            >
              {visible.map((slice) => (
                // Colors are CSS variables, which resolve in `style` but not in SVG presentation attributes.
                <Cell key={slice.key} style={{ fill: slice.color }} />
              ))}
            </Pie>
          </PieChart>
        </ChartResponsiveContainer>
        <span className="adviser-dash-donut-total">
          <strong>{total}</strong>
          <small>{totalLabel}</small>
        </span>
      </div>
      <ul className="adviser-dash-legend">
        {slices.map((slice) => (
          <li key={slice.key} className={slice.value ? undefined : 'is-zero'}>
            <span className="adviser-dash-swatch" style={{ background: slice.color }} aria-hidden="true" />
            <span>{slice.label}</span>
            <strong>{slice.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const StatusBars = memo(function StatusBars({ slices }: { slices: DashSlice[] }) {
  const mounted = useMounted();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <ul className="adviser-dash-bars">
      {slices.map((slice) => {
        const share = total ? Math.round((slice.value / total) * 100) : 0;
        return (
          <li key={slice.key} className={slice.value ? undefined : 'is-zero'}>
            <div className="adviser-dash-bars-head">
              <span>
                <span className="adviser-dash-swatch" style={{ background: slice.color }} aria-hidden="true" />
                {slice.label}
              </span>
              <strong>{slice.value}</strong>
            </div>
            <span className="adviser-dash-bars-track">
              {slice.value ? <span style={{ width: mounted ? `${share}%` : 0, background: slice.color }} /> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
});

export const GroupProgressList = memo(function GroupProgressList({ rows }: { rows: DashProgressRow[] }) {
  const mounted = useMounted();
  if (!rows.length) return <EmptyState icon="fa-users">No groups assigned yet.</EmptyState>;

  return (
    <ul className="adviser-dash-groups">
      {rows.map((row) => (
        <li key={row.id}>
          <span className="adviser-dash-groups-code">{row.name}</span>
          <span className="adviser-dash-groups-copy">
            <strong>{row.title}</strong>
            <small>{row.detail}</small>
          </span>
          <span className="adviser-dash-groups-meter" role="img" aria-label={`${row.progress}% complete`}>
            <span className="adviser-dash-groups-track">
              <span style={{ width: mounted ? `${row.progress}%` : 0, background: row.progressColor }} />
            </span>
            <strong>{row.progress}%</strong>
          </span>
          <span className="adviser-dash-status">
            <span className="adviser-dash-swatch" style={{ background: row.status.color }} aria-hidden="true" />
            {row.status.label}
          </span>
        </li>
      ))}
    </ul>
  );
});

export const AgendaList = memo(function AgendaList({
  sections,
  emptyMessage
}: {
  sections: Array<{ id: string; label: string; icon: string; items: DashListItem[] }>;
  emptyMessage: string;
}) {
  const filled = sections.filter((section) => section.items.length);
  if (!filled.length) return <EmptyState icon="fa-mug-hot">{emptyMessage}</EmptyState>;

  return (
    <div className="adviser-dash-agenda">
      {filled.map((section) => (
        <div key={section.id}>
          <h3>
            {section.label}
            <span>{section.items.length}</span>
          </h3>
          <ul>
            {section.items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} prefetch={false}>
                  {item.date ? (
                    <span className="adviser-dash-date">
                      <small>{item.date.month}</small>
                      <strong>{item.date.day}</strong>
                    </span>
                  ) : (
                    <span className="adviser-dash-date is-icon">
                      <i aria-hidden="true" className={`fas ${section.icon}`} />
                    </span>
                  )}
                  <span className="adviser-dash-agenda-copy">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <i aria-hidden="true" className="fas fa-chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
});

/* ---------- Analytics charts ---------- */

// Chart colors are CSS variables; SVG marks get them through classes (see adviser-dashboard.css),
// because presentation attributes don't reliably resolve var().
const AXIS_TICK = { fontSize: 11 };

type SeriesTooltipRow = { label: string } & Record<string, string | number>;

function SeriesTooltip({
  active,
  payload,
  series
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: SeriesTooltipRow }>;
  series: Array<{ key: string; label: string; color: string }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="adviser-dash-tooltip">
      <span>{row.label}</span>
      {series.map((item) => (
        <span key={item.key} className="adviser-dash-tooltip-row">
          <span className="adviser-dash-swatch" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
          <strong>{row[item.key]}</strong>
        </span>
      ))}
    </div>
  );
}

const ACTIVITY_SERIES = [
  { key: 'submitted', label: 'Submitted', color: DASH_COLORS.warning, className: 'is-submitted' },
  { key: 'reviewed', label: 'Reviewed', color: DASH_COLORS.good, className: 'is-reviewed' }
] as const;

export const ActivityChart = memo(function ActivityChart({ weeks }: { weeks: AdviserDashboardAnalytics['weeklyActivity'] }) {
  const totals = ACTIVITY_SERIES.map((series) => ({
    ...series,
    total: weeks.reduce((sum, week) => sum + week[series.key], 0)
  }));
  if (!weeks.length || totals.every((series) => series.total === 0)) {
    return <EmptyState icon="fa-chart-line">No submissions in the last 8 weeks.</EmptyState>;
  }

  return (
    <div className="adviser-dash-series">
      <ul className="adviser-dash-series-legend">
        {totals.map((series) => (
          <li key={series.key}>
            <span className="adviser-dash-swatch" style={{ background: series.color }} aria-hidden="true" />
            {series.label}
            <strong>{series.total}</strong>
          </li>
        ))}
      </ul>
      <div className="adviser-dash-chart" role="img" aria-label={`Weekly submissions and reviews over ${weeks.length} weeks`}>
        <ChartResponsiveContainer width="100%" height="100%">
          <LineChart data={weeks} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} className="adviser-dash-grid" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} className="adviser-dash-axis" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} className="adviser-dash-axis" />
            <Tooltip cursor={{ className: 'adviser-dash-cursor' }} content={<SeriesTooltip series={[...ACTIVITY_SERIES]} />} />
            {ACTIVITY_SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                className={`adviser-dash-line ${series.className}`}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, className: `adviser-dash-dot ${series.className}` }}
                activeDot={{ r: 5, strokeWidth: 2, className: `adviser-dash-dot ${series.className}` }}
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ChartResponsiveContainer>
      </div>
    </div>
  );
});

function formatDays(days: number) {
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  return `${days % 1 === 0 ? days : days.toFixed(1)}d`;
}

export const TurnaroundChart = memo(function TurnaroundChart({ turnaround }: { turnaround: AdviserDashboardAnalytics['turnaround'] }) {
  if (!turnaround.reviewedCount || turnaround.medianDays === null) {
    return <EmptyState icon="fa-stopwatch">No reviews in the last 90 days.</EmptyState>;
  }

  return (
    <div className="adviser-dash-turnaround">
      <div className="adviser-dash-figure">
        <strong>{formatDays(turnaround.medianDays)}</strong>
        <small>median across {turnaround.reviewedCount} review{turnaround.reviewedCount === 1 ? '' : 's'}</small>
      </div>
      <div className="adviser-dash-chart" role="img" aria-label={`Review turnaround: median ${formatDays(turnaround.medianDays)}`}>
        <ChartResponsiveContainer width="100%" height="100%">
          <BarChart data={turnaround.buckets} margin={{ top: 18, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} interval={0} className="adviser-dash-axis" />
            <Tooltip cursor={{ className: 'adviser-dash-cursor' }} content={<SeriesTooltip series={[{ key: 'count', label: 'Reviews', color: DASH_COLORS.series }]} />} />
            <Bar
              dataKey="count"
              className="adviser-dash-bar"
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              label={{ position: 'top', className: 'adviser-dash-bar-label', fontSize: 11 }}
              animationDuration={700}
            >
              {turnaround.buckets.map((bucket) => (
                <Cell key={bucket.key} style={{ fill: DASH_COLORS.series }} />
              ))}
            </Bar>
          </BarChart>
        </ChartResponsiveContainer>
      </div>
    </div>
  );
});

export const MilestoneCompletion = memo(function MilestoneCompletion({
  milestones
}: {
  milestones: AdviserDashboardAnalytics['milestoneCompletion'];
}) {
  const mounted = useMounted();
  if (!milestones.length) return <EmptyState icon="fa-list-check">No project stage checkpoints yet.</EmptyState>;

  return (
    <ul className="adviser-dash-meters">
      {milestones.map((milestone) => {
        const share = milestone.total ? Math.round((milestone.completed / milestone.total) * 100) : 0;
        return (
          <li key={milestone.id}>
            <span className="adviser-dash-meters-label" title={milestone.title}>
              {milestone.title}
            </span>
            <span className="adviser-dash-meters-track" role="img" aria-label={`${milestone.completed} of ${milestone.total} checkpoints complete`}>
              <span style={{ width: mounted ? `${share}%` : 0, background: DASH_COLORS.good }} />
            </span>
            <strong>
              {milestone.completed}
              <small>/{milestone.total}</small>
            </strong>
          </li>
        );
      })}
    </ul>
  );
});

export const SubmissionTypes = memo(function SubmissionTypes({ types }: { types: AdviserDashboardAnalytics['submissionTypes'] }) {
  const mounted = useMounted();
  if (!types.length) return <EmptyState icon="fa-folder-open">No files uploaded yet.</EmptyState>;
  const max = Math.max(...types.map((type) => type.count));

  return (
    <ul className="adviser-dash-meters">
      {types.map((type) => (
        <li key={type.label}>
          <span className="adviser-dash-meters-label" title={type.label}>
            {type.label}
          </span>
          <span className="adviser-dash-meters-track is-plain">
            <span style={{ width: mounted ? `${(type.count / max) * 100}%` : 0, background: DASH_COLORS.series }} />
          </span>
          <strong>{type.count}</strong>
        </li>
      ))}
    </ul>
  );
});
