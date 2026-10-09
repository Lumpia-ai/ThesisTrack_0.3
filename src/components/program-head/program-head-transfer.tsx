'use client';

import { useMemo, useState } from 'react';
import { PROGRAM_HEAD_PROJECTS } from '@/components/program-head/program-head-data';
import {
  PH_CARD_CLASS,
  PH_PALETTE as P,
  PH_ROW_HEIGHT_CLASS,
  PH_TD_CLASS,
  PH_TH_CLASS,
  ProgramHeadAnimatedNumber as AnimatedNumber,
  ProgramHeadButton,
  ProgramHeadDetailGrid,
  ProgramHeadDrawer,
  ProgramHeadFillerRows,
  ProgramHeadKpiCard as StatCard,
  ProgramHeadModal,
  ProgramHeadPageHeader,
  ProgramHeadPaginationBar,
  ProgramHeadPanel,
  ProgramHeadPill,
  ProgramHeadPrimaryAction,
  phTint,
  useProgramHeadPagination
} from '@/components/program-head/program-head-primitives';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';

/* Transfer stages in pipeline order, in the shared navy / light-blue / gold palette. */
const STAGES = [
  { key: 'Ready for Transfer', label: 'Ready', hint: 'Tagged for partner matching', icon: 'fa-rocket', color: P.gold },
  { key: 'Proposed', label: 'Proposed', hint: 'Offered to a partner', icon: 'fa-paper-plane', color: P.light },
  { key: 'Deployed', label: 'Deployed', hint: 'Signed MOA, being piloted', icon: 'fa-box-open', color: `color-mix(in srgb, ${P.navy} 60%, ${P.light})` },
  { key: 'In Use', label: 'In use', hint: 'Verified, in active use', icon: 'fa-circle-check', color: P.navy }
] as const;
type StageKey = (typeof STAGES)[number]['key'];
const STAGE_BY_KEY = Object.fromEntries(STAGES.map((stage) => [stage.key, stage])) as Record<StageKey, (typeof STAGES)[number]>;

const OVERSIGHT_CHECKLIST = [
  { label: 'Implemented location recorded', done: 7, total: 8 },
  { label: 'Beneficiary organization tagged', done: 8, total: 8 },
  { label: 'Adoption outside home program', done: 3, total: 8 },
  { label: 'Manuscript link present', done: 8, total: 8 }
];

const FOOTPRINT = [
  { label: 'Schools', count: 1, icon: 'fa-school' },
  { label: 'LGU Offices', count: 1, icon: 'fa-landmark' },
  { label: 'SMEs', count: 2, icon: 'fa-store' },
  { label: 'Community Sites', count: 2, icon: 'fa-users' }
];
const FOOTPRINT_TOTAL = FOOTPRINT.reduce((sum, site) => sum + site.count, 0);

const EVIDENCE_ROWS = [
  { year: '2025-2026', project: 'AI-Powered Learning Management System', type: 'Presentation certificate, pilot photos', location: 'Regional Research Colloquium / Computer Lab', status: 'Verified' },
  { year: '2025-2026', project: 'Sustainable Agriculture IoT System', type: 'Deployment photos, utilization report', location: 'Lumbia community farm', status: 'Verified' },
  { year: '2024-2025', project: 'Marine Pollution Detection Drone', type: 'MOA, training attendance, impact report', location: 'Macajalar Bay', status: 'Archived' }
];

/** Colour for a completion ratio: complete → navy, most → light blue, low → gold (needs attention). */
const ratioColor = (pct: number) => (pct >= 100 ? P.navy : pct >= 75 ? P.light : P.gold);

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] overflow-hidden ph-anim-meter">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }}></div>
    </div>
  );
}

const statIcon = (color: string) => ({ backgroundColor: phTint(color, 14), color });

