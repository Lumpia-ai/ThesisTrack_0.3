'use client';

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SystemAdminShell } from '@/components/system-admin/system-admin-shell';
import {
  ActionLink,
  AdminPage,
  EmptyState,
  IconTile,
  type IconTone,
  KpiCard,
  SectionCard,
  TextLink
} from '@/components/system-admin/ui';
import {
  getSystemAdminDashboardMock,
  type DashboardActivity,
  type DashboardAttentionItem,
  type DashboardPortalStatus,
  type DashboardRoleGroup,
  type DashboardSchoolTerm,
  type DashboardSummary,
  type DashboardSummaryMetric,
  type DashboardSummaryMetricKey
} from '@/mocks/system-admin/dashboard';
import styles from './system-admin-dashboard.module.css';

const REFRESH_INTERVAL_MS = 60_000;
const ACTIVITY_LIMIT = 5;

const numberFormat = new Intl.NumberFormat('en-US');
const formatCount = (value: number) => numberFormat.format(value);
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

const ROLE_GROUP_LABELS: Record<DashboardRoleGroup, string> = {
  students: 'Students',
  advisers_panelists: 'Advisers and panelists',
  program_heads: 'Program heads',
  partners: 'Partners',
  other_staff: 'Other staff'
};

const ROLE_GROUP_ICONS: Record<DashboardRoleGroup, string> = {
  students: 'fa-user-graduate',
  advisers_panelists: 'fa-chalkboard-user',
  program_heads: 'fa-user-tie',
  partners: 'fa-handshake',
  other_staff: 'fa-id-badge'
};

const SERVER_STATUS: Record<DashboardPortalStatus['serverStatus'], { label: string; className: string }> = {
  online: { label: 'Server is live', className: `${styles.dotSuccess} ${styles.dotLive}` },
  degraded: { label: 'Server is degraded', className: styles.dotWarning },
  offline: { label: 'Server is down', className: styles.dotError }
};

type ActivityFilter = 'all' | 'accounts' | 'branding';

const ACTIVITY_FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'branding', label: 'Branding' }
];

const matchesFilter = (activity: DashboardActivity, filter: ActivityFilter) =>
  filter === 'all' || (filter === 'branding') === (activity.type === 'branding_updated');

/** School-calendar months, August first, no summer term (matches the order of the monthly data). */
const SCHOOL_MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

/** Month-index ranges [start, end) into SCHOOL_MONTHS. */
const FIRST_SEM: [number, number] = [0, 5]; // Aug–Dec
const SECOND_SEM: [number, number] = [5, 10]; // Jan–May

const SCHOOL_TERMS: { key: DashboardSchoolTerm; label: string; hint: string; months: [number, number] }[] = [
  { key: 'year', label: 'Whole year', hint: 'Aug–May', months: [0, 10] },
  { key: 'first', label: '1st sem', hint: 'Aug–Dec · 4th-year capstone continues', months: FIRST_SEM },
  { key: 'second', label: '2nd sem', hint: 'Jan–May · 3rd-year capstone starts', months: SECOND_SEM }
];

/** "2025–2026" → { first: 2025, second: 2026 }; the 1st semester falls in the first year, the 2nd in the second. */
const schoolYearCalendar = (schoolYear: string) => {
  const [first, second] = schoolYear.split(/[–-]/).map((part) => Number.parseInt(part, 10));
  return { first, second: Number.isFinite(second) ? second : first + 1 };
};

type TermSeries = { values: number[]; labels: string[] };

/** Monthly values for a term of one school year; months not recorded yet (year in progress) are left out. */
function termSeries(monthly: Record<string, number[]>, term: DashboardSchoolTerm, schoolYear: string): TermSeries {
  const [start, end] = (SCHOOL_TERMS.find((item) => item.key === term) ?? SCHOOL_TERMS[0]).months;
  const values = (monthly[schoolYear] ?? []).slice(start, end);
  return { values, labels: SCHOOL_MONTHS.slice(start, start + values.length) };
}

/** `good` says which direction of change is healthy (drives the green/red change indicator). */
const SUMMARY_META: Record<
  DashboardSummaryMetricKey,
  { label: string; icon: string; tone: IconTone; good: 'up' | 'down' | 'neutral' }
