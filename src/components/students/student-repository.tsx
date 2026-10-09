'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import {
  LIBRARY_DOCUMENTS,
  LIBRARY_PROJECTS,
  LIBRARY_REVIEWS,
  type LibraryDepartment,
  type LibraryDocument,
  type LibraryProject,
  type LibraryReview,
  type LibraryProjectType,
  getDepartmentLabel,
  PROJECT_TYPE_GROUPS,
  getProjectIcon,
  getTechnologyLabel
} from '@/components/library/library-data';

type RepositoryModalIntent = 'details' | 'download';

const ITEMS_PER_PAGE = 6;

function matchesSearch(project: LibraryProject, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return (
    project.title.toLowerCase().includes(query) ||
    project.authors.join(' ').toLowerCase().includes(query) ||
    project.keywords.join(' ').toLowerCase().includes(query) ||
    project.abstract.toLowerCase().includes(query)
  );
}

function getDocumentVisual(fileName: string) {
  if (/\.pdf$/i.test(fileName)) return { icon: 'fa-file-pdf', tint: 'bg-red-50 text-red-600' };
  if (/\.docx?$/i.test(fileName)) return { icon: 'fa-file-word', tint: 'bg-blue-50 text-blue-600' };
  if (/\.(zip|rar|7z)$/i.test(fileName)) return { icon: 'fa-file-zipper', tint: 'bg-amber-50 text-amber-600' };
  if (/\.pptx?$/i.test(fileName)) return { icon: 'fa-file-powerpoint', tint: 'bg-orange-50 text-orange-600' };
  return { icon: 'fa-file', tint: 'bg-slate-100 text-slate-600' };
}

// Studies are filed by the year their school year started ("S.Y. 2024–2025").
function formatSchoolYear(startYear: number) {
  return `S.Y. ${startYear}–${startYear + 1}`;
}

// "Juan M. Reyes" -> { last: "Reyes", initials: "J. M." }
function splitAuthorName(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() || name;
  const initials = parts.map((part) => `${part.charAt(0).toUpperCase()}.`).join(' ');
  return { last, initials, first: parts.join(' ') };
}

function joinWithAnd(items: string[], separator = ', ', finalJoin = ', & ') {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(separator)}${finalJoin}${items[items.length - 1]}`;
}

type CitationStyle = 'APA' | 'MLA' | 'IEEE';

// Citations exist only for studies published as journal manuscripts.
function formatCitation(project: LibraryProject, style: CitationStyle) {
  const publication = project.publication;
  if (!publication) return '';

  const title = project.detailTitle || project.title;
  const names = project.authors.map(splitAuthorName);
  const volumeIssue = `${publication.volume ?? ''}${publication.issue ? `(${publication.issue})` : ''}`;
  const doi = publication.doi ? ` https://doi.org/${publication.doi}` : '';

  if (style === 'APA') {
    const authors = joinWithAnd(names.map((name) => `${name.last}, ${name.initials}`));
    return `${authors} (${publication.year}). ${title}. ${publication.journal}${volumeIssue ? `, ${volumeIssue}` : ''}${publication.pages ? `, ${publication.pages}` : ''}.${doi}`;
  }

  if (style === 'MLA') {
    const [first, ...rest] = names;
    const authors = !first ? '' : rest.length > 1 ? `${first.last}, ${first.first}, et al.` : rest.length === 1 ? `${first.last}, ${first.first}, and ${rest[0].first} ${rest[0].last}` : `${first.last}, ${first.first}`;
    return `${authors}. "${title}." ${publication.journal}${publication.volume ? `, vol. ${publication.volume}` : ''}${publication.issue ? `, no. ${publication.issue}` : ''}, ${publication.year}${publication.pages ? `, pp. ${publication.pages}` : ''}.${doi}`;
  }

  const authors = joinWithAnd(names.map((name) => `${name.initials} ${name.last}`), ', ', ', and ');
  return `${authors}, "${title}," ${publication.journal}${publication.volume ? `, vol. ${publication.volume}` : ''}${publication.issue ? `, no. ${publication.issue}` : ''}${publication.pages ? `, pp. ${publication.pages}` : ''}, ${publication.year}.${doi}`;
}

