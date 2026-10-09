'use client';

import { useMemo, useState } from 'react';
import { PROGRAM_HEAD_PROJECTS, getStatusTone } from '@/components/program-head/program-head-data';
import {
  PH_CARD_CLASS,
  PH_PALETTE as P,
  PH_ROW_HEIGHT_CLASS,
  PH_TD_CLASS,
  PH_TH_CLASS,
  ProgramHeadAvatar,
  ProgramHeadButton,
  ProgramHeadDetailGrid,
  ProgramHeadDrawer,
  ProgramHeadFillerRows,
  ProgramHeadFilterSelect,
  ProgramHeadMeter,
  ProgramHeadModal,
  ProgramHeadPageHeader,
  ProgramHeadPaginationBar,
  ProgramHeadPill as Pill,
  ProgramHeadPrimaryAction,
  ProgramHeadSearchInput,
  ProgramHeadStatCard,
  ProgramHeadStatusBadge,
  ProgramHeadTabs,
  getProgramHeadInitials,
  useProgramHeadPagination
} from '@/components/program-head/program-head-primitives';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';

const STATUS_OPTIONS = ['All Statuses', 'Active', 'Completed', 'Pending', 'On Hold'];

const STATUS_COLORS: Record<string, string> = {
  Completed: P.navy,
  Active: P.light,
  Pending: P.gold,
  'On Hold': P.neutral
};

const TRANSFER_META: Record<string, { color: string; icon: string; label: string }> = {
  'Ready for Transfer': { color: P.gold, icon: 'fa-rocket', label: 'Ready' },
  Proposed: { color: P.light, icon: 'fa-paper-plane', label: 'Proposed' },
  Deployed: { color: P.navy, icon: 'fa-box-open', label: 'Deployed' },
  'In Use': { color: P.navy, icon: 'fa-circle-check', label: 'In use' }
};

