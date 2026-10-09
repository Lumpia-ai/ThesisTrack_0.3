'use client';

import { useState, useMemo } from 'react';
import {
  LIBRARY_PROJECTS,
  LIBRARY_DOCUMENTS,
  type LibraryDepartment,
  type LibraryProject,
  type LibraryProjectType,
  type LibraryDocument,
  getProjectIcon,
  getTechnologyLabel,
  getDepartmentLabel
} from '@/components/library/library-data';
import {
  LibraryDepartmentBadge,
  LibraryModal
} from '@/components/library/library-primitives';
import { LibraryShell } from '@/components/library/library-shell';

const ITEMS_PER_PAGE = 6;

function formatViewCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function LibraryRepository() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<'all' | LibraryDepartment>('all');
  const [year, setYear] = useState<'all' | string>('all');
  const [projectType, setProjectType] = useState<'all' | LibraryProjectType>('all');
  const [viewMode, setViewMode] = useState<'scholar' | 'cards' | 'table'>('scholar');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
        
        const query = search.trim().toLowerCase();
        if (query) {
          return (
            project.title.toLowerCase().includes(query) ||
            project.authors.join(' ').toLowerCase().includes(query) ||
            project.keywords.join(' ').toLowerCase().includes(query) ||
            project.abstract.toLowerCase().includes(query)
          );
        }
        return true;
      }),
    [department, projectType, search, year]
  );

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const activeProject = LIBRARY_PROJECTS.find((project) => project.id === activeProjectId) || null;
  const activeProjectDocuments = activeProject ? documentsByProjectId[activeProject.id] || [] : [];

  return (
    <LibraryShell
      activeNav="repository"
      title="Archive & Repository"
      description="Search prior studies, compare related work, and download records"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem', position: 'relative' }}>
        
        {/* Subtle Background Glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '300px', background: 'radial-gradient(ellipse at top, rgba(0, 58, 143, 0.05), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1, marginTop: '-0.5rem' }}>
          <div>
             <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Repository Archive</h2>
             <p style={{ margin: '0.2rem 0 0 0', color: '#64748B', fontSize: '0.9rem' }}>{filteredProjects.length} matching studies found in the university database</p>
          </div>
          <button onClick={() => setIsUploadModalOpen(true)} style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', padding: '0.85rem 1.8rem', borderRadius: '2rem', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,58,143,0.25), inset 0 2px 0 rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 25px rgba(0,58,143,0.3), inset 0 2px 0 rgba(255,255,255,0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,58,143,0.25), inset 0 2px 0 rgba(255,255,255,0.1)'; }}>
            <i className="fas fa-cloud-upload-alt"></i> Upload Study
          </button>
        </div>

        {/* Modern Filter Bar */}
        <section style={{ background: 'white', borderRadius: '1.5rem', padding: '1.5rem', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #E2E8F0', zIndex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            
            <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Repository</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}></i>
                  <input
                    placeholder="Search by title, author, keyword, or abstract"
                    type="text"
                    value={search}
                    onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                <select value={department} onChange={(event) => { setDepartment(event.target.value as 'all' | LibraryDepartment); setCurrentPage(1); }} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem', cursor: 'pointer' }}>
                  <option value="all">All Departments</option>
                  <option value="IT">IT</option>
                  <option value="MET">MET</option>
                  <option value="TCM">TCM</option>
                  <option value="ESM">ESM</option>
                  <option value="NAME">NAME</option>
                </select>
              </div>

              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
                <select value={year} onChange={(event) => { setYear(event.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontSize: '0.95rem', cursor: 'pointer' }}>
                  <option value="all">All Years</option>
                  {availableYears.map((yearOption) => <option key={yearOption} value={yearOption}>{yearOption}</option>)}
                </select>
              </div>
            </div>

            {/* View Toggles (Apple Segmented Control Style) */}
            <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.4rem', borderRadius: '1rem', border: '1px solid #E2E8F0', position: 'relative' }}>
              <button onClick={() => setViewMode('scholar')} style={{ flex: 1, padding: '0.7rem 1.2rem', border: 'none', background: viewMode === 'scholar' ? 'white' : 'transparent', borderRadius: '0.6rem', fontWeight: 700, color: viewMode === 'scholar' ? '#003A8F' : '#64748B', cursor: 'pointer', boxShadow: viewMode === 'scholar' ? '0 4px 10px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-grip-lines"></i> Scholar
              </button>
              <button onClick={() => setViewMode('cards')} style={{ flex: 1, padding: '0.7rem 1.2rem', border: 'none', background: viewMode === 'cards' ? 'white' : 'transparent', borderRadius: '0.6rem', fontWeight: 700, color: viewMode === 'cards' ? '#003A8F' : '#64748B', cursor: 'pointer', boxShadow: viewMode === 'cards' ? '0 4px 10px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-table-cells-large"></i> Cards
              </button>
              <button onClick={() => setViewMode('table')} style={{ flex: 1, padding: '0.7rem 1.2rem', border: 'none', background: viewMode === 'table' ? 'white' : 'transparent', borderRadius: '0.6rem', fontWeight: 700, color: viewMode === 'table' ? '#003A8F' : '#64748B', cursor: 'pointer', boxShadow: viewMode === 'table' ? '0 4px 10px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-table-list"></i> Table
              </button>
            </div>

          </div>
        </section>

        {/* Results Container */}
        {filteredProjects.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '1.2rem', border: '1px dashed #CBD5E1' }}>
             <i className="fas fa-search" style={{ fontSize: '3rem', color: '#94A3B8', marginBottom: '1rem' }}></i>
             <h3 style={{ margin: '0 0 0.5rem 0', color: '#0F172A' }}>No studies found</h3>
             <p style={{ color: '#64748B', margin: 0 }}>Try adjusting your filters or search terms.</p>
          </div>
        ) : viewMode === 'scholar' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', zIndex: 1 }}>
            {paginatedProjects.map((project) => (
              <article key={project.id} style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 15px rgba(15, 23, 42, 0.03)', display: 'flex', gap: '1.8rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 15px 35px rgba(15, 23, 42, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(15, 23, 42, 0.03)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003A8F', fontSize: '2rem', flexShrink: 0, boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), 0 4px 8px rgba(0,0,0,0.04)' }}>
                  <i className={`fas ${getProjectIcon(project.type)}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 onClick={() => setActiveProjectId(project.id)} style={{ margin: '0 0 0.4rem 0', color: '#0F172A', fontSize: '1.3rem', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#003A8F'} onMouseOut={(e) => e.currentTarget.style.color = '#0F172A'}>{project.detailTitle || project.title}</h3>
                  <div style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: '#334155' }}>{project.authorsShort || project.authors.join(', ')}</strong> 
                    <span style={{ color: '#CBD5E1' }}>•</span> {project.year} 
                    <span style={{ color: '#CBD5E1' }}>•</span> {getDepartmentLabel(project.department)}
                  </div>
                  <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '1rem', lineHeight: 1.6 }}>{project.abstract}</p>
                  
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(246, 190, 0, 0.15)', color: '#92400E', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700 }}>{project.department}</span>
                    <span style={{ background: '#F1F5F9', color: '#475569', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>{project.type}</span>
                    <span style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#15803D', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-eye" style={{ marginRight: '0.3rem' }}></i>{formatViewCount(project.views)}</span>
                    
                    <button onClick={() => setActiveProjectId(project.id)} style={{ marginLeft: 'auto', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', padding: '0.5rem 1.2rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseOver={(e) => { e.currentTarget.style.background = '#0F172A'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#0F172A'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                      Details <i className="fas fa-arrow-right" style={{ fontSize: '0.8rem' }}></i>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : viewMode === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', zIndex: 1 }}>
            {paginatedProjects.map((project) => (
              <article key={project.id} style={{ background: 'white', borderRadius: '1.5rem', padding: '1.8rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 15px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 15px 35px rgba(15, 23, 42, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.transform = 'translateY(-4px)'; }} onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(15, 23, 42, 0.03)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003A8F', fontSize: '1.8rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), 0 4px 8px rgba(0,0,0,0.04)' }}>
                    <i className={`fas ${getProjectIcon(project.type)}`} />
                  </div>
                  <span style={{ background: 'rgba(246, 190, 0, 0.15)', color: '#92400E', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 800 }}>{project.department}</span>
                </div>
                
                <h3 onClick={() => setActiveProjectId(project.id)} style={{ margin: '0 0 0.5rem 0', color: '#0F172A', fontSize: '1.15rem', cursor: 'pointer', transition: 'color 0.2s', lineHeight: 1.4 }} onMouseOver={(e) => e.currentTarget.style.color = '#003A8F'} onMouseOut={(e) => e.currentTarget.style.color = '#0F172A'}>{project.title}</h3>
                <div style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.2rem', fontWeight: 500 }}>
                  {project.year} <span style={{ color: '#CBD5E1', margin: '0 0.3rem' }}>•</span> {project.authorsShort || project.authors[0]}
                </div>
                
                <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.abstract}</p>
                
                <button onClick={() => setActiveProjectId(project.id)} style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', padding: '0.8rem', borderRadius: '0.8rem', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#0F172A'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#0F172A'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                  View Full Study
                </button>
              </article>
            ))}
          </div>
        ) : (
          <section style={{ background: 'white', borderRadius: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Study Title</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Department</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Year</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((project, i) => (
                    <tr key={project.id} style={{ borderBottom: i === paginatedProjects.length - 1 ? 'none' : '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <i className={`fas ${getProjectIcon(project.type)}`} style={{ color: '#003A8F' }}></i>
                          <div>
                            <strong onClick={() => setActiveProjectId(project.id)} style={{ color: '#0F172A', display: 'block', cursor: 'pointer' }}>{project.title}</strong>
                            <span style={{ color: '#64748B', fontSize: '0.85rem' }}>{project.authorsShort || project.authors[0]}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <LibraryDepartmentBadge>{project.department}</LibraryDepartmentBadge>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#64748B', fontWeight: 600 }}>{project.year}</td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button onClick={() => setActiveProjectId(project.id)} style={{ background: 'transparent', color: '#003A8F', padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #003A8F', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      <LibraryModal
        maxWidth={800}
        open={activeProjectId !== null}
        title="Study Details"
        onClose={() => setActiveProjectId(null)}
        footer={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setActiveProjectId(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600 }}>Close</button>
            <button className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-download"></i> Download Summary
            </button>
          </div>
        }
      >
        {activeProject ? (
          <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0F172A', fontSize: '1.3rem' }}>{activeProject.detailTitle || activeProject.title}</h3>
              <div style={{ color: '#475569', fontSize: '0.95rem' }}>
                <strong>{activeProject.authors.join(', ')}</strong> • {activeProject.year} • {getDepartmentLabel(activeProject.department)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: '0.8rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Department</span>
                <strong style={{ color: '#0F172A' }}>{getDepartmentLabel(activeProject.department)}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Project Type</span>
                <strong style={{ color: '#0F172A' }}>{activeProject.type}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Repository Files</span>
                <strong style={{ color: '#0F172A' }}>{activeProjectDocuments.length} files</strong>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0F172A' }}>Abstract</h4>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{activeProject.abstract}</p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.8rem 0', color: '#0F172A', fontSize: '1rem' }}>Keywords</h4>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {activeProject.keywords.map((keyword) => (
                  <span key={keyword} style={{ background: '#F1F5F9', color: '#475569', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #E2E8F0' }}>{keyword}</span>
                ))}
              </div>
            </div>

            {activeProject.technologies && activeProject.technologies.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.8rem 0', color: '#0F172A', fontSize: '1rem' }}>{getTechnologyLabel(activeProject)}</h4>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {activeProject.technologies.map((tech) => (
                    <span key={tech} style={{ background: 'rgba(0, 58, 143, 0.05)', color: '#003A8F', padding: '0.4rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(0, 58, 143, 0.1)' }}>{tech}</span>
                  ))}
                </div>
              </div>
            )}

            {activeProject.achievements && activeProject.achievements.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.8rem 0', color: '#0F172A', fontSize: '1rem' }}>Achievements & Recognition</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {activeProject.achievements.map((achievement) => (
                    <div key={achievement} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#F8FAFC', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0' }}>
                      <i className="fas fa-award" style={{ color: '#F6BE00', fontSize: '1.2rem' }}></i>
                      <span style={{ color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>{achievement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeProject.transfer && (
              <div>
                <h4 style={{ margin: '0 0 0.8rem 0', color: '#0F172A', fontSize: '1rem' }}>Deployment and Transfer</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '0.8rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Industry Partner</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{activeProject.transfer.partner}</strong>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '0.8rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Status</span>
                    <strong style={{ color: '#16A34A', fontSize: '0.95rem' }}>{activeProject.transfer.status}</strong>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '0.8rem', border: '1px solid #E2E8F0', gridColumn: '1 / -1' }}>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Impact & Outcome</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{activeProject.transfer.impact}</strong>
                  </div>
                </div>
              </div>
            )}

            {activeProjectDocuments.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.8rem 0', color: '#0F172A' }}>Repository Documents</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeProjectDocuments.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #E2E8F0', padding: '0.8rem 1rem', borderRadius: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <i className="fas fa-file-pdf" style={{ color: '#EF4444' }}></i>
                        <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{doc.fileName}</strong>
                        <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>({doc.size})</span>
                      </div>
                      <button style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.4rem', padding: '0.4rem 0.8rem', color: '#0F172A', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}><i className="fas fa-download"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </LibraryModal>

      <LibraryModal
        maxWidth={850}
        open={isUploadModalOpen}
        title="Upload Study to Repository"
        onClose={() => setIsUploadModalOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setIsUploadModalOpen(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600 }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(false)} style={{ padding: '0.8rem 1.8rem', borderRadius: '2rem', background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 6px 15px rgba(0,58,143,0.2)' }}>
              <i className="fas fa-cloud-upload-alt"></i> Publish to Archive
            </button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem 0' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Title</label>
              <input type="text" placeholder="e.g. AI-Powered Inventory System" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s', fontWeight: 600 }} onFocus={(e) => e.target.style.borderColor = '#003A8F'} onBlur={(e) => e.target.style.borderColor = '#E2E8F0'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                <select style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', cursor: 'pointer', fontWeight: 600 }}>
                  <option>IT</option>
                  <option>MET</option>
                  <option>TCM</option>
                  <option>ESM</option>
                  <option>NAME</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
                <input type="number" defaultValue="2024" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authors</label>
              <input type="text" placeholder="Comma separated names" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adviser</label>
              <input type="text" placeholder="e.g. Dr. Ricardo Cruz" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', transition: 'all 0.2s' }} />
            </div>
          </div>
          
          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abstract</label>
              <textarea placeholder="Paste the study abstract here..." style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A', resize: 'none', flex: 1, fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keywords</label>
              <input type="text" placeholder="e.g. AI, Machine Learning, IoT" style={{ padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A' }} />
            </div>
          </div>
          
          {/* Full Width Dropzone */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository Documents</label>
            <div style={{ border: '2px dashed #CBD5E1', borderRadius: '1rem', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 15px rgba(0,58,143,0.06)' }}>
                <i className="fas fa-file-pdf" style={{ fontSize: '2.5rem', color: '#003A8F' }}></i>
              </div>
              <div style={{ textAlign: 'center' }}>
                <strong style={{ color: '#003A8F', display: 'block', fontSize: '1.2rem', marginBottom: '0.3rem' }}>Browse or drag files here</strong>
                <span style={{ color: '#64748B', fontSize: '0.95rem', display: 'block' }}>Upload the Full Manuscript, Presentation, or Supporting Data (PDF, DOCX)</span>
              </div>
            </div>
          </div>

        </div>
      </LibraryModal>
    </LibraryShell>
  );
}
