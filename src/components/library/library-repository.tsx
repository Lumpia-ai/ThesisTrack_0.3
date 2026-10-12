'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  LIBRARY_PROJECTS,
  LIBRARY_DOCUMENTS,
  type LibraryDepartment,
  type LibraryProject,
  type LibraryProjectType,
  type LibraryDocument,
  PROJECT_TYPE_GROUPS,
  getProjectIcon,
  getTechnologyLabel,
  getDepartmentLabel
} from '@/components/library/library-data';
import { LibraryModal } from '@/components/library/library-primitives';
import { LibraryShell } from '@/components/library/library-shell';

const ITEMS_PER_PAGE = 6;

const DEPARTMENTS: Array<{ key: 'all' | LibraryDepartment; label: string }> = [
  { key: 'all', label: 'All Departments' },
  { key: 'IT', label: 'IT' },
  { key: 'MET', label: 'MET' },
  { key: 'TCM', label: 'TCM' },
  { key: 'ESM', label: 'ESM' },
  { key: 'NAME', label: 'NAME' }
];

function getDeptPillClass(dept: LibraryDepartment): string {
  switch (dept) {
    case 'IT':
      return 'is-it';
    case 'MET':
      return 'is-met';
    case 'TCM':
      return 'is-tcm';
    case 'ESM':
      return 'is-esm';
    case 'NAME':
      return 'is-name';
    default:
      return 'is-it';
  }
}

function formatViewCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function LibraryRepository() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<'all' | LibraryDepartment>('all');
  const [year, setYear] = useState<'all' | string>('all');
  const [projectType, setProjectType] = useState<'all' | LibraryProjectType>('all');
  const [sortBy, setSortBy] = useState<'views-desc' | 'year-desc' | 'year-asc' | 'title-asc'>('views-desc');
  const [viewMode, setViewMode] = useState<'scholar' | 'cards' | 'table'>('scholar');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const availableYears = useMemo(
    () => Array.from(new Set(LIBRARY_PROJECTS.map((project) => String(project.year)))).sort((a, b) => Number(b) - Number(a)),
    []
  );

  const documentsByProjectId = useMemo(
    () =>
      LIBRARY_DOCUMENTS.reduce<Record<number, LibraryDocument[]>>((acc, doc) => {
        acc[doc.projectId] = [...(acc[doc.projectId] || []), doc];
        return acc;
      }, {}),
    []
  );

  const departmentCounts = useMemo(() => {
    return {
      all: LIBRARY_PROJECTS.length,
      IT: LIBRARY_PROJECTS.filter((p) => p.department === 'IT').length,
      MET: LIBRARY_PROJECTS.filter((p) => p.department === 'MET').length,
      TCM: LIBRARY_PROJECTS.filter((p) => p.department === 'TCM').length,
      ESM: LIBRARY_PROJECTS.filter((p) => p.department === 'ESM').length,
      NAME: LIBRARY_PROJECTS.filter((p) => p.department === 'NAME').length
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const list = LIBRARY_PROJECTS.filter((project) => {
      if (department !== 'all' && project.department !== department) return false;
      if (year !== 'all' && String(project.year) !== year) return false;
      if (projectType !== 'all' && project.type !== projectType) return false;

      const query = search.trim().toLowerCase();
      if (query) {
        return (
          project.title.toLowerCase().includes(query) ||
          project.authors.join(' ').toLowerCase().includes(query) ||
          project.keywords.join(' ').toLowerCase().includes(query) ||
          project.adviser.toLowerCase().includes(query) ||
          project.abstract.toLowerCase().includes(query)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'views-desc':
          return b.views - a.views;
        case 'year-desc':
          return b.year - a.year;
        case 'year-asc':
          return a.year - b.year;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [department, year, projectType, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = filteredProjects.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  const activeProject = LIBRARY_PROJECTS.find((project) => project.id === activeProjectId) || null;
  const activeProjectDocuments = activeProject ? documentsByProjectId[activeProject.id] || [] : [];

  const hasActiveFilters =
    search.trim() !== '' ||
    department !== 'all' ||
    year !== 'all' ||
    projectType !== 'all';

  function resetAllFilters() {
    setSearch('');
    setDepartment('all');
    setYear('all');
    setProjectType('all');
    setCurrentPage(1);
  }

  return (
    <LibraryShell
      activeNav="repository"
      title="Research Repository"
      description="Official institutional archive of accredited theses, machine prototypes, and capstone projects"
    >
      <div className="library-repo-container">

        {/* Hero Banner */}
        <div className="library-repo-hero">
          <div className="library-repo-hero-text">
            <h1>
              <i className="fas fa-landmark" style={{ color: '#003A8F' }} aria-hidden="true" />
              Institutional Repository & Archive
            </h1>
            <p>
              Explore {LIBRARY_PROJECTS.length} verified studies cataloged with full manuscripts, defense evaluations, and faculty advisership. Completed manuscripts are automatically archived and published upon final panel approval.
            </p>
          </div>
          <div className="library-repo-hero-actions">
            <span className="library-browse-stat-pill is-primary">
              <i className="fas fa-layer-group" aria-hidden="true" />
              {filteredProjects.length} {filteredProjects.length === 1 ? 'Study' : 'Studies'} Found
            </span>
            <span className="library-published-status-badge" style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}>
              <i className="fas fa-check-circle" aria-hidden="true" />
              <span>Auto-Archived on Completion</span>
            </span>
          </div>
        </div>

        {/* Quick Department Filter Tabs */}
        <div className="library-dept-tabs-bar" role="tablist" aria-label="Department filter tabs">
          {DEPARTMENTS.map((dept) => {
            const isActive = department === dept.key;
            const count = departmentCounts[dept.key];
            return (
              <button
                key={dept.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`library-dept-tab-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setDepartment(dept.key);
                  setCurrentPage(1);
                }}
              >
                <span>{dept.label}</span>
                <span className="library-dept-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="library-browse-controls-card">
          <div className="library-browse-controls-row">

            {/* Search Input */}
            <div className="library-browse-search-wrapper">
              <i className="fas fa-search library-browse-search-icon" aria-hidden="true" />
              <input
                id="repo-search"
                type="text"
                placeholder="Search archive by title, authors, adviser, or keywords..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="library-browse-search-field"
                aria-label="Search repository archive"
              />
              {search && (
                <button
                  type="button"
                  className="library-browse-search-clear"
                  onClick={() => {
                    setSearch('');
                    setCurrentPage(1);
                  }}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Filter Selects Group */}
            <div className="library-browse-filter-select-group">

              {/* Department Dropdown */}
              <div className="library-browse-select-wrap">
                <i className="fas fa-building-columns library-browse-select-icon" aria-hidden="true" />
                <select
                  id="repo-department"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value as 'all' | LibraryDepartment);
                    setCurrentPage(1);
                  }}
                  className="library-browse-select"
                  aria-label="Filter by department"
                >
                  <option value="all">All Departments</option>
                  <option value="IT">IT - Information Technology</option>
                  <option value="MET">MET - Manufacturing Engineering Tech</option>
                  <option value="TCM">TCM - Tech Communication Management</option>
                  <option value="ESM">ESM - Engineering & Sustainability</option>
                  <option value="NAME">NAME - Naval Architecture & Marine Eng</option>
                </select>
                <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
              </div>

              {/* Year Dropdown */}
              <div className="library-browse-select-wrap">
                <i className="fas fa-calendar-alt library-browse-select-icon" aria-hidden="true" />
                <select
                  id="repo-year"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="library-browse-select"
                  aria-label="Filter by publication year"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
              </div>

              {/* Project Type Dropdown */}
              <div className="library-browse-select-wrap">
                <i className="fas fa-shapes library-browse-select-icon" aria-hidden="true" />
                <select
                  id="repo-type"
                  value={projectType}
                  onChange={(e) => {
                    setProjectType(e.target.value as 'all' | LibraryProjectType);
                    setCurrentPage(1);
                  }}
                  className="library-browse-select"
                  aria-label="Filter by project type"
                >
                  <option value="all">All Project Types</option>
                  {PROJECT_TYPE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
              </div>

              {/* Sort By Dropdown */}
              <div className="library-browse-select-wrap">
                <i className="fas fa-arrow-down-wide-short library-browse-select-icon" aria-hidden="true" />
                <select
                  id="repo-sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as typeof sortBy);
                    setCurrentPage(1);
                  }}
                  className="library-browse-select"
                  aria-label="Sort repository studies"
                >
                  <option value="views-desc">Most Viewed</option>
                  <option value="year-desc">Newest Year</option>
                  <option value="year-asc">Oldest Year</option>
                  <option value="title-asc">Title (A – Z)</option>
                </select>
                <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
              </div>

            </div>

            {/* View Mode Switcher (Scholar, Cards, Table) */}
            <div className="library-browse-view-switch" role="group" aria-label="Repository view layout switch">
              <button
                type="button"
                className={`library-browse-view-btn ${viewMode === 'scholar' ? 'is-active' : ''}`}
                onClick={() => setViewMode('scholar')}
                aria-pressed={viewMode === 'scholar'}
                title="Scholar List View"
              >
                <i className="fas fa-grip-lines" aria-hidden="true" />
                <span>Scholar</span>
              </button>
              <button
                type="button"
                className={`library-browse-view-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                title="Card Grid View"
              >
                <i className="fas fa-th-large" aria-hidden="true" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`library-browse-view-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                title="Table List View"
              >
                <i className="fas fa-table-list" aria-hidden="true" />
                <span>Table</span>
              </button>
            </div>

          </div>

          {/* Active Filter Chips Bar */}
          {hasActiveFilters && (
            <div className="library-active-chips-bar">
              <span className="library-active-chips-label">Active Filters:</span>

              {search.trim() && (
                <span className="library-active-chip">
                  Search: &ldquo;{search}&rdquo;
                  <button type="button" onClick={() => setSearch('')} aria-label="Remove search filter">
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </span>
              )}

              {department !== 'all' && (
                <span className="library-active-chip">
                  Dept: {department}
                  <button type="button" onClick={() => setDepartment('all')} aria-label="Remove department filter">
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </span>
              )}

              {year !== 'all' && (
                <span className="library-active-chip">
                  Year: {year}
                  <button type="button" onClick={() => setYear('all')} aria-label="Remove year filter">
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </span>
              )}

              {projectType !== 'all' && (
                <span className="library-active-chip">
                  Type: {projectType}
                  <button type="button" onClick={() => setProjectType('all')} aria-label="Remove project type filter">
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                className="library-active-chip-clear-all"
              >
                <i className="fas fa-rotate-left" style={{ marginRight: '0.3rem' }} aria-hidden="true" />
                Reset All Filters
              </button>
            </div>
          )}

        </div>

        {/* Content Section */}
        {filteredProjects.length === 0 ? (

          /* Empty State */
          <div className="library-browse-empty-state">
            <div className="library-browse-empty-icon">
              <i className="fas fa-book-bookmark" aria-hidden="true" />
            </div>
            <h3 className="library-browse-empty-title">No archived studies found</h3>
            <p className="library-browse-empty-subtitle">
              No research studies in the archive matched your query. Adjust your keywords or clear your department/year filters.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="library-browse-empty-reset-btn"
            >
              <i className="fas fa-rotate-left" aria-hidden="true" />
              Reset All Filters
            </button>
          </div>

        ) : viewMode === 'scholar' ? (

          /* Scholar List View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {paginatedProjects.map((project) => {
              const docs = documentsByProjectId[project.id] || [];
              const deptPillClass = getDeptPillClass(project.department);

              return (
                <article key={project.id} className="library-repo-scholar-card">
                  {/* Icon */}
                  <div className="library-repo-scholar-icon-box">
                    <i className={`fas ${getProjectIcon(project.type)}`} aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <div className="library-repo-scholar-content">
                    <h2
                      className="library-repo-scholar-title"
                      onClick={() => setActiveProjectId(project.id)}
                      title="Click to view complete details"
                    >
                      {project.detailTitle || project.title}
                    </h2>

                    <div className="library-repo-scholar-citation-line">
                      <strong>{project.authorsShort || project.authors.join(', ')}</strong>
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      <span>{project.year}</span>
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      <span>{getDepartmentLabel(project.department)}</span>
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      <span>Adviser: {project.adviser}</span>
                    </div>

                    <p className="library-repo-scholar-abstract">
                      {project.abstract}
                    </p>

                    <div className="library-repo-scholar-footer">
                      <div className="library-repo-scholar-badges">
                        <span className={`library-dept-pill ${deptPillClass}`}>
                          {project.department}
                        </span>
                        <span className="library-browse-type-badge">
                          <i className={`fas ${getProjectIcon(project.type)}`} aria-hidden="true" />
                          {project.type}
                        </span>
                        <span className="library-browse-card-views">
                          <i className="fas fa-eye" aria-hidden="true" />
                          {formatViewCount(project.views)} views
                        </span>
                        {docs.length > 0 && (
                          <span className="library-repo-doc-chip" title={`${docs.length} attached manuscript and presentation files`}>
                            <i className="fas fa-paperclip" aria-hidden="true" />
                            {docs.length} {docs.length === 1 ? 'File' : 'Files'}
                          </span>
                        )}
                      </div>

                      <div className="library-repo-scholar-actions">
                        <button
                          type="button"
                          className="library-browse-quick-btn"
                          onClick={() => setActiveProjectId(project.id)}
                        >
                          <i className="fas fa-eye" aria-hidden="true" />
                          <span>Quick View</span>
                        </button>
                        <Link
                          href={`/library/project-details?id=${project.id}`}
                          className="library-browse-details-btn"
                          style={{ padding: '0.6rem 1.1rem' }}
                        >
                          <span>Full Study</span>
                          <i className="fas fa-arrow-right" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

        ) : viewMode === 'cards' ? (

          /* Cards View */
          <div className="library-browse-grid">
            {paginatedProjects.map((project) => {
              const docs = documentsByProjectId[project.id] || [];
              const deptPillClass = getDeptPillClass(project.department);

              return (
                <article key={project.id} className="library-browse-card">
                  <div className="library-browse-card-header">
                    <div className="library-browse-card-badges">
                      <span className={`library-dept-pill ${deptPillClass}`}>
                        {project.department}
                      </span>
                      <span className="library-browse-type-badge">
                        <i className={`fas ${getProjectIcon(project.type)}`} aria-hidden="true" />
                        {project.type}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
                      {project.year}
                    </span>
                  </div>

                  <div className="library-browse-card-body">
                    <h2
                      className="library-browse-card-title"
                      onClick={() => setActiveProjectId(project.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {project.title}
                    </h2>

                    <p className="library-browse-card-abstract">
                      {project.abstract}
                    </p>

                    <div className="library-browse-card-meta">
                      <div className="library-browse-card-meta-row">
                        <span className="library-browse-card-meta-item">
                          <i className="fas fa-users" aria-hidden="true" />
                          <span>{project.authorsShort || project.authors[0]}</span>
                        </span>
                        <span className="library-browse-card-views">
                          <i className="fas fa-eye" aria-hidden="true" />
                          {formatViewCount(project.views)} views
                        </span>
                      </div>
                      <div className="library-browse-card-meta-row">
                        <span className="library-browse-card-meta-item">
                          <i className="fas fa-user-tie" aria-hidden="true" />
                          <span>Adviser: {project.adviser}</span>
                        </span>
                        {docs.length > 0 && (
                          <span className="library-repo-doc-chip" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                            <i className="fas fa-paperclip" aria-hidden="true" />
                            {docs.length} docs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="library-browse-card-actions">
                    <button
                      type="button"
                      className="library-browse-quick-btn"
                      onClick={() => setActiveProjectId(project.id)}
                    >
                      <i className="fas fa-eye" aria-hidden="true" />
                      <span>Overview</span>
                    </button>
                    <Link
                      href={`/library/project-details?id=${project.id}`}
                      className="library-browse-details-btn"
                    >
                      <span>Full Study</span>
                      <i className="fas fa-arrow-right" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

        ) : (

          /* Table View */
          <div className="library-browse-table-wrapper">
            <div className="table-scroll">
              <table className="library-browse-table">
                <thead>
                  <tr>
                    <th>Study Title</th>
                    <th>Dept</th>
                    <th>Type</th>
                    <th>Authors</th>
                    <th>Adviser</th>
                    <th>Year</th>
                    <th>Views</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((project) => {
                    const deptPillClass = getDeptPillClass(project.department);

                    return (
                      <tr key={project.id}>
                        <td style={{ maxWidth: '320px' }}>
                          <div
                            className="library-browse-table-title"
                            onClick={() => setActiveProjectId(project.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            {project.title}
                          </div>
                          <div className="library-browse-table-abstract">{project.abstract}</div>
                        </td>
                        <td>
                          <span className={`library-dept-pill ${deptPillClass}`}>
                            {project.department}
                          </span>
                        </td>
                        <td>
                          <span className="library-browse-type-badge">
                            <i className={`fas ${getProjectIcon(project.type)}`} aria-hidden="true" />
                            {project.type}
                          </span>
                        </td>
                        <td style={{ maxWidth: '170px', color: '#475569', fontSize: '0.85rem' }}>
                          {project.authors.join(', ')}
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                          {project.adviser}
                        </td>
                        <td style={{ fontWeight: 700, color: '#334155' }}>
                          {project.year}
                        </td>
                        <td>
                          <span className="library-browse-card-views">
                            <i className="fas fa-eye" aria-hidden="true" />
                            {formatViewCount(project.views)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="library-browse-quick-btn"
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
                              onClick={() => setActiveProjectId(project.id)}
                            >
                              Overview
                            </button>
                            <Link
                              href={`/library/project-details?id=${project.id}`}
                              className="library-browse-details-btn"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                            >
                              Study
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        )}

        {/* Pagination Section */}
        {filteredProjects.length > 0 && (
          <div className="library-browse-pagination-bar">
            <span className="library-browse-pagination-info">
              Showing{' '}
              <strong>
                {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredProjects.length)}
              </strong>{' '}
              of <strong>{filteredProjects.length}</strong> studies
            </span>

            <div className="library-browse-pagination-pages">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="library-browse-page-nav-btn"
                aria-label="Previous page"
              >
                <i className="fas fa-chevron-left" aria-hidden="true" />
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`library-browse-page-num-btn ${pageNum === safeCurrentPage ? 'is-active' : ''}`}
                  aria-current={pageNum === safeCurrentPage ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="library-browse-page-nav-btn"
                aria-label="Next page"
              >
                <span>Next</span>
                <i className="fas fa-chevron-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Study Details Modal */}
      {activeProject && (
        <LibraryModal
          maxWidth={820}
          open={Boolean(activeProject)}
          title="Archive Record Overview"
          onClose={() => setActiveProjectId(null)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
              <button
                type="button"
                className="library-browse-quick-btn"
                onClick={() => setActiveProjectId(null)}
              >
                Close
              </button>
              <Link
                href={`/library/project-details?id=${activeProject.id}`}
                className="library-browse-details-btn"
              >
                <span>Open Full Study Details</span>
                <i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          }
        >
          <div className="library-preview-modal-body">
            <div className="library-preview-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className={`library-dept-pill ${getDeptPillClass(activeProject.department)}`}>
                  {activeProject.department} - {getDepartmentLabel(activeProject.department)}
                </span>
                <span className="library-browse-type-badge">
                  <i className={`fas ${getProjectIcon(activeProject.type)}`} aria-hidden="true" />
                  {activeProject.type}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#003A8F', fontWeight: 700 }}>
                  <i className="fas fa-eye" style={{ marginRight: '0.3rem' }} aria-hidden="true" />
                  {formatViewCount(activeProject.views)} views
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.4 }}>
                {activeProject.detailTitle || activeProject.title}
              </h2>
            </div>

            <div className="library-preview-meta-grid">
              <div className="library-preview-meta-cell">
                <span>Authors</span>
                <strong>{activeProject.authors.join(', ')}</strong>
              </div>
              <div className="library-preview-meta-cell">
                <span>Adviser</span>
                <strong>{activeProject.adviser}</strong>
              </div>
              <div className="library-preview-meta-cell">
                <span>Academic Year</span>
                <strong>{activeProject.year}</strong>
              </div>
              <div className="library-preview-meta-cell">
                <span>Repository Files</span>
                <strong>{activeProjectDocuments.length} files attached</strong>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                Abstract
              </h4>
              <div className="library-preview-abstract-box">
                {activeProject.abstract}
              </div>
            </div>

            {activeProject.keywords?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                  Keywords & Classification
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {activeProject.keywords.map((kw) => (
                    <span key={kw} className="library-browse-tag-pill" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeProject.technologies && activeProject.technologies.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                  {getTechnologyLabel(activeProject)}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {activeProject.technologies.map((tech) => (
                    <span
                      key={tech}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '0.4rem',
                        background: '#EFF6FF',
                        color: '#003A8F',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid #BFDBFE'
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeProjectDocuments.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                  Archived Repository Documents
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeProjectDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <i className="fas fa-file-pdf" style={{ color: '#DC2626', fontSize: '1.2rem' }} aria-hidden="true" />
                        <div>
                          <strong style={{ color: '#0F172A', fontSize: '0.9rem', display: 'block' }}>{doc.fileName}</strong>
                          <span style={{ color: '#64748B', fontSize: '0.75rem' }}>{doc.categoryLabel} • {doc.size}</span>
                        </div>
                      </div>
                      <a
                        href={`/library/project-details?id=${activeProject.id}`}
                        style={{
                          textDecoration: 'none',
                          background: 'white',
                          border: '1px solid #CBD5E1',
                          borderRadius: '0.45rem',
                          padding: '0.4rem 0.8rem',
                          color: '#003A8F',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <i className="fas fa-download" aria-hidden="true" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </LibraryModal>
      )}

    </LibraryShell>
  );
}
