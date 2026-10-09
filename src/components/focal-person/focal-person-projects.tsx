'use client';

import { useMemo, useState } from 'react';
import { FocalPersonShell } from '@/components/focal-person/focal-person-shell';
import { WORKFLOW_STATUSES, daysSince } from '@/components/focal-person/focal-person-data';
import { useFocalProjects } from '@/components/focal-person/focal-person-store';
import { FocalProjectsTable, ScopeNotice } from '@/components/focal-person/focal-person-ui';

const ALL = 'All';

const PROGRESS_OPTIONS = [
  { label: 'Any progress', matches: () => true },
  { label: 'Below 50%', matches: (value: number) => value < 50 },
  { label: '50% – 79%', matches: (value: number) => value >= 50 && value < 80 },
  { label: '80% and above', matches: (value: number) => value >= 80 }
];

const UPDATED_OPTIONS = [
  { label: 'Any date', matches: () => true },
  { label: 'Last 7 days', matches: (days: number) => days <= 7 },
  { label: 'Last 30 days', matches: (days: number) => days <= 30 },
  { label: 'Older than 30 days', matches: (days: number) => days > 30 }
];

const DEFAULT_FILTERS = {
  query: '',
  program: ALL,
  researchType: ALL,
  status: ALL,
  validation: ALL,
  progress: PROGRESS_OPTIONS[0].label,
  updated: UPDATED_OPTIONS[0].label
};

type Mode = 'all' | 'pending';

export function FocalPersonProjects({ mode = 'all' }: { mode?: Mode }) {
  const { loading, scope, items } = useFocalProjects();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const setFilter = (key: keyof typeof DEFAULT_FILTERS) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const baseItems = useMemo(
    () => (mode === 'pending' ? items.filter((item) => item.workflow.status === 'Pending Validation') : items),
    [items, mode]
  );

  const programOptions = useMemo(() => [ALL, ...new Set(baseItems.map((item) => item.project.program))], [baseItems]);
  const typeOptions = useMemo(() => [ALL, ...new Set(baseItems.map((item) => item.project.researchType))], [baseItems]);

  const rows = useMemo(() => {
    const search = filters.query.trim().toLowerCase();
    const progress = PROGRESS_OPTIONS.find((option) => option.label === filters.progress) ?? PROGRESS_OPTIONS[0];
    const updated = UPDATED_OPTIONS.find((option) => option.label === filters.updated) ?? UPDATED_OPTIONS[0];

    return baseItems.filter(({ project, workflow, validation }) => {
      const matchesQuery =
        !search ||
        project.title.toLowerCase().includes(search) ||
        project.id.toLowerCase().includes(search) ||
        project.researchers.some((name) => name.toLowerCase().includes(search));

      return (
        matchesQuery &&
        (filters.program === ALL || project.program === filters.program) &&
        (filters.researchType === ALL || project.researchType === filters.researchType) &&
        (filters.status === ALL || workflow.status === filters.status) &&
        (filters.validation === ALL || (filters.validation === 'Complete') === validation.complete) &&
        progress.matches(project.progressValue) &&
        updated.matches(daysSince(project.lastUpdated))
      );
    });
  }, [baseItems, filters]);

  const hasFilters = (Object.keys(DEFAULT_FILTERS) as Array<keyof typeof DEFAULT_FILTERS>).some(
    (key) => filters[key] !== DEFAULT_FILTERS[key]
  );
  const readyCount = baseItems.filter((item) => item.validation.complete).length;

  const isPending = mode === 'pending';
  const title = isPending ? 'Pending Validation' : 'Research Projects';

  return (
    <FocalPersonShell activeNav={isPending ? 'pending-validation' : 'projects'} title={title}>
      <div className="admin-page-stack repo-page focal-page">
        <header className="repo-page-header">
          <div>
            <h1>{title}</h1>
            <p className="admin-note">
              {isPending
                ? 'Projects waiting for your completeness check. Complete projects can be forwarded to the Research Head.'
                : `All research projects in ${scope ?? 'your program'}. Records are read-only; open a project to review and validate it.`}
            </p>
          </div>
        </header>

        <ScopeNotice loading={loading} scope={scope} />

        {!loading && scope ? (
          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>{isPending ? 'Validation Queue' : 'Project Monitoring'}</h3>
              <span className="status-badge status-info">
                {rows.length} shown{isPending ? ` · ${readyCount} ready to forward` : ''}
              </span>
            </div>

            <div className="repo-filter-bar">
              <div className="repo-filter-search">
                <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  className="repo-filter-input"
                  aria-label="Search by project title or researcher"
                  placeholder="Search title or researcher..."
                  type="search"
                  value={filters.query}
                  onChange={(event) => setFilter('query')(event.target.value)}
                />
              </div>
              <select className="repo-filter-select" aria-label="Program" value={filters.program} onChange={(event) => setFilter('program')(event.target.value)}>
                {programOptions.map((option) => (
                  <option key={option} value={option}>{option === ALL ? 'All programs' : option}</option>
                ))}
              </select>
              <select className="repo-filter-select" aria-label="Research type" value={filters.researchType} onChange={(event) => setFilter('researchType')(event.target.value)}>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>{option === ALL ? 'All research types' : option}</option>
                ))}
              </select>
              {isPending ? (
                <select className="repo-filter-select" aria-label="Validation result" value={filters.validation} onChange={(event) => setFilter('validation')(event.target.value)}>
                  <option value={ALL}>Complete &amp; incomplete</option>
                  <option value="Complete">Complete</option>
                  <option value="Incomplete">Incomplete</option>
                </select>
              ) : (
                <select className="repo-filter-select" aria-label="Project status" value={filters.status} onChange={(event) => setFilter('status')(event.target.value)}>
                  <option value={ALL}>All statuses</option>
                  {WORKFLOW_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              )}
              <select className="repo-filter-select" aria-label="Progress" value={filters.progress} onChange={(event) => setFilter('progress')(event.target.value)}>
                {PROGRESS_OPTIONS.map((option) => <option key={option.label}>{option.label}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Date updated" value={filters.updated} onChange={(event) => setFilter('updated')(event.target.value)}>
                {UPDATED_OPTIONS.map((option) => <option key={option.label}>{option.label}</option>)}
              </select>
              {hasFilters ? (
                <div className="repo-filter-actions">
                  <button className="btn btn-outline repo-btn" type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>
                    <i className="fas fa-xmark" aria-hidden="true"></i>
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>

            <FocalProjectsTable
              rows={rows}
              statusColumn={isPending ? 'validation' : 'workflow'}
              emptyMessage={
                baseItems.length
                  ? 'No projects match the current filters.'
                  : isPending
                    ? 'No projects are waiting for validation.'
                    : 'No research projects are recorded for your program yet.'
              }
            />
          </section>
        ) : null}
      </div>
    </FocalPersonShell>
  );
}
