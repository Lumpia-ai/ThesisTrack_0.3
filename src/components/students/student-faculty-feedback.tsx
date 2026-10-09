'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { logout } from '@/lib/mock/auth';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { STUDENT_NAV_ITEMS } from '@/components/students/student-navigation';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type FeedbackWorkflowStatus = 'Needs Revision' | 'Approved';
type FeedbackFilter = 'all' | 'unread' | 'needs-action' | 'approved';
type FeedbackSortOption = 'latest' | 'oldest' | 'priority';
type FeedbackBoardColumnKey = 'unread' | 'needs-action' | 'approved';

type FeedbackCommentDetail = {
  id: string;
  content: string;
  area: string;
  text: string;
  created_at: string;
  updated_at: string;
  status: string;
  unread: boolean;
  facultyName: string;
  mode: string;
};

type FeedbackRecord = StudentDashboardData['feedback'][number] & {
  workflowStatus: FeedbackWorkflowStatus;
  studentReply?: string;
  studentReplyDate?: string;
  relatedChapter: string;
  relatedMilestone: string;
  relatedFile: string;
  commentIds: string[];
  comments: FeedbackCommentDetail[];
  commentCount: number;
};

type FeedbackBoardColumn = {
  key: FeedbackBoardColumnKey;
  title: string;
  description: string;
  tone: BadgeTone;
  items: FeedbackRecord[];
};

const WORKFLOW_FILTER_OPTIONS: Array<{ value: FeedbackFilter; label: string; icon: string }> = [
  { value: 'all', label: 'All', icon: 'fa-layer-group' },
  { value: 'unread', label: 'Unread', icon: 'fa-envelope' },
  { value: 'needs-action', label: 'Needs Action', icon: 'fa-file-arrow-up' },
  { value: 'approved', label: 'Approved', icon: 'fa-circle-check' }
];