export function ProgramHeadTransfer() {
  const [impactOpen, setImpactOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<StageKey | 'All'>('All');
  const [selectedCode, setSelectedCode] = useState('');

  const pipeline = useMemo(
    () => PROGRAM_HEAD_PROJECTS.filter((project) => project.transferStatus in STAGE_BY_KEY),
    []
  );

  const counts = useMemo(() => Object.fromEntries(
    STAGES.map((stage) => [stage.key, pipeline.filter((project) => project.transferStatus === stage.key).length])
  ) as Record<StageKey, number>, [pipeline]);

  const transferProjects = useMemo(
    () => (stageFilter === 'All' ? pipeline : pipeline.filter((project) => project.transferStatus === stageFilter)),
    [pipeline, stageFilter]
  );
  const pagination = useProgramHeadPagination(transferProjects, stageFilter);

  const selectedProject = useMemo(() => PROGRAM_HEAD_PROJECTS.find((project) => project.code === selectedCode), [selectedCode]);
  const selectedStageIndex = selectedProject ? STAGES.findIndex((stage) => stage.key === selectedProject.transferStatus) : -1;

  return (
    <ProgramHeadShell activeNav="transfer" title="Technology Transfer Summary" description="Track where studies were implemented, who benefited, and which outputs are ready for adoption." notificationCount={2}>
      <div className="space-y-5 ph-palette">
        <ProgramHeadPageHeader
          description="Where studies were implemented, who benefited, and which outputs are ready for adoption."
          actions={<ProgramHeadPrimaryAction icon="fa-chart-line" onClick={() => setImpactOpen(true)}>Impact Report</ProgramHeadPrimaryAction>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 ph-stagger">
          <StatCard title="Transfer Ready" value={counts['Ready for Transfer']} note="Tagged for partner matching" icon="fa-handshake" color={P.gold} />
          <StatCard title="Deployed / In Use" value={counts.Deployed + counts['In Use']} note="Signed MOA or verified" icon="fa-satellite-dish" color={P.navy} />
          <StatCard title="Active Pilot Sites" value={5} note="Implementation evidence this AY" icon="fa-flask" color={P.light} />
          <StatCard title="Evidence Bundles" value={18} note="Accreditation and extension files" icon="fa-archive" color={P.navy} />
        </div>

        {/* Pipeline: stage flow doubles as the filter for the table below */}
        <div className={PH_CARD_CLASS}>
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[15px] font-bold text-[var(--text)]">Transfer Pipeline</h3>
              <button
                type="button"
                onClick={() => setStageFilter('All')}
                className={`h-7 px-3 rounded-lg text-xs font-bold transition-colors ${stageFilter === 'All' ? 'text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'}`}
                style={stageFilter === 'All' ? { backgroundColor: P.navy } : undefined}
              >
                All <span className="tabular-nums opacity-80">{pipeline.length}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 ph-stagger" role="tablist" aria-label="Filter by transfer stage">
              {STAGES.map((stage, index) => {
                const active = stageFilter === stage.key;
                const count = counts[stage.key];
                return (
                  <button
                    key={stage.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStageFilter(active ? 'All' : stage.key)}
                    className={`group relative text-left rounded-xl px-3.5 py-3 ring-1 ring-inset transition-all duration-200 ${
                      active ? 'shadow-sm -translate-y-px' : 'ring-[var(--border)] hover:-translate-y-px hover:shadow-sm'
                    }`}
                    style={active ? { backgroundColor: phTint(stage.color, 10), ['--tw-ring-color' as string]: stage.color } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs transition-transform group-hover:scale-105" style={statIcon(stage.color)}>
                        <i className={`fas ${stage.icon}`}></i>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{stage.label}</p>
                        <p className="text-xl font-extrabold text-[var(--text)] tabular-nums leading-none"><AnimatedNumber value={count} /></p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--muted)] truncate">{stage.hint}</p>
                    <div className="mt-2"><Bar pct={pipeline.length ? (count / pipeline.length) * 100 : 0} color={stage.color} /></div>
                    {index < STAGES.length - 1 && (
                      <i aria-hidden="true" className="hidden lg:block fas fa-chevron-right absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[10px] text-[var(--muted)] bg-[var(--surface)] rounded-full"></i>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead className="bg-[var(--surface-alt)]">
                <tr>
                  <th className={PH_TH_CLASS}>Project</th>
                  <th className={PH_TH_CLASS}>Partner & Location</th>
                  <th className={PH_TH_CLASS}>Stage</th>
                  <th className={PH_TH_CLASS}>Beneficiaries</th>
                  <th className={PH_TH_CLASS}>Evidence</th>
                  <th className={`${PH_TH_CLASS} w-10`}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody key={pagination.bodyKey} {...pagination.bodyProps} className={`divide-y divide-[var(--border)] ${pagination.bodyProps.className}`}>
                {transferProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--muted)]">No projects at this stage.</td>
                  </tr>
                ) : pagination.pageItems.map((project) => {
                  const stage = STAGE_BY_KEY[project.transferStatus as StageKey];
                  return (
                    <tr key={project.code} className={`group ${PH_ROW_HEIGHT_CLASS} hover:bg-[var(--surface-alt)] cursor-pointer transition-colors`} onClick={() => setSelectedCode(project.code)}>
                      <td className={`${PH_TD_CLASS} max-w-[340px]`}>
                        <p className="text-sm font-bold text-[var(--text)] truncate" title={project.title}>{project.title}</p>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                          <span className="font-mono px-1.5 py-px rounded bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)]">{project.code}</span>
                          <span className="truncate">{project.typeLabel}</span>
                        </span>
                      </td>
                      <td className={PH_TD_CLASS}>
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs" style={statIcon(P.navy)}>
                            <i className="fas fa-building"></i>
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-[var(--text)] block truncate">{project.partner}</span>
                            <span className="text-[11px] text-[var(--muted)] truncate block"><i className="fas fa-map-marker-alt text-[9px] mr-1"></i>{project.partnerLocation}</span>
                          </div>
                        </div>
                      </td>
                      <td className={PH_TD_CLASS}>
                        {stage ? <ProgramHeadPill color={stage.color} icon={stage.icon}>{stage.label}</ProgramHeadPill> : null}
                      </td>
                      <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)] max-w-[220px] truncate`} title={project.beneficiaries}>{project.beneficiaries}</td>
                      <td className={PH_TD_CLASS}>
                        <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] text-xs font-bold text-[var(--text)] whitespace-nowrap">
                          <i className="fas fa-paperclip text-[10px] text-[var(--muted)]"></i>{project.evidenceCount}
                        </span>
                      </td>
                      <td className={`${PH_TD_CLASS} text-right`}>
                        <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--surface)] group-hover:ring-1 group-hover:ring-[var(--border)] transition-all">
                          <i className="fas fa-chevron-right text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <ProgramHeadFillerRows count={pagination.fillerCount} colSpan={6} />
              </tbody>
            </table>
          </div>
          <ProgramHeadPaginationBar
            currentPage={pagination.currentPage}
            pageCount={pagination.pageCount}
            pageStart={pagination.pageStart}
            shownCount={pagination.pageItems.length}
            total={pagination.total}
            onPage={pagination.goToPage}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ph-stagger">
          <ProgramHeadPanel title="Oversight Checklist" bodyClassName="p-5 space-y-3.5">
            {OVERSIGHT_CHECKLIST.map((item) => {
              const pct = Math.round((item.done / item.total) * 100);
              const complete = item.done === item.total;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5 gap-3">
                    <span className="flex items-center gap-2 font-medium text-[var(--text)]">
                      <i className={`fas ${complete ? 'fa-circle-check' : 'fa-circle-half-stroke'} text-xs`} style={{ color: ratioColor(pct) }}></i>
                      {item.label}
                    </span>
                    <span className="font-bold text-[var(--text)] tabular-nums">{item.done}/{item.total}</span>
                  </div>
                  <Bar pct={pct} color={ratioColor(pct)} />
                </div>
              );
            })}
          </ProgramHeadPanel>

          <ProgramHeadPanel
            title="Implementation Footprint"
            action={<span className="text-xs text-[var(--muted)]"><strong className="text-[var(--text)] tabular-nums">{FOOTPRINT_TOTAL}</strong> sites</span>}
            bodyClassName="p-5 grid grid-cols-2 gap-3"
          >
            {FOOTPRINT.map((site) => (
              <div key={site.label} className="rounded-xl ring-1 ring-inset ring-[var(--border)] px-3.5 py-3 hover:-translate-y-px hover:shadow-sm transition-all duration-200">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm" style={statIcon(P.navy)}>
                    <i className={`fas ${site.icon}`}></i>
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xl font-extrabold text-[var(--text)] leading-none tabular-nums"><AnimatedNumber value={site.count} /></span>
                    <span className="text-xs text-[var(--muted)]">{site.label}</span>
                  </div>
                </div>
                <div className="mt-2.5"><Bar pct={(site.count / FOOTPRINT_TOTAL) * 100} color={P.light} /></div>
              </div>
            ))}
          </ProgramHeadPanel>
        </div>

        <ProgramHeadPanel
          title="Implementation Evidence by Year"
          action={<span className="text-xs text-[var(--muted)]">Proof of deployment and partner feedback</span>}
          bodyClassName="overflow-x-auto"
        >
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead className="bg-[var(--surface-alt)]">
              <tr>
                <th className={PH_TH_CLASS}>Year</th>
                <th className={PH_TH_CLASS}>Project</th>
                <th className={PH_TH_CLASS}>Evidence Type</th>
                <th className={PH_TH_CLASS}>Location / Event</th>
                <th className={PH_TH_CLASS}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] ph-stagger">
              {EVIDENCE_ROWS.map((row) => (
                <tr key={`${row.year}-${row.project}`} className="hover:bg-[var(--surface-alt)] transition-colors">
                  <td className={PH_TD_CLASS}>
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold tabular-nums whitespace-nowrap" style={{ backgroundColor: phTint(P.navy, 10), color: P.brandText }}>{row.year}</span>
                  </td>
                  <td className={`${PH_TD_CLASS} text-sm font-medium text-[var(--text)]`}>{row.project}</td>
                  <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)]`}>{row.type}</td>
                  <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)]`}><i className="fas fa-map-marker-alt text-[10px] mr-1.5 opacity-70"></i>{row.location}</td>
                  <td className={PH_TD_CLASS}>
                    <ProgramHeadPill color={row.status === 'Verified' ? P.navy : P.neutral} icon={row.status === 'Verified' ? 'fa-circle-check' : 'fa-box-archive'}>{row.status}</ProgramHeadPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ProgramHeadPanel>
      </div>

      <ProgramHeadDrawer maxWidth={520} open={Boolean(selectedProject)} title="Transfer Details" onClose={() => setSelectedCode('')}>
        {selectedProject ? (
          <div className="space-y-5">
            <div>
              <h3 className="m-0 text-lg font-bold text-[var(--text)] leading-snug">{selectedProject.title}</h3>
              <p className="text-xs text-[var(--muted)] mt-1"><span className="font-mono">{selectedProject.code}</span> · {selectedProject.cluster}</p>
            </div>

            {/* Where the project sits in the pipeline */}
            <ol className="grid grid-cols-4 gap-1.5" aria-label="Transfer stage">
              {STAGES.map((stage, index) => {
                const reached = index <= selectedStageIndex;
                const current = index === selectedStageIndex;
                return (
                  <li key={stage.key} className="text-center">
                    <div className="h-1.5 rounded-full mb-2 transition-colors" style={{ backgroundColor: reached ? stage.color : 'var(--surface-alt)' }}></div>
                    <span
                      className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-[10px] ${current ? 'ring-2 ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
                      style={reached
                        ? { backgroundColor: stage.color, color: '#fff', ['--tw-ring-color' as string]: stage.color }
                        : { backgroundColor: 'var(--surface-alt)', color: 'var(--muted)' }}
                    >
                      <i className={`fas ${stage.icon}`}></i>
                    </span>
                    <p className={`mt-1 text-[11px] ${current ? 'font-bold text-[var(--text)]' : 'text-[var(--muted)]'}`}>{stage.label}</p>
                  </li>
                );
              })}
            </ol>

            <ProgramHeadDetailGrid
              items={[
                ['Partner', selectedProject.partner],
                ['Location', selectedProject.partnerLocation],
                ['Beneficiaries', selectedProject.beneficiaries],
                ['Evidence', `${selectedProject.evidenceCount} files`],
                ['Adviser', selectedProject.adviser],
                ['Type', selectedProject.typeLabel]
              ]}
            />
            <div className="flex gap-3 pt-1">
              <button type="button" className="flex-1 h-10 rounded-xl ring-1 ring-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors" onClick={() => setSelectedCode('')}>Close</button>
              <button type="button" className="flex-1 h-10 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: P.navy }}>
                <i className={`fas ${selectedProject.transferStatus === 'Proposed' ? 'fa-file-signature' : 'fa-file-pdf'}`}></i>
                {selectedProject.transferStatus === 'Proposed' ? 'Finalize Transfer' : 'Impact Report'}
              </button>
            </div>
          </div>
        ) : null}
      </ProgramHeadDrawer>

      <ProgramHeadModal open={impactOpen} title="Generate Transfer Impact Report" onClose={() => setImpactOpen(false)}>
        <div className="ph-form-field">
          <label htmlFor="ph-transfer-year">Academic Year</label>
          <select className="ph-select" id="ph-transfer-year" defaultValue="AY 2025-2026">
            <option>AY 2025-2026</option><option>AY 2024-2025</option><option>All Years</option>
          </select>
        </div>
        <div className="ph-form-field">
          <label>Include</label>
          <div className="ph-checkbox-list">
            <label><input defaultChecked type="checkbox" /> Beneficiary count</label>
            <label><input defaultChecked type="checkbox" /> Implementation location</label>
            <label><input defaultChecked type="checkbox" /> Adoption status</label>
            <label><input defaultChecked type="checkbox" /> Evidence summary</label>
          </div>
        </div>
        <div className="ph-modal-actions">
          <ProgramHeadButton onClick={() => setImpactOpen(false)}>Cancel</ProgramHeadButton>
          <ProgramHeadButton variant="primary" onClick={() => setImpactOpen(false)}>Generate Report</ProgramHeadButton>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
