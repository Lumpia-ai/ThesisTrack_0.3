'use client';

import { useMemo, useState } from 'react';
import { FocalPersonShell } from '@/components/focal-person/focal-person-shell';
import { useFocalProjects } from '@/components/focal-person/focal-person-store';
import { HistoryTable, ScopeNotice } from '@/components/focal-person/focal-person-ui';
import { findInventoryRecord } from '@/components/research-head/research-head-projects-data';

const ALL = 'all';
const ROLE_OPTIONS = ['Program Head', 'Research Focal Person', 'Research Head'];

export function FocalPersonHistory() {
  const { loading, scope, state, projectIds } = useFocalProjects();
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState(ALL);
  const [roleFilter, setRoleFilter] = useState(ALL);

  const scopedHistory = useMemo(() => state.history.filter((entry) => projectIds.has(entry.projectId)), [projectIds, state]);
  const actionOptions = useMemo(() => [...new Set(scopedHistory.map((entry) => entry.action))].sort(), [scopedHistory]);

  const entries = scopedHistory.filter((entry) => {
    const search = query.trim().toLowerCase();
    const title = findInventoryRecord(entry.projectId)?.title ?? '';

    return (
      (!search ||
        title.toLowerCase().includes(search) ||
        entry.projectId.toLowerCase().includes(search) ||
        entry.actor.toLowerCase().includes(search) ||
        entry.remarks.toLowerCase().includes(search)) &&
      (actionFilter === ALL || entry.action === actionFilter) &&
      (roleFilter === ALL || entry.actorRole === roleFilter)
    );
  });

  return (
    <FocalPersonShell activeNav="history" title="Validation History">
      <div className="admin-page-stack repo-page focal-page">
        <header className="repo-page-header">
          <div>
            <h1>Validation History</h1>
            <p className="admin-note">Audit trail of approvals, validations, forwards, and returns for projects in {scope ?? 'your program'}.</p>
          </div>
        </header>

        <ScopeNotice loading={loading} scope={scope} />

        {!loading && scope ? (
          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Workflow Records</h3>
              <span className="status-badge status-info">{entries.length} entries</span>
            </div>

            <div className="repo-filter-bar">
              <div className="repo-filter-search">
                <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  className="repo-filter-input"
                  aria-label="Search history"
                  placeholder="Search project, person, or remarks..."
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select className="repo-filter-select" aria-label="Action" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
                <option value={ALL}>All actions</option>
                {actionOptions.map((action) => <option key={action}>{action}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value={ALL}>All roles</option>
                {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
              </select>
            </div>

            <HistoryTable entries={entries} showProject />
          </section>
        ) : null}
      </div>
    </FocalPersonShell>
  );
}
