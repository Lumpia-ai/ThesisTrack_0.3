'use client';

import Link from 'next/link';
import { FocalPersonShell } from '@/components/focal-person/focal-person-shell';
import { EVENT_META, WORKFLOW_STATUSES, formatRelative } from '@/components/focal-person/focal-person-data';
import { eventsFor, useFocalProjects } from '@/components/focal-person/focal-person-store';
import { FocalProjectsTable, ScopeNotice, projectHref } from '@/components/focal-person/focal-person-ui';
import { TruncatedText } from '@/components/shared/truncated-text';
import { findInventoryRecord } from '@/components/research-head/research-head-projects-data';

export function FocalPersonDashboard() {
  const { loading, scope, state, items, projectIds } = useFocalProjects();

  const countStatus = (status: string) => items.filter((item) => item.workflow.status === status).length;
  const stats = [
    { label: 'Total Projects', value: items.length, icon: 'fa-folder-tree', href: '/focal-person/projects' },
    { label: 'Ongoing', value: items.filter((item) => item.researchState === 'Ongoing').length, icon: 'fa-bars-progress', href: '/focal-person/projects' },
    { label: 'Completed', value: items.filter((item) => item.researchState === 'Completed').length, icon: 'fa-flag-checkered', href: '/focal-person/projects' },
    { label: 'Pending Validation', value: countStatus('Pending Validation'), icon: 'fa-list-check', href: '/focal-person/pending-validation' },
    { label: 'Returned / Revision', value: countStatus('Returned'), icon: 'fa-rotate-left', href: '/focal-person/returned' },
    { label: 'Forwarded to RH', value: countStatus('Forwarded to Research Head'), icon: 'fa-share-from-square', href: '/focal-person/projects' }
  ];

  // Status overview: one bar per workflow status, labeled with name and count.
  const statusRows = WORKFLOW_STATUSES.map((status) => ({ status, count: countStatus(status) }));
  const maxCount = Math.max(1, ...statusRows.map((row) => row.count));

  const activities = eventsFor(state, 'focal_person', projectIds).slice(0, 7);
  const recentlyUpdated = [...items]
    .sort((left, right) => new Date(right.project.lastUpdated).getTime() - new Date(left.project.lastUpdated).getTime())
    .slice(0, 5);

  return (
    <FocalPersonShell activeNav="dashboard" title="Dashboard">
      <div className="admin-page-stack repo-page focal-page">
        <header className="repo-page-header">
          <div>
            <h1>Research Coordination</h1>
            <p className="admin-note">{scope ? `${scope} · monitoring, validation, and forwarding` : 'Research Focal Person workspace'}</p>
          </div>
        </header>

        <ScopeNotice loading={loading} scope={scope} />

        {!loading && scope ? (
          <>
            <section className="repo-stats-grid focal-stats-grid" aria-label="Project summary">
              {stats.map((stat) => (
                <Link key={stat.label} className="repo-stat-card focal-stat-link" href={stat.href}>
                  <div className="repo-stat-icon">
                    <i className={`fas ${stat.icon}`} aria-hidden="true"></i>
                  </div>
                  <div className="repo-stat-body">
                    <span className="repo-stat-label">{stat.label}</span>
                    <strong className="repo-stat-value">{stat.value}</strong>
                  </div>
                </Link>
              ))}
            </section>

            <div className="focal-dash-grid">
              <section className="admin-section-card repo-records">
                <div className="admin-section-head repo-records-head">
                  <h3>Projects by Status</h3>
                  <span className="admin-note">{items.length} total</span>
                </div>
                <ul className="focal-status-bars" aria-label="Projects by workflow status">
                  {statusRows.map((row) => (
                    <li key={row.status}>
                      <span className="focal-status-bars-label">{row.status}</span>
                      <span className="focal-status-bars-track">
                        <span
                          className="focal-status-bars-fill"
                          style={{ width: `${(row.count / maxCount) * 100}%` }}
                          title={`${row.status}: ${row.count}`}
                        ></span>
                      </span>
                      <strong className="focal-status-bars-value">{row.count}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="admin-section-card repo-records">
                <div className="admin-section-head repo-records-head">
                  <h3>Recent Activities</h3>
                  <Link className="focal-link" href="/focal-person/notifications">View all</Link>
                </div>
                {activities.length ? (
                  <ul className="notif-list">
                    {activities.map((item) => (
                      <li key={item.id} className="notif-item focal-activity">
                        <span className="notif-icon" style={{ color: EVENT_META[item.type].color }} aria-hidden="true">
                          <i className={`fas ${EVENT_META[item.type].icon}`}></i>
                        </span>
                        <div className="notif-body">
                          <Link className="focal-link" href={projectHref(item.projectId)}>
                            <strong>{item.title}</strong>
                          </Link>
                          <TruncatedText text={findInventoryRecord(item.projectId)?.title ?? item.projectId} />
                        </div>
                        <div className="notif-side">
                          <time>{formatRelative(item.at)}</time>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="admin-empty-state">No recent activity.</div>
                )}
              </section>
            </div>

            <section className="admin-section-card repo-records">
              <div className="admin-section-head repo-records-head">
                <h3>Recently Updated Projects</h3>
                <Link className="focal-link" href="/focal-person/projects">All projects</Link>
              </div>
              <FocalProjectsTable rows={recentlyUpdated} emptyMessage="No projects in your program yet." />
            </section>
          </>
        ) : null}
      </div>
    </FocalPersonShell>
  );
}