> = {
  new_signups: { label: 'New sign-ups', icon: 'fa-user-plus', tone: 'primary', good: 'up' },
  sign_ins: { label: 'Sign-ins', icon: 'fa-right-to-bracket', tone: 'primary', good: 'up' },
  staff_created: { label: 'Staff accounts created', icon: 'fa-id-badge', tone: 'accent', good: 'neutral' },
  suspensions: { label: 'Suspensions', icon: 'fa-user-slash', tone: 'error', good: 'down' },
  restorations: { label: 'Accounts restored', icon: 'fa-rotate-left', tone: 'success', good: 'neutral' },
  password_resets: { label: 'Password resets', icon: 'fa-key', tone: 'accent', good: 'neutral' },
  failed_sign_ins: { label: 'Failed sign-ins', icon: 'fa-triangle-exclamation', tone: 'error', good: 'down' },
  config_changes: { label: 'Settings & branding changes', icon: 'fa-sliders', tone: 'primary', good: 'neutral' }
};

const isTerm = (value: unknown): value is DashboardSchoolTerm => value === 'year' || value === 'first' || value === 'second';
const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/**
 * State remembered in localStorage (per browser). Starts at `initial` on the server and the first
 * client render, then picks up the saved value after mount, so hydration always matches.
 */
function usePersistentState<T>(key: string, initial: T, isValid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) {
          setValue(parsed);
        }
      }
    } catch {
      // Storage blocked or bad JSON: keep the default.
    }
    // isValid is a module-level constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Not persisted; the in-page state still changes.
      }
    },
    [key]
  );

  return [value, update] as const;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Current time, re-read every `intervalMs`. Null until mounted so server and client render the same markup. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

/** Eases from the previous value to `target` (from 0 on first mount). */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reducedMotion()) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;

    const step = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const next = Math.round(from + (target - from) * (1 - (1 - progress) ** 3));
      fromRef.current = next;
      setValue(next);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/**
 * Dashboard data with manual + periodic refresh (paused while the tab is hidden).
 * Mock data for now; replace the body of `load` with a fetch (see PLACEHOLDERS.md).
 */
function useDashboardData() {
  const [data, setData] = useState(getSystemAdminDashboardMock);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  const refresh = useCallback(() => {
    setRefreshing(true);
    window.clearTimeout(timeoutRef.current);
    // Short delay stands in for network latency so the refresh is visible.
    timeoutRef.current = window.setTimeout(() => {
      setData(getSystemAdminDashboardMock());
      setUpdatedAt(new Date());
      setRefreshing(false);
    }, 600);
  }, []);

  useEffect(() => {
    setUpdatedAt(new Date());

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(timeoutRef.current);
    };
  }, [refresh]);

  return { data, updatedAt, refreshing, refresh };
}

