'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { isBackupTitleNotification } from '@/lib/notification-tags';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type NotificationType = StudentDashboardData['notifications'][number]['type'];
type StudentNotification = StudentDashboardData['notifications'][number];

// Mirrors the same allow-list used server-side in student-workspace.ts — live-polled
// notifications go through this same normalization so a type never becomes unfilterable.
const KNOWN_NOTIFICATION_FILTER_TYPES = new Set(['feedback', 'deadline', 'schedule', 'approval', 'transfer']);

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700'
};

const PRIMARY_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#002c6b] bg-[#003A8F] px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:-translate-y-px hover:bg-[#002c6b] hover:shadow-md';
const SECONDARY_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)] shadow-sm transition duration-150 hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]';

function sortByCreatedAtDesc<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

function toClientNotification(notification: StudentNotification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    status: notification.read ? 'READ' : 'UNREAD',
    createdAt: notification.created_at,
    readAt: notification.read ? notification.updated_at : null
  };
}

function canPollApi() {
  return (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
    window.navigator.onLine
  );
}

function isExpectedPollError(error: unknown) {
  return (
    error instanceof DOMException && error.name === 'AbortError'
  ) || (
    error instanceof TypeError && (!canPollApi() || error.message === 'Failed to fetch')
  );
}

function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${BADGE_STYLES[tone]}`}>
      {icon ? <i className={`fas ${icon} text-[10px]`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

// The `route` field every notification carries is always the notifications page itself
// (it isn't populated with anything more specific anywhere in the app), so it's never a
// useful "go here" link. `type` is mostly a severity flag (success/warning/info), not a
// real category, so most notifications land in the generic Dashboard fallback below —
// checking the exact, known notification titles first gets people to the actual page
// the update is about (e.g. a title review outcome should open Title Submission, not
// the Dashboard).
const TITLE_BASED_ACTIONS: Record<string, { href: string; label: string }> = {
  'Title Review Updated': { href: '/students/title-submission', label: 'Open Title Submission' },
  'New Title Proposal Submitted': { href: '/students/title-submission', label: 'Open Title Submission' },
  'Project Reset: New Title Required': { href: '/students/title-submission', label: 'Open Title Submission' },
  'Feedback Resolved': { href: '/students/faculty-feedback', label: 'Open Feedback' },
  'Schedule Updated': { href: '/students/schedule', label: 'Check Schedule' },
  'Defense Passed': { href: '/students/milestones', label: 'Open Project Stages' },
  'Defense Not Passed': { href: '/students/milestones', label: 'Open Project Stages' },
  'Upload Permission Granted': { href: '/students/project-files', label: 'Open Project Files' },
  'Compliance Needs Revision': { href: '/students/compliance', label: 'Open Compliance' },
  'Compliance Verified': { href: '/students/compliance', label: 'Open Compliance' },
  'Compliance Approved': { href: '/students/compliance', label: 'Open Compliance' }
};

function getNotificationAction(item: StudentNotification) {
  if (TITLE_BASED_ACTIONS[item.title]) {
    return TITLE_BASED_ACTIONS[item.title];
  }

  const fallbackActionByType: Record<string, { href: string; label: string }> = {
    approval: { href: '/students/project-files', label: 'Open Project Files' },
    deadline: { href: '/students/project-files', label: 'Open Project Files' },
    feedback: { href: '/students/faculty-feedback', label: 'Open Feedback' },
    general: { href: '/students/dashboard', label: 'Open Dashboard' },
    schedule: { href: '/students/schedule', label: 'Check Schedule' },
    transfer: { href: '/students/project-overview', label: 'Open Project Overview' }
  };

  return fallbackActionByType[item.type] || fallbackActionByType.general;
}

function getNotificationTypeMeta(type: NotificationType) {
  switch (type) {
    case 'deadline':
      return {
        label: 'Deadline',
        icon: 'fa-hourglass-half',
        tone: 'danger' as BadgeTone,
        indicatorClass: 'bg-rose-500',
        iconWrapClass: 'bg-rose-50 text-rose-600',
        surfaceClass: 'from-rose-50/90 to-white'
      };
    case 'feedback':
      return {
        label: 'Feedback',
        icon: 'fa-comments',
        tone: 'info' as BadgeTone,
        indicatorClass: 'bg-blue-500',
        iconWrapClass: 'bg-blue-50 text-[#003A8F]',
        surfaceClass: 'from-blue-50/90 to-white'
      };
    case 'schedule':
      return {
        label: 'Schedule',
        icon: 'fa-calendar-check',
        tone: 'neutral' as BadgeTone,
        indicatorClass: 'bg-violet-500',
        iconWrapClass: 'bg-violet-50 text-violet-700',
        surfaceClass: 'from-violet-50/90 to-white'
      };
    case 'approval':
      return {
        label: 'Approval',
        icon: 'fa-circle-check',
        tone: 'success' as BadgeTone,
        indicatorClass: 'bg-emerald-500',
        iconWrapClass: 'bg-emerald-50 text-emerald-700',
        surfaceClass: 'from-emerald-50/90 to-white'
      };
    case 'transfer':
      return {
        label: 'Project Update',
        icon: 'fa-diagram-project',
        tone: 'neutral' as BadgeTone,
        indicatorClass: 'bg-slate-400',
        iconWrapClass: 'bg-[var(--surface-alt)] text-[var(--muted)]',
        surfaceClass: 'from-slate-50/90 to-white'
      };
    default:
      return {
        label: 'General',
        icon: 'fa-bell',
        tone: 'info' as BadgeTone,
        indicatorClass: 'bg-[#003A8F]',
        iconWrapClass: 'bg-blue-50 text-[#003A8F]',
        surfaceClass: 'from-blue-50/90 to-white'
      };
  }
}

function isNeedsActionNotification(item: StudentNotification) {
  return !item.read && (item.priority === 'high' || item.type === 'feedback' || item.type === 'deadline' || item.type === 'approval');
}

function NotificationCard({
  item,
  onMarkRead,
  onAction
}: {
  item: StudentNotification & { entityType?: string; entityId?: string };
  onMarkRead: (id: string) => void;
  onAction?: (id: string, action: 'accept' | 'reject') => void;
}) {
  const router = useRouter();
  const typeMeta = getNotificationTypeMeta(item.type);
  const isPermissionRequest = item.title === 'Upload Permission Request';
  const isUnread = !item.read;

  const handleOpen = () => {
    if (isUnread) {
      onMarkRead(item.id);
    }
    router.push(getNotificationAction(item).href);
  };

  return (
    <article
      className={`group relative cursor-pointer overflow-hidden rounded-[20px] shadow-sm ring-1 transition duration-150 hover:-translate-y-px hover:shadow-md ${
        isUnread ? 'bg-blue-50/40 ring-blue-100' : 'bg-[var(--surface)] ring-slate-200/80'
      }`}
      onClick={handleOpen}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${typeMeta.indicatorClass}`} />
      <div className="p-5 pl-6">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${typeMeta.iconWrapClass}`}>
              <i className={`fas ${typeMeta.icon}`} aria-hidden="true" />
              {isUnread ? <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-[#F6BE00]" aria-hidden="true" /> : null}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={typeMeta.label} tone={typeMeta.tone} icon={typeMeta.icon} />
                {item.priority === 'high' ? <Badge label="Urgent" tone="danger" /> : null}
                {isPermissionRequest && isUnread ? <Badge label="Action Required" tone="danger" icon="fa-hand" /> : null}
                {isBackupTitleNotification(item.title) ? <Badge label="Backup" tone="warning" icon="fa-bookmark" /> : null}
              </div>
              <h4 className="mt-3 text-base font-bold leading-6 text-slate-950 sm:text-lg">{item.title}</h4>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{item.message}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                <i className="fas fa-clock" aria-hidden="true" /> {item.dateLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            {isPermissionRequest && !item.read && onAction ? (
              <>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:-translate-y-px hover:bg-emerald-700 hover:shadow-md"
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onAction(item.id, 'accept'); }}
                >
                  <i className="fas fa-check" aria-hidden="true" /> Accept
                </button>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-[var(--surface)] px-4 text-sm font-semibold text-rose-600 shadow-sm transition duration-150 hover:-translate-y-px hover:border-rose-300 hover:bg-rose-50 hover:shadow-md"
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onAction(item.id, 'reject'); }}
                >
                  <i className="fas fa-xmark" aria-hidden="true" /> Reject
                </button>
              </>
            ) : (
              !item.read ? (
                <button className={SECONDARY_ACTION_CLASS} type="button" onClick={(event) => { event.stopPropagation(); onMarkRead(item.id); }}>
                  <i className="fas fa-check" aria-hidden="true" /> Mark Read
                </button>
              ) : null
            )}
          </div>
        </div>
      </div>
    </article>
  );
}


export function StudentNotifications({ data }: { data: StudentDashboardData }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'needs-action' | 'updates' | 'completed'>('needs-action');
  const [notificationsData, setNotificationsData] = useState(() => sortByCreatedAtDesc(data.notifications || []));

  const [realNotifications, setRealNotifications] = useState<any[]>(() =>
    (data.notifications || []).map(toClientNotification)
  );

  useEffect(() => {
    if (!data.profile.user_id) return;

    let cancelled = false;
    let inFlightController: AbortController | null = null;

    const fetchNotifications = async () => {
      if (cancelled || inFlightController || !canPollApi()) {
        return;
      }

      const controller = new AbortController();
      inFlightController = controller;

      try {
        const notifRes = await fetch(`/api/notifications?userId=${encodeURIComponent(data.profile.user_id)}&limit=50`, {
          cache: 'no-store',
          signal: controller.signal
        });
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          if (!cancelled) {
            setRealNotifications(notifs);
          }
        }
      } catch (e) {
        if (!isExpectedPollError(e)) {
          console.warn('Failed to poll student notifications', e);
        }
      } finally {
        if (inFlightController === controller) {
          inFlightController = null;
        }
      }
    };

    const pollNotifications = () => {
      void fetchNotifications().catch((error) => {
        if (!isExpectedPollError(error)) {
          console.warn('Failed to poll student notifications', error);
        }
      });
    };

    pollNotifications();
    return () => {
      cancelled = true;
      inFlightController?.abort();
    };
  }, [data.profile.user_id]);

  useEffect(() => {
    const combined: any[] = [];
    const seenIds = new Set<string>();
    if (realNotifications.length > 0) {
      realNotifications.forEach(notif => {
        if (seenIds.has(notif.id)) return;
        seenIds.add(notif.id);
        combined.push({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: KNOWN_NOTIFICATION_FILTER_TYPES.has(notif.type) ? notif.type : 'general',
          priority: notif.type === 'warning' || notif.type === 'danger' ? 'high' : 'normal',
          read: notif.status === 'READ',
          created_at: notif.createdAt,
          dateLabel: new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          route: '/students/notifications',
        } as any);
      });
    }
    setNotificationsData(sortByCreatedAtDesc(combined));
  }, [realNotifications]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const unreadFeedbackCount = data.feedback.filter((item) => item.unread).length;
  const filteredNotifications = useMemo(() => {
    return notificationsData.filter((item) => typeFilter === 'all' || item.type === typeFilter);
  }, [notificationsData, typeFilter]);
  const unreadNotificationsCount = notificationsData.filter((item) => !item.read).length;
  const deadlines = notificationsData.filter((item) => item.type === 'deadline').length;
  const completedCount = notificationsData.filter((item) => item.read).length;
  const needsActionNotifications = filteredNotifications.filter((item) => isNeedsActionNotification(item));
  const needsActionIds = new Set(needsActionNotifications.map((item) => item.id));
  const updatesNotifications = filteredNotifications.filter((item) => !item.read && !needsActionIds.has(item.id));
  const completedNotifications = filteredNotifications.filter((item) => item.read);

  const markRead = (id: string) => {
    setNotificationsData((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setRealNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'READ', readAt: new Date().toISOString() } : item)));
    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id, action: 'read' }),
      keepalive: true
    }).finally(() => {
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    });
  };

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, action })
      });
      if (res.ok) {
        const readAt = new Date().toISOString();
        setNotificationsData((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
        setRealNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'READ', readAt } : item)));
        window.dispatchEvent(new Event('thesistrack:notifications-updated'));
      }
    } catch (e) {
      console.error('Failed to process notification action', e);
    }
  };

  const markAllRead = () => {
    const unreadIds = notificationsData.filter((item) => !item.read).map((item) => item.id);
    if (!unreadIds.length) {
      return;
    }

    setNotificationsData((prev) => prev.map((item) => ({ ...item, read: true })));
    setRealNotifications((prev) => prev.map((item) => (unreadIds.includes(item.id) ? { ...item, status: 'READ', readAt: new Date().toISOString() } : item)));
    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: unreadIds, action: 'read' }),
      keepalive: true
    });
    window.dispatchEvent(new Event('thesistrack:notifications-updated'));
  };

  const resetFilters = () => {
    setTypeFilter('all');
  };

  const summaryCards = [
    {
      label: 'Needs Attention',
      value: unreadNotificationsCount,
      note: unreadNotificationsCount ? 'Unread items still waiting in the student inbox.' : 'The active inbox is currently clear.',
      icon: 'fa-bell',
      tone: 'warning' as BadgeTone
    },
    {
      label: 'Deadline Alerts',
      value: deadlines,
      note: deadlines ? 'Time-sensitive reminders for files, submissions, or defense prep.' : 'No deadline alert is currently active.',
      icon: 'fa-hourglass-half',
      tone: 'danger' as BadgeTone
    },
    {
      label: 'Feedback Notices',
      value: unreadFeedbackCount,
      note: unreadFeedbackCount ? 'Unread adviser or panel items need review.' : 'No unread faculty feedback notice is pending.',
      icon: 'fa-comments',
      tone: 'info' as BadgeTone
    },
    {
      label: 'Completed',
      value: completedCount,
      note: completedCount ? 'Read notifications preserved for follow-up and reference.' : 'No completed notification is stored yet.',
      icon: 'fa-check-double',
      tone: 'success' as BadgeTone
    }
  ];

  const typeFilterOptions: Array<{ value: NotificationType | 'all'; label: string; icon: string }> = [
    { value: 'all', label: 'All', icon: 'fa-layer-group' },
    { value: 'feedback', label: 'Feedback', icon: 'fa-comments' },
    { value: 'deadline', label: 'Deadline', icon: 'fa-hourglass-half' },
    { value: 'approval', label: 'Approval', icon: 'fa-circle-check' },
    { value: 'schedule', label: 'Schedule', icon: 'fa-calendar-check' },
    { value: 'general', label: 'General', icon: 'fa-bell' },
    { value: 'transfer', label: 'Project', icon: 'fa-diagram-project' }
  ];

  const realTypesPresent = typeFilterOptions.filter(
    (option) => option.value !== 'all' && notificationsData.some((item) => item.type === option.value)
  );
  // If every notification is the same type, "All" and that one type pill would always
  // select the exact same set — showing both is redundant, so the type row only appears
  // once there's an actual choice to make.
  const showTypeFilters = realTypesPresent.length > 1;
  const visibleTypeFilterOptions = typeFilterOptions.filter(
    (option) => option.value === 'all' || option.value === typeFilter || notificationsData.some((item) => item.type === option.value)
  );

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
                <span>Notifications</span>
              </span>
            </div>
            <h1>Notifications</h1>
            <p>Stay updated on project alerts, evaluation schedules, and upcoming project stages.</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        <section className="grid gap-5">
          <article className="rounded-[28px] bg-[var(--surface)] p-6 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#003A8F]">Notification Center</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link prefetch={false} className={PRIMARY_ACTION_CLASS} href="/students/faculty-feedback">
                  <i className="fas fa-comments" aria-hidden="true" /> Open Feedback
                </Link>
                <Link prefetch={false} className={SECONDARY_ACTION_CLASS} href="/students/schedule">
                  <i className="fas fa-calendar-check" aria-hidden="true" /> Check Schedule
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => (
                <article key={item.label} className="rounded-2xl bg-[var(--surface-alt)] p-4 ring-1 ring-slate-200/80">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        item.tone === 'danger'
                          ? 'bg-rose-50 text-rose-600'
                          : item.tone === 'warning'
                            ? 'bg-amber-50 text-amber-700'
                            : item.tone === 'success'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-[#003A8F]'
                      }`}
                    >
                      <i className={`fas ${item.icon}`} aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{item.label}</span>
                  </div>
                  <strong className="mt-4 block text-3xl font-extrabold leading-none text-slate-950">{item.value}</strong>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[24px] bg-[var(--surface)] p-4 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#003A8F]">Inbox Filters</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {typeFilter !== 'all' ? (
                <button className={SECONDARY_ACTION_CLASS} type="button" onClick={resetFilters}>
                  <i className="fas fa-rotate-left" aria-hidden="true" /> Reset
                </button>
              ) : null}
              <button className={PRIMARY_ACTION_CLASS} type="button" onClick={markAllRead} disabled={!unreadNotificationsCount}>
                <i className="fas fa-check-double" aria-hidden="true" /> Mark All Read
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {showTypeFilters ? (
              <div className="flex flex-wrap items-center gap-2">
                {visibleTypeFilterOptions.map((option) => {
                  const isActive = typeFilter === option.value;
                  const count = option.value === 'all' ? notificationsData.length : notificationsData.filter((item) => item.type === option.value).length;

                  return (
                    <button
                      key={option.value}
                      aria-pressed={isActive}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition ${
                        isActive
                          ? 'border-[#003A8F]/20 bg-[#003A8F]/10 text-[#003A8F]'
                          : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--text)]'
                      }`}
                      type="button"
                      onClick={() => setTypeFilter(option.value)}
                    >
                      <i className={`fas ${option.icon} text-[12px]`} aria-hidden="true" />
                      {option.label}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-[var(--surface)] text-[#003A8F]' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>{count}</span>
                    </button>
                  );
                })}

                <span className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" aria-hidden="true" />
              </div>
            ) : null}

            <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[var(--surface-alt)] p-1">
              {(
                [
                  { key: 'all', label: 'All', icon: 'fa-layer-group', count: filteredNotifications.length, badgeTone: 'neutral' as BadgeTone },
                  {
                    key: 'needs-action',
                    label: 'Needs Action',
                    icon: 'fa-bolt',
                    count: needsActionNotifications.length,
                    badgeTone: (needsActionNotifications.length ? 'danger' : 'neutral') as BadgeTone
                  },
                  {
                    key: 'updates',
                    label: 'Updates',
                    icon: 'fa-bell',
                    count: updatesNotifications.length,
                    badgeTone: (updatesNotifications.length ? 'info' : 'neutral') as BadgeTone
                  },
                  { key: 'completed', label: 'Completed', icon: 'fa-check-double', count: completedNotifications.length, badgeTone: 'success' as BadgeTone }
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    aria-pressed={isActive}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition ${
                      isActive
                        ? 'bg-[var(--surface)] text-[#003A8F] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <i className={`fas ${tab.icon} text-[12px] ${isActive ? 'text-[#003A8F]' : 'text-[var(--text-meta)]'}`} aria-hidden="true" />
                    {tab.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        tab.badgeTone === 'neutral' ? 'bg-[var(--surface)] text-[var(--muted)]' : BADGE_STYLES[tab.badgeTone]
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const activeItems =
              activeTab === 'all'
                ? filteredNotifications
                : activeTab === 'needs-action'
                  ? needsActionNotifications
                  : activeTab === 'updates'
                    ? updatesNotifications
                    : completedNotifications;
            const emptyCopy =
              activeTab === 'all'
                ? 'No notification is present in the current filtered view.'
                : activeTab === 'needs-action'
                  ? 'No actionable notification is waiting after the current filters were applied.'
                  : activeTab === 'updates'
                    ? 'No non-urgent update is present in the current filtered view.'
                    : 'No completed notification is available after the current filters were applied.';

            return activeItems.length ? (
              <div className="mt-5 space-y-3">
                {activeItems.map((item) => (
                  <NotificationCard key={item.id} item={item as any} onMarkRead={markRead} onAction={handleAction} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-[var(--surface-alt)] px-4 py-5 text-sm leading-6 text-[var(--muted)]">{emptyCopy}</div>
            );
          })()}
        </section>
      </div>
    </>
  );
}
