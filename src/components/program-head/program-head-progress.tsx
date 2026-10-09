'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import {
  PROGRAM_HEAD_PROJECTS,
  getProgramHeadAnalytics,
  getProgramHeadDueLabel,
  getProgramHeadPriority,
  getProgramHeadRecommendedAction
} from '@/components/program-head/program-head-data';
import {
  PH_CARD_CLASS,
  PH_PALETTE as P,
  PH_ROW_HEIGHT_CLASS,
  PH_TD_CLASS,
  PH_TH_CLASS,
  ProgramHeadAvatar,
  ProgramHeadDetailGrid,
  ProgramHeadDrawer,
  ProgramHeadFillerRows,
  ProgramHeadFilterSelect,
  ProgramHeadModal,
  ProgramHeadPageHeader,
  ProgramHeadPaginationBar,
  ProgramHeadPill,
  ProgramHeadPrimaryAction,
  ProgramHeadStatCard,
  ProgramHeadTabs,
  phTint,
  useProgramHeadPagination
} from '@/components/program-head/program-head-primitives';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';

const RISK_TABS = ['All', 'Behind Schedule', 'At Risk', 'On Track'] as const;
const RISK_SORT: Record<string, number> = { 'Behind Schedule': 0, 'At Risk': 1, 'On Track': 2 };

/* Same mapping as the dashboard's progress chart: gold draws the eye to what's behind. */
const RISK_COLORS: Record<string, string> = {
  'Behind Schedule': P.gold,
  'At Risk': P.light,
  'On Track': P.navy
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: P.gold,
  High: P.light,
  Ready: P.navy,
  Monitor: P.neutral
};

function Bar({ pct, color, height = 'h-2' }: { pct: number; color: string; height?: string }) {
  return (
    <div className={`flex-1 ${height} rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] overflow-hidden ph-anim-meter`}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }}></div>
    </div>
  );
}

