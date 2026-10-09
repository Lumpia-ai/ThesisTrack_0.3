'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PARTNER_TECHNOLOGIES, getImpactStars, type PartnerDepartment } from '@/components/partner/partner-data';
import {
  PartnerDepartmentBadge,
  PartnerModal
} from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';
import { getDepartmentBranding } from '@/config/department-branding';

const ITEMS_PER_PAGE = 6;

function getDepartmentAccent(department: string) {
  const branding = getDepartmentBranding(department);
  const upper = department.trim().toUpperCase();

  return {
    ink: branding.primaryColor,
    soft: upper === 'IT'
      ? 'color-mix(in srgb, #111111 12%, transparent)'
      : upper === 'NAME'
        ? 'color-mix(in srgb, #DBEAFE 38%, transparent)'
        : upper === 'MET'
          ? 'color-mix(in srgb, #F3D7B6 38%, transparent)'
          : `color-mix(in srgb, ${branding.primaryColor} 22%, transparent)`,
    fill: `color-mix(in srgb, ${branding.primaryColor} 68%, var(--surface-accent))`
  };
}

export function PartnerProject() {
  const [departmentFilter, setDepartmentFilter] = useState<'all' | PartnerDepartment>('all');
  const [sortBy, setSortBy] = useState('Sort by: Latest');
  const [search, setSearch] = useState('');
  const [selectedTechnologyId, setSelectedTechnologyId] = useState('');
  const [viewMode, setViewMode] = useState<'scholar' | 'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState(1);

  const technologies = useMemo(() => {
    const filtered = PARTNER_TECHNOLOGIES.filter((technology) => {
      const matchesDepartment =
        departmentFilter === 'all' || technology.department === departmentFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        technology.title.toLowerCase().includes(term) ||
        technology.summary.toLowerCase().includes(term) ||
        technology.abstract.toLowerCase().includes(term) ||
        technology.industries.join(' ').toLowerCase().includes(term);

      return matchesDepartment && matchesSearch;
    });

    if (sortBy === 'Highest Impact') {
      return [...filtered].sort((left, right) => right.impactRating - left.impactRating);
    }

    if (sortBy === 'Technology Readiness') {
      return [...filtered].sort((left, right) => right.readinessPercent - left.readinessPercent);
    }

    return filtered;
  }, [departmentFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(technologies.length / ITEMS_PER_PAGE));
  const paginatedTechnologies = technologies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const selectedTechnology = PARTNER_TECHNOLOGIES.find((technology) => technology.id === selectedTechnologyId);

  return (
    <PartnerShell
      activeNav="project"
      title="Technology Repository"
      description="Discover, analyze, and request innovative solutions ready for industry adoption"
      notificationCount={2}
    >
      <div className="relative flex flex-col gap-8 pb-8" style={{ color: 'var(--text)' }}>
        <div className="pointer-events-none absolute left-1/2 top-[-3rem] h-72 w-[80%] -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12), transparent 68%)' }} />

        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--primary)' }}>Technology repository</p>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl" style={{ color: 'var(--text)' }}>Available technologies</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{technologies.length} projects ready for technology transfer</p>
          </div>
          <Link className="btn btn-outline hidden md:inline-flex" href="/partner/requests">
            View requests <i aria-hidden="true" className="fas fa-arrow-right ml-2" />
          </Link>
        </div>

        <section className="relative z-10 rounded-[1.5rem] border p-4 shadow-soft md:p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search repository</span>
              <i aria-hidden="true" className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              <input
                className="w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition focus:ring-2"
                placeholder="Search by keyword, technology, or application..."
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)', boxShadow: 'inset 0 0 0 1px transparent' }}
              />
            </label>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-2 text-[0.72rem] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
                Department
                <select
                  value={departmentFilter}
                  onChange={(event) => {
                    setDepartmentFilter(event.target.value as 'all' | PartnerDepartment);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border px-3 py-3 text-sm font-medium outline-none"
                  style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="all">All Departments</option>
                  <option value="IT">IT</option>
                  <option value="MET">MET</option>
                  <option value="TCM">TCM</option>
                  <option value="ESM">ESM</option>
                  <option value="NAME">NAME</option>
                </select>
              </label>

              <label className="flex flex-1 flex-col gap-2 text-[0.72rem] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
                Sort options
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border px-3 py-3 text-sm font-medium outline-none"
                  style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option>Sort by: Latest</option>
                  <option>Most Popular</option>
                  <option>Highest Impact</option>
                  <option>Technology Readiness</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 rounded-xl border p-1" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
              {[
                { key: 'scholar', label: 'Scholar', icon: 'fa-grip-lines' },
                { key: 'cards', label: 'Cards', icon: 'fa-table-cells-large' },
                { key: 'table', label: 'Table', icon: 'fa-table-list' }
              ].map((view) => (
                <button
                  key={view.key}
                  type="button"
                  aria-pressed={viewMode === view.key}
                  onClick={() => setViewMode(view.key as 'scholar' | 'cards' | 'table')}
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition"
                  style={{
                    background: viewMode === view.key ? 'var(--surface)' : 'transparent',
                    color: viewMode === view.key ? 'var(--primary)' : 'var(--muted)',
                    boxShadow: viewMode === view.key ? '0 6px 18px rgba(15, 23, 42, 0.08)' : 'none'
                  }}
                >
                  <i aria-hidden="true" className={`fas ${view.icon}`} />
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {technologies.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--muted)' }}>
            <i aria-hidden="true" className="fas fa-magnifying-glass mb-4 text-3xl" style={{ color: 'var(--primary)' }} />
            <h3 className="mb-1 text-lg font-black" style={{ color: 'var(--text)' }}>No technologies match those filters</h3>
            <p className="text-sm">Try another search term or department.</p>
          </div>
        ) : viewMode === 'scholar' ? (
          <div className="relative z-10 flex flex-col gap-4">
            {paginatedTechnologies.map((technology) => {
              const accent = getDepartmentAccent(technology.department);

              return (
                <article
                  key={technology.id}
                  className="group flex gap-4 rounded-[1.5rem] border p-5 shadow-soft transition duration-200 hover:-translate-y-1 md:p-6"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: accent.soft, color: accent.ink }}>
                    <i aria-hidden="true" className={`fas ${technology.icon}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Link href={`/partner/details?id=${technology.id}`} className="text-xl font-black leading-tight" style={{ color: 'var(--text)' }}>
                        {technology.title}
                      </Link>
                      <PartnerDepartmentBadge style={{ background: 'transparent', borderColor: 'transparent', color: accent.ink, textShadow: 'none' }}>
                        {technology.department}
                      </PartnerDepartmentBadge>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                      <strong style={{ color: 'var(--text)' }}>{technology.developers}</strong>
                      <span>•</span>
                      <span>{technology.trl}</span>
                      <span>•</span>
                      <span>{technology.industries[0]}</span>
                    </div>

                    <p className="mb-4 max-w-4xl text-sm leading-6" style={{ color: 'var(--muted)' }}>{technology.abstract}</p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em]" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--muted)' }}>{technology.readinessPercent}% Ready</span>
                      <span className="rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em]" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--muted)' }}>{technology.platform}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <Link className="btn btn-outline" href={`/partner/details?id=${technology.id}`}>
                          Read study
                        </Link>
                        <button className="btn btn-primary" type="button" onClick={() => setSelectedTechnologyId(technology.id)}>
                          <i aria-hidden="true" className="fas fa-handshake mr-2" /> Adopt
                        </button>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="relative z-10 grid gap-5 lg:grid-cols-3">
            {paginatedTechnologies.map((technology) => {
              const accent = getDepartmentAccent(technology.department);

              return (
                <article key={technology.id} className="group flex flex-col overflow-hidden rounded-[1.5rem] border shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="h-1.5" style={{ background: accent.soft }} />
                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: accent.soft, color: accent.ink }}>
                        <i aria-hidden="true" className={`fas ${technology.icon}`} />
                      </span>
                      <PartnerDepartmentBadge style={{ background: 'transparent', borderColor: 'transparent', color: accent.ink, textShadow: 'none' }}>
                        {technology.department}
                      </PartnerDepartmentBadge>
                    </div>

                    <h3 className="min-h-[3.25rem] text-lg font-black leading-snug" style={{ color: 'var(--text)' }}>{technology.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>{technology.summary}</p>

                    <div className="mt-4 flex min-h-[2rem] flex-wrap gap-2 text-[0.68rem] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
                      <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>{technology.trl}</span>
                      <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>{technology.platform}</span>
                    </div>

                    <div className="mt-5 rounded-xl border p-4" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold">
                        <span style={{ color: 'var(--muted)' }}>Readiness · {technology.readinessLabel}</span>
                        <span style={{ color: accent.ink }}>{technology.readinessPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-accent)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${technology.readinessPercent}%`, background: accent.fill }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--muted)' }}>Impact rating</span>
                        <span style={{ color: 'var(--accent, #F6BE00)' }}>{getImpactStars(technology.impactRating)}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button className="btn btn-primary flex-1" type="button" onClick={() => setSelectedTechnologyId(technology.id)}>
                        <i aria-hidden="true" className="fas fa-handshake mr-2" /> Adopt
                      </button>
                      <Link className="btn btn-outline flex-1 text-center" href={`/partner/details?id=${technology.id}`}>
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="relative z-10 overflow-hidden rounded-[1.5rem] border shadow-soft" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sunken)', borderBottom: '2px solid var(--border)', color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 800 }}>Technology / project</th>
                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 800 }}>Readiness</th>
                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 800 }}>Department</th>
                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTechnologies.map((technology, index) => {
                    const accent = getDepartmentAccent(technology.department);

                    return (
                      <tr key={technology.id} style={{ borderBottom: index === paginatedTechnologies.length - 1 ? 'none' : '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: accent.soft, color: accent.ink }}>
                              <i aria-hidden="true" className={`fas ${technology.icon}`} />
                            </span>
                            <div>
                              <Link href={`/partner/details?id=${technology.id}`} className="block font-bold" style={{ color: 'var(--text)' }}>
                                {technology.title}
                              </Link>
                              <span className="text-xs" style={{ color: 'var(--muted)' }}>{technology.industries.slice(0, 2).join(', ')}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div className="flex items-center gap-3">
                            <span className="min-w-[42px] font-bold" style={{ color: 'var(--text)' }}>{technology.readinessPercent}%</span>
                            <div style={{ width: '110px', height: '6px', background: 'var(--surface-accent)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${technology.readinessPercent}%`, background: accent.fill, height: '100%' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <PartnerDepartmentBadge style={{ background: 'transparent', borderColor: 'transparent', color: accent.ink, textShadow: 'none' }}>
                            {technology.department}
                          </PartnerDepartmentBadge>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                          <div className="flex justify-end gap-2">
                            <Link className="btn btn-outline small" href={`/partner/details?id=${technology.id}`}>
                              View
                            </Link>
                            <button className="btn btn-primary small" type="button" onClick={() => setSelectedTechnologyId(technology.id)}>
                              Adopt
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {totalPages > 1 && (
          <div className="relative z-10 flex justify-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="btn btn-outline small"
              style={{ opacity: currentPage === 1 ? 0.55 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <i aria-hidden="true" className="fas fa-chevron-left mr-2" /> Prev
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold transition"
                style={{
                  background: page === currentPage ? 'var(--primary)' : 'var(--surface)',
                  borderColor: page === currentPage ? 'var(--primary)' : 'var(--border)',
                  color: page === currentPage ? 'white' : 'var(--text)'
                }}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="btn btn-outline small"
              style={{ opacity: currentPage === totalPages ? 0.55 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next <i aria-hidden="true" className="fas fa-chevron-right ml-2" />
            </button>
          </div>
        )}
      </div>

      <PartnerModal
        open={Boolean(selectedTechnology)}
        title="Request adoption"
        narrow
        onClose={() => setSelectedTechnologyId('')}
        footer={
          <div className="flex w-full justify-end gap-3">
            <button className="btn btn-outline" type="button" onClick={() => setSelectedTechnologyId('')}>
              Cancel
            </button>
            {selectedTechnology ? (
              <Link className="btn btn-primary" href={`/partner/request?id=${selectedTechnology.id}`}>
                Continue request <i aria-hidden="true" className="fas fa-arrow-right ml-2" />
              </Link>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-5 py-2">
          <div className="flex items-center gap-4 rounded-xl border p-4" style={{ background: 'var(--primary-soft)', borderColor: 'var(--border)' }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--surface)', color: 'var(--primary)' }}>
              <i aria-hidden="true" className={`fas ${selectedTechnology?.icon}`} />
            </span>
            <div>
              <span className="text-[0.68rem] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--primary)' }}>Target project</span>
              <h3 className="mt-1 text-lg font-black" style={{ color: 'var(--text)' }}>{selectedTechnology?.title}</h3>
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="partner-project-plan" style={{ color: 'var(--text)' }}>
            Proposed implementation plan
            <textarea
              id="partner-project-plan"
              rows={4}
              defaultValue="We plan to deploy the system in a controlled pilot environment before full organizational rollout."
              className="rounded-xl border p-3 font-normal outline-none"
              style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="partner-project-date" style={{ color: 'var(--text)' }}>
            Expected timeline
            <input
              id="partner-project-date"
              type="date"
              defaultValue="2026-05-15"
              className="rounded-xl border p-3 font-normal outline-none"
              style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </label>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
