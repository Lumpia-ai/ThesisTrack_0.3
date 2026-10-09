'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SecretaryShell } from '@/components/secretary/secretary-shell';
import { EVENT_META, formatRelative, meetingHref, type SecretaryEventType } from '@/components/secretary/secretary-data';
import { useSecretary } from '@/components/secretary/secretary-store';

const ALL = 'all';
const TYPE_OPTIONS = Object.keys(EVENT_META) as SecretaryEventType[];

export function SecretaryNotifications() {
  const { events, meetings, markEventRead, markEventsRead } = useSecretary();
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [readFilter, setReadFilter] = useState<string>(ALL);

  const unread = events.filter((item) => !item.read);
  const filtered = events.filter(
    (item) =>
      (typeFilter === ALL || item.type === typeFilter) &&
      (readFilter === ALL || (readFilter === 'unread' ? !item.read : item.read))
  );

  return (
    <SecretaryShell activeNav="notifications" title="Notifications">
      <div className="admin-page-stack repo-page secretary-page">
        <header className="repo-page-header">
          <div>
            <h1>Notifications</h1>
            <p className="admin-note">Assignments, schedule changes, and the chair&apos;s responses to your minutes.</p>
          </div>
          <div className="repo-page-actions">
            <button
              className="btn btn-outline repo-btn"
              type="button"
              disabled={!unread.length}
              onClick={() => markEventsRead(unread.map((item) => item.id))}
            >
              <i className="fas fa-check-double" aria-hidden="true"></i>
              Mark All as Read
            </button>
          </div>
        </header>

        <section className="admin-section-card repo-records">
          <div className="admin-section-head repo-records-head">
            <h3>Inbox</h3>
            <span className={`status-badge ${unread.length ? 'status-info' : 'status-neutral'}`}>
              {unread.length ? `${unread.length} unread` : 'All caught up'}
            </span>
          </div>

          <div className="repo-filter-bar">
            <select className="repo-filter-select" aria-label="Notification type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value={ALL}>All types</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{EVENT_META[type].label}</option>
              ))}
            </select>
            <select className="repo-filter-select" aria-label="Read status" value={readFilter} onChange={(event) => setReadFilter(event.target.value)}>
              <option value={ALL}>Read &amp; unread</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          {filtered.length ? (
            <ul className="notif-list">
              {filtered.map((item) => {
                const meta = EVENT_META[item.type];
                const meeting = meetings.find((entry) => entry.id === item.meetingId);

                return (
                  <li key={item.id} className={`notif-item${item.read ? '' : ' is-unread'}`}>
                    <span className="notif-icon" style={{ color: meta.color }} aria-hidden="true">
                      <i className={`fas ${meta.icon}`}></i>
                    </span>
                    <div className="notif-body">
                      <div className="notif-title-row">
                        {item.read ? null : <span className="notif-unread-dot" aria-label="Unread"></span>}
                        <strong>{item.title}</strong>
                      </div>
                      <p>{item.message}</p>
                      <span className="notif-meta">
                        {meta.label} · {meeting?.title ?? item.meetingId}
                      </span>
                    </div>
                    <div className="notif-side">
                      <time dateTime={item.at}>{formatRelative(item.at)}</time>
                      <span className="repo-action-group">
                        <Link className="btn btn-outline repo-btn repo-btn-sm" href={meetingHref(item.meetingId)} onClick={() => markEventRead(item.id)}>
                          Open
                        </Link>
                        {item.read ? null : (
                          <button className="btn btn-outline repo-btn repo-btn-sm" type="button" onClick={() => markEventRead(item.id)}>
                            Mark Read
                          </button>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="admin-empty-state">No notifications match the current filters.</div>
          )}
        </section>
      </div>
    </SecretaryShell>
  );
}
