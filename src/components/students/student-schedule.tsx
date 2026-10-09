'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import {
  buildStudentScheduleModel,
  formatMonthDayLabel,
  formatWeekRangeLabel,
  formatWeekdayLabel,
  startOfDay,
  type AlertTone,
  type ScheduleItemType,
  type StudentScheduleItem
} from '@/lib/student-schedule';

const TYPE_STYLES: Record<ScheduleItemType, string> = {
  // One colour per type, used everywhere an item appears on this page.
  Meeting: 'bg-teal-50 text-teal-700',
  Consultation: 'bg-blue-50 text-blue-700',
  Deadline: 'bg-rose-50 text-rose-700',
  Event: 'bg-purple-50 text-purple-700',
  Reminder: 'bg-amber-50 text-amber-700'
};

// Solid colour per type for dots and the legend (matches TYPE_STYLES).
const TYPE_DOTS: Record<ScheduleItemType, string> = {
  Consultation: 'bg-blue-500',
  Meeting: 'bg-teal-500',
  Deadline: 'bg-rose-500',
  Reminder: 'bg-amber-500',
  Event: 'bg-purple-500'
};

const ALERT_CARD_STYLES: Record<AlertTone, string> = {
  neutral: 'bg-[var(--surface-alt)] text-[var(--text)]',
  info: 'bg-blue-50 text-blue-800',
  success: 'bg-green-50 text-emerald-800',
  warning: 'bg-yellow-50 text-amber-900',
  danger: 'bg-red-50 text-rose-900'
};

const ALERT_BAR_STYLES: Record<AlertTone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500'
};

type ScheduleViewFilter = 'all' | 'today' | 'deadline' | 'consultation' | 'event';

const TYPE_ICONS: Record<ScheduleItemType, string> = {
  Meeting: 'fa-users',
  Consultation: 'fa-comments',
  Deadline: 'fa-hourglass-half',
  Event: 'fa-calendar-day',
  Reminder: 'fa-bell'
};

const FILTER_OPTIONS: Array<{ id: ScheduleViewFilter; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: 'fa-layer-group' },
  { id: 'today', label: 'Today', icon: 'fa-clock' },
  { id: 'deadline', label: 'Deadlines', icon: 'fa-hourglass-half' },
  { id: 'consultation', label: 'Consultations', icon: 'fa-comments' },
  { id: 'event', label: 'Events', icon: 'fa-calendar-day' }
];

// Defenses and presentations use the stage icon from Project Stages so the same
// stage looks the same everywhere; everything else uses its type icon.
const STAGE_ICON_RULES: Array<{ pattern: RegExp; icon: string }> = [
  { pattern: /concept/i, icon: 'fa-lightbulb' },
  { pattern: /proposal/i, icon: 'fa-file-lines' },
  { pattern: /development|system|prototype/i, icon: 'fa-laptop-code' },
  { pattern: /final/i, icon: 'fa-landmark' },
  { pattern: /completion|repository|archive/i, icon: 'fa-graduation-cap' }
];

