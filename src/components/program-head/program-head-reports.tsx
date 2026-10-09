'use client';

import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartResponsiveContainer } from '@/components/shared/chart-responsive-container';
import {
  PH_PALETTE as P,
  ProgramHeadAnimatedNumber as AnimatedNumber,
  ProgramHeadButton,
  ProgramHeadKpiCard,
  ProgramHeadModal,
  ProgramHeadPageHeader,
  ProgramHeadPanel,
  ProgramHeadPill,
  ProgramHeadPrimaryAction,
  phTint
} from '@/components/program-head/program-head-primitives';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';

const DEPT_DATA = [
  { name: 'IT', label: 'Information Technology', pct: 86, projects: 42, transfer: 8, trend: 4.2 },
  { name: 'TCM', label: 'Technology Communication Management', pct: 82, projects: 19, transfer: 3, trend: 2.8 },
  { name: 'NAME', label: 'Naval Architecture and Marine Engineering', pct: 79, projects: 32, transfer: 5, trend: 2.1 },
  { name: 'MET', label: 'Manufacturing Engineering Technology', pct: 78, projects: 28, transfer: 4, trend: 1.6 },
  { name: 'ESM', label: 'Energy Systems and Management', pct: 74, projects: 35, transfer: 2, trend: 0.9 }
];

const PERFORMANCE_TARGET = 85;
const RANKED_DEPT_DATA = [...DEPT_DATA].sort((a, b) => b.pct - a.pct);
const AVERAGE_DEPT_PERFORMANCE = Math.round(DEPT_DATA.reduce((sum, dept) => sum + dept.pct, 0) / DEPT_DATA.length);
const DEPARTMENTS_AT_TARGET = DEPT_DATA.filter((dept) => dept.pct >= PERFORMANCE_TARGET).length;

const YEARS = ['2021-22', '2022-23', '2023-24'];
const TRENDS = [
  { metric: 'Active Projects', icon: 'fa-bolt', values: [112, 134, 156] },
  { metric: 'Completed Projects', icon: 'fa-flag-checkered', values: [78, 95, 124] },
  { metric: 'Technology Transfers', icon: 'fa-rocket', values: [3, 5, 8] },
  { metric: 'Faculty Publications', icon: 'fa-book-open', values: [12, 18, 24] }
];

const INSIGHTS = [
  { text: 'Technology transfer increased by 60% this year.', icon: 'fa-rocket' },
  { text: 'Student satisfaction data is pending.', icon: 'fa-star' }
];

const RECOMMENDATIONS = [
  { text: 'Increase industry partnerships for the ESM department.', icon: 'fa-handshake' },
  { text: 'Develop a mentorship program for at-risk projects.', icon: 'fa-user-shield' },
  { text: 'Expand technology transfer initiatives across programs.', icon: 'fa-exchange-alt' },
  { text: 'Enhance faculty development in emerging technologies.', icon: 'fa-microchip' }
];

const AXIS_TICK = { fontSize: 11, fontWeight: 600, fill: 'var(--ph-c-tick, #4B5563)' };

/* Navy = at target, light blue = within 5 points, gold = needs support (look here). */
function getTargetStatus(pct: number) {
  const gap = pct - PERFORMANCE_TARGET;
  if (gap >= 0) return { label: 'On target', color: P.navy, icon: 'fa-circle-check' };
  if (gap >= -5) return { label: 'Near target', color: P.light, icon: 'fa-arrow-trend-up' };
  return { label: 'Needs support', color: P.gold, icon: 'fa-triangle-exclamation' };
}

const pctChange = (from: number, to: number) => (from ? Math.round(((to - from) / from) * 1000) / 10 : 0);

function DeptTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: (typeof DEPT_DATA)[number] }> }) {
  const dept = payload?.[0]?.payload;
  if (!active || !dept) return null;
  const status = getTargetStatus(dept.pct);
  return (
    <div className="rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)] shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-[var(--text)]">{dept.label}</p>
      <p className="flex items-center gap-2 mt-1 text-[var(--muted)]">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></span>
        Completion <strong className="ml-auto pl-3 text-[var(--text)] tabular-nums">{dept.pct}%</strong>
      </p>
      <p className="text-[var(--muted)] mt-0.5">{dept.pct >= PERFORMANCE_TARGET ? '+' : ''}{dept.pct - PERFORMANCE_TARGET} pts vs target</p>
    </div>
  );
}