const BUTTON_BASE_CLASS = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#003A8F]/20';
const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} border border-[#002c6b] bg-[#003A8F] text-white shadow-[0_16px_32px_rgba(0,58,143,0.18)] hover:-translate-y-px hover:bg-[#002c6b] hover:shadow-[0_18px_36px_rgba(0,58,143,0.22)]`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)] hover:shadow-md`;
const TERTIARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} min-h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 text-[13px] text-[var(--text)] shadow-sm hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface)]`;

const BOARD_COLUMN_STYLES: Record<FeedbackBoardColumnKey, {
  shell: string;
  accent: string;
  badgeTone: BadgeTone;
  iconWrap: string;
  icon: string;
  emptyIcon: string;
  emptyCopy: string;
}> = {
  unread: {
    shell: 'border-blue-100 bg-gradient-to-b from-blue-50/90 to-white',
    accent: 'bg-blue-600',
    badgeTone: 'info',
    iconWrap: 'bg-blue-100 text-blue-700',
    icon: 'fa-envelope',
    emptyIcon: 'fa-inbox',
    emptyCopy: 'No unread review notes in this lane.'
  },
  'needs-action': {
    shell: 'border-amber-100 bg-gradient-to-b from-amber-50/90 to-white',
    accent: 'bg-amber-500',
    badgeTone: 'warning',
    iconWrap: 'bg-amber-100 text-amber-700',
    icon: 'fa-file-arrow-up',
    emptyIcon: 'fa-list-check',
    emptyCopy: 'No revision feedback needs action right now.'
  },
  approved: {
    shell: 'border-emerald-100 bg-gradient-to-b from-emerald-50/90 to-white',
    accent: 'bg-emerald-500',
    badgeTone: 'success',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    icon: 'fa-circle-check',
    emptyIcon: 'fa-check-double',
    emptyCopy: 'No approved feedback threads in the current view.'
  }
};

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function normalizeFeedbackStatus(status: string): FeedbackWorkflowStatus {
  const normalized = status.toLowerCase();

  if (normalized.includes('approved') || normalized.includes('completed')) {
    return 'Approved';
  }

  return 'Needs Revision';
}

function getStatusTone(status: string): BadgeTone {
  const normalized = status.toLowerCase();
  if (['approved', 'completed'].includes(normalized)) return 'success';
  if (normalized.includes('needs revision') || normalized.includes('revision')) return 'warning';
  if (['danger'].includes(normalized)) return 'danger';
  return 'neutral';
}

function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: string }) {
  const toneClassName = {
    neutral: 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700'
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${toneClassName}`}>


      {icon ? <i className={`fas ${icon}`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function findLatestDocumentByCategory(data: StudentDashboardData, categories: string[]) {
  return [...data.documents]
    .filter((item) => categories.includes(item.category))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0]
    ?.fileName;
}

function inferFeedbackContext(item: StudentDashboardData['feedback'][number], data: StudentDashboardData) {
  const haystack = `${item.title} ${item.content}`.toLowerCase();

  if (haystack.includes('chapter 3') || haystack.includes('methodology') || haystack.includes('validation')) {
    return {
      relatedChapter: 'Chapter 3',
      relatedMilestone: 'Development',
      relatedFile: findLatestDocumentByCategory(data, ['chapter-3']) || 'Chapter-3-Methodology-Revision.pdf'
    };
  }

  if (haystack.includes('presentation') || haystack.includes('slide') || haystack.includes('defense')) {
    return {
      relatedChapter: 'Presentation Deck',
      relatedMilestone: 'Final Defense',
      relatedFile: findLatestDocumentByCategory(data, ['presentation-files']) || 'Midterm-Presentation-Deck.pptx'
    };
  }

  if (haystack.includes('pilot') || haystack.includes('beneficiary')) {
    return {
      relatedChapter: 'Implementation Notes',
      relatedMilestone: 'Final Defense',
      relatedFile: findLatestDocumentByCategory(data, ['system-files']) || 'System-Prototype-v0.9.zip'
    };
  }

  if (haystack.includes('architecture') || haystack.includes('system')) {
    return {
      relatedChapter: 'System Design',
      relatedMilestone: 'Development',
      relatedFile: findLatestDocumentByCategory(data, ['system-files']) || 'System-Prototype-v0.9.zip'
    };
  }

  return {
    relatedChapter: 'General Review',
    relatedMilestone: data.project.currentMilestone || 'Project Review',
    relatedFile: data.documents[0]?.fileName || 'Shared Project Record'
  };
}

function parseFeedbackCommentBody(body: string) {
  const trimmedBody = body.trim();
  const match = trimmedBody.match(/^Area:\s*(.+?)\n\n([\s\S]*)$/i);

  if (!match) {
    return {
      area: '',
      text: trimmedBody
    };
  }

  return {
    area: match[1]?.trim() || '',
    text: match[2]?.trim() || ''
  };
}

function getFeedbackGroupKey(item: StudentDashboardData['feedback'][number]) {
  return [
    item.project_id,
    item.submissionId || item.submissionTitle || item.title,
    item.facultyName,
    item.mode
  ].join('::');
}

function toFeedbackCommentDetail(item: StudentDashboardData['feedback'][number]): FeedbackCommentDetail {
  const parsedComment = parseFeedbackCommentBody(item.content);

  return {
    id: item.id,
    content: item.content,
    area: parsedComment.area,
    text: parsedComment.text,
    created_at: item.created_at,
    updated_at: item.updated_at,
    status: item.status,
    unread: item.unread,
    facultyName: item.facultyName,
    mode: item.mode
  };
}

function getThreadWorkflowStatus(comments: FeedbackCommentDetail[]): FeedbackWorkflowStatus {
  if (comments.length && comments.every((comment) => normalizeFeedbackStatus(comment.status) === 'Approved')) {
    return 'Approved';
  }

  return 'Needs Revision';
}

function buildFeedbackRecords(data: StudentDashboardData): FeedbackRecord[] {
  const groupedFeedback = new Map<string, FeedbackRecord>();

  data.feedback.forEach((item) => {
    const groupKey = getFeedbackGroupKey(item);
    const commentDetail = toFeedbackCommentDetail(item);
    const existingRecord = groupedFeedback.get(groupKey);

    if (existingRecord) {
      existingRecord.comments.push(commentDetail);
      existingRecord.commentIds.push(item.id);
      return;
    }

    groupedFeedback.set(groupKey, {
      ...item,
      workflowStatus: normalizeFeedbackStatus(item.status),
      ...inferFeedbackContext(item, data),
      commentIds: [item.id],
      comments: [commentDetail],
      commentCount: 1
    });
  });

  return Array.from(groupedFeedback.values()).map((record) => {
    const comments = [...record.comments].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    const latestComment = comments[0];
    // A superseded thread belongs to a round the student already resubmitted
    // past — it's resolved, not a live ask, so it reads the same as "Approved"
    // instead of surfacing forever in Unread/Needs Action.
    const workflowStatus = record.isSuperseded ? 'Approved' : getThreadWorkflowStatus(comments);
    const commentCount = comments.length;
    const preview = commentCount > 1
      ? `${commentCount} adviser comments are grouped in this thread. Latest: ${latestComment.text}`
      : latestComment.content;

    return {
      ...record,
      id: latestComment.id,
      status: workflowStatus,
      workflowStatus,
      unread: !record.isSuperseded && comments.some((comment) => comment.unread),
      created_at: latestComment.created_at,
      updated_at: latestComment.updated_at,
      content: preview,
      commentIds: comments.map((comment) => comment.id),
      comments,
      commentCount
    };
  });
}

function getFeedbackPriorityScore(item: FeedbackRecord) {
  let score = 0;

  if (item.unread) score += 40;
  if (item.workflowStatus === 'Needs Revision') score += 30;
  if (item.workflowStatus === 'Approved') score += 10;
  if (item.mode === 'Adviser') score += 5;

  return score;
}

function sortFeedbackRecords(items: FeedbackRecord[], sortBy: FeedbackSortOption) {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left.created_at).getTime();
    const rightDate = new Date(right.created_at).getTime();

    if (sortBy === 'oldest') {
      return leftDate - rightDate;
    }

    if (sortBy === 'priority') {
      const priorityDelta = getFeedbackPriorityScore(right) - getFeedbackPriorityScore(left);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
    }

    return rightDate - leftDate;
  });
}

