'use client';

import { useMemo, useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';
import { findInventoryRecord } from '@/components/research-head/research-head-projects-data';
import { EVENT_META, daysSince, formatRelative } from '@/components/focal-person/focal-person-data';
import { eventsFor, markEventRead, markEventsRead, useWorkflowState } from '@/components/focal-person/focal-person-store';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    category: 'Repository Updates',
    department: 'All',
    icon: 'fa-folder-open',
    iconColor: 'var(--primary)',
    title: 'Repository Publication Queue Updated',
    message: '7 approved manuscripts are ready for library release after final metadata review.',
    time: '20 minutes ago',
    daysAgo: 0,
    unread: true
  },
  {
    id: 'notif-2',
    category: 'Department Alerts',
    department: 'TCM',
    icon: 'fa-hourglass-half',
    iconColor: 'var(--warning)',
    title: 'Department Escalation: TCM Title Reviews Delayed',
    message: '2 title approvals have exceeded the review window and need research-head follow-up today.',
    time: '1 hour ago',
    daysAgo: 0,
    unread: true
  },
  {
    id: 'notif-4',
    category: 'Approval Queue',
    department: 'All',
    icon: 'fa-chart-line',
    iconColor: 'var(--warning)',
    title: 'Quarterly Research Summary Ready',
    message: 'The Q1 2026 school research summary is ready for review and endorsement.',
    time: 'Yesterday, 8:15 AM',
    daysAgo: 1,
    unread: false
  },
  {
    id: 'notif-5',
    category: 'Repository Updates',
    department: 'IT',
    icon: 'fa-tags',
    iconColor: 'var(--primary)',
    title: 'Library Metadata Completion Needed',
    message: '5 published records are missing final keywords or abstract tags before archiving.',
    time: 'Yesterday, 1:30 PM',
    daysAgo: 1,
    unread: false
  },
  {
    id: 'notif-6',
    category: 'Approval Queue',
    department: 'All',
    icon: 'fa-handshake',
    iconColor: 'var(--success)',
    title: 'Transfer Endorsement Logged',
    message: 'The AI Inventory System endorsement package was forwarded to TTO for partner onboarding.',
    time: '2 days ago',
    daysAgo: 2,
    unread: false
  }
];

const TYPE_OPTIONS = ['All Types', 'Approval Queue', 'Department Alerts', 'Repository Updates'];
const DEPARTMENT_OPTIONS = ['All Departments', 'IT', 'MET', 'TCM', 'ESM', 'NAME'];
const STATUS_OPTIONS = ['All Statuses', 'Unread', 'Read'];

// Date ranges by how many days ago the notification arrived.
const DATE_OPTIONS = [
  { label: 'All Dates', matches: () => true },
  { label: 'Today', matches: (daysAgo: number) => daysAgo === 0 },
  { label: 'Yesterday', matches: (daysAgo: number) => daysAgo === 1 },
  { label: 'Last 7 Days', matches: (daysAgo: number) => daysAgo <= 7 },
  { label: 'Last 30 Days', matches: (daysAgo: number) => daysAgo <= 30 },
  { label: 'Older', matches: (daysAgo: number) => daysAgo > 30 }
];

const DEFAULT_FILTERS = {
  query: '',
  type: TYPE_OPTIONS[0],
  date: DATE_OPTIONS[0].label,
  department: DEPARTMENT_OPTIONS[0],
  status: STATUS_OPTIONS[0]
};

