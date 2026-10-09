'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LIBRARY_PROJECTS,
  type LibraryDepartment,
  type LibraryProject,
  type LibraryProjectType,
  PROJECT_TYPE_GROUPS,
  getProjectIcon
} from '@/components/library/library-data';
import { LibraryDepartmentBadge } from '@/components/library/library-primitives';
import { LibraryShell } from '@/components/library/library-shell';

const ITEMS_PER_PAGE = 6;

function matchesSearch(project: LibraryProject, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return (
    project.title.toLowerCase().includes(query) ||
    project.authors.join(' ').toLowerCase().includes(query) ||
    project.keywords.join(' ').toLowerCase().includes(query)
  );
}

export function LibraryBrowse() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [department, setDepartment] = useState<'all' | LibraryDepartment>('all');
  const [year, setYear] = useState<'all' | string>('all');
  const [projectType, setProjectType] = useState<'all' | LibraryProjectType>('all');
  const [view, setView] = useState<'card' | 'table'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [savedProjectIds, setSavedProjectIds] = useState<number[]>([]);

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setCurrentPage(1);
  }, [searchParams]);

  const filteredProjects = LIBRARY_PROJECTS.filter((project) => {
    if (department !== 'all' && project.department !== department) {
      return false;
    }

    if (year !== 'all' && String(project.year) !== year) {
      return false;
    }

    if (projectType !== 'all' && project.type !== projectType) {
      return false;
    }

    return matchesSearch(project, search);
  });

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = filteredProjects.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  function toggleSaved(projectId: number) {
    setSavedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    );
  }

  return (
    <LibraryShell
      activeNav="browse"
      title="Browse Repository"
      description="Search and discover completed research projects"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Modern Filter Bar */}
        <section style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #F1F5F9' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="library-search" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}></i>
                <input
                  id="library-search"
                  placeholder="Title, author, or keyword..."
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="library-department" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
              <select
                id="library-department"
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value as 'all' | LibraryDepartment);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Departments</option>
                <option value="IT">IT</option>
                <option value="MET">MET</option>
                <option value="TCM">TCM</option>
                <option value="ESM">ESM</option>
                <option value="NAME">NAME</option>
              </select>
            </div>

            <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="library-year" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
              <select
                id="library-year"
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Years</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>

            <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="library-type" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
              <select
                id="library-type"
                value={projectType}
                onChange={(event) => {
                  setProjectType(event.target.value as 'all' | LibraryProjectType);
                  setCurrentPage(1);
                }}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Types</option>
                {PROJECT_TYPE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.types.map((type) => <option key={type} value={type}>{type}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F1F5F9', padding: '0.4rem', borderRadius: '0.8rem' }}>
              <button
                type="button"
                onClick={() => setView('card')}
                style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: view === 'card' ? 'white' : 'transparent', color: view === 'card' ? '#003A8F' : '#64748B', boxShadow: view === 'card' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <i className="fas fa-th-large" aria-hidden="true" /> Card
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: view === 'table' ? 'white' : 'transparent', color: view === 'table' ? '#003A8F' : '#64748B', boxShadow: view === 'table' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <i className="fas fa-list" aria-hidden="true" /> Table
              </button>
            </div>
            
          </div>
        </section>

        {/* Results */}
        {!filteredProjects.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'white', borderRadius: '1.2rem', border: '1px dashed #CBD5E1', textAlign: 'center', gap: '1rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F8FAFC', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              <i className="fas fa-search" aria-hidden="true" />
            </div>
            <div>
              <strong style={{ fontSize: '1.2rem', color: '#0F172A', display: 'block', marginBottom: '0.3rem' }}>No projects found</strong>
              <p style={{ margin: 0, color: '#64748B' }}>Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          </div>
        ) : view === 'card' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {paginatedProjects.map((project) => {
              const isSaved = savedProjectIds.includes(project.id);
              return (
                <article key={project.id} style={{ background: 'white', borderRadius: '1.2rem', padding: '1.5rem', border: '1px solid #F1F5F9', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.03)', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.2s', position: 'relative' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 58, 143, 0.08)' }} onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 58, 143, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', color: '#003A8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      <i className={`fas ${getProjectIcon(project.type)}`} aria-hidden="true" />
                    </div>
                    <button
                      aria-label={isSaved ? 'Remove from saved projects' : 'Save project'}
                      onClick={(e) => { e.preventDefault(); toggleSaved(project.id); }}
                      style={{ background: isSaved ? '#FEF3C7' : 'white', color: isSaved ? '#D97706' : '#94A3B8', border: '1px solid', borderColor: isSaved ? '#FDE68A' : '#E2E8F0', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      title={isSaved ? 'Saved' : 'Save'}
                    >
                      <i className="fas fa-bookmark" aria-hidden="true" />
                    </button>
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.4 }}>{project.title}</h3>
                    <span style={{ display: 'inline-block', background: '#F8FAFC', color: '#003A8F', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #E2E8F0', marginBottom: '0.5rem' }}>{project.department}</span>
                    <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}><strong>Authors:</strong> {project.authors.join(', ')}</p>
                  </div>
                  <div style={{ background: '#F8FAFC', borderRadius: '0.8rem', padding: '0.8rem', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', marginBottom: '0.3rem' }}>
                      <span>Adviser: {project.adviser}</span>
                      <strong>{project.year}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B' }}>
                      <span>Type: {project.type}</span>
                    </div>
                  </div>
                  <Link href={`/library/project-details?id=${project.id}`} style={{ textDecoration: 'none', background: 'white', color: '#003A8F', padding: '0.6rem', borderRadius: '0.6rem', border: '1px solid #003A8F', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#003A8F'; e.currentTarget.style.color = 'white' }} onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#003A8F' }}>
                    View Details
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '1.2rem', boxShadow: '0 10px 25px rgba(0, 58, 143, 0.05)', overflow: 'hidden', border: '1px solid #F1F5F9' }}>
            <div className="table-scroll" style={{ padding: '0 1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '1.2rem 1rem', fontWeight: 700 }}>Title</th>
                    <th style={{ padding: '1.2rem 1rem', fontWeight: 700 }}>Authors</th>
                    <th style={{ padding: '1.2rem 1rem', fontWeight: 700 }}>Dept</th>
                    <th style={{ padding: '1.2rem 1rem', fontWeight: 700 }}>Year</th>
                    <th style={{ padding: '1.2rem 1rem', fontWeight: 700 }}>Adviser</th>
                    <th style={{ padding: '1.2rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((project, i) => (
                    <tr key={project.id} style={{ borderBottom: i === paginatedProjects.length - 1 ? 'none' : '1px solid #F1F5F9', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => window.location.href = `/library/project-details?id=${project.id}`}>
                      <td style={{ padding: '1.2rem 1rem', color: '#0F172A', fontWeight: 700, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title}</td>
                      <td style={{ padding: '1.2rem 1rem', color: '#475569', fontSize: '0.9rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.authors.join(', ')}</td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <span style={{ background: '#EFF6FF', color: '#003A8F', padding: '0.3rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #BFDBFE' }}>{project.department}</span>
                      </td>
                      <td style={{ padding: '1.2rem 1rem', color: '#64748B', fontWeight: 600 }}>{project.year}</td>
                      <td style={{ padding: '1.2rem 1rem', color: '#64748B', fontSize: '0.9rem' }}>{project.adviser}</td>
                      <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                        <Link href={`/library/project-details?id=${project.id}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', background: 'white', color: '#003A8F', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #003A8F', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#003A8F'; e.currentTarget.style.color = 'white' }} onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#003A8F' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredProjects.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              style={{ background: 'white', border: '1px solid #E2E8F0', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: safeCurrentPage === 1 ? '#94A3B8' : '#0F172A', fontWeight: 600, cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', opacity: safeCurrentPage === 1 ? 0.6 : 1 }}
            >
              Prev
            </button>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', border: pageNumber === safeCurrentPage ? 'none' : '1px solid #E2E8F0', background: pageNumber === safeCurrentPage ? '#003A8F' : 'white', color: pageNumber === safeCurrentPage ? 'white' : '#475569', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              style={{ background: 'white', border: '1px solid #E2E8F0', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: safeCurrentPage === totalPages ? '#94A3B8' : '#0F172A', fontWeight: 600, cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', opacity: safeCurrentPage === totalPages ? 0.6 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </LibraryShell>
  );
}
