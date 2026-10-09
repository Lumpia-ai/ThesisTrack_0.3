'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getDepartmentTheme } from './department-theme';

type RepositoryProjectSummary = {
  id: string;
  title: string;
  abstract: string | null;
  adviser: string | null;
  program: string | null;
  department: string | null;
  schoolYear: string | null;
  keywords: string[];
  publishedAt: string | null;
  authors: string[];
};

type ProjectsResponse = {
  success: boolean;
  projects: RepositoryProjectSummary[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filters: { schoolYears: string[]; departments: string[] };
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function GuestRepository() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [schoolYear, setSchoolYear] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, department, schoolYear]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (department !== 'all') params.set('department', department);
        if (schoolYear !== 'all') params.set('schoolYear', schoolYear);
        params.set('page', String(page));

        const response = await fetch(`/api/repository/projects?${params.toString()}`, {
          signal: controller.signal
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Unable to load the repository right now.');
        }

        setData(payload);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError((fetchError as Error).message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();

    return () => controller.abort();
  }, [debouncedSearch, department, schoolYear, page]);

  const departments = data?.filters.departments || [];
  const schoolYears = data?.filters.schoolYears || [];
  const projects = data?.projects || [];
  const pagination = data?.pagination;

  const resultsLabel = useMemo(() => {
    if (!pagination) return '';
    return `${pagination.total} completed ${pagination.total === 1 ? 'study' : 'studies'} in the public repository`;
  }, [pagination]);

  const hasActiveFilters = department !== 'all' || schoolYear !== 'all' || search.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section
        style={{
          background: 'white',
          borderRadius: '1.5rem',
          padding: '1.6rem',
          boxShadow: '0 24px 50px rgba(8, 20, 55, 0.16)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 280px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Search Repository
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                placeholder="Search by title, author, or keyword"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              <option value="all">All Departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>School Year</label>
            <select
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              <option value="all">All Years</option>
              {schoolYears.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters ? (
            <button
              onClick={() => { setSearch(''); setDepartment('all'); setSchoolYear('all'); }}
              style={{ padding: '0.8rem 1.2rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-rotate-left" style={{ marginRight: '0.4rem' }} /> Reset
            </button>
          ) : null}
        </div>

        {!isLoading && !error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#64748B', fontSize: '0.9rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
            <i className="fas fa-circle-check" style={{ color: '#16A34A' }} />
            {resultsLabel}
          </div>
        ) : null}
      </section>

      {error ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'white', borderRadius: '1.2rem', border: '1px dashed #FCA5A5' }}>
          <i className="fas fa-triangle-exclamation" style={{ fontSize: '2rem', color: '#EF4444', marginBottom: '1rem' }} />
          <p style={{ color: '#64748B', margin: 0 }}>{error}</p>
        </div>
      ) : isLoading ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '1.6rem' }} />
        </div>
      ) : projects.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '1.2rem', border: '1px dashed #CBD5E1' }}>
          <i className="fas fa-box-archive" style={{ fontSize: '3rem', color: '#94A3B8', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0F172A' }}>No studies found</h3>
          <p style={{ color: '#64748B', margin: 0 }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {projects.map((project) => {
            const theme = getDepartmentTheme(project.department);

            return (
              <Link
                key={project.id}
                href={`/repository/${project.id}`}
                style={{
                  background: 'white',
                  borderRadius: '1.5rem',
                  padding: '2rem',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 15px rgba(15, 23, 42, 0.03)',
                  display: 'flex',
                  gap: '1.8rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(event) => {
                  event.currentTarget.style.transform = 'translateY(-3px)';
                  event.currentTarget.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.1)';
                  event.currentTarget.style.borderColor = '#CBD5E1';
                }}
                onMouseOut={(event) => {
                  event.currentTarget.style.transform = 'none';
                  event.currentTarget.style.boxShadow = '0 4px 15px rgba(15, 23, 42, 0.03)';
                  event.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: theme.color }} />
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: theme.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color, fontSize: '1.6rem', flexShrink: 0 }}>
                  <i className={`fas ${theme.icon}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.4rem 0', color: '#0F172A', fontSize: '1.25rem' }}>{project.title}</h3>
                    {project.department ? (
                      <span style={{ flexShrink: 0, background: theme.tint, color: theme.color, padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 800 }}>{project.department}</span>
                    ) : null}
                  </div>
                  <div style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                    {project.authors.length ? (
                      <strong style={{ color: '#334155' }}><i className="fas fa-user-group" style={{ marginRight: '0.35rem', color: '#94A3B8' }} />{project.authors.join(', ')}</strong>
                    ) : null}
                    {project.schoolYear ? (
                      <>
                        <span style={{ color: '#CBD5E1' }}>&bull;</span> {project.schoolYear}
                      </>
                    ) : null}
                    {project.adviser ? (
                      <>
                        <span style={{ color: '#CBD5E1' }}>&bull;</span> Adviser: {project.adviser}
                      </>
                    ) : null}
                  </div>
                  {project.abstract ? (
                    <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.abstract}
                    </p>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {project.keywords.slice(0, 4).map((keyword) => (
                        <span key={keyword} style={{ background: '#F1F5F9', color: '#475569', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600 }}>{keyword}</span>
                      ))}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: theme.color, fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      View Details <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem' }} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', alignItems: 'center' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: 'white', color: '#0F172A', fontWeight: 600, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ color: '#64748B', fontSize: '0.9rem' }}>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: 'white', color: '#0F172A', fontWeight: 600, cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer', opacity: page >= pagination.totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