function StarRow({ value, size = 'text-xs' }: { value: number; size?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-400 ${size}`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`fas ${value >= star ? 'fa-star' : value >= star - 0.5 ? 'fa-star-half-stroke' : 'fa-star text-slate-200'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function formatViewCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatAuthorLine(project: LibraryProject) {
  return project.authorsShort || project.authors.join(', ');
}

export function StudentRepository({ data }: { data: StudentDashboardData }) {
  // Every viewer page is watermarked with the study's authors (ownership), not the reader.
  const getViewerWatermark = (project: LibraryProject) =>
    `© ${formatAuthorLine(project)} · ${getDepartmentLabel(project.department)} · ${formatSchoolYear(project.year)}`;
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<'all' | LibraryDepartment>('all');
  const [year, setYear] = useState<'all' | string>('all');
  const [projectType, setProjectType] = useState<'all' | LibraryProjectType>('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedProjectIds, setSavedProjectIds] = useState<number[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [modalIntent, setModalIntent] = useState<RepositoryModalIntent>('details');
  // Read-only document viewer (students can read but not download studies).
  const [viewerProjectId, setViewerProjectId] = useState<number | null>(null);
  // Ratings and comments (session-only on top of the sample reviews).
  const [reviews, setReviews] = useState<LibraryReview[]>(() => [...LIBRARY_REVIEWS]);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [citeStyle, setCiteStyle] = useState<CitationStyle | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<CitationStyle | null>(null);

  const availableYears = useMemo(
    () => Array.from(new Set(LIBRARY_PROJECTS.map((project) => String(project.year)))).sort((left, right) => Number(right) - Number(left)),
    []
  );

  const documentsByProjectId = useMemo(
    () =>
      LIBRARY_DOCUMENTS.reduce<Record<number, LibraryDocument[]>>((accumulator, document) => {
        accumulator[document.projectId] = [...(accumulator[document.projectId] || []), document];
        return accumulator;
      }, {}),
    []
  );

  const filteredProjects = useMemo(
    () =>
      LIBRARY_PROJECTS.filter((project) => {
        if (department !== 'all' && project.department !== department) return false;
        if (year !== 'all' && String(project.year) !== year) return false;
        if (projectType !== 'all' && project.type !== projectType) return false;
        if (savedOnly && !savedProjectIds.includes(project.id)) return false;
        return matchesSearch(project, search);
      }),
    [department, projectType, savedOnly, savedProjectIds, search, year]
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = filteredProjects.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  useEffect(() => {
    document.body.classList.toggle('is-modal-open', Boolean(activeProjectId));
    return () => document.body.classList.remove('is-modal-open');
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId && !viewerProjectId) return;

    // Esc closes the top-most layer: the document viewer first, then the study details.
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (viewerProjectId) {
        setViewerProjectId(null);
        return;
      }
      setActiveProjectId(null);
      setModalIntent('details');
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activeProjectId, viewerProjectId]);

  const totalStudies = LIBRARY_PROJECTS.length;
  const activeProject = LIBRARY_PROJECTS.find((project) => project.id === activeProjectId) || null;
  const viewerProject = LIBRARY_PROJECTS.find((project) => project.id === viewerProjectId) || null;

  const getRatingSummary = (projectId: number) => {
    const projectReviews = reviews.filter((review) => review.projectId === projectId);
    const average = projectReviews.length
      ? projectReviews.reduce((sum, review) => sum + review.rating, 0) / projectReviews.length
      : 0;
    return { count: projectReviews.length, average };
  };
  const activeReviews = activeProject ? reviews.filter((review) => review.projectId === activeProject.id) : [];
  const activeRating = activeProject ? getRatingSummary(activeProject.id) : { count: 0, average: 0 };

  // Deep link from the title similarity checker: /students/repository?study=ID
  // opens that study's details on load.
  useEffect(() => {
    const studyId = Number(new URLSearchParams(window.location.search).get('study'));
    if (studyId && LIBRARY_PROJECTS.some((project) => project.id === studyId)) {
      setActiveProjectId(studyId);
      setModalIntent('details');
    }
  }, []);

  // The cite panel opens inside the scrolling body — bring it into view.
  useEffect(() => {
    if (citeStyle) {
      document.getElementById('repository-cite-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [citeStyle]);

  // Reset the comment form and cite panel whenever a different study opens.
  useEffect(() => {
    setDraftRating(0);
    setDraftComment('');
    setCiteStyle(null);
    setCopiedStyle(null);
  }, [activeProjectId]);

  const postReview = () => {
    if (!activeProject || !draftRating) return;

    setReviews((current) => [
      {
        id: `rev-local-${Date.now()}`,
        projectId: activeProject.id,
        author: data.profile.fullName || 'You',
        rating: draftRating as LibraryReview['rating'],
        comment: draftComment.trim(),
        dateLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      },
      ...current
    ]);
    setDraftRating(0);
    setDraftComment('');
  };

  const copyCitation = async (project: LibraryProject, style: CitationStyle) => {
    try {
      await navigator.clipboard.writeText(formatCitation(project, style));
      setCopiedStyle(style);
      window.setTimeout(() => setCopiedStyle((current) => (current === style ? null : current)), 2000);
    } catch {
      setCopiedStyle(null);
    }
  };
  const activeProjectDocuments = activeProject ? documentsByProjectId[activeProject.id] || [] : [];
  const relatedProjects = activeProject?.relatedStudyIds
    ?.map((id) => LIBRARY_PROJECTS.find((project) => project.id === id) || null)
    .filter((project): project is LibraryProject => Boolean(project)) || [];

  const resetFilters = () => {
    setSearch('');
    setDepartment('all');
    setYear('all');
    setProjectType('all');
    setSavedOnly(false);
    setCurrentPage(1);
  };

  const toggleSaved = (projectId: number) => {
    setSavedProjectIds((current) => (current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId]));
  };

  const openProjectModal = (projectId: number, intent: RepositoryModalIntent = 'details') => {
    setActiveProjectId(projectId);
    setModalIntent(intent);
  };

  const closeProjectModal = () => {
    setActiveProjectId(null);
    setModalIntent('details');
  };

  const hasActiveFilters = Boolean(search.trim()) || department !== 'all' || year !== 'all' || projectType !== 'all' || savedOnly;
  const selectClass =
    'rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--primary)]';

  return (
    <div className="student-repository-page">
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Repository</span>
              </span>
            </div>
            <h1>Repository</h1>
          </div>
        </div>
      </header>

      <div className="page-body flex flex-col gap-4">
        {/* Search + filters in one card (replaces the intro card and four stat cards). */}
        <section className="rounded-2xl border border-[var(--border)] border-t-[3px] border-t-[var(--primary)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Previous studies</span>
              <h2 className="text-lg font-bold tracking-tight text-[var(--text)]">
                {filteredProjects.length} of {totalStudies} stud{totalStudies === 1 ? 'y' : 'ies'}
              </h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <i className="fas fa-lock text-[10px]" aria-hidden="true" /> Read-only for students
            </span>
          </div>

          <label className="relative block">
            <span className="sr-only">Search the repository</span>
            <i className="fas fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-meta)]" aria-hidden="true" />
            <input
              id="student-repository-search"
              type="search"
              placeholder="Search by title, author, keyword, or abstract"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] py-3 pl-11 pr-4 text-sm outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[var(--primary)]/10"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select aria-label="Department" value={department} onChange={(event) => { setDepartment(event.target.value as 'all' | LibraryDepartment); setCurrentPage(1); }} className={selectClass}>
              <option value="all">All Departments</option>
              {(['IT', 'MET', 'TCM', 'ESM', 'NAME'] as const).map((code) => (
                <option key={code} value={code}>{getDepartmentLabel(code)}</option>
              ))}
            </select>
            <select aria-label="School year" value={year} onChange={(event) => { setYear(event.target.value); setCurrentPage(1); }} className={selectClass}>
              <option value="all">All School Years</option>
              {availableYears.map((yearOption) => <option key={yearOption} value={yearOption}>{formatSchoolYear(Number(yearOption))}</option>)}
            </select>
            <select aria-label="Project type" value={projectType} onChange={(event) => { setProjectType(event.target.value as 'all' | LibraryProjectType); setCurrentPage(1); }} className={selectClass}>
              <option value="all">All Types</option>
              {PROJECT_TYPE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.types.map((type) => <option key={type} value={type}>{type}</option>)}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={() => { setSavedOnly((current) => !current); setCurrentPage(1); }}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                savedOnly ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <i className="fas fa-bookmark text-xs" aria-hidden="true" />
              Saved{savedProjectIds.length ? ` · ${savedProjectIds.length}` : ''}
            </button>
            {hasActiveFilters ? (
              <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-[var(--primary)] hover:underline">
                <i className="fas fa-rotate-left text-xs" aria-hidden="true" /> Reset
              </button>
            ) : null}
          </div>
        </section>

        {/* Results */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5 shadow-sm">
          {!filteredProjects.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-alt)] text-[var(--text-meta)]">
                <i className={`fas ${savedOnly ? 'fa-bookmark' : 'fa-magnifying-glass'}`} aria-hidden="true" />
              </span>
              <strong className="text-sm text-[var(--text)]">
                {savedOnly ? (savedProjectIds.length ? 'No saved studies match your filters' : 'No saved studies yet') : 'No study matches your search'}
              </strong>
              <p className="max-w-sm text-xs text-[var(--muted)]">
                {savedOnly && !savedProjectIds.length ? 'Tap the bookmark on any study to save it here.' : 'Try fewer filters or a different keyword.'}
              </p>
              <button type="button" onClick={resetFilters} className="mt-1 text-sm font-semibold text-[var(--primary)] hover:underline">
                Reset filters
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {paginatedProjects.map((project) => {
                const isSaved = savedProjectIds.includes(project.id);
                const documentCount = (documentsByProjectId[project.id] || []).length;

                return (
                  <li key={project.id} className="flex gap-4 py-6 first:pt-1 last:pb-1">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <i className={`fas ${getProjectIcon(project.type)}`} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openProjectModal(project.id, 'details')}
                            className="text-left text-base font-bold leading-snug text-[var(--text)] transition hover:text-[var(--primary)] hover:underline"
                          >
                            {project.detailTitle || project.title}
                          </button>
                          <p className="mt-1 text-[13px] text-[var(--muted)]">{formatAuthorLine(project)}</p>
                          {/* Rating and journal status at a glance, like a Scholar listing. */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            {getRatingSummary(project.id).count ? (
                              <span className="flex items-center gap-1.5">
                                <StarRow value={getRatingSummary(project.id).average} />
                                <span className="font-semibold text-[var(--text)]">{getRatingSummary(project.id).average.toFixed(1)}</span>
                                <span className="text-[var(--muted)]">· {getRatingSummary(project.id).count} comment{getRatingSummary(project.id).count === 1 ? '' : 's'}</span>
                              </span>
                            ) : (
                              <span className="text-[var(--text-meta)]">No ratings yet</span>
                            )}
                            {project.publication ? (
                              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                                <i className="fas fa-book-journal-whills text-[10px]" aria-hidden="true" />
                                Published in {project.publication.journal}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={isSaved ? 'Remove from saved studies' : 'Save study'}
                          aria-pressed={isSaved}
                          onClick={() => toggleSaved(project.id)}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                            isSaved ? 'bg-amber-50 text-amber-600' : 'text-[var(--text-meta)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
                          }`}
                        >
                          <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark`} aria-hidden="true" />
                        </button>
                      </div>

                      <p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-7 text-[var(--text)]">{project.abstract}</p>

                      {/* One details line (the old citation line repeated department and year). */}
                      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)]">
                        <span className="font-semibold text-[var(--text)]">{project.type}</span>
                        <span><i className="fas fa-user-tie mr-1.5 text-[10px] text-[var(--text-meta)]" aria-hidden="true" />{project.adviser}</span>
                        <span><i className="fas fa-calendar mr-1.5 text-[10px] text-[var(--text-meta)]" aria-hidden="true" />{formatSchoolYear(project.year)}</span>
                        <span><i className="fas fa-building-columns mr-1.5 text-[10px] text-[var(--text-meta)]" aria-hidden="true" />{getDepartmentLabel(project.department)}</span>
                        <span><i className="fas fa-eye mr-1.5 text-[10px] text-[var(--text-meta)]" aria-hidden="true" />{formatViewCount(project.views)} views</span>
                        <span><i className="fas fa-folder-open mr-1.5 text-[10px] text-[var(--text-meta)]" aria-hidden="true" />{documentCount} file{documentCount === 1 ? '' : 's'}</span>
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {project.keywords.slice(0, 4).map((keyword) => (
                          <span key={keyword} className="rounded-md bg-[var(--surface-alt)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">{keyword}</span>
                        ))}
                        <span className="ml-auto flex items-center gap-1.5">
                          <button type="button" onClick={() => openProjectModal(project.id, 'details')} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]">
                            Details
                          </button>
                          {/* Students read studies in the in-app viewer; downloading is disabled. */}
                          <button type="button" onClick={() => setViewerProjectId(project.id)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]">
                            <i className="fas fa-book-open mr-1.5 text-[10px]" aria-hidden="true" />Read
                          </button>
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {filteredProjects.length > ITEMS_PER_PAGE ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <span className="text-xs text-[var(--muted)]">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40">
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`h-7 min-w-7 rounded-lg px-2 text-xs font-bold transition ${pageNumber === safeCurrentPage ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-alt)]'}`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button type="button" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>


      {/* Study details. Self-contained styling and mounted on .student-shell: the
          old modal relied on page-scoped CSS that doesn't reach <body>, so it
          rendered as unstyled run-together text. */}
      {activeProject && typeof document !== 'undefined' ? createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={closeProjectModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-repository-modal-title"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          >
            {/* Header: what the study is */}
            <div className="flex items-start gap-4 border-b border-[var(--border)] px-6 py-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
                <i className={`fas ${getProjectIcon(activeProject.type)}`} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">
                  Study details
                </span>
                <h3 id="student-repository-modal-title" className="mt-0.5 text-lg font-bold leading-snug text-[var(--text)]">
                  {activeProject.detailTitle || activeProject.title}
                </h3>
                <p className="mt-1 text-[13px] text-[var(--muted)]">{formatAuthorLine(activeProject)}</p>
              </div>
              <button
                type="button"
                onClick={closeProjectModal}
                aria-label="Close study details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-meta)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
              >
                <i className="fas fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto px-6 py-5">
              {/* Facts, once each */}
              <dl className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 sm:grid-cols-4">
                {[
                  { label: 'Type', value: activeProject.type },
                  { label: 'School year', value: formatSchoolYear(activeProject.year) },
                  { label: 'Department', value: getDepartmentLabel(activeProject.department) },
                  { label: 'Adviser', value: activeProject.adviser }
                ].map((fact) => (
                  <div key={fact.label} className="min-w-0">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--text-meta)]">{fact.label}</dt>
                    <dd className="mt-1 text-[13px] font-semibold text-[var(--text)]">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <section>
                <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Abstract</h4>
                <p className="text-sm leading-7 text-[var(--text)]">{activeProject.abstract}</p>
              </section>

              <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Keywords</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProject.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-md bg-[var(--surface-alt)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">{keyword}</span>
                    ))}
                  </div>
                </div>
                {activeProject.technologies?.length ? (
                  <div>
                    <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">{getTechnologyLabel(activeProject)}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeProject.technologies.map((technology) => (
                        <span key={technology} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{technology}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              {activeProject.achievements?.length ? (
                <section>
                  <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Achievements</h4>
                  <ul className="flex flex-col gap-2">
                    {activeProject.achievements.map((achievement) => (
                      <li key={achievement} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                        <i className="fas fa-award mt-1 text-amber-500" aria-hidden="true" />
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {activeProject.transfer ? (
                <section>
                  <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Deployment & transfer</h4>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-[var(--text)]">{activeProject.transfer.partner}</strong>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                        {activeProject.transfer.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--text)]">{activeProject.transfer.impact}</p>
                  </div>
                </section>
              ) : null}

              <section>
                <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">
                  Repository files · {activeProjectDocuments.length}
                </h4>
                {activeProjectDocuments.length ? (
                  <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
                    {activeProjectDocuments.map((document) => (
                      <li key={document.id} className="flex items-center gap-3 px-4 py-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getDocumentVisual(document.fileName).tint}`}>
                          <i className={`fas ${getDocumentVisual(document.fileName).icon}`} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[13px] font-bold text-[var(--text)]">{document.fileName}</strong>
                          <span className="block text-xs text-[var(--muted)]">{document.type} · {document.size} · {document.dateLabel}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No repository files are listed for this study yet.</p>
                )}
              </section>

              {/* Cite — only for studies already published as a journal manuscript. */}
              {activeProject.publication && citeStyle ? (
                <section id="repository-cite-panel" className="scroll-mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[#003A8F]">Cite this study</h4>
                    <button type="button" onClick={() => setCiteStyle(null)} className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]">
                      Close
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(['APA', 'MLA', 'IEEE'] as const).map((style) => (
                      <div key={style} className="flex items-start gap-3 rounded-lg bg-[var(--surface)] p-3">
                        <span className="w-10 shrink-0 pt-0.5 text-xs font-black text-[var(--text-meta)]">{style}</span>
                        <p className="min-w-0 flex-1 select-text text-[13px] leading-relaxed text-[var(--text)]">{formatCitation(activeProject, style)}</p>
                        <button
                          type="button"
                          onClick={() => copyCitation(activeProject, style)}
                          className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                        >
                          <i className={`fas ${copiedStyle === style ? 'fa-check' : 'fa-copy'} mr-1 text-[10px]`} aria-hidden="true" />
                          {copiedStyle === style ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Ratings & comments */}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Ratings & comments</h4>
                  {activeRating.count ? (
                    <span className="flex items-center gap-2 text-sm">
                      <strong className="text-[var(--text)]">{activeRating.average.toFixed(1)}</strong>
                      <StarRow value={activeRating.average} size="text-sm" />
                      <span className="text-xs text-[var(--muted)]">({activeRating.count})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">No ratings yet</span>
                  )}
                </div>

                {/* Write a review */}
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--muted)]">Your rating</span>
                    <span className="flex items-center gap-0.5" role="radiogroup" aria-label="Your rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={draftRating === star}
                          aria-label={`${star} star${star === 1 ? '' : 's'}`}
                          onClick={() => setDraftRating(star)}
                          className={`text-lg transition hover:scale-110 ${draftRating >= star ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'}`}
                        >
                          <i className="fas fa-star" aria-hidden="true" />
                        </button>
                      ))}
                    </span>
                  </div>
                  <textarea
                    value={draftComment}
                    onChange={(event) => setDraftComment(event.target.value)}
                    placeholder="Share how this study helped you (optional)"
                    rows={2}
                    className="mt-3 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
                  />
                  <div className="mt-2 flex items-center justify-end gap-3">
                    {!draftRating ? <span className="text-xs text-[var(--text-meta)]">Pick a star rating to post</span> : null}
                    <button
                      type="button"
                      onClick={postReview}
                      disabled={!draftRating}
                      className="rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </div>

                {activeReviews.length ? (
                  <ul className="mt-3 flex flex-col divide-y divide-[var(--border)]">
                    {activeReviews.map((review) => (
                      <li key={review.id} className="flex gap-3 py-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-alt)] text-xs font-bold text-[var(--muted)]">
                          {review.author.trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <strong className="text-[13px] text-[var(--text)]">{review.author}</strong>
                            <StarRow value={review.rating} />
                            <span className="text-[11px] text-[var(--text-meta)]">{review.dateLabel}</span>
                          </div>
                          {review.comment ? <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{review.comment}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {relatedProjects.length ? (
                <section>
                  <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Related studies</h4>
                  <ul className="flex flex-col gap-2">
                    {relatedProjects.map((project) => (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() => openProjectModal(project.id, 'details')}
                          className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 text-left transition hover:border-[var(--primary)]/30 hover:bg-[var(--surface-alt)]"
                        >
                          <i className={`fas ${getProjectIcon(project.type)} text-sm text-blue-600`} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-[13px] font-bold text-[var(--text)]">{project.title}</strong>
                            <span className="block text-xs text-[var(--muted)]">{formatSchoolYear(project.year)} · {getDepartmentLabel(project.department)}</span>
                          </span>
                          <i className="fas fa-chevron-right text-[10px] text-[var(--text-meta)]" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
              <span className="text-xs text-[var(--muted)]">
                <i className="fas fa-eye mr-1.5 text-[10px]" aria-hidden="true" />
                {formatViewCount(activeProject.views)} views
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Cite only for studies published as a journal manuscript. */}
                {activeProject.publication ? (
                  <button
                    type="button"
                    onClick={() => setCiteStyle((current) => (current ? null : 'APA'))}
                    aria-pressed={Boolean(citeStyle)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                      citeStyle ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-alt)]'
                    }`}
                  >
                    <i className="fas fa-quote-right" aria-hidden="true" /> Cite
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleSaved(activeProject.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    savedProjectIds.includes(activeProject.id)
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-alt)]'
                  }`}
                >
                  <i className={`${savedProjectIds.includes(activeProject.id) ? 'fas' : 'far'} fa-bookmark`} aria-hidden="true" />
                  {savedProjectIds.includes(activeProject.id) ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewerProjectId(activeProject.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                >
                  <i className="fas fa-book-open" aria-hidden="true" /> View full document
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.querySelector('.student-shell') ?? document.body
      ) : null}
      {/* Read-only document viewer. Students can read a study inside the system
          but not take a copy: no download/print controls, right-click and text
          selection are blocked. Repository files are sample data for now, so it
          renders the study's cover page and abstract as document pages. */}
      {viewerProject && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[10001] flex flex-col bg-slate-900/80 backdrop-blur-sm" onContextMenu={(event) => event.preventDefault()}>
          <div className="flex items-center gap-3 border-b border-white/10 bg-slate-900 px-5 py-3 text-white">
            <i className="fas fa-book-open text-white/70" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-bold">{viewerProject.detailTitle || viewerProject.title}</strong>
              <span className="block text-[11px] text-white/60">
                <i className="fas fa-lock mr-1" aria-hidden="true" />
                View only · downloading and printing are disabled
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewerProjectId(null)}
              aria-label="Close document"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <i className="fas fa-xmark" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 select-none overflow-y-auto px-4 py-8" onCopy={(event) => event.preventDefault()}>
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {/* Page 1: title page */}
              <article className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-sm bg-white px-12 py-16 text-center text-slate-900 shadow-xl">
                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center font-black uppercase tracking-widest text-slate-900/[0.06] [transform:rotate(-30deg)]" aria-hidden="true">
                  <span className="text-5xl">ThesisTrack · View only</span>
                  <span className="text-lg">{getViewerWatermark(viewerProject)}</span>
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">{getDepartmentLabel(viewerProject.department)}</p>
                <h2 className="mt-8 text-2xl font-black leading-snug">{viewerProject.detailTitle || viewerProject.title}</h2>
                <p className="mt-6 text-sm text-slate-600">A {viewerProject.type} study presented by</p>
                <p className="mt-2 text-base font-semibold">{formatAuthorLine(viewerProject)}</p>
                <p className="mt-10 text-sm text-slate-600">Adviser: {viewerProject.adviser}</p>
                <p className="mt-1 text-sm text-slate-600">{formatSchoolYear(viewerProject.year)}</p>
              </article>

              {/* Page 2: abstract */}
              <article className="relative min-h-[70vh] overflow-hidden rounded-sm bg-white px-12 py-14 text-slate-900 shadow-xl">
                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center font-black uppercase tracking-widest text-slate-900/[0.06] [transform:rotate(-30deg)]" aria-hidden="true">
                  <span className="text-5xl">ThesisTrack · View only</span>
                  <span className="text-lg">{getViewerWatermark(viewerProject)}</span>
                </span>
                <h3 className="text-center text-lg font-black uppercase tracking-widest">Abstract</h3>
                <p className="mt-6 text-justify text-[15px] leading-8">{viewerProject.abstract}</p>
                <p className="mt-6 text-sm">
                  <strong>Keywords:</strong> {viewerProject.keywords.join(', ')}
                </p>
              </article>

              <p className="text-center text-xs text-white/60">
                <i className="fas fa-shield-halved mr-1.5" aria-hidden="true" />
                You're reading the full manuscript. Downloading is disabled, and every page is watermarked with the authors' names.
              </p>
            </div>
          </div>
        </div>,
        document.querySelector('.student-shell') ?? document.body
      ) : null}
    </div>
  );
}