/** Year-over-year tile: latest value, change, and a small area chart of the history. */
function TrendTile({ metric, icon, values }: (typeof TRENDS)[number]) {
  const gradientId = `ph-trend-${useId().replace(/:/g, '')}`;
  const latest = values[values.length - 1];
  const change = pctChange(values[values.length - 2], latest);
  const data = values.map((value, index) => ({ year: YEARS[index], value }));
  return (
    <div className="rounded-xl ring-1 ring-inset ring-[var(--border)] p-4 hover:shadow-sm hover:-translate-y-px transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] min-w-0">
          <i className={`fas ${icon} text-[11px]`} style={{ color: P.brandText }}></i>
          <span className="truncate">{metric}</span>
        </span>
        <span
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ backgroundColor: phTint(P.navy, 10), color: P.brandText }}
        >
          <i className={`fas ${change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-[9px]`}></i>{Math.abs(change)}%
        </span>
      </div>
      <p className="mt-1 text-2xl font-extrabold text-[var(--text)] tabular-nums leading-none"><AnimatedNumber value={latest} /></p>
      <div className="h-14 -mx-1 mt-2">
        <ChartResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--ph-c-light, #58A2F5)', stopOpacity: 0.45 }} />
                <stop offset="100%" style={{ stopColor: 'var(--ph-c-light, #58A2F5)', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <RechartsTooltip
              cursor={false}
              content={({ active, payload }) => (active && payload?.[0] ? (
                <div className="rounded-lg bg-[var(--surface)] ring-1 ring-[var(--border)] shadow px-2 py-1 text-[11px]">
                  <span className="text-[var(--muted)]">{String(payload[0].payload?.year)}</span>{' '}
                  <strong className="text-[var(--text)] tabular-nums">{String(payload[0].value)}</strong>
                </div>
              ) : null)}
            />
            <Area type="monotone" dataKey="value" stroke={P.navy} strokeWidth={2} fill={`url(#${gradientId})`} dot={{ r: 2.5, fill: P.navy, strokeWidth: 0 }} animationDuration={900} />
          </AreaChart>
        </ChartResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-[var(--muted)] flex justify-between tabular-nums">
        <span>{YEARS[0]}: {values[0]}</span><span>{YEARS[YEARS.length - 1]}</span>
      </p>
    </div>
  );
}

