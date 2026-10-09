'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { getProjectFileCategoryLabel } from '@/components/students/student-project-files.shared';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type HistoryFilterKey = 'all' | 'submissions' | 'revisions' | 'approvals' | 'milestones' | 'files';
type HistoryEventFilterKey = Exclude<HistoryFilterKey, 'all'>;
type HistoryPriority = 'major' | 'minor';

type StudentHistoryEntry = {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  sourceLabel: string;
  eventLabel: string;
  statusLabel: string;
  statusTone: BadgeTone;
  route?: string;
  actionLabel?: string;
  icon: string;
  tone: BadgeTone;
  details: string[];
  filters: HistoryEventFilterKey[];
  priority: HistoryPriority;
};

type TimelineDayGroup = {
  key: string;
  label: string;
  weekday: string;
  dayNumber: string;
  monthStamp: string;
  entries: StudentHistoryEntry[];
};

type TimelineMonthGroup = {
  key: string;
  label: string;
  total: number;
  days: TimelineDayGroup[];
};

const HISTORY_FILTERS: Array<{ key: HistoryFilterKey; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: 'fa-layer-group' },
  { key: 'submissions', label: 'Submissions', icon: 'fa-paper-plane' },
  { key: 'revisions', label: 'Revisions', icon: 'fa-rotate-right' },
  { key: 'approvals', label: 'Approvals', icon: 'fa-circle-check' },
  { key: 'milestones', label: 'Project Stages', icon: 'fa-timeline' },
  { key: 'files', label: 'Files', icon: 'fa-folder-open' }
];

const BADGE_TONE_STYLES: Record<BadgeTone, string> = {
  neutral: 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700'
};

const ICON_TONE_STYLES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-alt)] text-[var(--muted)]',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-blue-100 text-[#003A8F]'
};

const ACCENT_BORDER_STYLES: Record<BadgeTone, string> = {
  neutral: 'border-l-slate-300',
  success: 'border-l-emerald-400',
  warning: 'border-l-amber-400',
  danger: 'border-l-rose-400',
  info: 'border-l-blue-400'
};

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatDisplayLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatHistoryMonth(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(value));
}