/** Under an hour → "12 min ago", today → "10:42 AM", yesterday → "Yesterday", otherwise "Sep 21". */
function formatWhen(iso: string, now: Date | null) {
  const date = new Date(iso);

  if (!now) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDiff === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatUpdated(updatedAt: Date | null, now: Date | null) {
  if (!updatedAt || !now) {
    return 'Updating…';
  }

  const minutes = Math.floor((now.getTime() - updatedAt.getTime()) / 60_000);
  return minutes < 1 ? 'Updated just now' : `Updated ${minutes} min ago`;
}

function describeActivity(activity: DashboardActivity) {
  switch (activity.type) {
    case 'account_created':
      return { icon: 'fa-user-plus', tone: 'primary' as IconTone, text: `Staff account created for ${activity.subjectName} (${activity.subjectRole})` };
    case 'account_suspended':
      return {
        icon: 'fa-ban',
        tone: 'error' as IconTone,
        text: `${activity.subjectName} suspended for ${activity.durationDays} ${plural(activity.durationDays, 'day', 'days')}`
      };
    case 'account_restored':
      return { icon: 'fa-rotate-left', tone: 'success' as IconTone, text: `${activity.subjectName} restored` };
    case 'branding_updated':
      return { icon: 'fa-palette', tone: 'accent' as IconTone, text: `Branding ${activity.area} updated` };
  }
}

function describeAttention(item: DashboardAttentionItem) {
  switch (item.kind) {
    case 'suspensions_ending':
      return {
        icon: 'fa-hourglass-half',
        label: `${plural(item.count, 'suspension ends', 'suspensions end')} this week`,
        action: 'Review',
        actionLabel: 'Review suspensions ending this week'
      };
    case 'temporary_passwords':
      return {
        icon: 'fa-key',
        label: "staff haven't changed their temporary password",
        action: 'View',
        actionLabel: 'View staff with temporary passwords'
      };
    case 'new_registrations':
      return {
        icon: 'fa-user-graduate',
        label: `new student ${plural(item.count, 'registration', 'registrations')} today`,
        action: 'View',
        actionLabel: "View today's new student registrations"
      };
  }
}

/** Ticks every second; kept separate so only the clock re-renders that often. */
function LiveClock() {
  const now = useNow(1000);

  if (!now) {
    return <span className={styles.clock}>&nbsp;</span>;
  }

  return (
    <time className={styles.clock} dateTime={now.toISOString()}>
      {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      <span className={styles.clockSep} aria-hidden="true">·</span>
      <span className={styles.clockTime}>
        {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
      </span>
    </time>
  );
}

function CountUp({ value }: { value: number }) {
  return <>{formatCount(useCountUp(value))}</>;
}

/** Daily bars, oldest first with today last (highlighted); bars grow in once mounted. */
function DailyBars({ values, now }: { values: number[]; now: Date | null }) {
  const max = Math.max(...values, 1);
  const dayLabel = (index: number) => {
    if (!now) {
      return '';
    }

    const day = new Date(now);
    day.setDate(day.getDate() - (values.length - 1 - index));
    return day.toLocaleDateString('en-US', { weekday: 'narrow' });
  };

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartCaption}>Sign-ups · last 7 days</figcaption>
      <div className={styles.bars} role="img" aria-label={`New sign-ups per day, last 7 days: ${values.join(', ')}`}>
        {values.map((value, index) => (
          <div key={index} className={styles.barCol}>
            <span className={styles.barValue}>{value}</span>
            <div
              className={`${styles.dayBar} ${index === values.length - 1 ? styles.dayBarToday : ''}`}
              style={{ '--h': `${now ? (value / max) * 100 : 0}%` } as CSSProperties}
            />
            <span className={styles.barDay}>{dayLabel(index)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** Ring gauge of active vs suspended accounts, with a two-row legend. */
function ActiveRing({ active, suspended, ready }: { active: number; suspended: number; ready: boolean }) {
  const total = active + suspended;
  const activePct = total ? (active / total) * 100 : 0;

  return (
    <div className={styles.ringWrap}>
      <svg className={styles.ring} viewBox="0 0 36 36" role="img" aria-label={`${Math.round(activePct)}% of accounts are active`}>
        {/* r = 15.915 gives a circumference of 100, so dash lengths are percentages. */}
        <circle className={styles.ringTrack} cx="18" cy="18" r="15.915" />
        <circle
          className={styles.ringValue}
          cx="18"
          cy="18"
          r="15.915"
          transform="rotate(-90 18 18)"
          strokeDasharray={`${ready ? activePct.toFixed(1) : 0} 100`}
        />
        <text className={styles.ringPct} x="18" y="19.2">
          {Math.round(activePct)}%
        </text>
        <text className={styles.ringSub} x="18" y="24">
          active
        </text>
      </svg>
      <ul className={styles.legend}>
        <li>
          <span className={`${styles.legendSwatch} ${styles.swatchSuccess}`} aria-hidden="true" />
          Active
          <b className={styles.legendValue}>{formatCount(active)}</b>
        </li>
        <li>
          <span className={`${styles.legendSwatch} ${styles.swatchError}`} aria-hidden="true" />
          Suspended
          <b className={styles.legendValue}>{formatCount(suspended)}</b>
        </li>
      </ul>
    </div>
  );
}

const STAFF_SWATCH: Partial<Record<DashboardRoleGroup, string>> = {
  advisers_panelists: styles.swatchPrimary,
  program_heads: styles.swatchAccent
};

/** Stacked bar + legend of admin-issued staff accounts by role. */
function StaffBreakdown({ groups, ready }: { groups: { group: DashboardRoleGroup; count: number }[]; ready: boolean }) {
  const total = groups.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={styles.breakdown}>
      <div className={styles.stack} aria-hidden="true">
        {groups.map((item) => (
          <div
            key={item.group}
            className={`${styles.stackPart} ${STAFF_SWATCH[item.group] ?? styles.swatchMuted}`}
            style={{ '--share': `${ready && total ? (item.count / total) * 100 : 0}%` } as CSSProperties}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {groups.map((item) => (
          <li key={item.group}>
            <span className={`${styles.legendSwatch} ${STAFF_SWATCH[item.group] ?? styles.swatchMuted}`} aria-hidden="true" />
            {ROLE_GROUP_LABELS[item.group]}
            <b className={styles.legendValue}>{formatCount(item.count)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Monthly bar chart for a summary card, labelled by month. */
function MiniBars({ id, series, label }: { id: string; series: TermSeries; label: string }) {
  const { values, labels } = series;
  const max = Math.max(...values, 1);

  if (!values.length) {
    return (
      <figure id={id} className={styles.miniChart}>
        <figcaption className={styles.miniEmpty}>No data for this period yet</figcaption>
      </figure>
    );
  }

  return (
    <figure id={id} className={styles.miniChart}>
      <div
        className={styles.miniBars}
        role="img"
        aria-label={`${label}: ${values.map((value, index) => `${labels[index]} ${value}`).join(', ')}`}
      >
        {values.map((value, index) => (
          <span
            key={index}
            className={styles.miniBar}
            style={{ '--h': `${(value / max) * 100}%`, '--i': index } as CSSProperties}
            title={`${labels[index]}: ${formatCount(value)}`}
          />
        ))}
      </div>
      <figcaption className={styles.miniAxis} aria-hidden="true">
        {labels.map((month) => (
          <span key={month}>{month.charAt(0)}</span>
        ))}
      </figcaption>
    </figure>
  );
}

type SummaryScope = {
  schoolYear: string;
  /** One school year older: the comparison period (null for the oldest year). */
  previousYear: string | null;
  term: DashboardSchoolTerm;
};

function SummaryCard({
  metric,
  scope,
  chartOpen,
  onToggleChart
}: {
  metric: DashboardSummaryMetric;
  scope: SummaryScope;
  chartOpen: boolean;
  onToggleChart: () => void;
}) {
  const meta = SUMMARY_META[metric.key];
  const series = termSeries(metric.monthly, scope.term, scope.schoolYear);
  const total = series.values.reduce((sum, value) => sum + value, 0);

  // Compare with the same months one school year earlier, trimmed to the months available now so a
  // year in progress isn't measured against a complete one.
  const previousSeries = scope.previousYear ? termSeries(metric.monthly, scope.term, scope.previousYear) : null;
  const previous = previousSeries
    ? previousSeries.values.slice(0, series.values.length).reduce((sum, value) => sum + value, 0)
    : null;
  const change = previous ? ((total - previous) / previous) * 100 : null;
  const direction = previous === null || total === previous ? 'flat' : total > previous ? 'up' : 'down';
  const deltaTone =
    direction === 'flat' || meta.good === 'neutral' ? styles.deltaNeutral : direction === meta.good ? styles.deltaGood : styles.deltaBad;
  const chartId = `sa-summary-chart-${metric.key}`;

  let deltaText: string;
  if (previous === null) {
    deltaText = 'No earlier year';
  } else if (direction === 'flat') {
    deltaText = 'No change';
  } else if (change === null) {
    deltaText = 'New';
  } else {
    deltaText = Math.abs(change) < 1 ? '<1%' : `${Math.abs(change).toFixed(0)}%`;
  }

  return (
    <li className={`${styles.summaryCard} ${chartOpen ? styles.summaryCardOpen : ''}`}>
      <div className={styles.summaryHead}>
        <IconTile icon={meta.icon} tone={meta.tone} />
        <span className={styles.summaryLabel}>{meta.label}</span>
        <button
          type="button"
          className={`${styles.chartToggle} ${chartOpen ? styles.chartToggleOn : ''}`}
          aria-expanded={chartOpen}
          aria-controls={chartOpen ? chartId : undefined}
          aria-label={`${chartOpen ? 'Hide' : 'Show'} ${meta.label.toLowerCase()} chart`}
          title={chartOpen ? 'Hide chart' : 'Show monthly chart'}
          onClick={onToggleChart}
        >
          <i className={`fas ${chartOpen ? 'fa-chart-simple' : 'fa-chart-column'}`} aria-hidden="true" />
        </button>
      </div>

      <strong className={styles.summaryValue}>
        <CountUp value={total} />
      </strong>

      <span className={`${styles.summaryDelta} ${deltaTone}`}>
        <i
          className={`fas ${direction === 'up' ? 'fa-arrow-trend-up' : direction === 'down' ? 'fa-arrow-trend-down' : 'fa-minus'}`}
          aria-hidden="true"
        />
        {deltaText}
        {scope.previousYear ? <span className={styles.summaryDeltaNote}>vs S.Y. {scope.previousYear}</span> : null}
      </span>

      {chartOpen ? <MiniBars id={chartId} series={series} label={`${meta.label} per month`} /> : null}
    </li>
  );
}

/** Header subtitle: which months the cards cover, with calendar years. */
function describeScope(scope: SummaryScope) {
  const { first, second } = schoolYearCalendar(scope.schoolYear);

  switch (scope.term) {
    case 'first':
      return `S.Y. ${scope.schoolYear} · 1st semester (Aug–Dec ${first})`;
    case 'second':
      return `S.Y. ${scope.schoolYear} · 2nd semester (Jan–May ${second})`;
    default:
      return `S.Y. ${scope.schoolYear} · Aug ${first} – May ${second}`;
  }
}

/** School-year summary cards; charts open per card or all at once, and the section can be hidden. */
function ActivitySummary({
  summary,
  schoolYear,
  onSchoolYearChange,
  term,
  onTermChange,
  showCharts,
  onShowChartsChange,
  hidden,
  onHiddenChange
}: {
  summary: DashboardSummary;
  schoolYear: string;
  onSchoolYearChange: (schoolYear: string) => void;
  term: DashboardSchoolTerm;
  onTermChange: (term: DashboardSchoolTerm) => void;
  showCharts: boolean;
  onShowChartsChange: (show: boolean) => void;
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
}) {
  const { schoolYears, metrics } = summary;
  const [openCharts, setOpenCharts] = useState<Set<DashboardSummaryMetricKey>>(new Set());

  // A remembered school year that no longer has data falls back to the current one.
  const activeYear = schoolYears.includes(schoolYear) ? schoolYear : schoolYears[0];
  const yearIndex = schoolYears.indexOf(activeYear);
  // schoolYears is newest first, so the older year is the next index.
  const scope: SummaryScope = {
    schoolYear: activeYear,
    previousYear: schoolYears[yearIndex + 1] ?? null,
    term
  };

  // "Show charts" opens every card's chart; turning it off closes them all. Keyed on the metric
  // names (not the array) so the periodic data refresh doesn't reset charts the user opened.
  const metricKeys = metrics.map((metric) => metric.key).join(',');

  useEffect(() => {
    setOpenCharts(showCharts ? new Set(metricKeys.split(',') as DashboardSummaryMetricKey[]) : new Set());
  }, [showCharts, metricKeys]);

  const toggleChart = (key: DashboardSummaryMetricKey) => {
    setOpenCharts((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section className={`${styles.summarySection} ${hidden ? styles.summaryCollapsed : ''}`} aria-labelledby="sa-activity-summary">
      <div className={styles.summaryBar}>
        <div className={styles.summaryTitle}>
          <h2 id="sa-activity-summary">Activity summary</h2>
          <span>
            {describeScope(scope)}
          </span>
          {hidden ? <span className={styles.hiddenTag}>Hidden</span> : null}
        </div>

        <div className={styles.summaryControls}>
          {!hidden ? (
            <>
              <label className={styles.yearSelect}>
                <i className="fas fa-graduation-cap" aria-hidden="true" />
                <span className={styles.srOnly}>School year</span>
                {/* sa-select-bare: the pill wrapper draws the border, so the dark theme leaves this select unfilled. */}
                <select className="sa-select-bare" value={activeYear} onChange={(event) => onSchoolYearChange(event.target.value)}>
                  {schoolYears.map((year, index) => (
                    <option key={year} value={year}>
                      S.Y. {year}
                      {index === 0 ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.segmented} role="group" aria-label="Term">
                {SCHOOL_TERMS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.segment} ${term === item.key ? styles.segmentActive : ''}`}
                    aria-pressed={term === item.key}
                    title={item.hint}
                    onClick={() => onTermChange(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {/* Stays visible when the summary is hidden: it also shows the charts in the cards above. */}
          <button
            type="button"
            className={`${styles.pillButton} ${showCharts ? styles.pillButtonOn : ''}`}
            aria-pressed={showCharts}
            onClick={() => onShowChartsChange(!showCharts)}
          >
            <i className="fas fa-chart-column" aria-hidden="true" />
            {showCharts ? 'Hide charts' : 'Show charts'}
          </button>
          <button
            type="button"
            className={styles.pillButton}
            aria-expanded={!hidden}
            aria-controls="sa-summary-grid"
            onClick={() => onHiddenChange(!hidden)}
          >
            <i className={`fas ${hidden ? 'fa-eye' : 'fa-eye-slash'}`} aria-hidden="true" />
            {hidden ? 'Show summary' : 'Hide'}
          </button>
        </div>
      </div>

      {!hidden ? (
        <ul id="sa-summary-grid" className={styles.summaryGrid}>
          {metrics.map((metric) => (
            <SummaryCard
              key={metric.key}
              metric={metric}
              scope={scope}
              chartOpen={openCharts.has(metric.key)}
              onToggleChart={() => toggleChart(metric.key)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function SystemAdminDashboard() {
  const { data, updatedAt, refreshing, refresh } = useDashboardData();
  const { kpis, usersByRole, recentActivity, needsAttention, portalStatus, summary } = data;

  // Drives relative times and "Updated … ago"; null until mounted.
  const now = useNow(30_000);
  const ready = now !== null;
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  // Summary filter and chart visibility, remembered per browser. Charts start hidden.
  // School year defaults to the current (newest) one; an outdated saved value falls back in ActivitySummary.
  const [summaryYear, setSummaryYear] = usePersistentState('sa-dashboard-school-year', summary.schoolYears[0] ?? '', isString);
  // Whole year by default; a saved value no longer offered (e.g. 'summer' or 'cycle') is ignored.
  const [summaryTerm, setSummaryTerm] = usePersistentState<DashboardSchoolTerm>('sa-dashboard-term', 'year', isTerm);
  const [showCharts, setShowCharts] = usePersistentState('sa-dashboard-charts', false, isBoolean);
  const [summaryHidden, setSummaryHidden] = usePersistentState('sa-dashboard-summary-hidden', false, isBoolean);

  const totalUsers = useCountUp(kpis.totalUsers);
  const suspended = useCountUp(kpis.suspendedAccounts);
  const staff = useCountUp(kpis.staffAccounts);

  const suspendedShare = kpis.totalUsers ? ((kpis.suspendedAccounts / kpis.totalUsers) * 100).toFixed(1) : '0';
  const roleTotal = usersByRole.reduce((sum, role) => sum + role.count, 0);
  const server = SERVER_STATUS[portalStatus.serverStatus];
  const visibleActivity = recentActivity.filter((activity) => matchesFilter(activity, activityFilter)).slice(0, ACTIVITY_LIMIT);
  const warningCount = needsAttention.filter((item) => item.tone === 'warning').length;

  return (
    <SystemAdminShell
      activeNav="dashboard"
      title="Dashboard"
      description="Accounts, access, and portal status at a glance."
    >
      <AdminPage wide>
        <div className={`${styles.topBar} ${styles.reveal}`}>
          <dl className={styles.statusBar} aria-label="Portal status">
            <div className={`${styles.statusItem} ${styles.statusPrimary}`}>
              <dt className={styles.srOnly}>Server</dt>
              <dd className={styles.serverLine}>
                <span className={`${styles.dot} ${server.className}`} aria-hidden="true" />
                {server.label}
              </dd>
              <dt className={styles.srOnly}>Date and time</dt>
              <dd className={styles.clockLine}>
                <i className="fas fa-calendar-day" aria-hidden="true" />
                <LiveClock />
              </dd>
            </div>
            <div className={styles.statusItem}>
              <i className="fas fa-graduation-cap" aria-hidden="true" />
              <dt>AY</dt>
              <dd>{portalStatus.academicYear}</dd>
            </div>
            <div className={styles.statusItem}>
              <i className="fas fa-user-graduate" aria-hidden="true" />
              <dt>Registration</dt>
              <dd>{portalStatus.studentRegistration === 'open' ? 'Open' : 'Closed'}</dd>
            </div>
            <div className={styles.statusItem}>
              <i className="fas fa-screwdriver-wrench" aria-hidden="true" />
              <dt>Maintenance</dt>
              <dd className={portalStatus.maintenanceMode ? styles.valueError : styles.valueSuccess}>
                {portalStatus.maintenanceMode ? 'On' : 'Off'}
              </dd>
            </div>
            <div className={styles.statusItem}>
              <i className="fas fa-palette" aria-hidden="true" />
              <dt>Branding updated</dt>
              <dd>
                <time dateTime={portalStatus.lastBrandingUpdate}>{formatWhen(portalStatus.lastBrandingUpdate, now)}</time>
              </dd>
            </div>
          </dl>
          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={refresh}
              disabled={refreshing}
              aria-label={`Refresh dashboard. ${formatUpdated(updatedAt, now)}`}
            >
              <i className={`fas fa-rotate ${refreshing ? styles.spin : ''}`} aria-hidden="true" />
              <span aria-live="polite">{refreshing ? 'Refreshing…' : formatUpdated(updatedAt, now)}</span>
            </button>
            <ActionLink href="/system-admin/users?create=1" icon="fa-user-plus" variant="primary">
              Create staff account
            </ActionLink>
          </div>
        </div>

        {/* Active accounts and expiring suspensions are covered by the helpers below and by Needs attention. */}
        <section className={styles.kpiGrid} aria-label="Account summary">
          <KpiCard
            label="Total users"
            icon="fa-users"
            href="/system-admin/users"
            value={formatCount(totalUsers)}
            helper={`+${formatCount(kpis.newUsersThisWeek)} this week`}
            helperTone="success"
          >
            {showCharts ? <DailyBars values={kpis.signupsLast7Days} now={now} /> : null}
          </KpiCard>
          <KpiCard
            label="Suspended"
            icon="fa-user-slash"
            iconTone="error"
            accent="accent"
            href="/system-admin/users"
            value={formatCount(suspended)}
            valueTone="error"
            helper={`${suspendedShare}% of all users`}
          >
            {showCharts ? <ActiveRing active={kpis.activeAccounts} suspended={kpis.suspendedAccounts} ready={ready} /> : null}
          </KpiCard>
          <KpiCard
            label="Staff accounts"
            icon="fa-id-badge"
            iconTone="accent"
            accent="accent"
            href="/system-admin/users"
            value={formatCount(staff)}
            helper="Issued by admin"
          >
            {showCharts ? <StaffBreakdown groups={kpis.staffByRole} ready={ready} /> : null}
          </KpiCard>
        </section>

        <div className={styles.reveal} style={{ '--delay': '150ms' } as CSSProperties}>
          <ActivitySummary
            summary={summary}
            schoolYear={summaryYear}
            onSchoolYearChange={setSummaryYear}
            term={summaryTerm}
            onTermChange={setSummaryTerm}
            showCharts={showCharts}
            onShowChartsChange={setShowCharts}
            hidden={summaryHidden}
            onHiddenChange={setSummaryHidden}
          />
        </div>

        <div className={styles.twoCol}>
          <SectionCard title="Users by role" titleId="sa-users-by-role">
            <ul className={styles.list}>
              {usersByRole.map((role) => {
                const share = roleTotal ? (role.count / roleTotal) * 100 : 0;
                // Keep very small non-zero groups visible as a sliver; the count shows the real number.
                const width = role.count > 0 ? Math.max(share, 0.75) : 0;

                return (
                  <li key={role.group} className={styles.row}>
                    <IconTile icon={ROLE_GROUP_ICONS[role.group]} tone={role.group === 'partners' ? 'accent' : 'primary'} />
                    <div className={styles.roleInfo}>
                      <div className={styles.roleRowHead}>
                        <span>{ROLE_GROUP_LABELS[role.group]}</span>
                        <span className={styles.roleCount}>
                          {formatCount(role.count)}
                          <span className={styles.roleShare}>{share < 1 && share > 0 ? '<1' : Math.round(share)}%</span>
                        </span>
                      </div>
                      <div className={styles.barTrack} aria-hidden="true">
                        <div
                          className={`${styles.barFill} ${role.group === 'partners' ? styles.barFillAccent : ''}`}
                          style={{ '--share': `${ready ? width.toFixed(1) : 0}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className={styles.cardFooter}>
              <TextLink href="/system-admin/users" label="Manage users">
                Manage users <i className="fas fa-arrow-right" aria-hidden="true" />
              </TextLink>
            </div>
          </SectionCard>

          <SectionCard
            title="Recent activity"
            titleId="sa-recent-activity"
            accent="accent"
            action={
              <div className={styles.segmented} role="group" aria-label="Filter activity">
                {ACTIVITY_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`${styles.segment} ${activityFilter === filter.key ? styles.segmentActive : ''}`}
                    aria-pressed={activityFilter === filter.key}
                    onClick={() => setActivityFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            }
          >
            {visibleActivity.length ? (
              // Keyed by filter so the entrance animation replays when switching.
              <ul key={activityFilter} className={styles.list}>
                {visibleActivity.map((activity, index) => {
                  const { icon, tone, text } = describeActivity(activity);

                  return (
                    <li key={activity.id} className={`${styles.row} ${styles.rowEnter}`} style={{ '--i': index } as CSSProperties}>
                      <IconTile icon={icon} tone={tone} />
                      <span className={styles.rowText}>{text}</span>
                      <time className={styles.rowMeta} dateTime={activity.occurredAt}>
                        {formatWhen(activity.occurredAt, now)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon="fa-clock-rotate-left" message="No recent activity" />
            )}
            <div className={styles.cardFooter}>
              <TextLink href="/system-admin/logs" label="View all account activity">
                View all activity <i className="fas fa-arrow-right" aria-hidden="true" />
              </TextLink>
            </div>
          </SectionCard>
        </div>

        <div className={`${styles.reveal} ${styles.attentionWrap}`} style={{ '--delay': '240ms' } as CSSProperties}>
          <SectionCard
            title="Needs attention"
            titleId="sa-needs-attention"
            accent="accent"
            action={
              warningCount ? (
                <span className={styles.countBadge}>
                  {warningCount} {plural(warningCount, 'item', 'items')} to review
                </span>
              ) : null
            }
          >
            {needsAttention.length ? (
              <ul className={styles.attentionGrid}>
                {needsAttention.map((item) => {
                  const { icon, label, action, actionLabel } = describeAttention(item);
                  const warning = item.tone === 'warning';

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-label={`${item.count} ${label}. ${actionLabel}`}
                        className={`${styles.attentionTile} ${warning ? styles.attentionWarning : ''}`}
                      >
                        <IconTile icon={icon} tone={warning ? 'accent' : 'primary'} />
                        <div className={styles.attentionText}>
                          <b className={styles.attentionCount}>
                            <CountUp value={item.count} />
                          </b>
                          <div className={styles.attentionLabel}>{label}</div>
                        </div>
                        <div className={styles.attentionAction} aria-hidden="true">
                          {action} <i className="fas fa-arrow-right" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon="fa-circle-check" message="Nothing needs attention right now" />
            )}
          </SectionCard>
        </div>
      </AdminPage>
    </SystemAdminShell>
  );
}
