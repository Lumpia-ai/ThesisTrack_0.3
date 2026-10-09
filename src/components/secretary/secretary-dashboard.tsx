'use client';

import Link from 'next/link';
import { SecretaryShell } from '@/components/secretary/secretary-shell';
import {
  DEFENSE_STAGES,
  EVENT_META,
  STAGE_META,
  formatRelative,
  formatTime,
  isSameDay,
  meetingHref
} from '@/components/secretary/secretary-data';
import { sortByDate, useSecretary } from '@/components/secretary/secretary-store';
import { MeetingsTable, StageTag, StatusDot, actionLabel } from '@/components/secretary/secretary-ui';
import { TruncatedText } from '@/components/shared/truncated-text';

export function SecretaryDashboard() {
  const { meetings, events } = useSecretary();

  const count = (predicate: (status: string) => boolean) => meetings.filter((meeting) => predicate(meeting.status)).length;
  const stats = [
    { label: 'Upcoming Defenses', value: count((status) => status === 'Upcoming'), icon: 'fa-calendar-days', tone: 'slate', href: '/secretary/meetings?status=Upcoming' },
    { label: 'Minutes to Record', value: count((status) => status === 'To Record' || status === 'Draft'), icon: 'fa-pen-to-square', tone: 'amber', href: '/secretary/meetings?status=open' },
    { label: 'Returned by Chair', value: count((status) => status === 'Returned'), icon: 'fa-rotate-left', tone: 'rose', href: '/secretary/meetings?status=Returned' },
    { label: 'Awaiting Chair', value: count((status) => status === 'Submitted to Chair'), icon: 'fa-hourglass-half', tone: 'blue', href: '/secretary/meetings?status=Submitted%20to%20Chair' },
    { label: 'Confirmed Minutes', value: count((status) => status === 'Confirmed'), icon: 'fa-circle-check', tone: 'emerald', href: '/secretary/reports' }
  ];

  const today = sortByDate(meetings.filter((meeting) => isSameDay(meeting.date)));
  const needsAction = sortByDate(meetings.filter((meeting) => meeting.status === 'Returned' || ((meeting.status === 'To Record' || meeting.status === 'Draft') && !isSameDay(meeting.date))));
  const upcoming = sortByDate(meetings.filter((meeting) => meeting.status === 'Upcoming')).slice(0, 5);

  const stageRows = DEFENSE_STAGES.map((stage) => {
    const stageMeetings = meetings.filter((meeting) => meeting.stage === stage);
    return {
      stage,
      total: stageMeetings.length,
      confirmed: stageMeetings.filter((meeting) => meeting.status === 'Confirmed').length
    };
  });

  return (
    <SecretaryShell activeNav="dashboard" title="Dashboard">
      <div className="admin-page-stack repo-page secretary-page">
        <header className="repo-page-header">
          <div>
            <h1>Minutes of Meeting</h1>
            <p className="admin-note">Concept, Proposal and Final defenses you are assigned to record.</p>
          </div>
        </header>

        <section className="repo-stats-grid secretary-stats-grid" aria-label="Minutes summary">
          {stats.map((stat) => (
            <Link key={stat.label} className={`repo-stat-card secretary-stat-link secretary-tone-${stat.tone}`} href={stat.href}>
              <div className="repo-stat-icon secretary-stat-icon">
                <i className={`fas ${stat.icon}`} aria-hidden="true"></i>
              </div>
              <div className="repo-stat-body">
                <span className="repo-stat-label">{stat.label}</span>
                <strong className="repo-stat-value">{stat.value}</strong>
              </div>
            </Link>
          ))}
        </section>

        <section className="admin-section-card repo-records">
          <div className="admin-section-head repo-records-head">
            <h3>Today&apos;s Defenses</h3>
            <span className="admin-note">{today.length ? `${today.length} scheduled` : 'None today'}</span>
          </div>
          {today.length ? (
            <ul className="secretary-today-list">
              {today.map((meeting) => (
                <li key={meeting.id} className="secretary-today-card">
                  <div className="secretary-today-time">
                    <strong>{formatTime(meeting.date)}</strong>
                    <span>{meeting.venue}</span>
                  </div>
                  <div className="secretary-today-body">
                    <StageTag stage={meeting.stage} />
                    <TruncatedText text={meeting.title} className="table-title" />
                    <span className="admin-note">
                      {meeting.groupName} · Chair: {meeting.chair}
                    </span>
                  </div>
                  <div className="secretary-today-side">
                    <StatusDot status={meeting.status} />
                    <Link className="btn btn-primary repo-btn" href={meetingHref(meeting.id)}>
                      <i className="fas fa-pen-to-square" aria-hidden="true"></i> {actionLabel(meeting.status)}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="admin-empty-state">No defenses scheduled today.</div>
          )}
        </section>

        <div className="secretary-dash-grid">
          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Needs Your Action</h3>
              <span className="admin-note">{needsAction.length} item{needsAction.length === 1 ? '' : 's'}</span>
            </div>
            {needsAction.length ? (
              <ul className="notif-list">
                {needsAction.map((meeting) => (
                  <li key={meeting.id} className="notif-item">
                    <span className="notif-icon secretary-stage-icon" aria-hidden="true">
                      <i className={`fas ${STAGE_META[meeting.stage].icon}`}></i>
                    </span>
                    <div className="notif-body">
                      <Link className="secretary-link" href={meetingHref(meeting.id)}>
                        <strong>{meeting.title}</strong>
                      </Link>
                      {meeting.status === 'Returned' && meeting.minutes.chairNote ? (
                        <p className="secretary-chair-note-inline">
                          <i className="fas fa-comment-dots" aria-hidden="true"></i> {meeting.minutes.chairNote}
                        </p>
                      ) : (
                        <p>{STAGE_META[meeting.stage].label} · {meeting.groupName}</p>
                      )}
                    </div>
                    <div className="notif-side">
                      <StatusDot status={meeting.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-empty-state">You&apos;re all caught up.</div>
            )}
          </section>

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Minutes by Defense Stage</h3>
              <span className="admin-note">Confirmed / assigned</span>
            </div>
            <ul className="secretary-stage-bars" aria-label="Confirmed minutes by defense stage">
              {stageRows.map((row) => (
                <li key={row.stage}>
                  <span className="secretary-stage-bars-label">
                    <i className={`fas ${STAGE_META[row.stage].icon}`} aria-hidden="true"></i>
                    {STAGE_META[row.stage].label}
                  </span>
                  <span className="secretary-stage-bars-track">
                    <span
                      className="secretary-stage-bars-fill"
                      style={{ width: `${row.total ? (row.confirmed / row.total) * 100 : 0}%` }}
                    ></span>
                  </span>
                  <strong className="secretary-stage-bars-value">
                    {row.confirmed}/{row.total}
                  </strong>
                </li>
              ))}
            </ul>

            <div className="admin-section-head repo-records-head secretary-subhead">
              <h3>Recent Activity</h3>
              <Link className="secretary-link" href="/secretary/notifications">View all</Link>
            </div>
            <ul className="notif-list">
              {events.slice(0, 4).map((item) => (
                <li key={item.id} className="notif-item">
                  <span className="notif-icon" style={{ color: EVENT_META[item.type].color }} aria-hidden="true">
                    <i className={`fas ${EVENT_META[item.type].icon}`}></i>
                  </span>
                  <div className="notif-body">
                    <strong>{item.title}</strong>
                    <TruncatedText text={item.message} />
                  </div>
                  <div className="notif-side">
                    <time dateTime={item.at}>{formatRelative(item.at)}</time>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="admin-section-card repo-records">
          <div className="admin-section-head repo-records-head">
            <h3>Upcoming Defenses</h3>
            <Link className="secretary-link" href="/secretary/meetings">All meetings</Link>
          </div>
          <MeetingsTable rows={upcoming} emptyMessage="No upcoming defenses assigned to you." />
        </section>
      </div>
    </SecretaryShell>
  );
}
