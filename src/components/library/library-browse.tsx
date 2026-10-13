'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  LIBRARY_PROJECTS,
  type LibraryDepartment,
  type LibraryProject,
  type LibraryProjectType,
  PROJECT_TYPE_GROUPS,
  getDepartmentLabel,
  getProjectIcon
} from '@/components/library/library-data';
import { LibraryModal } from '@/components/library/library-primitives';
import { LibraryShell } from '@/components/library/library-shell';

const DEPARTMENTS: Array<{ key: 'all' | LibraryDepartment; label: string; fullTitle: string }> = [
  { key: 'all', label: 'All Departments', fullTitle: 'All Academic Departments' },
  { key: 'IT', label: 'IT', fullTitle: 'Information Technology' },
  { key: 'MET', label: 'MET', fullTitle: 'Manufacturing Engineering Tech' },
  { key: 'TCM', label: 'TCM', fullTitle: 'Tech Communication Management' },
  { key: 'ESM', label: 'ESM', fullTitle: 'Engineering & Sustainability' },
  { key: 'NAME', label: 'NAME', fullTitle: 'Naval Architecture & Marine Eng' }
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

function matchesSearch(project: LibraryProject, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return (
    project.title.toLowerCase().includes(query) ||
    project.authors.join(' ').toLowerCase().includes(query) ||
    project.keywords.join(' ').toLowerCase().includes(query) ||
    project.adviser.toLowerCase().includes(query) ||
    project.abstract.toLowerCase().includes(query)
  );
}

export function LibraryBrowse() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [department, setDepartment] = useState<'all' | LibraryDepartment>('all');
  const [year, setYear] = useState<'all' | string>('all');
  const [projectType, setProjectType] = useState<'all' | LibraryProjectType>('all');
  const [sortBy, setSortBy] = useState<'views-desc' | 'year-desc' | 'year-asc' | 'title-asc'>('views-desc');
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);
  const [onlySaved, setOnlySaved] = useState(false);
  const [view, setView] = useState<'card' | 'table'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [savedProjectIds, setSavedProjectIds] = useState<number[]>([]);
  const [previewProject, setPreviewProject] = useState<LibraryProject | null>(null);
  const [copiedCitation, setCopiedCitation] = useState(false);

  // Initialize and persist saved bookmarks in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('thesistrack_saved_projects');
      if (stored) {
        setSavedProjectIds(JSON.parse(stored));
      }
    } catch {
      // Fallback if localStorage is disabled or restricted
    }
  }, []);

  function toggleSaved(projectId: number) {
    setSavedProjectIds((current) => {
      const next = current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId];
      try {
        localStorage.setItem('thesistrack_saved_projects', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearch(query);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    LIBRARY_PROJECTS.forEach((p) => set.add(String(p.year)));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, []);

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

  // Filtered and sorted list
  const filteredProjects = useMemo(() => {
    const list = LIBRARY_PROJECTS.filter((project) => {
      if (department !== 'all' && project.department !== department) {
        return false;
      }
      if (year !== 'all' && String(project.year) !== year) {
        return false;
      }
      if (projectType !== 'all' && project.type !== projectType) {
        return false;
      }
      if (onlySaved && !savedProjectIds.includes(project.id)) {
        return false;
      }
      return matchesSearch(project, search);
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
  }, [department, year, projectType, onlySaved, savedProjectIds, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = filteredProjects.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const hasActiveFilters =
    search.trim() !== '' ||
    department !== 'all' ||
    year !== 'all' ||
    projectType !== 'all' ||
    onlySaved;

  function resetAllFilters() {
    setSearch('');
    setDepartment('all');
    setYear('all');
    setProjectType('all');
    setOnlySaved(false);
    setCurrentPage(1);
  }

  function handleCopyCitation(project: LibraryProject) {
    const authorText = project.authors.join(', ');
    const deptFull = getDepartmentLabel(project.department);
    const citation = `${authorText} (${project.year}). ${project.title}. University Institutional Research Repository, Department of ${deptFull}.`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(citation).then(() => {
        setCopiedCitation(true);
        setTimeout(() => setCopiedCitation(false), 2400);
      });
    }
  }

  return (
    <LibraryShell
      activeNav="browse"
      title="Browse Projects"
      description="Explore accredited capstone and thesis repositories across all academic departments"
    >
      <div className="library-browse-container">
        
        {/* Top Hero / Summary Banner */}
        <div className="library-browse-hero">
          <div className="library-browse-hero-text">
            <span className="library-browse-hero-badge">
              <i className="fas fa-compass" aria-hidden="true" />
              Institutional Catalog
            </span>
            <h1>Explore Academic Research &amp; Theses</h1>
            <p>
              Discover {LIBRARY_PROJECTS.length} peer-reviewed undergraduate theses, machine prototypes, IoT systems, and capstone deployments across all academic departments.
            </p>
          </div>
          <div className="library-browse-hero-stats">
            <div className="library-browse-stat-badge is-primary">
              <i className="fas fa-file-lines" aria-hidden="true" />
              <span>
                <strong>{filteredProjects.length}</strong> {filteredProjects.length === 1 ? 'Study' : 'Studies'} Found
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOnlySaved((prev) => !prev);
                setCurrentPage(1);
              }}
              className={`library-browse-stat-badge is-bookmark ${onlySaved ? 'is-active' : ''}`}
              title={onlySaved ? 'Show all studies' : 'Filter by your saved bookmarks'}
            >
              <i className={onlySaved ? 'fas fa-bookmark' : 'far fa-bookmark'} aria-hidden="true" />
              <span>{savedProjectIds.length} Saved</span>
              {onlySaved && <span className="library-browse-badge-sub">Active</span>}
            </button>
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
                title={dept.fullTitle}
              >
                <span>{dept.label}</span>
                <span className="library-dept-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Toolbar Card */}
        <div className="library-browse-controls-card">
          <div className="library-browse-controls-row">
            
            {/* Search Input */}
            <div className="library-browse-search-wrapper">
              <i className="fas fa-search library-browse-search-icon" aria-hidden="true" />
              <input
                id="library-search"
                type="text"
                placeholder="Search by title, author, adviser, keywords, or abstract..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="library-browse-search-field"
                aria-label="Search research projects"
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
              
              {/* Year Dropdown */}
              <div className="library-browse-select-wrap">
                <i className="far fa-calendar-alt library-browse-select-icon" aria-hidden="true" />
                <select
                  id="library-year"
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
                  id="library-type"
                  value={projectType}
                  onChange={(e) => {
                    setProjectType(e.target.value as 'all' | LibraryProjectType);
                    setCurrentPage(1);
                  }}
                  className="library-browse-select"
                  aria-label="Filter by project type"
                >
                  <option value="all">All Types</option>
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
                  id="library-sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as typeof sortBy);
                    setCurrentPage(1);
                  }}
                  className="library-browse-select"
                  aria-label="Sort projects"
                >
                  <option value="views-desc">Most Viewed</option>
                  <option value="year-desc">Newest Year</option>
                  <option value="year-asc">Oldest Year</option>
                  <option value="title-asc">Title (A – Z)</option>
                </select>
                <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
              </div>

              {/* Items Per Page Dropdown */}
              <div className="library-browse-select-wrap">
                <i className="fas fa-list-ol library-browse-select-icon" aria-hidden="true" />
                <select
                  id="library-per-page"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="library-browse-select"
                  aria-label="Items per page"
                >
                  <option value={6}>6 per page</option>
                  <option value={9}>9 per page</option>
                  <option value={12}>12 per page</option>
                </select>
                <i className="fas fa-chevron-down library-browse-select-caret" aria-hidden="true" />
              </div>

            </div>

            {/* Saved Only Toggle */}
            <button
              type="button"
              className={`library-browse-saved-toggle ${onlySaved ? 'is-active' : ''}`}
              onClick={() => {
                setOnlySaved((prev) => !prev);
                setCurrentPage(1);
              }}
              title="Filter by bookmarked projects"
            >
              <i className={onlySaved ? 'fas fa-bookmark' : 'far fa-bookmark'} aria-hidden="true" />
              <span>Bookmarks ({savedProjectIds.length})</span>
            </button>

            {/* View Mode Toggle (Grid / Table) */}
            <div className="library-browse-view-switch" role="group" aria-label="View layout switch">
              <button
                type="button"
                className={`library-browse-view-btn ${view === 'card' ? 'is-active' : ''}`}
                onClick={() => setView('card')}
                aria-pressed={view === 'card'}
                title="Card grid view"
              >
                <i className="fas fa-th-large" aria-hidden="true" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={`library-browse-view-btn ${view === 'table' ? 'is-active' : ''}`}
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                title="Table list view"
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

              {onlySaved && (
                <span className="library-active-chip">
                  Bookmarks Only
                  <button type="button" onClick={() => setOnlySaved(false)} aria-label="Remove saved filter">
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
              <i className="fas fa-folder-open" aria-hidden="true" />
            </div>
            <h3 className="library-browse-empty-title">No matching studies found</h3>
            <p className="library-browse-empty-subtitle">
              We couldn&apos;t find any research studies matching your active filters. Try refining your keywords or clearing current filters.
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

        ) : view === 'card' ? (

          /* Card Grid View */
          <div className="library-browse-grid">
            {paginatedProjects.map((project) => {
              const isSaved = savedProjectIds.includes(project.id);
              const deptPillClass = getDeptPillClass(project.department);

              return (
                <article key={project.id} className="library-browse-card">
                  
                  {/* Card Header */}
                  <div className="library-browse-card-header">
                    <div className="library-browse-card-badges">
                      <span className={`library-dept-pill ${deptPillClass}`} title={getDepartmentLabel(project.department)}>
                        {project.department}
                      </span>
                      <span className="library-browse-type-badge">
                        <i className={`fas ${getProjectIcon(project.type)}`} aria-hidden="true" />
                        {project.type}
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-label={isSaved ? 'Remove from saved bookmarks' : 'Bookmark project'}
                      className={`library-browse-bookmark-btn ${isSaved ? 'is-saved' : ''}`}
                      onClick={() => toggleSaved(project.id)}
                      title={isSaved ? 'Bookmarked' : 'Add to bookmarks'}
                    >
                      <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'} aria-hidden="true" />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="library-browse-card-body">
                    <h2 className="library-browse-card-title">
                      <Link
                        href={`/library/project-details?id=${project.id}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {project.title}
                      </Link>
                    </h2>

                    <p className="library-browse-card-abstract">
                      {project.abstract}
                    </p>

                    <div className="library-browse-card-meta">
                      <div className="library-browse-card-meta-row">
                        <span className="library-browse-card-meta-item" title={project.authors.join(', ')}>
                          <i className="fas fa-users" aria-hidden="true" />
                          <span>{project.authors.join(', ')}</span>
                        </span>
                        <span className="library-browse-card-meta-item" title={`Year ${project.year}`}>
                          <i className="far fa-calendar-alt" aria-hidden="true" />
                          <span>{project.year}</span>
                        </span>
                      </div>
                      <div className="library-browse-card-meta-row">
                        <span className="library-browse-card-meta-item" title={`Adviser: ${project.adviser}`}>
                          <i className="fas fa-user-tie" aria-hidden="true" />
                          <span>Adviser: {project.adviser}</span>
                        </span>
                        <span className="library-browse-card-views" title="Total verified reads">
                          <i className="far fa-eye" aria-hidden="true" />
                          {project.views.toLocaleString()} views
                        </span>
                      </div>
                    </div>

                    {/* Keywords tags */}
                    {project.keywords.length > 0 && (
                      <div className="library-browse-card-tags">
                        {project.keywords.slice(0, 3).map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            className="library-browse-tag-pill"
                            onClick={() => {
                              setSearch(kw);
                              setCurrentPage(1);
                            }}
                            title={`Filter by tag "${kw}"`}
                          >
                            #{kw}
                          </button>
                        ))}
                        {project.keywords.length > 3 && (
                          <span className="library-browse-tag-pill is-more" title={project.keywords.slice(3).join(', ')}>
                            +{project.keywords.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="library-browse-card-actions">
                    <button
                      type="button"
                      className="library-browse-quick-btn"
                      onClick={() => {
                        setCopiedCitation(false);
                        setPreviewProject(project);
                      }}
                      title="Quick summary preview"
                    >
                      <i className="far fa-eye" aria-hidden="true" />
                      <span>Preview</span>
                    </button>
                    <Link
                      href={`/library/project-details?id=${project.id}`}
                      className="library-browse-details-btn"
                      title="Open full study details"
                    >
                      <span>View Study</span>
                      <i className="fas fa-arrow-right" aria-hidden="true" />
                    </Link>
                  </div>

                </article>
              );
            })}
          </div>

        ) : (

          /* Table List View */
          <div className="library-browse-table-wrapper">
            <div className="table-scroll">
              <table className="library-browse-table">
                <thead>
                  <tr>
                    <th>Title &amp; Abstract</th>
                    <th>Dept</th>
                    <th>Type</th>
                    <th>Authors &amp; Adviser</th>
                    <th>Year</th>
                    <th>Views</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((project) => {
                    const isSaved = savedProjectIds.includes(project.id);
                    const deptPillClass = getDeptPillClass(project.department);

                    return (
                      <tr key={project.id}>
                        <td style={{ maxWidth: '340px' }}>
                          <Link
                            href={`/library/project-details?id=${project.id}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <div className="library-browse-table-title">{project.title}</div>
                            <div className="library-browse-table-abstract">{project.abstract}</div>
                          </Link>
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
                        <td style={{ maxWidth: '200px' }}>
                          <div className="library-browse-table-authors" title={project.authors.join(', ')}>
                            {project.authors.join(', ')}
                          </div>
                          <div className="library-browse-table-adviser" title={`Adviser: ${project.adviser}`}>
                            Adv: {project.adviser}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#334155' }}>
                          {project.year}
                        </td>
                        <td>
                          <span className="library-browse-card-views">
                            <i className="far fa-eye" aria-hidden="true" />
                            {project.views.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="library-browse-table-actions">
                            <button
                              type="button"
                              className={`library-browse-bookmark-btn ${isSaved ? 'is-saved' : ''}`}
                              onClick={() => toggleSaved(project.id)}
                              title={isSaved ? 'Bookmarked' : 'Add bookmark'}
                            >
                              <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="library-browse-quick-btn"
                              style={{ height: '32px', padding: '0 0.65rem', fontSize: '0.78rem' }}
                              onClick={() => {
                                setCopiedCitation(false);
                                setPreviewProject(project);
                              }}
                              title="Quick Preview"
                            >
                              Preview
                            </button>
                            <Link
                              href={`/library/project-details?id=${project.id}`}
                              className="library-browse-details-btn"
                              style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.78rem' }}
                            >
                              Details
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
                {(safeCurrentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(safeCurrentPage * itemsPerPage, filteredProjects.length)}
              </strong>{' '}
              of <strong>{filteredProjects.length}</strong> projects
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

      {/* Quick Preview Modal */}
      {previewProject && (
        <LibraryModal
          open={Boolean(previewProject)}
          title="Project Quick Overview"
          onClose={() => setPreviewProject(null)}
          maxWidth={760}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <button
                type="button"
                className={`library-browse-bookmark-btn ${savedProjectIds.includes(previewProject.id) ? 'is-saved' : ''}`}
                onClick={() => toggleSaved(previewProject.id)}
                title={savedProjectIds.includes(previewProject.id) ? 'Bookmarked' : 'Add to bookmarks'}
              >
                <i className={savedProjectIds.includes(previewProject.id) ? 'fas fa-bookmark' : 'far fa-bookmark'} aria-hidden="true" />
              </button>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="library-browse-quick-btn"
                  onClick={() => setPreviewProject(null)}
                >
                  Close
                </button>
                <Link
                  href={`/library/project-details?id=${previewProject.id}`}
                  className="library-browse-details-btn"
                >
                  <span>Open Full Project Page</span>
                  <i className="fas fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </div>
          }
        >
          <div className="library-preview-modal-body">
            
            <div className="library-preview-modal-header">
              <div className="library-preview-top-row">
                <span className={`library-dept-pill ${getDeptPillClass(previewProject.department)}`}>
                  {previewProject.department} - {getDepartmentLabel(previewProject.department)}
                </span>
                <span className="library-browse-type-badge">
                  <i className={`fas ${getProjectIcon(previewProject.type)}`} aria-hidden="true" />
                  {previewProject.type}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#003A8F', fontWeight: 700 }}>
                  <i className="far fa-eye" style={{ marginRight: '0.3rem' }} aria-hidden="true" />
                  {previewProject.views.toLocaleString()} views
                </span>
              </div>
              <h2 className="library-preview-title">
                {previewProject.title}
              </h2>
            </div>

            <div className="library-preview-meta-grid">
              <div className="library-preview-meta-cell">
                <span>Authors</span>
                <strong>{previewProject.authors.join(', ')}</strong>
              </div>
              <div className="library-preview-meta-cell">
                <span>Adviser</span>
                <strong>{previewProject.adviser}</strong>
              </div>
              <div className="library-preview-meta-cell">
                <span>Academic Year</span>
                <strong>{previewProject.year}</strong>
              </div>
              <div className="library-preview-meta-cell">
                <span>Repository Status</span>
                <strong style={{ color: '#16A34A' }}>
                  {previewProject.statusLabel ?? 'Approved & Cataloged'}
                </strong>
              </div>
            </div>

            <div>
              <h4 className="library-preview-section-title">
                Abstract
              </h4>
              <div className="library-preview-abstract-box">
                {previewProject.abstract}
              </div>
            </div>

            {/* Quick APA Citation Box */}
            <div>
              <h4 className="library-preview-section-title">
                Academic Citation (APA Style)
              </h4>
              <div className="library-preview-citation-box">
                <div className="library-preview-citation-text">
                  {previewProject.authors.join(', ')} ({previewProject.year}). {previewProject.title}. University Institutional Research Repository.
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCitation(previewProject)}
                  className={`library-preview-citation-btn ${copiedCitation ? 'is-copied' : ''}`}
                >
                  <i className={`fas ${copiedCitation ? 'fa-check' : 'fa-copy'}`} aria-hidden="true" />
                  <span>{copiedCitation ? 'Copied!' : 'Copy Citation'}</span>
                </button>
              </div>
            </div>

            {previewProject.keywords?.length > 0 && (
              <div>
                <h4 className="library-preview-section-title">
                  Keywords &amp; Classification
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {previewProject.keywords.map((kw) => (
                    <span key={kw} className="library-browse-tag-pill" style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {previewProject.technologies && previewProject.technologies.length > 0 && (
              <div>
                <h4 className="library-preview-section-title">
                  Technologies &amp; Materials
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {previewProject.technologies.map((tech) => (
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

          </div>
        </LibraryModal>
      )}

    </LibraryShell>
  );
}
