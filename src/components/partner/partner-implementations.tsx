'use client';

import { useMemo, useState } from 'react';
import {
  PARTNER_IMPLEMENTATIONS,
  getPartnerStatusTone
} from '@/components/partner/partner-data';
import {
  PartnerDepartmentBadge,
  PartnerModal,
  PartnerStatusBadge
} from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';

const PHASE_ACCENTS: Record<string, string> = {
  Planning: '#64748B',
  Setup: '#F59E0B',
  'Testing Phase': '#2563EB',
  Training: '#8B5CF6',
  'Go-Live': '#F43F5E',
  'Fully Operational': '#16A34A'
};

const IMPLEMENTATION_STATS = [
  {
    title: 'Active Implementations',
    icon: 'fa-rocket',
    accent: '#2563EB',
    soft: 'rgba(37, 99, 235, 0.14)',
    note: 'Currently underway',
    value: () => PARTNER_IMPLEMENTATIONS.length
  },
  {
    title: 'In Testing Phase',
    icon: 'fa-flask',
    accent: '#F59E0B',
    soft: 'rgba(245, 158, 11, 0.14)',
    note: 'Validation in progress',
    value: () => PARTNER_IMPLEMENTATIONS.filter((implementation) => implementation.currentPhase === 'Testing Phase').length
  },
  {
    title: 'Fully Operational',
    icon: 'fa-check-circle',
    accent: '#16A34A',
    soft: 'rgba(22, 163, 74, 0.14)',
    note: 'Live and running',
    value: () => PARTNER_IMPLEMENTATIONS.filter((implementation) => implementation.currentPhase === 'Fully Operational').length
  },
  {
    title: 'Success Rate',
    icon: 'fa-chart-line',
    accent: '#8B5CF6',
    soft: 'rgba(139, 92, 246, 0.14)',
    note: 'Successful rollouts',
    value: () => '94%'
  }
];