export function ProgramHeadReports() {
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(RANKED_DEPT_DATA[0].name);

  const selected = useMemo(() => DEPT_DATA.find((dept) => dept.name === selectedDept) ?? RANKED_DEPT_DATA[0], [selectedDept]);
  const selectedRank = RANKED_DEPT_DATA.findIndex((dept) => dept.name === selected.name) + 1;
  const selectedStatus = getTargetStatus(selected.pct);
  const gap = selected.pct - PERFORMANCE_TARGET;

  return (
    <ProgramHeadShell activeNav="reports" title="Reports & Analytics" description="Comprehensive program performance analysis" notificationCount={2}>
      <div className="space-y-5">
        <ProgramHeadPageHeader
          meta="All departments · AY 2025-2026"
          description="Program performance across departments, year over year."
          actions={<ProgramHeadPrimaryAction icon="fa-chart-line" onClick={() => setReportOpen(true)}>Generate Report</ProgramHeadPrimaryAction>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 ph-stagger">
          <ProgramHeadKpiCard title="Program Completion" value={86} suffix="%" pct={86} note="12% up from last year" icon="fa-chart-pie" color={P.navy} />
          <ProgramHeadKpiCard title="Student Retention" value={94} suffix="%" pct={94} note="Above university average" icon="fa-user-graduate" color={P.light} />
          <ProgramHeadKpiCard title="Industry Placement" value={78} suffix="%" pct={78} note="Graduates employed within six months" icon="fa-briefcase" color={P.gold} />
          <ProgramHeadKpiCard title="Research Output" value={24} note="Publications this year" icon="fa-book-open" color={P.navy} />
        </div>

        {/* Department performance: chart + selected department */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 ph-stagger">
          <ProgramHeadPanel
            title="Department Performance"
            action={
              <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                <span>Average <strong className="text-[var(--text)] tabular-nums">{AVERAGE_DEPT_PERFORMANCE}%</strong></span>
                <span className="h-3 w-px bg-[var(--border)]"></span>
                <span><strong className="text-[var(--text)] tabular-nums">{DEPARTMENTS_AT_TARGET}/{DEPT_DATA.length}</strong> at target</span>
              </div>
            }
            bodyClassName="px-3 pt-4 pb-3"
          >
            <div className="h-64">
              <ChartResponsiveContainer width="100%" height="100%">
                <BarChart data={RANKED_DEPT_DATA} margin={{ top: 12, right: 12, bottom: 0, left: -12 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--ph-c-grid, #E5E7EB)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <RechartsTooltip cursor={{ fill: 'var(--surface-alt)' }} content={<DeptTooltip />} />
                  <ReferenceLine
                    y={PERFORMANCE_TARGET}
                    stroke={P.gold}
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{ value: `Target ${PERFORMANCE_TARGET}%`, position: 'insideTopRight', fill: 'var(--ph-c-tick, #4B5563)', fontSize: 11, fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="pct"
                    radius={[8, 8, 0, 0]}
                    animationDuration={900}
                    cursor="pointer"
                    onClick={(entry: { name?: string }) => entry?.name && setSelectedDept(entry.name)}
                  >
                    {RANKED_DEPT_DATA.map((dept) => (
                      <Cell
                        key={dept.name}
                        fill={getTargetStatus(dept.pct).color}
                        fillOpacity={dept.name === selected.name ? 1 : 0.45}
                        style={{ transition: 'fill-opacity 200ms ease' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartResponsiveContainer>
            </div>
            <div className="mt-2 px-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                {[{ label: 'On target', color: P.navy }, { label: 'Near target', color: P.light }, { label: 'Needs support', color: P.gold }].map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>{item.label}</span>
                ))}
              </div>
              <div className="flex gap-1" role="tablist" aria-label="Department">
                {RANKED_DEPT_DATA.map((dept) => {
                  const active = dept.name === selected.name;
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedDept(dept.name)}
                      className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors ${active ? 'text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'}`}
                      style={active ? { backgroundColor: P.navy } : undefined}
                    >
                      {dept.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </ProgramHeadPanel>

          {/* Selected department detail — re-animates on every selection */}
          <ProgramHeadPanel
            title="Department Detail"
            action={<ProgramHeadPill color={selectedStatus.color} icon={selectedStatus.icon}>{selectedStatus.label}</ProgramHeadPill>}
            bodyClassName="p-5"
          >
            <div key={selected.name} className="ph-anim-fade-in space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-sm font-extrabold"
                  style={{ backgroundColor: phTint(P.navy, 10), color: P.brandText }}
                >
                  #{selectedRank}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[var(--text)] leading-tight">{selected.name}</p>
                  <p className="text-xs text-[var(--muted)]">{selected.label}</p>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--muted)]">Completion</span>
                  <span className="text-2xl font-extrabold text-[var(--text)] tabular-nums"><AnimatedNumber value={selected.pct} />%</span>
                </div>
                <div className="relative">
                  <div className="h-2.5 w-full rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] overflow-hidden ph-anim-meter">
                    <div className="h-full rounded-full" style={{ width: `${selected.pct}%`, backgroundColor: selectedStatus.color }}></div>
                  </div>
                  <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full" style={{ left: `${PERFORMANCE_TARGET}%`, backgroundColor: P.gold }} title={`Target ${PERFORMANCE_TARGET}%`}></span>
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                  <strong className="text-[var(--text)]">{gap >= 0 ? '+' : ''}{gap} pts</strong> vs the {PERFORMANCE_TARGET}% target
                </p>
              </div>

              <dl className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Projects', value: selected.projects },
                  { label: 'Transfers', value: selected.transfer },
                  { label: 'Annual change', value: selected.trend, prefix: '+', suffix: '%' }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] px-3 py-2.5 text-center">
                    <dd className="text-lg font-extrabold text-[var(--text)] tabular-nums leading-none">
                      {stat.prefix}{Number.isInteger(stat.value) ? <AnimatedNumber value={stat.value} /> : stat.value}{stat.suffix}
                    </dd>
                    <dt className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </ProgramHeadPanel>
        </div>

        {/* Year over year · insights */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 items-start ph-stagger">
          <ProgramHeadPanel
            title="Year over Year"
            action={<span className="text-xs text-[var(--muted)]">{YEARS[0]} → {YEARS[YEARS.length - 1]}</span>}
            bodyClassName="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {TRENDS.map((trend) => <TrendTile key={trend.metric} {...trend} />)}
          </ProgramHeadPanel>

          <ProgramHeadPanel title="Insights & Recommendations" bodyClassName="py-2">
            <p className="px-5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Insights</p>
            <ul className="ph-stagger">
              {INSIGHTS.map((item) => (
                <li key={item.text} className="px-5 py-2 flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[11px]" style={{ backgroundColor: phTint(P.gold, 16), color: `color-mix(in srgb, ${P.gold} 70%, var(--text))` }}>
                    <i className={`fas ${item.icon}`}></i>
                  </span>
                  <span className="text-sm text-[var(--text)]">{item.text}</span>
                </li>
              ))}
            </ul>
            <p className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--border)] mt-2">Recommendations</p>
            <ol className="ph-stagger">
              {RECOMMENDATIONS.map((item, index) => (
                <li key={item.text} className="px-5 py-2 flex items-center gap-3 hover:bg-[var(--surface-alt)] transition-colors">
                  <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[11px]" style={{ backgroundColor: phTint(P.navy, 10), color: P.brandText }}>
                    <i className={`fas ${item.icon}`}></i>
                  </span>
                  <span className="text-sm text-[var(--text)] flex-1">{item.text}</span>
                  <span className="text-[10px] font-bold text-[var(--muted)] tabular-nums">{index + 1}</span>
                </li>
              ))}
            </ol>
          </ProgramHeadPanel>
        </div>
      </div>

      <ProgramHeadModal open={reportOpen} title="Generate Program Report" onClose={() => setReportOpen(false)}>
        <div className="ph-form-field"><label htmlFor="ph-report-type">Report Type</label>
          <select className="ph-select" id="ph-report-type" defaultValue="Annual Program Report">
            <option>Annual Program Report</option><option>Department Performance</option><option>Student Success Metrics</option><option>Technology Transfer Analytics</option>
          </select>
        </div>
        <div className="ph-form-field"><label htmlFor="ph-report-title">Report Title</label><input className="ph-input" defaultValue="Annual Program Report 2025-2026" id="ph-report-title" /></div>
        <div className="ph-form-field"><label htmlFor="ph-report-format">Format</label>
          <select className="ph-select" id="ph-report-format" defaultValue="PDF Document"><option>PDF Document</option><option>PowerPoint Presentation</option><option>Excel Dashboard</option></select>
        </div>
        <div className="ph-form-field"><label>Sections to Include</label>
          <div className="ph-checkbox-list">
            <label><input defaultChecked type="checkbox" /> Executive summary</label>
            <label><input defaultChecked type="checkbox" /> Department performance</label>
            <label><input defaultChecked type="checkbox" /> Year-over-year trends</label>
            <label><input defaultChecked type="checkbox" /> Faculty metrics</label>
            <label><input defaultChecked type="checkbox" /> Technology transfer</label>
          </div>
        </div>
        <div className="ph-modal-actions">
          <ProgramHeadButton onClick={() => setReportOpen(false)}>Cancel</ProgramHeadButton>
          <ProgramHeadButton variant="primary" onClick={() => setReportOpen(false)}>Generate</ProgramHeadButton>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
