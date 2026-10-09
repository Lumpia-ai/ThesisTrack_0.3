'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  PARTNER_DEPARTMENTS,
  PARTNER_IMPLEMENTATIONS,
  PARTNER_REQUESTS,
  PARTNER_TECHNOLOGIES,
  getImpactStars,
  getPartnerStatusTone
} from '@/components/partner/partner-data';
import {
  PartnerDepartmentBadge,
  PartnerModal,
  PartnerStatusBadge
} from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';
import { getDepartmentBranding } from '@/config/department-branding';

function getDepartmentAccent(department: string) {
  const branding = getDepartmentBranding(department);
  const isInformationTechnology = department.trim().toUpperCase() === 'IT';

  return {
    ink: branding.primaryColor,
    soft: isInformationTechnology
      ? 'color-mix(in srgb, #111111 12%, transparent)'
      : department.trim().toUpperCase() === 'NAME'
        ? 'color-mix(in srgb, #DBEAFE 38%, transparent)'
        : department.trim().toUpperCase() === 'MET'
          ? 'color-mix(in srgb, #F3D7B6 38%, transparent)'
      : `color-mix(in srgb, ${branding.accentColor} 22%, transparent)`,
    fill: `color-mix(in srgb, ${branding.primaryColor} 68%, var(--surface-accent))`
  };
}

const KPI_CARDS = [
  { label: 'Available technologies', icon: 'fa-microchip', accent: '#2563EB' },
  { label: 'My requests', icon: 'fa-code-pull-request', accent: '#0F766E' },
  { label: 'Active implementations', icon: 'fa-diagram-project', accent: '#C2410C' },
  { label: 'Success rate', icon: 'fa-chart-line', accent: '#15803D' }
] as const;