function getFeedbackLane(item: FeedbackRecord): FeedbackBoardColumnKey {
  if (item.unread) {
    return 'unread';
  }

  if (item.workflowStatus === 'Approved') {
    return 'approved';
  }

  return 'needs-action';
}

function matchesFeedbackFilter(item: FeedbackRecord, filter: FeedbackFilter) {
  if (filter === 'all') return true;
  return getFeedbackLane(item) === filter;
}

function getFeedbackCardClass(item: FeedbackRecord) {
  if (item.workflowStatus === 'Approved') return 'is-resolved';
  return 'is-revised';
}

function formatFeedbackTimestamp(createdAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(createdAt));
}

function getFeedbackPreview(content: string, maxLength = 220) {
  return content.length > maxLength ? `${content.slice(0, maxLength).trimEnd()}...` : content;
}

export function StudentFacultyFeedback({ data }: { data: StudentDashboardData }) {
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [workflowFilter, setWorkflowFilter] = useState<FeedbackFilter>('all');
  const [reviewerFilter, setReviewerFilter] = useState<'all' | 'Adviser' | 'Panel'>('all');
  const [sortBy, setSortBy] = useState<FeedbackSortOption>('priority');
  const [feedbackData, setFeedbackData] = useState<FeedbackRecord[]>(() => buildFeedbackRecords(data));
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
  useEffect(() => {
    setFeedbackData(buildFeedbackRecords(data));
  }, [data]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        setSidebarOpen(false);
        setSelectedFeedback(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!selectedFeedback) {
      return;
    }

    setSelectedFeedback(feedbackData.find((item) => item.id === selectedFeedback.id) || null);
  }, [feedbackData, selectedFeedback]);

  const unreadNotificationsCount = data.notifications.filter((item) => !item.read).length;
  const unreadFeedbackCount = feedbackData.filter((item) => getFeedbackLane(item) === 'unread').length;
  const needsActionCount = feedbackData.filter((item) => getFeedbackLane(item) === 'needs-action').length;
  const approvedCount = feedbackData.filter((item) => getFeedbackLane(item) === 'approved').length;
  const latestFeedback = sortFeedbackRecords(feedbackData, 'latest')[0] || null;

  const visibleFeedback = useMemo(() => {
    const filtered = feedbackData.filter((item) => {
      if (!matchesFeedbackFilter(item, workflowFilter)) {
        return false;
      }

      if (reviewerFilter !== 'all' && item.mode !== reviewerFilter) {
        return false;
      }

      return true;
    });

    return sortFeedbackRecords(filtered, sortBy);
  }, [feedbackData, reviewerFilter, sortBy, workflowFilter]);

  const boardColumns = useMemo<FeedbackBoardColumn[]>(() => {
    const sectionMap: Record<FeedbackBoardColumnKey, FeedbackRecord[]> = {
      unread: [],
      'needs-action': [],
      approved: []
    };

    visibleFeedback.forEach((item) => {
      sectionMap[getFeedbackLane(item)].push(item);
    });

    return [
      {
        key: 'unread',
        title: 'Unread',
        description: 'Fresh adviser or panel comments that have not been acknowledged yet.',
        tone: 'info',
        items: sectionMap.unread
      },
      {
        key: 'needs-action',
        title: 'Needs Action',
        description: 'Read adviser comments, revise the document, then upload the next version from Project Files.',
        tone: 'warning',
        items: sectionMap['needs-action']
      },
      {
        key: 'approved',
        title: 'Approved',
        description: 'Approved adviser feedback threads kept as part of the academic review history.',
        tone: 'success',
        items: sectionMap.approved
      }
    ];
  }, [visibleFeedback]);

  const resetFilters = () => {
    setWorkflowFilter('all');
    setReviewerFilter('all');
    setSortBy('priority');
  };

  return (
    <div className="student-faculty-feedback-page w-full min-w-0">
      <button className={`sidebar-backdrop ${sidebarOpen ? 'is-open' : ''}`} type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />

      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Faculty Feedback</span>
              </span>
            </div>
            <h1>Faculty Feedback</h1>
            <p>Review adviser comments, feedback history, and revision instructions.</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        <section className="grid gap-5 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <div className="grid gap-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#003A8F]">Academic Review Workflow</span>
            <div className="grid gap-3">
              <h2 className="max-w-[18ch] text-[clamp(1.55rem,2.7vw,2rem)] font-extrabold leading-tight text-slate-950">Track review threads in a clearer academic workflow board</h2>
              <p className="max-w-[62ch] text-sm leading-7 text-[var(--muted)]">Review adviser comments in one thread per file, then upload the revised document from Project Files when changes are required.</p>
            </div>

            <div className="rounded-[22px] border border-blue-100 bg-blue-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <p className="text-sm font-semibold text-[var(--text)]">Latest review activity</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {latestFeedback
                  ? `${latestFeedback.title} from ${latestFeedback.facultyName} on ${formatFeedbackTimestamp(latestFeedback.created_at)}.`
                  : 'No faculty comment has been recorded yet for this project workspace.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link prefetch={false} className={PRIMARY_BUTTON_CLASS} href="/students/project-files">
                <i className="fas fa-file-arrow-up" aria-hidden="true" /> Open Project Files
              </Link>
              <Link prefetch={false} className={SECONDARY_BUTTON_CLASS} href="/students/project-overview">
                <i className="fas fa-folder-open" aria-hidden="true" /> View Project
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <article className="rounded-[22px] border border-blue-100 bg-blue-50/80 p-4 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Unread</span>
              <strong className="mt-2 block text-3xl font-extrabold leading-none text-slate-950">{unreadFeedbackCount}</strong>
              <small className="mt-2 block text-xs leading-5 text-[var(--muted)]">New review notes that still need to be viewed.</small>
            </article>
            <article className="rounded-[22px] border border-amber-100 bg-amber-50/80 p-4 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Needs Action</span>
              <strong className="mt-2 block text-3xl font-extrabold leading-none text-slate-950">{needsActionCount}</strong>
              <small className="mt-2 block text-xs leading-5 text-[var(--muted)]">Threads requiring a revised upload.</small>
            </article>
            <article className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Approved</span>
              <strong className="mt-2 block text-3xl font-extrabold leading-none text-slate-950">{approvedCount}</strong>
              <small className="mt-2 block text-xs leading-5 text-[var(--muted)]">Approved review records preserved for project history.</small>
            </article>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#003A8F]">Board Controls</span>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Refine the review board</h3>
              <p className="mt-1 max-w-[56ch] text-sm leading-6 text-[var(--muted)]">Workflow tabs filter the board lanes, while reviewer and sort options reshape the cards shown in each column.</p>
            </div>
            <Badge label={`${visibleFeedback.length} visible`} tone="warning" icon="fa-filter" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {WORKFLOW_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                aria-pressed={workflowFilter === option.value}
                className={`${BUTTON_BASE_CLASS} min-h-9 rounded-full border px-3.5 text-[13px] shadow-none ${
                  workflowFilter === option.value
                    ? 'border-[#003A8F]/20 bg-[#003A8F]/10 text-[#003A8F]'
                    : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--text)]'
                }`}
                type="button"
                onClick={() => setWorkflowFilter(option.value)}
              >
                <i className={`fas ${option.icon}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="grid gap-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]" htmlFor="feedback-reviewer-filter">Reviewer</label>
              <select
                id="feedback-reviewer-filter"
                className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 text-sm font-medium text-[var(--text)] outline-none transition focus:border-[#003A8F] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#003A8F]/10"
                value={reviewerFilter}
                onChange={(event) => setReviewerFilter(event.target.value as 'all' | 'Adviser' | 'Panel')}
              >
                <option value="all">All reviewers</option>
                <option value="Adviser">Adviser</option>
                <option value="Panel">Panel</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]" htmlFor="feedback-sort">Sort</label>
              <select
                id="feedback-sort"
                className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 text-sm font-medium text-[var(--text)] outline-none transition focus:border-[#003A8F] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#003A8F]/10"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as FeedbackSortOption)}
              >
                <option value="priority">Priority</option>
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            <div className="flex items-end">
              <button className={SECONDARY_BUTTON_CLASS} type="button" onClick={resetFilters}>
                <i className="fas fa-rotate-left" aria-hidden="true" /> Reset Filters
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {boardColumns.map((column) => {
            const columnStyle = BOARD_COLUMN_STYLES[column.key];

            return (
              <section key={column.key} className={`flex min-h-[24rem] flex-col rounded-[28px] border p-4 shadow-[0_14px_30px_rgba(15,23,42,0.04)] ${columnStyle.shell}`}>
                <div className={`mb-4 h-1.5 w-full rounded-full ${columnStyle.accent}`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${columnStyle.iconWrap}`}>
                      <i className={`fas ${columnStyle.icon}`} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-950">{column.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{column.description}</p>
                    </div>
                  </div>
                  <Badge label={`${column.items.length}`} tone={columnStyle.badgeTone} />
                </div>

                <div className="mt-4 grid gap-4">
                  {column.items.length ? (
                    column.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[22px] bg-[var(--surface)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${item.mode === 'Adviser' ? 'bg-amber-100 text-amber-700' : 'bg-[var(--surface-alt)] text-[var(--text)]'}`}>
                              {getInitials(item.facultyName)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-meta)]">{item.facultyName}</p>
                              <h4 className="mt-1 text-sm font-bold leading-6 text-slate-950">{item.title}</h4>
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-end gap-2">
                            <Badge label={item.mode} tone={item.mode === 'Adviser' ? 'warning' : 'neutral'} />
                            {item.unread ? <Badge label="Unread" tone="info" icon="fa-envelope" /> : null}
                            <Badge label={`${item.commentCount} comment${item.commentCount === 1 ? '' : 's'}`} tone="info" icon="fa-comments" />
                            <Badge label={item.workflowStatus} tone={getStatusTone(item.workflowStatus)} />
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{getFeedbackPreview(item.content)}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                            <i className="fas fa-user" aria-hidden="true" />
                            {item.facultyName}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                            <i className="fas fa-clock" aria-hidden="true" />
                            {formatFeedbackTimestamp(item.created_at)}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">Chapter: {item.relatedChapter}</span>
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">Milestone: {item.relatedMilestone}</span>
                          <span className="inline-flex items-center rounded-full bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] ring-1 ring-inset ring-slate-200">File: {item.relatedFile}</span>
                        </div>

                        {item.studentReply ? (
                          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Your Reply</span>
                              <span className="text-xs font-medium text-[var(--text-meta)]">{item.studentReplyDate}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.studentReply}</p>
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className={`${TERTIARY_BUTTON_CLASS} border-[#003A8F]/20 bg-blue-50 text-[#003A8F] hover:bg-blue-100`} type="button" onClick={() => setSelectedFeedback(item)}>
                            <i className="fas fa-list-check" aria-hidden="true" />
                            View Details
                          </button>
                          {item.workflowStatus === 'Needs Revision' ? (
                            <Link prefetch={false} className={`${TERTIARY_BUTTON_CLASS} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`} href="/students/project-files">
                              <i className="fas fa-file-arrow-up" aria-hidden="true" />
                              Upload Revised File
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="flex min-h-[14rem] items-center justify-center rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                      <div className="grid gap-3">
                        <span className={`mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl ${columnStyle.iconWrap}`}>
                          <i className={`fas ${columnStyle.emptyIcon}`} aria-hidden="true" />
                        </span>
                        <div className="grid gap-1">
                          <strong className="text-sm font-semibold text-[var(--text)]">Nothing to review here</strong>
                          <p className="text-sm leading-6 text-[var(--muted)]">{columnStyle.emptyCopy}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </section>

        {selectedFeedback ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title">
            <button
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
              type="button"
              aria-label="Close feedback details"
              onClick={() => setSelectedFeedback(null)}
            />

            <section className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_28px_80px_rgba(15,23,42,0.25)]">
              <div className="border-b border-[var(--border)] bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#003A8F]">Feedback Thread</span>
                    <h2 id="feedback-detail-title" className="mt-2 text-xl font-extrabold leading-tight text-slate-950 sm:text-2xl">{selectedFeedback.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {selectedFeedback.commentCount} adviser comment{selectedFeedback.commentCount === 1 ? '' : 's'} grouped into one review thread for this file.
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-sm transition hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
                    type="button"
                    aria-label="Close feedback details"
                    onClick={() => setSelectedFeedback(null)}
                  >
                    <i className="fas fa-xmark" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge label={selectedFeedback.mode} tone={selectedFeedback.mode === 'Adviser' ? 'warning' : 'neutral'} />
                  {selectedFeedback.unread ? <Badge label="Unread" tone="info" icon="fa-envelope" /> : null}
                  <Badge label={selectedFeedback.workflowStatus} tone={getStatusTone(selectedFeedback.workflowStatus)} />
                  <Badge label={`File: ${selectedFeedback.relatedFile}`} tone="neutral" icon="fa-file-lines" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="grid gap-4">
                  {selectedFeedback.comments.map((comment, index) => (
                    <article key={comment.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#003A8F] text-xs font-extrabold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                              <span>{comment.facultyName}</span>
                              <span aria-hidden="true">|</span>
                              <span>{formatFeedbackTimestamp(comment.created_at)}</span>
                            </div>
                            <Badge label={normalizeFeedbackStatus(comment.status)} tone={getStatusTone(normalizeFeedbackStatus(comment.status))} />
                          </div>

                          {comment.area ? (
                            <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#003A8F] ring-1 ring-inset ring-blue-100">
                              <i className="fas fa-location-dot mr-2 text-[10px]" aria-hidden="true" />
                              {comment.area}
                            </p>
                          ) : null}

                          <p className="mt-3 text-sm leading-6 text-[var(--text)]">{comment.text}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-alt)] p-4">
                {selectedFeedback.workflowStatus === 'Needs Revision' ? (
                  <Link prefetch={false} className={`${TERTIARY_BUTTON_CLASS} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`} href="/students/project-files">
                    <i className="fas fa-file-arrow-up" aria-hidden="true" />
                    Upload Revised File
                  </Link>
                ) : null}
                <button className={SECONDARY_BUTTON_CLASS} type="button" onClick={() => setSelectedFeedback(null)}>
                  Close
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