export function PartnerImplementations() {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [phaseFilter, setPhaseFilter] = useState('All Phases');
  const [selectedImplementationId, setSelectedImplementationId] = useState('');

  const implementations = useMemo(() => {
    return PARTNER_IMPLEMENTATIONS.filter((implementation) => {
      const matchesDepartment =
        departmentFilter === 'All Departments' || implementation.department === departmentFilter;
      const matchesPhase = phaseFilter === 'All Phases' || implementation.currentPhase === phaseFilter;

      return matchesDepartment && matchesPhase;
    });
  }, [departmentFilter, phaseFilter]);

  const selectedImplementation =
    PARTNER_IMPLEMENTATIONS.find((implementation) => implementation.id === selectedImplementationId) ??
    PARTNER_IMPLEMENTATIONS[0];

  return (
    <PartnerShell
      activeNav="implementations"
      title="Active Implementations"
      description="Monitor and manage your ongoing technology implementations"
      notificationCount={2}
    >
      <div className="flex flex-col gap-8">
        {/* KPI Stat Bar */}
        <section className="grid grid-cols-1 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {IMPLEMENTATION_STATS.map((stat) => (
            <div key={stat.title} className="flex items-center gap-4 p-5 transition-colors hover:bg-[var(--surface-alt)]">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition-transform"
                style={{ background: stat.soft, color: stat.accent }}
              >
                <i aria-hidden="true" className={`fas ${stat.icon}`} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{stat.title}</p>
                <p className="text-2xl font-extrabold leading-tight text-[var(--text)]">{stat.value()}</p>
                <p className="truncate text-xs font-medium text-[var(--muted)]">{stat.note}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 px-1 font-bold text-[var(--muted)]">
            <i aria-hidden="true" className="fas fa-filter" /> Filters
          </div>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="min-w-[200px] flex-1 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] outline-none"
          >
            <option>All Departments</option>
            <option>IT</option>
            <option>MET</option>
            <option>TCM</option>
            <option>ESM</option>
            <option>NAME</option>
          </select>
          <select
            value={phaseFilter}
            onChange={(event) => setPhaseFilter(event.target.value)}
            className="min-w-[200px] flex-1 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] outline-none"
          >
            <option>All Phases</option>
            <option>Planning</option>
            <option>Setup</option>
            <option>Testing Phase</option>
            <option>Training</option>
            <option>Go-Live</option>
            <option>Fully Operational</option>
          </select>
        </div>

        {/* Implementation Cards */}
        {implementations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-12 text-center">
            <i aria-hidden="true" className="fas fa-diagram-project mb-3 text-4xl text-[var(--muted)]" />
            <h4 className="mb-1 text-base font-extrabold text-[var(--text)]">No implementations match your filters</h4>
            <p className="text-sm text-[var(--muted)]">Try switching the department or phase filter back to show all.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {implementations.map((implementation) => {
            const phaseAccent = PHASE_ACCENTS[implementation.currentPhase] ?? 'var(--primary)';

            return (
            <article
              key={implementation.id}
              className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
              style={{ borderTop: `3px solid ${phaseAccent}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
                    style={{ background: `${phaseAccent}24`, color: phaseAccent }}
                  >
                    <i aria-hidden="true" className="fas fa-diagram-project" />
                  </span>
                  <h3 className="text-base font-extrabold leading-snug text-[var(--text)]">{implementation.title}</h3>
                </div>
                <PartnerDepartmentBadge>{implementation.department}</PartnerDepartmentBadge>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4">
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-[var(--muted)]">{implementation.currentPhase}</span>
                  <span style={{ color: phaseAccent }}>{implementation.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-accent)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${implementation.progress}%`, background: phaseAccent }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Start Date</span>
                  <span className="font-semibold text-[var(--muted-strong)]">
                    <i aria-hidden="true" className="far fa-calendar-alt mr-1.5 text-[var(--muted)]" />
                    {implementation.startDate}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Target Go-Live</span>
                  <span className="font-semibold text-[var(--muted-strong)]">
                    <i aria-hidden="true" className="far fa-flag mr-1.5 text-[var(--muted)]" />
                    {implementation.targetDate}
                  </span>
                </div>
                <div className="col-span-2 inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--success-soft)] px-3 py-1.5 font-semibold text-[var(--success)]">
                  <i aria-hidden="true" className="fas fa-chart-pie" /> {implementation.impactLabel}
                </div>
              </div>

              {/* Milestones timeline */}
              <div className="flex gap-1 py-1">
                {implementation.milestones.map((milestone) => {
                  const isCompleted = milestone.state === 'completed';
                  const isActive = milestone.state === 'current';
                  const trackColor = isCompleted ? 'var(--success)' : isActive ? 'var(--info)' : 'var(--surface-accent)';
                  const labelColor = isCompleted ? 'var(--success)' : isActive ? 'var(--info)' : 'var(--muted)';

                  return (
                    <div key={milestone.label} className="flex flex-1 flex-col gap-1.5">
                      <div className="relative h-1 rounded-full" style={{ background: trackColor }}>
                        {(isCompleted || isActive) && (
                          <div
                            className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--surface)]"
                            style={{ background: trackColor }}
                          />
                        )}
                      </div>
                      <span className="text-[0.65rem] font-bold uppercase" style={{ color: labelColor }}>
                        {milestone.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto flex gap-3 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedImplementationId(implementation.id)}
                  className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  View Notes
                </button>
                <button className="flex-1 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110">
                  Submit Report
                </button>
              </div>
            </article>
            );
          })}
        </div>
        )}

        {/* Portfolio Table */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-6 py-5">
            <h3 className="text-lg font-extrabold text-[var(--text)]">Implementation Portfolio</h3>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--border)] text-xs font-bold uppercase tracking-wide text-[var(--text-meta)]">
                  <th className="px-4 py-4">Project</th>
                  <th className="px-4 py-4">Partner</th>
                  <th className="px-4 py-4">Phase</th>
                  <th className="px-4 py-4">Progress</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {implementations.map((implementation, i) => (
                  <tr
                    key={implementation.id}
                    className={`transition hover:bg-[var(--surface-alt)] ${i === implementations.length - 1 ? '' : 'border-b border-[var(--border)]'}`}
                  >
                    <td className="px-4 py-4 font-bold text-[var(--text)]">{implementation.title}</td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">{implementation.partner}</td>
                    <td className="px-4 py-4 text-sm text-[var(--muted)]">{implementation.currentPhase}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-10 font-bold text-[var(--primary)]">{implementation.progress}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-accent)]">
                          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${implementation.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <PartnerStatusBadge tone={getPartnerStatusTone(implementation.status)}>{implementation.status}</PartnerStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <PartnerModal
        open={Boolean(selectedImplementationId)}
        title={selectedImplementation.title}
        onClose={() => setSelectedImplementationId('')}
        footer={
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={() => setSelectedImplementationId('')}
              className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-1">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Partner</span>
              <strong className="text-sm text-[var(--text)]">{selectedImplementation.partner}</strong>
            </div>
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Target Date</span>
              <strong className="text-sm text-[var(--text)]">{selectedImplementation.targetDate}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Current Phase</span>
              <div className="inline-block rounded-full bg-[var(--primary-soft)] px-3 py-1 text-sm font-bold text-[var(--primary)]">
                {selectedImplementation.currentPhase}
              </div>
            </div>
          </div>

          <div className="rounded-xl border-l-4 border-[var(--warning)] bg-[var(--warning-soft)] p-4">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--warning)]">Status Note</span>
            <p className="text-sm text-[var(--muted-strong)]">Maintain weekly coordination and deployment documentation.</p>
          </div>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