function getItemIcon(item: StudentScheduleItem) {
  if (item.type === 'Event' || item.type === 'Meeting') {
    const match = STAGE_ICON_RULES.find((rule) => rule.pattern.test(item.title));
    if (match) return match.icon;
  }
  return TYPE_ICONS[item.type];
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function getScheduleActionHref(item: StudentScheduleItem) {
  if (item.type === 'Deadline') return '/students/project-files';
  if (item.relatedPhase?.toLowerCase().includes('repository')) return '/students/repository';
  if (item.source === 'milestone') return '/students/milestones';
  return '/students/notifications';
}

function Pill({
  label,
  icon,
  className
}: {
  label: string;
  icon?: string;
  className: string;
}) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      {icon ? <i className={`fas ${icon} text-[10px] opacity-70`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function EmptyState({ copy = 'No schedule items available' }: { copy?: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl bg-[var(--surface-alt)] px-6 py-10 text-center text-sm font-medium text-[var(--muted)]">
      {copy}
    </div>
  );
}

function Meta({ icon, value }: { icon: string; value?: string }) {
  if (!value) return null;

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
      <i className={`fas ${icon} text-[11px] text-[var(--text-meta)]`} aria-hidden="true" />
      {value}
    </span>
  );
}

function eventTone(item: StudentScheduleItem) {
  if (item.status === 'completed') {
    return {
      border: 'border-emerald-400',
      dot: 'bg-emerald-500',
      panel: 'bg-green-50'
    };
  }

  if (item.status === 'overdue') {
    return {
      border: 'border-rose-400',
      dot: 'bg-rose-500',
      panel: 'bg-red-50'
    };
  }

  return {
    border: 'border-amber-400',
    dot: 'bg-amber-500',
    panel: 'bg-yellow-50'
  };
}

const CARD = 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm';

function CardHeading({ kicker, title, trailing }: { kicker: string; title: string; trailing?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">{kicker}</span>
        <h3 className="text-lg font-bold tracking-tight text-[var(--text)]">{title}</h3>
      </div>
      {trailing}
    </div>
  );
}

// Placeholder venues add noise to every row ("TBA · Scheduled Venue").
function getPlaceLabel(item: StudentScheduleItem) {
  const location = /^(tba|tbd|n\/a|scheduled venue)$/i.test(item.location.trim()) ? '' : item.location;
  return [location, item.mode].filter(Boolean).join(' · ');
}

// The same item can come through twice (e.g. a schedule row and its stage
// deadline with identical title and time) — show it once.
function dedupeItems(items: StudentScheduleItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.title}|${item.dayKey}|${item.timeLabel}|${item.type}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupByDay(items: StudentScheduleItem[]) {
  const groups: Array<{ dayKey: string; date: Date; items: StudentScheduleItem[] }> = [];

  [...items]
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && last.dayKey === item.dayKey) {
        last.items.push(item);
      } else {
        groups.push({ dayKey: item.dayKey, date: new Date(item.date), items: [item] });
      }
    });

  return groups;
}

const AGENDA_GROUPS: Array<{ id: 'overdue' | 'today' | 'upcoming' | 'completed'; label: string; className: string }> = [
  { id: 'overdue', label: 'Overdue', className: 'text-rose-700' },
  { id: 'today', label: 'Today', className: 'text-amber-700' },
  { id: 'upcoming', label: 'Upcoming', className: 'text-[var(--primary)]' },
  { id: 'completed', label: 'Completed', className: 'text-emerald-700' }
];