function formatHistoryDay(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getStatusTone(status: string): BadgeTone {
  // Raw Prisma enum values (e.g. "UNDER_REVIEW", "NEEDS_REVISION") use
  // underscores; the match lists below are space-separated multi-word
  // phrases — normalize so an unformatted raw status still matches instead
  // of silently falling through to the 'info' default.
  const normalized = status.toLowerCase().replace(/_/g, ' ');

  if (['approved', 'completed', 'reviewed', 'resolved', 'confirmed', 'active', 'recognized'].includes(normalized)) {
    return 'success';
  }

  if (['pending', 'pending review', 'under review', 'upcoming', 'submitted', 'proposed', 'ongoing', 'resubmitted'].includes(normalized)) {
    return 'warning';
  }

  if (['needs revision', 'returned for revision', 'danger'].includes(normalized)) {
    return 'danger';
  }

  return 'info';
}

function uniqueHistoryFilters(filters: Array<HistoryEventFilterKey | undefined | false>) {
  return Array.from(new Set(filters.filter(Boolean) as HistoryEventFilterKey[]));
}

function compactDetails(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function getPriorityRank(priority: HistoryPriority) {
  return priority === 'major' ? 0 : 1;
}

function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${BADGE_TONE_STYLES[tone]}`}>
      {icon ? <i className={`fas ${icon} text-[10px]`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function buildHistoryEntries(data: StudentDashboardData): StudentHistoryEntry[] {
  const titleSubmissions =
    data.titleRegistration.submissions?.length
      ? data.titleRegistration.submissions
      : [
          {
            id: data.titleRegistration.id,
            proposalLabel: 'Proposal 01',
            proposedTitle: data.titleRegistration.proposedTitle,
            registrationStatus: data.titleRegistration.registrationStatus,
            category: data.titleRegistration.category,
            revisionHistory: data.titleRegistration.revisionHistory
          }
        ];
  const titleEntries: StudentHistoryEntry[] = titleSubmissions.flatMap((submission) =>
    submission.revisionHistory
      .filter((entry) => entry.status.toLowerCase().includes('submit'))
      .map((entry) => ({
        id: `history-title-${submission.id}-${entry.id}`,
        timestamp: entry.date,
        title: `${submission.proposalLabel} submitted`,
        description: entry.note,
        actor: entry.reviewedBy,
        sourceLabel: 'Title Submission',
        eventLabel: 'Submission',
        statusLabel: entry.status,
        statusTone: getStatusTone(entry.status),
        route: '/students/title-submission',
        actionLabel: 'Open Title Submission',
        icon: 'fa-paper-plane',
        tone: 'info' as BadgeTone,
        details: compactDetails([
          submission.registrationStatus,
          submission.category,
          submission.proposedTitle
        ]),
        filters: uniqueHistoryFilters(['submissions']),
        priority: 'major' as HistoryPriority
      }))
  );

  const majorFileCategories = new Set(['proposal', 'chapter-3', 'system-files', 'presentation-files', 'award-recognition']);

  const documentEntries: StudentHistoryEntry[] = data.documents.map((document) => {
    const reviewStatus = document.reviewStatus || formatDisplayLabel(document.status);
    const normalizedStatus = reviewStatus.toLowerCase();
    const isApproval = normalizedStatus.includes('approved') || normalizedStatus.includes('reviewed');
    const isRevision = normalizedStatus.includes('revision');
    const isPending = normalizedStatus.includes('pending');

    return {
      id: `history-document-${document.id}`,
      timestamp: document.created_at,
      title: `Uploaded ${document.fileName}`,
      description: `${document.uploadedBy} added ${document.fileName} to the shared project workspace for review and tracking.`,
      actor: document.uploadedBy,
      sourceLabel: 'Project Files',
      eventLabel: isRevision ? 'Revision' : isApproval ? 'Approval' : 'File',
      statusLabel: reviewStatus,
      statusTone: getStatusTone(reviewStatus),
      route: '/students/project-files',
      actionLabel: 'Open Project Files',
      icon: isRevision ? 'fa-file-pen' : isApproval ? 'fa-file-circle-check' : 'fa-file-arrow-up',
      tone: isRevision ? 'warning' : isApproval ? 'success' : isPending ? 'warning' : 'info',
      details: compactDetails([getProjectFileCategoryLabel(document.category), document.fileType, document.sizeLabel]),
      filters: uniqueHistoryFilters(['files', isRevision ? 'revisions' : undefined, isApproval ? 'approvals' : undefined]),
      priority: majorFileCategories.has(document.category) || isRevision || isPending ? 'major' : 'minor'
    };
  });

  const reportEntries: StudentHistoryEntry[] = data.progressReports.map((entry) => {
    const reportStatus = entry.statusDisplay || entry.status;
    const normalizedStatus = reportStatus.toLowerCase();
    const isApproval = normalizedStatus.includes('reviewed') || normalizedStatus.includes('approved');
    const isRevision = normalizedStatus.includes('revision');

    return {
      id: `history-report-${entry.id}`,
      timestamp: entry.created_at,
      title: entry.title,
      description: entry.progressDescription,
      actor: data.profile.fullName,
      sourceLabel: 'Progress Reports',
      eventLabel: isRevision ? 'Revision' : 'Submission',
      statusLabel: reportStatus,
      statusTone: getStatusTone(reportStatus),
      route: '/students/progress-reports',
      actionLabel: 'Open Progress Reports',
      icon: 'fa-clipboard-check',
      tone: isApproval ? 'success' : isRevision ? 'warning' : 'info',
      details: compactDetails([`${entry.percentageCompleted}% complete`, reportStatus]),
      filters: uniqueHistoryFilters(['submissions', isRevision ? 'revisions' : undefined, isApproval ? 'approvals' : undefined]),
      priority: 'major'
    };
  });

  const presentationEntries: StudentHistoryEntry[] = data.presentations.map((entry) => {
    const eventStack = `${entry.eventName} ${entry.eventType}`.toLowerCase();
    const isDefense = eventStack.includes('defense') || eventStack.includes('presentation');

    return {
      id: `history-presentation-${entry.id}`,
      timestamp: entry.date,
      title: entry.eventName,
      description: entry.description,
      actor: 'Project Team',
      sourceLabel: 'Academic Activity',
      eventLabel: isDefense ? 'Defense' : 'Project Stage',
      statusLabel: entry.achievement ? 'Recognized' : 'Completed',
      statusTone: entry.achievement ? 'success' : 'info',
      route: '/students/project-overview',
      actionLabel: 'Open Project Overview',
      icon: entry.achievement ? 'fa-trophy' : 'fa-person-chalkboard',
      tone: entry.achievement ? 'success' : 'info',
      details: compactDetails([entry.eventType, entry.scope, entry.achievement || entry.venue]),
      filters: uniqueHistoryFilters(['milestones', entry.achievement ? 'approvals' : undefined]),
      priority: 'major'
    };
  });

  return [
    ...titleEntries,
    ...documentEntries,
    ...reportEntries,
    ...presentationEntries
  ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

export function StudentHistory({ data }: { data: StudentDashboardData }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<HistoryFilterKey>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-refresh data logic removed
  useEffect(() => {
    return () => {};
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const historyEntries = useMemo(() => buildHistoryEntries(data), [data]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return historyEntries.filter((entry) => {
      if (selectedFilter !== 'all' && !entry.filters.includes(selectedFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [entry.title, entry.description, entry.actor, entry.sourceLabel, entry.eventLabel, entry.statusLabel, ...entry.details]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [historyEntries, searchTerm, selectedFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<HistoryEventFilterKey, number> = {
      submissions: 0,
      revisions: 0,
      approvals: 0,
      milestones: 0,
      files: 0
    };

    historyEntries.forEach((entry) => {
      entry.filters.forEach((filterKey) => {
        counts[filterKey] += 1;
      });
    });

    return counts;
  }, [historyEntries]);

  const timelineGroups = useMemo<TimelineMonthGroup[]>(() => {
    const monthMap = new Map<string, { label: string; days: Map<string, TimelineDayGroup> }>();

    filteredEntries.forEach((entry) => {
      const timestamp = new Date(entry.timestamp);
      const monthKey = getMonthKey(timestamp);
      const dayKey = getDateKey(timestamp);

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          label: formatHistoryMonth(entry.timestamp),
          days: new Map()
        });
      }

      const monthGroup = monthMap.get(monthKey)!;

      if (!monthGroup.days.has(dayKey)) {
        monthGroup.days.set(dayKey, {
          key: dayKey,
          label: formatHistoryDay(entry.timestamp),
          weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(timestamp),
          dayNumber: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(timestamp),
          monthStamp: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(timestamp),
          entries: []
        });
      }

      monthGroup.days.get(dayKey)!.entries.push(entry);
    });

    return Array.from(monthMap.entries()).map(([key, monthGroup]) => {
      const days = Array.from(monthGroup.days.values()).map((dayGroup) => ({
        ...dayGroup,
        entries: [...dayGroup.entries].sort((left, right) => {
          const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority);
          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
        })
      }));

      return {
        key,
        label: monthGroup.label,
        total: days.reduce((sum, day) => sum + day.entries.length, 0),
        days
      };
    });
  }, [filteredEntries]);

  const latestEntry = historyEntries[0] || null;

  const collapsedMinorCount = useMemo(() => {
    return timelineGroups.reduce((monthTotal, monthGroup) => {
      return (
        monthTotal +
        monthGroup.days.reduce((dayTotal, dayGroup) => {
          if (expandedGroups[dayGroup.key]) {
            return dayTotal;
          }

          const majorEntries = dayGroup.entries.filter((entry) => entry.priority === 'major');
          const minorEntries = dayGroup.entries.filter((entry) => entry.priority === 'minor');
          const defaultMinorVisibleCount = majorEntries.length === 0 ? Math.min(1, minorEntries.length) : 0;

          return dayTotal + Math.max(0, minorEntries.length - defaultMinorVisibleCount);
        }, 0)
      );
    }, 0);
  }, [timelineGroups, expandedGroups]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFilter('all');
    setExpandedGroups({});
  };

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups((previous) => ({ ...previous, [groupKey]: !previous[groupKey] }));
  };

  const scrollToMonth = (monthKey: string) => {
    document.getElementById(`history-month-${monthKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const todayKey = getDateKey(new Date());

  return (
    <>
      <button className={`sidebar-backdrop ${sidebarOpen ? 'is-open' : ''}`} type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />

      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Project History</span>
              </span>
            </div>
            <h1>Project History</h1>
            <p>A log of what you and your group have done — title submissions, file uploads, progress reports, and academic activity. For updates from your adviser or panel, check Notifications.</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] p-5">
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#003A8F]">Activity Log</span>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Every action you've taken, searchable and grouped by day</h2>
              <p className="mt-1 max-w-[60ch] text-sm leading-6 text-[var(--muted)]">
                Title submissions, file uploads, progress reports, and academic activity — everything your group has done, in one filterable timeline.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge label={`${filteredEntries.length} of ${historyEntries.length} shown`} tone="info" icon="fa-filter" />
              {collapsedMinorCount ? <Badge label={`${collapsedMinorCount} collapsed`} tone="warning" icon="fa-layer-group" /> : null}
              {latestEntry ? <Badge label={`Latest: ${formatHistoryDay(latestEntry.timestamp)}`} tone="neutral" icon="fa-clock-rotate-left" /> : null}
            </div>
          </div>

          <div className="space-y-4 border-b border-[var(--border)] p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="grid gap-1.5">
                <span className="sr-only">Search Timeline</span>
                <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 text-sm text-[var(--muted)] transition focus-within:border-[#003A8F] focus-within:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-[#003A8F]/10">
                  <i className="fas fa-magnifying-glass text-[var(--text-meta)]" aria-hidden="true" />
                  <input
                    className="w-full border-0 bg-transparent p-0 text-sm font-medium text-[var(--text)] outline-none placeholder:text-[var(--text-meta)]"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by activity title, actor, status, or file"
                  />
                </span>
              </label>

              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
                type="button"
                onClick={handleResetFilters}
              >
                <i className="fas fa-rotate-left" aria-hidden="true" />
                Reset
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {HISTORY_FILTERS.map((filter) => {
                const count = filter.key === 'all' ? historyEntries.length : filterCounts[filter.key];
                const isActive = selectedFilter === filter.key;
                const isEmpty = filter.key !== 'all' && count === 0 && !isActive;

                return (
                  <button
                    key={filter.key}
                    aria-pressed={isActive}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition ${
                      isActive
                        ? 'border-[#003A8F]/20 bg-[#003A8F]/10 text-[#003A8F]'
                        : isEmpty
                          ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-meta)] opacity-60 hover:opacity-100 hover:border-[var(--border-strong)] hover:text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--text)]'
                    }`}
                    type="button"
                    onClick={() => setSelectedFilter(filter.key)}
                  >
                    <i className={`fas ${filter.icon} text-[12px]`} aria-hidden="true" />
                    {filter.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        isActive ? 'bg-[var(--surface)] text-[#003A8F]' : isEmpty ? 'bg-[var(--surface-alt)] text-[var(--text-meta)]' : 'bg-[var(--surface)] text-[var(--muted)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {timelineGroups.length > 1 ? (
            <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface-alt)]/60 px-5 py-3">
              <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                <i className="fas fa-location-arrow" aria-hidden="true" /> Jump to
              </span>
              {timelineGroups.map((monthGroup) => (
                <button
                  key={monthGroup.key}
                  type="button"
                  onClick={() => scrollToMonth(monthGroup.key)}
                  className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] shadow-sm transition hover:-translate-y-px hover:border-[var(--border-strong)]"
                >
                  {monthGroup.label} <span className="text-[var(--muted)]">· {monthGroup.total}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="p-5">
            {timelineGroups.length ? (
              <div className="space-y-8">
                {timelineGroups.map((monthGroup) => (
                  <section key={monthGroup.key} id={`history-month-${monthGroup.key}`} className="scroll-mt-24 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-[#003A8F]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#003A8F]">{monthGroup.label}</div>
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-xs font-medium text-[var(--muted)]">{monthGroup.total} activities</span>
                    </div>

                    <div className="space-y-5">
                      {monthGroup.days.map((dayGroup) => {
                        const isExpanded = Boolean(expandedGroups[dayGroup.key]);
                        const isToday = dayGroup.key === todayKey;
                        const majorEntries = dayGroup.entries.filter((entry) => entry.priority === 'major');
                        const minorEntries = dayGroup.entries.filter((entry) => entry.priority === 'minor');
                        const defaultMinorVisibleCount = majorEntries.length === 0 ? Math.min(1, minorEntries.length) : 0;
                        const visibleMinorEntries = isExpanded ? minorEntries : minorEntries.slice(0, defaultMinorVisibleCount);
                        const hiddenMinorCount = isExpanded ? 0 : Math.max(0, minorEntries.length - defaultMinorVisibleCount);

                        return (
                          <div key={dayGroup.key} className="grid gap-4 lg:grid-cols-[108px_minmax(0,1fr)]">
                            <div className="flex lg:block">
                              <div
                                className={`inline-flex w-full items-center gap-4 rounded-[24px] border px-4 py-3 lg:grid lg:gap-1 lg:px-3 lg:text-center ${
                                  isToday ? 'border-[#003A8F]/30 bg-[#003A8F]/5' : 'border-[var(--border)] bg-[var(--surface-alt)]'
                                }`}
                              >
                                <span className={`text-[11px] font-bold uppercase tracking-[0.16em] ${isToday ? 'text-[#003A8F]' : 'text-[var(--muted)]'}`}>
                                  {isToday ? 'Today' : dayGroup.weekday}
                                </span>
                                <strong className="text-2xl font-extrabold leading-none text-slate-950">{dayGroup.dayNumber}</strong>
                                <span className="text-xs text-[var(--muted)]">{dayGroup.monthStamp}</span>
                              </div>
                            </div>

                            <div className="relative space-y-3 pl-7 before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
                              {[...majorEntries, ...visibleMinorEntries].map((entry) => (
                                <article
                                  key={entry.id}
                                  className={`group relative rounded-[20px] border-l-[3px] p-4 shadow-sm ring-1 transition duration-150 hover:-translate-y-px hover:shadow-md ${ACCENT_BORDER_STYLES[entry.tone]} ${
                                    entry.priority === 'major' ? 'bg-[var(--surface)] ring-slate-200' : 'bg-[var(--surface-alt)] ring-slate-200/80'
                                  }`}
                                >
                                  <span className={`absolute -left-[28px] top-5 flex h-5 w-5 items-center justify-center rounded-full border-4 border-[var(--border)] ${ICON_TONE_STYLES[entry.tone]}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  </span>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${ICON_TONE_STYLES[entry.tone]}`}>
                                      <i className={`fas ${entry.icon} text-xs`} aria-hidden="true" />
                                    </span>
                                    <Badge label={entry.eventLabel} tone={entry.tone} />
                                    <Badge label={entry.statusLabel} tone={entry.statusTone} />
                                    <span className="ml-auto shrink-0 text-xs font-medium text-[var(--muted)]">{formatHistoryTime(entry.timestamp)}</span>
                                  </div>

                                  <div className="mt-3">
                                    <h4 className="text-base font-bold leading-6 text-slate-950">{entry.title}</h4>
                                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{entry.description}</p>
                                  </div>

                                  {entry.details.length ? (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {entry.details.map((detail) => (
                                        <span key={`${entry.id}-${detail}`} className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                                          {detail}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}

                                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ICON_TONE_STYLES[entry.tone]}`}>
                                        {getInitials(entry.actor)}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-[var(--text)]">{entry.actor}</p>
                                        <p className="truncate text-[11px] text-[var(--muted)]">{entry.sourceLabel}</p>
                                      </div>
                                    </div>

                                    {entry.route ? (
                                      <Link prefetch={false}
                                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#003A8F] transition hover:text-[#002c6b]"
                                        href={entry.route}
                                      >
                                        {entry.actionLabel || 'Open Related Page'} <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
                                      </Link>
                                    ) : null}
                                  </div>
                                </article>
                              ))}

                              {hiddenMinorCount ? (
                                <button
                                  aria-expanded={isExpanded}
                                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
                                  type="button"
                                  onClick={() => toggleGroupExpansion(dayGroup.key)}
                                >
                                  <i className="fas fa-chevron-down text-xs" aria-hidden="true" />
                                  Show {hiddenMinorCount} more update{hiddenMinorCount === 1 ? '' : 's'}
                                </button>
                              ) : null}

                              {isExpanded && minorEntries.length > defaultMinorVisibleCount ? (
                                <button
                                  aria-expanded={isExpanded}
                                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                                  type="button"
                                  onClick={() => toggleGroupExpansion(dayGroup.key)}
                                >
                                  <i className="fas fa-chevron-up text-xs" aria-hidden="true" />
                                  Hide minor updates
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#003A8F]">
                  <i className="fas fa-clock-rotate-left text-lg" aria-hidden="true" />
                </span>
                <strong className="mt-4 block text-lg font-bold text-slate-950">No history records match the current filter</strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Try clearing the search or switching to another activity tab to restore the full timeline.</p>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
                  type="button"
                  onClick={handleResetFilters}
                >
                  <i className="fas fa-rotate-left" aria-hidden="true" />
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