export function ProgramHeadProgress() {
  const [riskReportOpen, setRiskReportOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<(typeof RISK_TABS)[number]>('All');
  const [adviserFilter, setAdviserFilter] = useState('All Advisers');
  const [selectedCode, setSelectedCode] = useState('');

  const departmentProjects = useMemo(() => PROGRAM_HEAD_PROJECTS.filter((project) => project.department === 'IT'), []);

  const adviserOptions = useMemo(() => {
    const advisers = departmentProjects.map((project) => project.adviser);
    return Array.from(new Set(advisers)).sort();
  }, [departmentProjects]);

  const scopedProjects = useMemo(() => {
    if (adviserFilter === 'All Advisers') return departmentProjects;
    return departmentProjects.filter((project) => project.adviser === adviserFilter);
  }, [departmentProjects, adviserFilter]);

  const progressRows = useMemo(() => {
    const rows = riskFilter === 'All' ? scopedProjects : scopedProjects.filter((project) => project.riskLevel === riskFilter);
    // Most urgent first, so the table doubles as the intervention queue.
    return [...rows].sort((a, b) => RISK_SORT[a.riskLevel] - RISK_SORT[b.riskLevel] || a.progress - b.progress);
  }, [riskFilter, scopedProjects]);

  const pagination = useProgramHeadPagination(progressRows, `${riskFilter}|${adviserFilter}`);

  const analytics = useMemo(() => getProgramHeadAnalytics(scopedProjects), [scopedProjects]);
  const riskCounts = useMemo(() => {
    const counts: Partial<Record<(typeof RISK_TABS)[number], number>> = { All: scopedProjects.length };
    analytics.riskDistribution.forEach((risk) => {
      counts[risk.name as (typeof RISK_TABS)[number]] = risk.value;
    });
    return counts;
  }, [analytics, scopedProjects.length]);

  const selectedProject = useMemo(() => PROGRAM_HEAD_PROJECTS.find((project) => project.code === selectedCode), [selectedCode]);

  return (
    <ProgramHeadShell activeNav="progress" title="Progress Monitoring" description="Track project stages and identify at-risk projects" notificationCount={3}>
      <div className="space-y-5 ph-palette">
        <ProgramHeadPageHeader
          description="Project stage progress and risk across the department. The table is ordered by urgency."
          actions={
            <>
              <ProgramHeadFilterSelect label="Adviser" value={adviserFilter} onChange={setAdviserFilter} options={['All Advisers', ...adviserOptions]} />
              <ProgramHeadPrimaryAction icon="fa-file-pdf" onClick={() => setRiskReportOpen(true)}>Risk Report</ProgramHeadPrimaryAction>
            </>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ph-stagger">
          <ProgramHeadStatCard
            title="Projects in Scope"
            value={analytics.totalProjects}
            note={`${analytics.studentCount} students`}
            icon="fas fa-layer-group"
            iconTone="bg-[color-mix(in_srgb,var(--ph-c-navy)_12%,transparent)] text-[var(--ph-brand-text)]"
          />
          <ProgramHeadStatCard
            title="Portfolio Health"
            value={`${analytics.healthScore}%`}
            note={`${analytics.averageProgress}% average progress`}
            icon="fas fa-tachometer-alt"
            iconTone="bg-[color-mix(in_srgb,var(--ph-c-light)_16%,transparent)] text-[var(--ph-c-light)]"
          >
            <div className="flex"><Bar pct={analytics.healthScore} color={P.light} height="h-1.5" /></div>
          </ProgramHeadStatCard>
          <ProgramHeadStatCard
            title="Needs Action"
            value={analytics.riskExposureCount}
            note={`${analytics.riskExposureRate}% of scope · ${analytics.behindScheduleProjects} behind schedule`}
            icon="fas fa-exclamation-circle"
            iconTone="bg-[color-mix(in_srgb,var(--ph-c-gold)_18%,transparent)] text-[var(--ph-c-gold)]"
          />
        </div>

        {/* Milestone strip */}
        <div className={`${PH_CARD_CLASS} px-5 py-4`}>
          <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Project Stage Achievement</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4">
            {analytics.milestoneTracking.map((milestone) => (
              <div key={milestone.label}>
                <div className="flex justify-between items-baseline gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-[var(--muted)] truncate" title={milestone.label}>{milestone.label}</span>
                  <span className="text-sm font-bold text-[var(--text)] tabular-nums whitespace-nowrap">{milestone.done}/{milestone.total}</span>
                </div>
                <div className="flex">
                  <Bar pct={milestone.pct} color={milestone.pct >= 80 ? P.navy : milestone.pct >= 50 ? P.light : P.gold} height="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress table */}
        <div className={PH_CARD_CLASS}>
          <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <ProgramHeadTabs tabs={RISK_TABS} value={riskFilter} onChange={setRiskFilter} counts={riskCounts} />
            <span className="text-xs text-[var(--muted)]"><strong className="text-[var(--text)]">{progressRows.length}</strong> projects · most urgent first</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead className="bg-[var(--surface-alt)]">
                <tr>
                  <th className={PH_TH_CLASS}>Project</th>
                  <th className={PH_TH_CLASS}>Adviser</th>
                  <th className={`${PH_TH_CLASS} w-56`}>Progress</th>
                  <th className={PH_TH_CLASS}>Risk</th>
                  <th className={PH_TH_CLASS}>Next Action</th>
                  <th className={`${PH_TH_CLASS} w-10`}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody key={pagination.bodyKey} {...pagination.bodyProps} className={`divide-y divide-[var(--border)] ${pagination.bodyProps.className}`}>
                {progressRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <p className="font-bold text-[var(--text)]">No projects found</p>
                      <p className="text-[var(--muted)] text-sm mt-1">Try a different risk level or adviser.</p>
                    </td>
                  </tr>
                ) : pagination.pageItems.map((project) => {
                  const riskColor = RISK_COLORS[project.riskLevel] ?? P.neutral;
                  const priority = getProgramHeadPriority(project);
                  const action = getProgramHeadRecommendedAction(project);
                  return (
                    <tr key={project.code} className={`group ${PH_ROW_HEIGHT_CLASS} hover:bg-[var(--surface-alt)] cursor-pointer transition-colors`} onClick={() => setSelectedCode(project.code)}>
                      <td className={`${PH_TD_CLASS} max-w-[320px]`}>
                        <p className="text-sm font-bold text-[var(--text)] truncate" title={project.title}>{project.title}</p>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                          <span className="font-mono px-1.5 py-px rounded bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)]">{project.code}</span>
                          <span className="truncate">{project.currentStage}</span>
                        </span>
                      </td>
                      <td className={PH_TD_CLASS}>
                        <div className="flex items-center gap-2.5">
                          <ProgramHeadAvatar name={project.adviser} />
                          <span className="text-sm font-medium text-[var(--text)] whitespace-nowrap">{project.adviser}</span>
                        </div>
                      </td>
                      <td className={PH_TD_CLASS}>
                        <div className="flex items-center gap-2.5">
                          <Bar pct={project.progress} color={riskColor} />
                          <span className="w-10 text-right text-xs font-bold text-[var(--text)] tabular-nums">{project.progress}%</span>
                        </div>
                        <span className="text-[11px] text-[var(--muted)] block mt-1">Updated {project.lastUpdate}</span>
                      </td>
                      <td className={PH_TD_CLASS}>
                        <ProgramHeadPill color={riskColor}>{project.riskLevel}</ProgramHeadPill>
                      </td>
                      <td className={`${PH_TD_CLASS} max-w-[300px]`}>
                        <span
                          className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: phTint(PRIORITY_COLORS[priority] ?? P.neutral, 16), color: `color-mix(in srgb, ${PRIORITY_COLORS[priority] ?? P.neutral} 70%, var(--text))` }}
                        >
                          {priority}
                        </span>
                        <p className="mt-0.5 text-xs text-[var(--muted)] truncate" title={action}>{action}</p>
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
      </div>

      <ProgramHeadDrawer maxWidth={560} open={Boolean(selectedProject)} title="Project Progress Details" onClose={() => setSelectedCode('')}>
        {selectedProject ? (
          <div className="space-y-5">
            <div>
              <h3 className="m-0 text-lg font-bold text-[var(--text)] leading-snug">{selectedProject.title}</h3>
              <p className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-2">
                <span className="font-mono">{selectedProject.code}</span>
                <ProgramHeadPill color={RISK_COLORS[selectedProject.riskLevel] ?? P.neutral}>{selectedProject.riskLevel}</ProgramHeadPill>
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">{selectedProject.currentStage}</span>
                <span className="font-extrabold tabular-nums" style={{ color: P.brandText }}>{selectedProject.progress}%</span>
              </div>
              <div className="flex"><Bar pct={selectedProject.progress} color={RISK_COLORS[selectedProject.riskLevel] ?? P.neutral} /></div>
            </div>

            <div className="rounded-xl p-4 ring-1 ring-inset" style={{ backgroundColor: phTint(P.navy, 6), ['--tw-ring-color' as string]: phTint(P.navy, 18) } as CSSProperties}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: P.brandText }}>Recommended Action · {getProgramHeadPriority(selectedProject)}</span>
                <span className="text-xs font-bold text-[var(--muted)]"><i className="fas fa-clock mr-1 text-[10px]"></i>{getProgramHeadDueLabel(selectedProject)}</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text)] leading-relaxed">{getProgramHeadRecommendedAction(selectedProject)}</p>
            </div>

            <ProgramHeadDetailGrid
              items={[
                ['Adviser', selectedProject.adviser],
                ['Students', selectedProject.students.length],
                ['Transfer', selectedProject.transferStatus],
                ['Evidence files', selectedProject.evidenceCount],
                ['Last update', selectedProject.lastUpdate],
                ['Department', selectedProject.department]
              ]}
            />

            <div className="flex gap-3 pt-1">
              <button type="button" className="flex-1 h-10 rounded-xl ring-1 ring-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors" onClick={() => setSelectedCode('')}>Close</button>
              <button type="button" className="flex-1 h-10 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: P.navy }}>
                <i className="fas fa-file-pdf"></i> Generate Report
              </button>
            </div>
          </div>
        ) : null}
      </ProgramHeadDrawer>

      <ProgramHeadModal open={riskReportOpen} title="Generate Risk Assessment Report" onClose={() => setRiskReportOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--text)] mb-1.5" htmlFor="ph-risk-level">Risk Level</label>
            <select className="w-full h-11 px-4 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none" id="ph-risk-level" defaultValue={riskFilter === 'All' ? 'All Risk Levels' : riskFilter}>
              <option>All Risk Levels</option><option>On Track</option><option>At Risk</option><option>Behind Schedule</option>
            </select>
          </div>
          <div>
            <span className="block text-sm font-bold text-[var(--text)] mb-2">Include</span>
            <div className="space-y-2">
              {['Intervention recommendations', 'Adviser load summary', 'Project stage tracking table'].map((item) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input defaultChecked type="checkbox" className="w-4 h-4 rounded border-slate-300" style={{ accentColor: 'var(--color-primary)' }} />
                  <span className="text-sm text-[var(--text)]">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex gap-3 justify-end">
          <button type="button" onClick={() => setRiskReportOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors">Cancel</button>
          <button type="button" onClick={() => setRiskReportOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-white shadow-md hover:brightness-110 transition-all" style={{ backgroundColor: 'var(--color-primary, #003A8F)' }}>Generate Report</button>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