// One list, grouped by status and then by day: the date sits on the left once
// per day, and status is shown once per group instead of on every row.
// showGroupHeaders: off where the surrounding card already names the group (Completed).
function AgendaList({ items, showGroupHeaders = true }: { items: StudentScheduleItem[]; showGroupHeaders?: boolean }) {
  const unique = dedupeItems(items);

  return (
    <div className="flex flex-col gap-5">
      {AGENDA_GROUPS.map((group) => {
        const groupItems = unique.filter((item) => item.status === group.id);
        if (!groupItems.length) return null;

        return (
          <section key={group.id}>
            {showGroupHeaders ? (
            <h4 className={cx('mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest', group.className)}>
              {group.label}
              <span className="rounded-full bg-[var(--surface-alt)] px-2 py-0.5 text-[10px] text-[var(--muted)]">{groupItems.length}</span>
            </h4>
            ) : null}

            <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
              {groupByDay(groupItems).map((day) => (
                <div key={day.dayKey} className="flex gap-4 px-4 py-3">
                  <div className="w-12 shrink-0 text-center">
                    <span className="block text-[10px] font-bold uppercase text-[var(--text-meta)]">{formatWeekdayLabel(day.date)}</span>
                    <span className={cx('block text-xl font-black leading-tight', group.id === 'overdue' ? 'text-rose-600' : 'text-[var(--text)]')}>
                      {day.date.getDate()}
                    </span>
                    <span className="block text-[10px] font-semibold text-[var(--muted)]">
                      {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(day.date)}
                    </span>
                  </div>

                  <ul className="flex min-w-0 flex-1 flex-col gap-1">
                    {day.items.map((item) => {
                      const place = getPlaceLabel(item);

                      return (
                        <li key={item.id}>
                          <Link
                            prefetch={false}
                            href={getScheduleActionHref(item)}
                            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--surface-alt)]"
                          >
                            <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TYPE_STYLES[item.type])}>
                              <i className={`fas ${getItemIcon(item)} text-xs`} aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <strong className="block truncate text-sm font-bold text-[var(--text)] group-hover:text-[var(--primary)]">
                                {item.title}
                              </strong>
                              <span className="block truncate text-xs text-[var(--muted)]">
                                {item.type} · {item.timeLabel}
                                {place ? ` · ${place}` : ''}
                              </span>
                            </span>
                            <i className="fas fa-chevron-right text-[10px] text-[var(--text-meta)] opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function StudentSchedule({ data }: { data: StudentDashboardData }) {
  const [referenceDate, setReferenceDate] = useState(() => startOfDay(data.dashboard?.snapshotAt || new Date()));
  const [activeFilter, setActiveFilter] = useState<ScheduleViewFilter>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    setReferenceDate(startOfDay(new Date()));
  }, []);

  const model = useMemo(() => buildStudentScheduleModel(data, referenceDate), [data, referenceDate]);
  const filteredItems = useMemo(() => {
    if (activeFilter === 'today') return model.todayItems;
    if (activeFilter === 'deadline') return model.activeItems.filter((item) => item.type === 'Deadline');
    if (activeFilter === 'consultation') return model.activeItems.filter((item) => item.type === 'Consultation' || item.type === 'Meeting');
    if (activeFilter === 'event') return model.activeItems.filter((item) => item.type === 'Event' || item.type === 'Reminder');

    return model.activeItems;
  }, [activeFilter, model.activeItems, model.todayItems]);

  const filterCounts: Record<ScheduleViewFilter, number> = {
    all: model.activeItems.length,
    today: model.todayItems.length,
    deadline: model.activeItems.filter((item) => item.type === 'Deadline').length,
    consultation: model.activeItems.filter((item) => item.type === 'Consultation' || item.type === 'Meeting').length,
    event: model.activeItems.filter((item) => item.type === 'Event' || item.type === 'Reminder').length
  };

  // Only alerts that ask for attention; neutral/info notes just add noise.
  const attentionAlerts = model.alerts.filter((alert) => alert.tone === 'danger' || alert.tone === 'warning').slice(0, 3);
  const next = model.nextUpcomingEvent;
  // Week calendar shows today by default (or the first day with something on it).
  const selectedCell =
    model.weeklyPlannerCells.find((cell) => cell.dayKey === selectedDayKey) ??
    model.weeklyPlannerCells.find((cell) => cell.isToday) ??
    model.weeklyPlannerCells.find((cell) => cell.items.length) ??
    model.weeklyPlannerCells[0];

  return (
    <div className="student-schedule-page">
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Schedule</span>
              </span>
            </div>
            <h1>Schedule</h1>
          </div>
        </div>
      </header>

      <div className="page-body flex w-full flex-col gap-4">
        {/* Next up + anything that needs attention */}
        {/* Left: what's next + what needs attention. Right: this week's calendar. */}
        <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,1fr)]">
          {/* Last card stretches so both columns end on the same line. */}
          <div className="flex min-w-0 flex-col gap-4 [&>*:last-child]:flex-1">
            <article className={cx(CARD, 'border-t-[3px] border-t-[var(--primary)]')}>
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Next up</span>
              {next ? (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                    <span className="text-[10px] font-bold uppercase">{formatWeekdayLabel(new Date(next.date))}</span>
                    <span className="text-lg font-black leading-none">{formatMonthDayLabel(new Date(next.date))}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black tracking-tight text-[var(--text)]">{next.title}</h2>
                      <Pill label={next.type} icon={getItemIcon(next)} className={TYPE_STYLES[next.type]} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Meta icon="fa-clock" value={`${next.dateLabel} · ${next.timeLabel}`} />
                      <Meta icon="fa-location-dot" value={next.location} />
                      <Meta icon="fa-compass" value={next.mode} />
                    </div>
                  </div>
                  <Link
                    prefetch={false}
                    href={getScheduleActionHref(next)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                  >
                    Details
                    <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">Nothing scheduled yet. Consultations, deadlines and defenses appear here once they’re set.</p>
              )}
            </article>

            {attentionAlerts.length ? (
              <article className={CARD}>
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Needs attention</span>
                <ul className="mt-3 flex flex-col gap-2">
                  {attentionAlerts.map((alert) => (
                    <li key={alert.id} className={cx('flex items-start gap-2.5 rounded-lg px-3 py-2', ALERT_CARD_STYLES[alert.tone])}>
                      <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', ALERT_BAR_STYLES[alert.tone])} aria-hidden="true" />
                      <span className="min-w-0">
                        <strong className="block text-xs font-bold">{alert.label}</strong>
                        <span className="block text-xs leading-relaxed opacity-90">{alert.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </div>

          {/* Week calendar: pick a day to see what's on it. */}
          <article className={cx(CARD, 'flex flex-col')}>
            <CardHeading kicker="This week" title={formatWeekRangeLabel(model.weekStart, model.weekEnd)} />
            <div className="grid grid-cols-7 gap-1.5">
              {model.weeklyPlannerCells.map((cell) => {
                const isSelected = cell.dayKey === selectedCell?.dayKey;

                return (
                  <button
                    key={cell.dayKey}
                    type="button"
                    onClick={() => setSelectedDayKey(cell.dayKey)}
                    aria-pressed={isSelected}
                    className={cx(
                      'flex flex-col items-center gap-1 rounded-xl border py-2 transition',
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : cell.isToday
                          ? 'border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <span className={cx('text-[10px] font-bold uppercase', isSelected ? 'text-white/80' : 'text-[var(--text-meta)]')}>
                      {formatWeekdayLabel(cell.day).slice(0, 3)}
                    </span>
                    <span className="text-base font-black leading-none">{cell.day.getDate()}</span>
                    <span className="flex h-1.5 items-center gap-0.5">
                      {cell.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className={cx('h-1.5 w-1.5 rounded-full', isSelected ? 'bg-white' : TYPE_DOTS[item.type])}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedCell ? (
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <p className="mb-2 text-xs font-bold text-[var(--muted)]">
                  {selectedCell.isToday ? 'Today · ' : ''}
                  {formatWeekdayLabel(selectedCell.day)}, {formatMonthDayLabel(selectedCell.day)}
                </p>
                {selectedCell.items.length ? (
                  <ul className="flex flex-col gap-2">
                    {selectedCell.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          prefetch={false}
                          href={getScheduleActionHref(item)}
                          className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/40"
                        >
                          <span className={cx('h-2 w-2 shrink-0 rounded-full', TYPE_DOTS[item.type])} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-[13px] font-bold text-[var(--text)]">{item.title}</strong>
                            <span className="block text-[11px] text-[var(--muted)]">{item.type} · {item.timeLabel}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--text-meta)]">Nothing scheduled.</p>
                )}
              </div>
            ) : null}
          </article>
        </section>

        {/* Agenda */}
        <article className={CARD}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Agenda</span>
              <h3 className="text-lg font-bold tracking-tight text-[var(--text)]">Your schedule items</h3>
              {/* Colour key for the item types. */}
              <ul className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {(['Consultation', 'Meeting', 'Deadline', 'Reminder', 'Event'] as const).map((type) => (
                  <li key={type} className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]">
                    <span className={cx('h-2 w-2 rounded-full', TYPE_DOTS[type])} aria-hidden="true" />
                    {type}
                  </li>
                ))}
              </ul>
            </div>
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-[var(--surface-alt)] p-1" role="tablist" aria-label="Filter agenda">
              {FILTER_OPTIONS.map((option) => {
                const active = activeFilter === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveFilter(option.id)}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
                      active ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
                    )}
                  >
                    {option.label}
                    <span className={cx('text-[10px]', active ? 'text-[var(--primary)]' : 'text-[var(--text-meta)]')}>{filterCounts[option.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {filteredItems.length ? <AgendaList items={filteredItems} /> : <EmptyState copy="No schedule items match this view" />}
        </article>

        {/* Completed — kept for reference, collapsed by default */}
        <article className={CARD}>
          <button
            type="button"
            onClick={() => setShowCompleted((current) => !current)}
            aria-expanded={showCompleted}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Completed</span>
              <span className="text-sm font-bold text-[var(--text)]">
                {model.completedItems.length} past item{model.completedItems.length === 1 ? '' : 's'}
              </span>
            </span>
            <i className={`fas ${showCompleted ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs text-[var(--text-meta)]`} aria-hidden="true" />
          </button>
          {showCompleted ? (
            model.completedItems.length ? (
              <div className="mt-4">
                <AgendaList items={model.completedItems} showGroupHeaders={false} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No completed items yet.</p>
            )
          ) : null}
        </article>
      </div>
    </div>
  );
}