export function PartnerDashboard() {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [search, setSearch] = useState('');
  const [selectedTechnologyId, setSelectedTechnologyId] = useState<string | null>(null);
  const [hoveredDepartment, setHoveredDepartment] = useState<string | null>(null);

  const visibleTechnologies = useMemo(() => {
    const term = search.trim().toLowerCase();

    return PARTNER_TECHNOLOGIES.filter((technology) => {
      const matchesDepartment =
        departmentFilter === 'All Departments' || technology.department === departmentFilter;
      const matchesSearch =
        !term ||
        technology.title.toLowerCase().includes(term) ||
        technology.summary.toLowerCase().includes(term);

      return matchesDepartment && matchesSearch;
    }).slice(0, 3);
  }, [departmentFilter, search]);

  const selectedTechnology =
    PARTNER_TECHNOLOGIES.find((technology) => technology.id === selectedTechnologyId) || null;
  const approvedRequests = PARTNER_REQUESTS.filter((request) => request.status === 'Approved').length;
  const pendingRequests = PARTNER_REQUESTS.length - approvedRequests;

  return (
    <PartnerShell
      activeNav="dashboard"
      title="Partner / Beneficiary Dashboard"
      description="Discover and adopt innovative technologies"
      notificationCount={2}
    >
      <div className="flex flex-col gap-8" style={{ color: 'var(--text)' }}>
        <section
          className="relative overflow-hidden rounded-[1.5rem] border p-6 shadow-portal md:p-9"
          style={{ background: 'linear-gradient(120deg, var(--primary), var(--primary-dark, #002C6B))', borderColor: 'var(--primary)', minHeight: '280px' }}
        >
          <div className="relative z-10 max-w-2xl text-white">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent, #F6BE00)' }} />
              Partner workspace
            </p>
            <h2 className="max-w-xl text-3xl font-black leading-[1.08] tracking-tight md:text-5xl" style={{ color: '#F6BE00' }}>Turn promising research into practical impact.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Explore deployment-ready technologies, coordinate adoption requests, and keep every active implementation moving.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn" href="/partner/project" style={{ background: '#0F766E', color: '#F8FAFC', border: '1px solid rgba(153,246,228,0.38)', fontWeight: 800 }}>
                <i aria-hidden="true" className="fas fa-search mr-2" /> Browse projects
              </Link>
              <Link className="btn" href="/partner/requests" style={{ background: 'rgba(255,255,255,0.14)', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.38)', fontWeight: 700 }}>
                View my requests <i aria-hidden="true" className="fas fa-arrow-right ml-2" />
              </Link>
            </div>
          </div>
          <i aria-hidden="true" className="fas fa-handshake absolute -bottom-10 -right-4 rotate-[-12deg] text-[12rem]" style={{ color: 'rgba(255,255,255,0.07)' }} />
        </section>

        <section className="grid overflow-hidden rounded-2xl border shadow-soft md:grid-cols-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {KPI_CARDS.map((card, index) => {
            const values = [PARTNER_TECHNOLOGIES.length, PARTNER_REQUESTS.length, PARTNER_IMPLEMENTATIONS.length, '85%'];
            const notes = ['Ready for adoption', `${approvedRequests} approved, ${pendingRequests} in progress`, 'Currently deployed', 'Successful adoptions'];

            return (
              <article key={card.label} className={`group relative flex items-center gap-4 p-5 transition-colors hover:bg-[var(--surface-sunken)] ${index < 3 ? 'border-b md:border-b-0 md:border-r' : ''}`} style={{ borderColor: 'var(--border)' }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${card.accent}18`, color: card.accent }}>
                  <i aria-hidden="true" className={`fas ${card.icon}`} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[0.7rem] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>{card.label}</p>
                  <strong className="mt-1 block text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{values[index]}</strong>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{notes[index]}</span>
                </div>
                <span className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full opacity-70 transition-all group-hover:h-1 group-hover:opacity-100" style={{ background: card.accent }} />
              </article>
            );
          })}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border p-4 shadow-soft md:flex-row md:items-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search available technologies</span>
            <i aria-hidden="true" className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input
              className="w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition focus:ring-2"
              placeholder="Search technologies by name or capability..."
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)', boxShadow: 'inset 0 0 0 1px transparent' }}
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {['All Departments', ...PARTNER_DEPARTMENTS].map((department) => (
              <button
                key={department}
                aria-pressed={departmentFilter === department}
                className="shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition hover:-translate-y-px"
                type="button"
                onClick={() => setDepartmentFilter(department)}
                onMouseEnter={() => setHoveredDepartment(department)}
                onMouseLeave={() => setHoveredDepartment(null)}
                style={(() => {
                  const accent = department === 'All Departments' ? null : getDepartmentAccent(department);
                  const selected = departmentFilter === department;
                  const hovered = hoveredDepartment === department && !selected;

                  return {
                    background: selected
                      ? accent?.ink || 'var(--primary)'
                      : hovered && accent?.ink
                        ? `color-mix(in srgb, ${accent.ink} 12%, var(--surface))`
                      : accent?.ink
                        ? `color-mix(in srgb, ${accent.ink} 5%, var(--surface))`
                        : 'var(--surface-sunken)',
                    borderColor: selected
                      ? accent?.ink || 'var(--primary)'
                      : hovered && accent?.ink
                        ? `color-mix(in srgb, ${accent.ink} 30%, var(--border))`
                      : accent?.ink
                        ? `color-mix(in srgb, ${accent.ink} 14%, var(--border))`
                        : 'var(--border)',
                    color: selected ? 'white' : hovered && accent?.ink ? accent.ink : 'var(--muted)',
                    textShadow: 'none'
                  };
                })()}
              >
                {department}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs md:border-l md:border-t-0 md:pl-4 md:pt-0" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <span><strong style={{ color: 'var(--text)' }}>{visibleTechnologies.length}</strong> shown</span>
            {(search || departmentFilter !== 'All Departments') ? (
              <button className="rounded-md px-2 py-1 font-bold transition hover:bg-[var(--primary-soft)]" type="button" onClick={() => { setSearch(''); setDepartmentFilter('All Departments'); }} style={{ color: 'var(--primary)' }}>
                Reset
              </button>
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--primary)' }}>Recommended for you</p>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Adoption-ready technologies</h2>
            </div>
            <Link className="hidden text-sm font-bold md:block" href="/partner/project" style={{ color: 'var(--primary)' }}>Browse all <i aria-hidden="true" className="fas fa-arrow-right ml-1" /></Link>
          </div>

          {visibleTechnologies.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--muted)' }}>
              <i aria-hidden="true" className="fas fa-magnifying-glass mb-4 text-3xl" style={{ color: 'var(--primary)' }} />
              <h3 className="mb-1 text-lg font-bold" style={{ color: 'var(--text)' }}>No technologies match those filters</h3>
              <p className="text-sm">Try another search term or department.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {visibleTechnologies.map((technology) => {
                const accent = getDepartmentAccent(technology.department);

                return (
                  <article key={technology.id} className="group flex flex-col overflow-hidden rounded-2xl border shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="h-1.5" style={{ background: accent.soft }} />
                    <div className="flex flex-1 flex-col p-5 md:p-6">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: 'transparent', color: accent.ink }}>
                          <i aria-hidden="true" className={`fas ${technology.icon}`} />
                        </span>
                        <PartnerDepartmentBadge style={{ background: 'transparent', borderColor: 'transparent', color: accent.ink, textShadow: 'none' }}>{technology.department}</PartnerDepartmentBadge>
                      </div>
                      <h3 className="min-h-[3.25rem] text-lg font-black leading-snug" style={{ color: 'var(--text)' }}>{technology.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>{technology.summary}</p>
                      <div className="mt-4 flex min-h-[2rem] flex-wrap gap-2 text-[0.68rem] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
                        <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>{technology.trl}</span>
                        <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>{technology.platform}</span>
                      </div>
                      <div className="mt-5 rounded-xl border p-4" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold"><span style={{ color: 'var(--muted)' }}>Readiness · {technology.readinessLabel}</span><span style={{ color: accent.ink }}>{technology.readinessPercent}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-accent)' }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${technology.readinessPercent}%`, background: accent.fill }} /></div>
                        <div className="mt-3 flex items-center justify-between text-xs"><span style={{ color: 'var(--muted)' }}>Impact rating</span><span style={{ color: 'var(--accent, #F6BE00)' }}>{getImpactStars(technology.impactRating)}</span></div>
                      </div>
                      <div className="mt-5 flex gap-2"><button className="btn btn-primary flex-1 transition hover:-translate-y-px active:!border-[#F6BE00] active:!bg-[#F6BE00] active:!text-[#1A1851]" type="button" onClick={() => setSelectedTechnologyId(technology.id)}><i aria-hidden="true" className="fas fa-handshake mr-2" /> Adopt</button><Link className="btn btn-outline flex-1 text-center transition hover:-translate-y-px active:!border-[#F6BE00] active:!bg-[#F6BE00] active:!text-white" href={`/partner/details?id=${technology.id}`}>Details</Link></div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border shadow-soft" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 md:p-6" style={{ borderColor: 'var(--border)' }}>
            <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent, #F6BE00)' }}>Live portfolio</p><h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>My active implementations</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Keep deployment milestones and partner coordination visible.</p></div>
            <Link className="btn btn-outline small" href="/partner/implementations">Open full tracker <i aria-hidden="true" className="fas fa-arrow-right ml-2" /></Link>
          </div>
          <div className="grid gap-3 p-4 md:p-5">
            {PARTNER_IMPLEMENTATIONS.map((implementation) => (
              <article key={implementation.id} className="group grid gap-4 rounded-xl border p-4 transition-colors hover:bg-[var(--surface)] md:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.8fr)_auto] md:items-center" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                <div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="truncate font-bold" style={{ color: 'var(--text)' }}>{implementation.title}</h3><PartnerDepartmentBadge style={{ background: 'transparent', borderColor: 'transparent', color: getDepartmentAccent(implementation.department).ink, textShadow: 'none' }}>{implementation.department}</PartnerDepartmentBadge></div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}><span><i aria-hidden="true" className="fas fa-calendar mr-1" /> Started {implementation.startDate}</span><span><i aria-hidden="true" className="fas fa-flag mr-1" /> {implementation.currentPhase}</span></div></div>
                <div><div className="mb-2 flex justify-between text-xs font-bold"><span style={{ color: 'var(--muted)' }}>Progress</span><span style={{ color: 'var(--primary)' }}>{implementation.progress}%</span></div><div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-accent)' }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${implementation.progress}%`, background: 'var(--primary)' }} /></div></div>
                <div className="flex items-center gap-3 md:justify-end"><PartnerStatusBadge tone={getPartnerStatusTone(implementation.status)}>{implementation.status}</PartnerStatusBadge><Link className="text-sm font-bold" href="/partner/implementations" style={{ color: 'var(--primary)' }}>Open <i aria-hidden="true" className="fas fa-arrow-right ml-1" /></Link></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <PartnerModal open={Boolean(selectedTechnologyId)} title="Request technology adoption" onClose={() => setSelectedTechnologyId(null)} footer={<div className="flex w-full justify-end gap-3"><button className="btn btn-outline" type="button" onClick={() => setSelectedTechnologyId(null)}>Cancel</button><Link className="btn" href={`/partner/request?id=${selectedTechnology?.id}`} style={{ background: '#F6BE00', border: '1px solid #D6A500', color: '#1A1851', fontWeight: 800 }}>Continue request <i aria-hidden="true" className="fas fa-arrow-right ml-2" /></Link></div>}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4 rounded-xl border p-4" style={{ background: 'var(--primary-soft)', borderColor: 'var(--border)' }}><span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--surface)', color: 'var(--primary)' }}><i aria-hidden="true" className={`fas ${selectedTechnology?.icon}`} /></span><div><span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--primary)' }}>Target project</span><h3 className="mt-1 font-black" style={{ color: 'var(--text)' }}>{selectedTechnology?.title}</h3></div></div>
          <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="partner-dashboard-plan" style={{ color: 'var(--text)' }}>Proposed implementation plan<textarea className="rounded-xl border p-3 font-normal outline-none" defaultValue="We plan to deploy the system in a controlled pilot environment before full organizational rollout." id="partner-dashboard-plan" rows={4} style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }} /></label>
          <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="partner-dashboard-date" style={{ color: 'var(--text)' }}>Expected timeline<input className="rounded-xl border p-3 font-normal outline-none" defaultValue="2026-05-15" id="partner-dashboard-date" type="date" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }} /></label>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