export function ResearchHeadNotifications() {
  const [localNotifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const workflowState = useWorkflowState();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Projects forwarded by Research Focal Persons (shared workflow store), listed with the rest.
  const workflowEvents = useMemo(() => eventsFor(workflowState, 'research_head'), [workflowState]);
  const notifications = useMemo(
    () => [
      ...workflowEvents.map((event) => ({
        id: event.id,
        category: 'Approval Queue',
        department: findInventoryRecord(event.projectId)?.department ?? 'All',
        icon: EVENT_META[event.type].icon,
        iconColor: 'var(--primary)',
        title: event.title,
        message: event.message,
        time: formatRelative(event.at),
        daysAgo: daysSince(event.at),
        unread: !event.read
      })),
      ...localNotifications
    ],
    [localNotifications, workflowEvents]
  );
  const [modalOpen, setModalOpen] = useState(false);

  const setFilter = (key: keyof typeof DEFAULT_FILTERS) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const hasActiveFilters = (Object.keys(DEFAULT_FILTERS) as Array<keyof typeof DEFAULT_FILTERS>).some(
    (key) => filters[key] !== DEFAULT_FILTERS[key]
  );

  const filteredNotifications = useMemo(() => {
    const search = filters.query.trim().toLowerCase();
    const dateRange = DATE_OPTIONS.find((option) => option.label === filters.date) ?? DATE_OPTIONS[0];

    return notifications.filter((item) => {
      const matchesQuery =
        !search || item.title.toLowerCase().includes(search) || item.message.toLowerCase().includes(search);
      const matchesType = filters.type === DEFAULT_FILTERS.type || item.category === filters.type;
      const matchesDate = dateRange.matches(item.daysAgo);
      // Institution-wide notifications ("All") stay visible under every department.
      const matchesDepartment =
        filters.department === DEFAULT_FILTERS.department || item.department === filters.department || item.department === 'All';
      const matchesStatus =
        filters.status === DEFAULT_FILTERS.status || (filters.status === 'Unread' ? item.unread : !item.unread);

      return matchesQuery && matchesType && matchesDate && matchesDepartment && matchesStatus;
    });
  }, [filters, notifications]);

  const markRead = (id: string) => {
    if (workflowEvents.some((event) => event.id === id)) {
      markEventRead(id);
      return;
    }

    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  const markAllAsRead = () => {
    markEventsRead(workflowEvents.filter((event) => !event.read).map((event) => event.id));
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
  };

  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <>
      <ResearchHeadShell
        activeNav="notifications"
        title="Research Head Notifications"
        description="Review approvals, department backlogs, repository releases, and school-level follow-ups."
      >
        <div className="admin-page-stack rh-wide-page repo-page">
          <header className="repo-page-header">
            <h1>Notifications</h1>
            <div className="repo-page-actions">
              <button className="btn btn-outline repo-btn" type="button" disabled={!unreadCount} onClick={markAllAsRead}>
                <i className="fas fa-check-double" aria-hidden="true"></i>
                Mark All as Read
              </button>
              <button className="btn btn-primary repo-btn" type="button" onClick={() => setModalOpen(true)}>
                <i className="fas fa-paper-plane" aria-hidden="true"></i>
                Send Notification
              </button>
            </div>
          </header>

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Inbox</h3>
              <span className={`status-badge ${unreadCount ? 'status-info' : 'status-neutral'}`}>
                {unreadCount ? `${unreadCount} unread` : 'All caught up'}
              </span>
            </div>

            <div className="repo-filter-bar">
              <div className="repo-filter-search">
                <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  className="repo-filter-input"
                  aria-label="Search notifications"
                  placeholder="Search notifications..."
                  type="search"
                  value={filters.query}
                  onChange={(event) => setFilter('query')(event.target.value)}
                />
              </div>
              <select className="repo-filter-select" aria-label="Type" value={filters.type} onChange={(event) => setFilter('type')(event.target.value)}>
                {TYPE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Date" value={filters.date} onChange={(event) => setFilter('date')(event.target.value)}>
                {DATE_OPTIONS.map((option) => <option key={option.label}>{option.label}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Department" value={filters.department} onChange={(event) => setFilter('department')(event.target.value)}>
                {DEPARTMENT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Status" value={filters.status} onChange={(event) => setFilter('status')(event.target.value)}>
                {STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
              {hasActiveFilters ? (
                <div className="repo-filter-actions">
                  <button className="btn btn-outline repo-btn" type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>
                    <i className="fas fa-xmark" aria-hidden="true"></i>
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>

            {filteredNotifications.length ? (
              <ul className="notif-list">
                {filteredNotifications.map((item) => (
                  <li key={item.id} className={`notif-item${item.unread ? ' is-unread' : ''}`}>
                    <span className="notif-icon" style={{ color: item.iconColor }} aria-hidden="true">
                      <i className={`fas ${item.icon}`}></i>
                    </span>
                    <div className="notif-body">
                      <div className="notif-title-row">
                        {item.unread ? <span className="notif-unread-dot" aria-label="Unread"></span> : null}
                        <strong>{item.title}</strong>
                      </div>
                      <p>{item.message}</p>
                      <span className="notif-meta">
                        {item.category}
                        {item.department !== 'All' ? ` · ${item.department}` : ''}
                      </span>
                    </div>
                    <div className="notif-side">
                      <time>{item.time}</time>
                      {item.unread ? (
                        <button className="btn btn-outline repo-btn repo-btn-sm" type="button" onClick={() => markRead(item.id)}>
                          Mark Read
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-empty-state">No notifications match the current filters.</div>
            )}

            <div className="repo-pagination-row">
              <span className="repo-pagination-info">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </span>
              <div className="admin-pagination">
                <button className="active" type="button">1</button>
                <button type="button">2</button>
                <button type="button">3</button>
                <button type="button">Next</button>
              </div>
            </div>
          </section>
        </div>
      </ResearchHeadShell>

      {modalOpen ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3>Send Research Notification</h3>
                <p>Broadcast a message to the selected user group, department, or institutional audience.</p>
              </div>
              <button className="close-modal" type="button" onClick={() => setModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="admin-form-grid">
                <div className="form-group">
                  <label>Recipient</label>
                  <select defaultValue="All Users">
                    <option>All Users</option>
                    <option>All Students</option>
                    <option>All Advisers</option>
                    <option>IT Department</option>
                    <option>MET Department</option>
                    <option>TCM Department</option>
                    <option>ESM Department</option>
                    <option>NAME Department</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select defaultValue="Normal">
                    <option>Normal</option>
                    <option>Important</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input placeholder="Notification title" />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea placeholder="Enter notification content..." rows={5}></textarea>
              </div>
              <label className="admin-check-card">
                <input type="checkbox" />
                <span>
                  <strong>Send email notification as well</strong>
                </span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={() => setModalOpen(false)}>
                Send Notification
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