export function ProgramHeadProjects() {
  const [selectedCode, setSelectedCode] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [adviserFilter, setAdviserFilter] = useState('All Advisers');
  const [searchQuery, setSearchQuery] = useState('');

  const advisers = useMemo(() => {
    const all = PROGRAM_HEAD_PROJECTS.map(p => p.adviser);
    return Array.from(new Set(all)).sort();
  }, []);

  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = { All: PROGRAM_HEAD_PROJECTS.length };
    PROGRAM_HEAD_PROJECTS.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const names = Object.keys(counts).filter(name => name !== 'All').sort((a, b) => counts[b] - counts[a]);
    return { tabs: ['All', ...names], counts };
  }, []);

  const filteredProjects = useMemo(() => {
    let projects = [...PROGRAM_HEAD_PROJECTS];
    if (categoryFilter !== 'All') projects = projects.filter(p => p.category === categoryFilter);
    if (statusFilter !== 'All Statuses') projects = projects.filter(p => p.status === statusFilter);
    if (adviserFilter !== 'All Advisers') projects = projects.filter(p => p.adviser === adviserFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      projects = projects.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.adviser.toLowerCase().includes(q) ||
        p.students.some(s => s.toLowerCase().includes(q))
      );
    }
    return projects;
  }, [categoryFilter, statusFilter, adviserFilter, searchQuery]);

  const selectedProject = useMemo(
    () => PROGRAM_HEAD_PROJECTS.find((project) => project.code === selectedCode),
    [selectedCode]
  );

  const pagination = useProgramHeadPagination(filteredProjects, `${categoryFilter}|${statusFilter}|${adviserFilter}|${searchQuery}`);

  const total = filteredProjects.length;
  const activeCount = filteredProjects.filter(p => p.status === 'Active').length;
  const completedCount = filteredProjects.filter(p => p.status === 'Completed').length;
  const transferReady = filteredProjects.filter(p => p.transferStatus === 'Ready for Transfer').length;
  const pctOf = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  const filtersActive = categoryFilter !== 'All' || statusFilter !== 'All Statuses' || adviserFilter !== 'All Advisers' || searchQuery.trim() !== '';
  const resetFilters = () => {
    setCategoryFilter('All');
    setStatusFilter('All Statuses');
    setAdviserFilter('All Advisers');
    setSearchQuery('');
  };

  return (
    <ProgramHeadShell
      activeNav="projects"
      title="Project Overview"
      description="IT Department - complete project portfolio"
      notificationCount={3}
    >
      <div className="space-y-5">
        <ProgramHeadPageHeader
          description="Complete project portfolio. Select a row for team, partner and progress details."
          actions={<ProgramHeadPrimaryAction icon="fa-download" onClick={() => setExportOpen(true)}>Export Report</ProgramHeadPrimaryAction>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <ProgramHeadStatCard title="Projects" value={total} note={filtersActive ? 'Matching current filters' : 'All projects'} icon="fas fa-folder-open" />
          <ProgramHeadStatCard title="Active" value={activeCount} note={`${pctOf(activeCount)}% of selection`} icon="fas fa-bolt" iconTone="bg-sky-500/10 text-sky-600" />
          <ProgramHeadStatCard title="Completed" value={completedCount} note={`${pctOf(completedCount)}% completion rate`} icon="fas fa-check-double" iconTone="bg-emerald-500/10 text-emerald-600">
            <ProgramHeadMeter pct={pctOf(completedCount)} tone="bg-emerald-500" />
          </ProgramHeadStatCard>
          <ProgramHeadStatCard title="Transfer Ready" value={transferReady} note="Available for adoption" icon="fas fa-rocket" iconTone="bg-purple-500/10 text-purple-600" />
        </div>

        <div className={`${PH_CARD_CLASS} ph-palette`}>
          <div className="px-5 py-3 border-b border-[var(--border)] space-y-3">
            <ProgramHeadTabs tabs={categoryTabs.tabs} value={categoryFilter} onChange={setCategoryFilter} counts={categoryTabs.counts} />
            <div className="flex flex-wrap items-center gap-2">
              <ProgramHeadSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search title, code, adviser, student..." />
              <ProgramHeadFilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
              <ProgramHeadFilterSelect label="Adviser" value={adviserFilter} onChange={setAdviserFilter} options={['All Advisers', ...advisers]} />
              {filtersActive && (
                <button type="button" onClick={resetFilters} className="h-9 px-3 text-xs font-bold text-[var(--muted)] hover:text-[var(--ph-brand-text)] transition-colors">
                  <i className="fas fa-undo mr-1.5 text-[10px]"></i>Reset
                </button>
              )}
              <span className="ml-auto text-xs text-[var(--muted)]"><strong className="text-[var(--text)]">{total}</strong> projects</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[var(--surface-alt)]">
                <tr>
                  <th className={PH_TH_CLASS}>Project</th>
                  <th className={PH_TH_CLASS}>Adviser</th>
                  <th className={PH_TH_CLASS}>Status</th>
                  <th className={`${PH_TH_CLASS} w-56`}>Progress</th>
                  <th className={PH_TH_CLASS}>Started</th>
                  <th className={PH_TH_CLASS}>Transfer</th>
                  <th className={`${PH_TH_CLASS} w-10`}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody key={pagination.bodyKey} {...pagination.bodyProps} className={`divide-y divide-[var(--border)] ${pagination.bodyProps.className}`}>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <p className="font-bold text-[var(--text)]">No projects found</p>
                      <p className="text-[var(--muted)] text-sm mt-1">Try adjusting your filters or search query.</p>
                      <button type="button" onClick={resetFilters} className="mt-3 text-sm font-bold hover:underline" style={{ color: P.brandText }}>Clear all filters</button>
                    </td>
                  </tr>
                ) : (
                  pagination.pageItems.map((project) => {
                    const transfer = TRANSFER_META[project.transferStatus];
                    return (
                      <tr key={project.code} className={`group ${PH_ROW_HEIGHT_CLASS} hover:bg-[var(--surface-alt)] cursor-pointer transition-colors`} onClick={() => setSelectedCode(project.code)}>
                        <td className={`${PH_TD_CLASS} max-w-[360px]`}>
                          <p className="text-sm font-bold text-[var(--text)] truncate" title={project.title}>{project.title}</p>
                          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                            <span className="font-mono px-1.5 py-px rounded bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)]">{project.code}</span>
                            {project.category}
                          </span>
                        </td>
                        <td className={PH_TD_CLASS}>
                          <div className="flex items-center gap-2.5">
                            <ProgramHeadAvatar name={project.adviser} />
                            <span className="text-sm font-medium text-[var(--text)] whitespace-nowrap">{project.adviser}</span>
                          </div>
                        </td>
                        <td className={PH_TD_CLASS}>
                          <Pill color={STATUS_COLORS[project.status] ?? P.neutral}>{project.status}</Pill>
                        </td>
                        <td className={PH_TD_CLASS}>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] overflow-hidden ph-anim-meter">
                              <div className="h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: project.progress === 100 ? P.navy : P.light }}></div>
                            </div>
                            <span className="w-10 text-right text-xs font-bold text-[var(--text)] tabular-nums">{project.progress}%</span>
                          </div>
                          <span className="text-[11px] text-[var(--muted)] block mt-1 truncate max-w-[200px]" title={project.currentStage}>{project.currentStage}</span>
                        </td>
                        <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)] whitespace-nowrap`}>{project.startLabel}</td>
                        <td className={PH_TD_CLASS}>
                          {transfer ? (
                            <Pill color={transfer.color} icon={transfer.icon}>{transfer.label}</Pill>
                          ) : (
                            <span className="text-xs font-semibold text-[var(--muted)]">Not yet ready</span>
                          )}
                        </td>
                        <td className={`${PH_TD_CLASS} text-right`}>
                          <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--surface)] group-hover:ring-1 group-hover:ring-[var(--border)] transition-all">
                            <i className="fas fa-chevron-right text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Keeps every page the same height so the pagination bar doesn't jump. */}
                <ProgramHeadFillerRows count={pagination.fillerCount} colSpan={7} />
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
      </div>

      <ProgramHeadDrawer maxWidth={560} open={Boolean(selectedProject)} title="Project Details" onClose={() => setSelectedCode('')}>
        {selectedProject ? (
          <div className="space-y-5">
            <div>
              <h3 className="m-0 text-lg font-bold text-[var(--text)] leading-snug">{selectedProject.title}</h3>
              <p className="text-xs text-[var(--muted)] mt-1"><span className="font-mono">{selectedProject.code}</span> · {selectedProject.category}</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">{selectedProject.currentStage}</span>
                <span className="font-extrabold text-[#0F3DDE] tabular-nums">{selectedProject.progress}%</span>
              </div>
              <ProgramHeadMeter pct={selectedProject.progress} />
            </div>

            <ProgramHeadDetailGrid
              items={[
                ['Adviser', selectedProject.adviser],
                ['Status', <ProgramHeadStatusBadge key="status" tone={getStatusTone(selectedProject.status)}>{selectedProject.status}</ProgramHeadStatusBadge>],
                ['Partner', <>{selectedProject.partner}<span className="block text-xs font-medium text-[var(--muted)]">{selectedProject.partnerLocation}</span></>],
                ['Transfer', selectedProject.transferStatus],
                ['Started', selectedProject.startLabel],
                ['Last update', selectedProject.lastUpdate]
              ]}
            />

            <div>
              <span className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Team ({selectedProject.students.length})</span>
              <ul className="divide-y divide-[var(--border)] rounded-xl ring-1 ring-[var(--border)]">
                {selectedProject.students.map((student) => (
                  <li key={student} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-7 h-7 rounded-full bg-[#0F3DDE]/10 text-[#0F3DDE] flex items-center justify-center text-[10px] font-bold">
                      {getProgramHeadInitials(student)}
                    </span>
                    <span className="text-sm font-medium text-[var(--text)]">{student}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" className="flex-1 h-10 rounded-xl ring-1 ring-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors" onClick={() => setSelectedCode('')}>
                Close
              </button>
              <button type="button" className="flex-1 h-10 bg-[#0F3DDE] text-white rounded-xl text-sm font-bold hover:bg-[#0c31b3] transition-colors flex items-center justify-center gap-2">
                <i className="fas fa-file-pdf"></i> Generate Report
              </button>
            </div>
          </div>
        ) : null}
      </ProgramHeadDrawer>

      <ProgramHeadModal open={exportOpen} title="Export Project Report" onClose={() => setExportOpen(false)}>
        <div className="ph-form-field">
          <label htmlFor="ph-project-report-type">Report Type</label>
          <select className="ph-select" id="ph-project-report-type" defaultValue="Complete Project Inventory">
            <option>Complete Project Inventory</option>
            <option>Active Projects Summary</option>
            <option>Completed Projects Report</option>
            <option>Tech Transfer Ready Projects</option>
          </select>
        </div>
        <div className="ph-form-field">
          <label htmlFor="ph-project-report-format">Format</label>
          <select className="ph-select" id="ph-project-report-format" defaultValue="PDF Document">
            <option>PDF Document</option>
            <option>Excel Spreadsheet</option>
            <option>CSV Data</option>
          </select>
        </div>
        <div className="ph-form-field">
          <label>Include</label>
          <div className="ph-checkbox-list">
            <label><input defaultChecked type="checkbox" /> Project details</label>
            <label><input defaultChecked type="checkbox" /> Adviser information</label>
            <label><input type="checkbox" /> Student lists</label>
            <label><input type="checkbox" /> Progress data</label>
          </div>
        </div>
        <div className="ph-modal-actions">
          <ProgramHeadButton onClick={() => setExportOpen(false)}>Cancel</ProgramHeadButton>
          <ProgramHeadButton variant="primary" onClick={() => setExportOpen(false)}>
            Export
          </ProgramHeadButton>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
