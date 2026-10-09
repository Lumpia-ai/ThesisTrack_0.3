'use client';

import { useMemo, useState } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip as RechartsTooltip } from 'recharts';
import { ChartResponsiveContainer } from '@/components/shared/chart-responsive-container';
import { PROGRAM_HEAD_ADVISERS, type ProgramHeadAdviser } from '@/components/program-head/program-head-data';
import {
  PH_CARD_CLASS,
  PH_PALETTE as P,
  PH_ROW_HEIGHT_CLASS,
  PH_TD_CLASS,
  PH_TH_CLASS,
  ProgramHeadAnimatedNumber as AnimatedNumber,
  ProgramHeadAvatar,
  ProgramHeadButton,
  ProgramHeadDetailGrid,
  ProgramHeadDrawer,
  ProgramHeadFillerRows,
  ProgramHeadKpiCard,
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

const IMPROVEMENT_THRESHOLD = 80;
const EXCELLENT_THRESHOLD = 90;
/** Recommended maximum projects per adviser (used for the workload axis and the Advising Load card). */
const ADVISING_CAP = 10;
/** Floor for the tech-transfer axis, so one adviser alone isn't automatically "100". */
const TRANSFER_REFERENCE = 5;

/** Department-wide focus items; adviser-specific ones come from each adviser's `developmentNote`. */
const DEPARTMENT_FOCUS = [
  { name: 'General', note: 'Increase technology transfer participation', icon: 'fa-rocket' },
  { name: 'Department Goal', note: '90% average performance by 2025', icon: 'fa-bullseye' }
];
/** How many adviser-specific focus items to show (lowest scores first). */
const ADVISER_FOCUS_LIMIT = 2;

/* Shared palette: navy = excellent, light blue = good, gold = needs improvement (look here). */
const scoreColor = (score: number) => (score >= EXCELLENT_THRESHOLD ? P.navy : score >= IMPROVEMENT_THRESHOLD ? P.light : P.gold);
const scoreLabel = (score: number) => (score >= EXCELLENT_THRESHOLD ? 'Excellent' : score >= IMPROVEMENT_THRESHOLD ? 'Good' : 'Needs improvement');

/** "4.8/5" → 96 (percentage); unknown formats → 0. */
const satisfactionPct = (value: string) => {
  const match = value.match(/([\d.]+)\s*\/\s*([\d.]+)/);
  return match ? Math.round((Number(match[1]) / Number(match[2])) * 100) : 0;
};

function ScoreBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-2 rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] overflow-hidden ph-anim-meter">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }}></div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? P.gold : rank <= 3 ? P.light : null;
  return (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
      style={medal ? { backgroundColor: medal, color: '#fff' } : { color: 'var(--muted)' }}
    >
      {rank === 1 ? <i className="fas fa-crown text-[10px]"></i> : rank}
    </span>
  );
}

export function ProgramHeadPerformance() {
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);

  const ranked = useMemo(
    () => PROGRAM_HEAD_ADVISERS.filter((a) => a.department === 'IT').sort((a, b) => b.overallScore - a.overallScore),
    []
  );
  const [spotlightName, setSpotlightName] = useState<string>(ranked[0]?.name ?? '');
  const pagination = useProgramHeadPagination(ranked, 'ranking');

  const avgScore = Math.round(ranked.reduce((sum, a) => sum + a.overallScore, 0) / (ranked.length || 1));
  const topPerformer = ranked[0];
  const needsImprovement = ranked.filter((a) => a.overallScore < IMPROVEMENT_THRESHOLD).length;

  // Radar dimensions, each normalised to 0–100 so they share one scale.
  // Fixed references (not "the busiest adviser"), so a lone adviser isn't automatically 100 on every axis.
  const transferScale = Math.max(TRANSFER_REFERENCE, ...ranked.map((a) => a.techTransferCount));
  const profileOf = (adviser: ProgramHeadAdviser) => ({
    'Overall': adviser.overallScore,
    'Completion': adviser.completionRate,
    'Satisfaction': satisfactionPct(adviser.satisfaction),
    'Workload': Math.min(100, Math.round((adviser.projectsSupervised / ADVISING_CAP) * 100)),
    'Tech transfer': Math.round((adviser.techTransferCount / transferScale) * 100)
  });

  const spotlight = ranked.find((a) => a.name === spotlightName) ?? topPerformer;
  const spotlightRank = ranked.findIndex((a) => a.name === spotlight?.name) + 1;

  const radarData = useMemo(() => {
    if (!spotlight) return [];
    const mine = profileOf(spotlight);
    const profiles = ranked.map(profileOf);
    return (Object.keys(mine) as Array<keyof typeof mine>).map((dimension) => ({
      dimension,
      adviser: mine[dimension],
      average: Math.round(profiles.reduce((sum, profile) => sum + profile[dimension], 0) / (profiles.length || 1))
    }));
    // profileOf only depends on ranked-derived maxima
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlight, ranked]);

  // With one adviser the "department average" is that adviser, so comparing is meaningless:
  // fall back to their own highest/lowest dimension.
  const canCompare = ranked.length >= 2;
  const delta = (row: { adviser: number; average: number }) => (canCompare ? row.adviser - row.average : row.adviser);
  const strongest = radarData.length ? radarData.reduce((best, row) => (delta(row) > delta(best) ? row : best)) : null;
  const weakest = radarData.length ? radarData.reduce((worst, row) => (delta(row) < delta(worst) ? row : worst)) : null;
  const formatDelta = (row: { adviser: number; average: number }) => {
    if (!canCompare) return `${row.adviser}`;
    const diff = row.adviser - row.average;
    return `${diff >= 0 ? '+' : ''}${diff} vs avg`;
  };

  // Advising load against the recommended cap, heaviest first.
  const loadScale = Math.max(ADVISING_CAP, ...ranked.map((a) => a.projectsSupervised));
  const totalProjects = ranked.reduce((sum, a) => sum + a.projectsSupervised, 0);
  const overCap = ranked.filter((a) => a.projectsSupervised > ADVISING_CAP).length;
  const byLoad = [...ranked].sort((a, b) => b.projectsSupervised - a.projectsSupervised);
  const loadColor = (projects: number) => (projects > ADVISING_CAP ? P.gold : projects >= ADVISING_CAP * 0.8 ? P.light : P.navy);
  const developmentNote = spotlight?.developmentNote;

  // Advisers with a development note, lowest score first, then the department-wide items.
  const developmentAreas = [
    ...[...ranked]
      .filter((adviser) => adviser.developmentNote)
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, ADVISER_FOCUS_LIMIT)
      .map((adviser) => ({ name: adviser.name, note: adviser.developmentNote as string, icon: 'fa-user-pen' })),
    ...DEPARTMENT_FOCUS
  ];

  const profile = profileName ? PROGRAM_HEAD_ADVISERS.find((a) => a.name === profileName) : null;

  return (
    <ProgramHeadShell activeNav="performance" title="Adviser Performance Dashboard" description="Evaluate faculty adviser performance metrics" notificationCount={3}>
      <div className="space-y-5">
        <ProgramHeadPageHeader
          description="Adviser scores ranked highest first. Select an adviser to compare their profile with the department."
          actions={<ProgramHeadPrimaryAction icon="fa-star" onClick={() => setEvaluationOpen(true)}>Conduct Evaluation</ProgramHeadPrimaryAction>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 ph-stagger">
          <ProgramHeadKpiCard title="Advisers" value={ranked.length} note="IT department" icon="fa-chalkboard-teacher" color={P.navy} />
          <ProgramHeadKpiCard title="Average Score" value={avgScore} suffix="%" pct={avgScore} note="Department average" icon="fa-chart-line" color={P.light} />
          <ProgramHeadKpiCard
            title="Top Performer"
            value={topPerformer?.name ?? '—'}
            note={topPerformer ? `${topPerformer.overallScore}% overall score` : ''}
            icon="fa-trophy"
            color={P.gold}
          />
          <ProgramHeadKpiCard title="Needs Improvement" value={needsImprovement} note={`Below ${IMPROVEMENT_THRESHOLD}%`} icon="fa-exclamation-triangle" color={P.gold} />
        </div>

        {/* Same 4-column grid as the KPI cards, so edges line up: ranking = 3 columns, spotlight = 1.
            Rows stretch, so both cards end at the same height. */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 ph-stagger">
          {/* Ranking */}
          <div className={`${PH_CARD_CLASS} xl:col-span-3`}>
            <div className="px-5 h-14 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-bold text-[var(--text)]">Performance Ranking</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                {[{ label: `${EXCELLENT_THRESHOLD}%+`, color: P.navy }, { label: `${IMPROVEMENT_THRESHOLD}%+`, color: P.light }, { label: `<${IMPROVEMENT_THRESHOLD}%`, color: P.gold }].map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>{item.label}</span>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-[var(--surface-alt)]">
                  <tr>
                    <th className={`${PH_TH_CLASS} w-14`}>#</th>
                    <th className={PH_TH_CLASS}>Adviser</th>
                    <th className={`${PH_TH_CLASS} w-52`}>Overall Score</th>
                    <th className={PH_TH_CLASS}>Projects</th>
                    <th className={PH_TH_CLASS}>Completion</th>
                    <th className={PH_TH_CLASS}>Satisfaction</th>
                    <th className={PH_TH_CLASS}>Transfers</th>
                  </tr>
                </thead>
                <tbody key={pagination.bodyKey} {...pagination.bodyProps} className={`divide-y divide-[var(--border)] ${pagination.bodyProps.className}`}>
                  {pagination.pageItems.map((row) => {
                    const rank = ranked.indexOf(row) + 1;
                    const active = row.name === spotlight?.name;
                    return (
                      <tr
                        key={row.name}
                        aria-selected={active}
                        className={`group ${PH_ROW_HEIGHT_CLASS} cursor-pointer transition-colors ${active ? '' : 'hover:bg-[var(--surface-alt)]'}`}
                        style={active ? { backgroundColor: phTint(P.navy, 6), boxShadow: `inset 3px 0 0 ${P.navy}` } : undefined}
                        onClick={() => setSpotlightName(row.name)}
                      >
                        <td className={PH_TD_CLASS}><RankBadge rank={rank} /></td>
                        <td className={PH_TD_CLASS}>
                          <div className="flex items-center gap-3">
                            <ProgramHeadAvatar name={row.name} />
                            <span className="text-sm font-bold text-[var(--text)] whitespace-nowrap">{row.name}</span>
                          </div>
                        </td>
                        <td className={PH_TD_CLASS}>
                          <div className="flex items-center gap-2.5">
                            <ScoreBar pct={row.overallScore} color={scoreColor(row.overallScore)} />
                            <span className="w-10 text-right text-xs font-bold text-[var(--text)] tabular-nums">{row.overallScore}%</span>
                          </div>
                        </td>
                        <td className={`${PH_TD_CLASS} text-sm font-semibold text-[var(--text)] tabular-nums`}>{row.projectsSupervised}</td>
                        <td className={`${PH_TD_CLASS} text-sm text-[var(--text)] tabular-nums`}>{row.completionRate}%</td>
                        <td className={`${PH_TD_CLASS} text-sm text-[var(--muted)] whitespace-nowrap`}>
                          <i className="fas fa-star text-[10px] mr-1" style={{ color: P.gold }}></i>{row.satisfaction}
                        </td>
                        <td className={`${PH_TD_CLASS} text-sm text-[var(--text)] tabular-nums`}>{row.techTransferCount}</td>
                      </tr>
                    );
                  })}
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
              noun="advisers"
            />
          </div>

          {/* Spotlight */}
          {spotlight && (
            <ProgramHeadPanel
              className="xl:col-span-1"
              title="Adviser Spotlight"
              action={<ProgramHeadPill color={scoreColor(spotlight.overallScore)}>{scoreLabel(spotlight.overallScore)}</ProgramHeadPill>}
              bodyClassName="p-5"
            >
              <div key={spotlight.name} className="ph-anim-fade-in space-y-4">
                <div className="flex items-center gap-3">
                  <ProgramHeadAvatar name={spotlight.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[var(--text)] truncate">{spotlight.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">Rank #{spotlightRank} of {ranked.length} · {spotlight.department}</p>
                  </div>
                  <span className="text-2xl font-extrabold tabular-nums" style={{ color: P.brandText }}>
                    <AnimatedNumber value={spotlight.overallScore} />%
                  </span>
                </div>

                <div className="h-56 -mx-2">
                  <ChartResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="var(--ph-c-grid, #E5E7EB)" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--ph-c-tick, #4B5563)' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      {canCompare && (
                        <Radar name="Department avg" dataKey="average" stroke={P.light} strokeDasharray="4 3" fill={P.light} fillOpacity={0.12} animationDuration={700} />
                      )}
                      <Radar name={spotlight.name} dataKey="adviser" stroke={P.navy} strokeWidth={2} fill={P.navy} fillOpacity={0.22} animationDuration={700} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => (active && payload?.length ? (
                          <div className="rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)] shadow-lg px-3 py-2 text-xs">
                            <p className="font-bold text-[var(--text)] mb-1">{String(label)}</p>
                            {payload.map((entry) => (
                              <p key={String(entry.name)} className="flex items-center gap-2 text-[var(--muted)]">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: String(entry.color) }}></span>
                                {String(entry.name)}<strong className="ml-auto pl-3 text-[var(--text)] tabular-nums">{String(entry.value)}</strong>
                              </p>
                            ))}
                          </div>
                        ) : null)}
                      />
                    </RadarChart>
                  </ChartResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 -mt-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: P.navy }}></span>Adviser</span>
                  {canCompare ? (
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded border-t border-dashed" style={{ borderColor: P.light }}></span>Dept. average</span>
                  ) : (
                    <span className="normal-case tracking-normal font-medium">Department comparison needs 2+ advisers</span>
                  )}
                </div>

                {strongest && weakest && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: phTint(P.navy, 8) }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Strongest</p>
                      <p className="font-bold text-[var(--text)]">{strongest.dimension} <span className="text-[var(--muted)] font-semibold">{formatDelta(strongest)}</span></p>
                    </div>
                    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: phTint(P.gold, 12) }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Room to grow</p>
                      <p className="font-bold text-[var(--text)]">{weakest.dimension} <span className="text-[var(--muted)] font-semibold">{formatDelta(weakest)}</span></p>
                    </div>
                  </div>
                )}

                {developmentNote && (
                  <p className="text-xs text-[var(--muted)] flex items-start gap-2">
                    <i className="fas fa-lightbulb mt-0.5" style={{ color: P.gold }}></i>{developmentNote}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={() => setProfileName(spotlight.name)} className="h-9 rounded-xl ring-1 ring-[var(--border)] text-xs font-bold text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors">
                    <i className="fas fa-id-card mr-1.5"></i>Full profile
                  </button>
                  <button type="button" onClick={() => setEvaluationOpen(true)} className="h-9 rounded-xl text-xs font-bold text-white hover:brightness-110 transition-all" style={{ backgroundColor: P.navy }}>
                    <i className="fas fa-star mr-1.5"></i>Evaluate
                  </button>
                </div>
              </div>
            </ProgramHeadPanel>
          )}
        </div>

        {/* Development focus · advising load — two columns each on the same 4-column grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 ph-stagger">
          <ProgramHeadPanel
            className="xl:col-span-2"
            title="Areas for Development"
            action={<span className="text-xs text-[var(--muted)]">{developmentAreas.length} focus areas</span>}
            bodyClassName="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {developmentAreas.map((item) => {
              const isAdviser = PROGRAM_HEAD_ADVISERS.some((a) => a.name === item.name);
              const inRanking = ranked.find((a) => a.name === item.name);
              const card = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: phTint(P.gold, 16), color: `color-mix(in srgb, ${P.gold} 70%, var(--text))` }}>
                      <i className={`fas ${item.icon}`}></i>
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: phTint(isAdviser ? P.navy : P.light, 12), color: isAdviser ? P.brandText : `color-mix(in srgb, ${P.light} 75%, var(--text))` }}
                    >
                      {isAdviser ? 'Adviser' : 'Department'}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm font-bold text-[var(--text)] truncate">{item.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)] leading-snug">{item.note}</p>
                  {inRanking && (
                    <p className="mt-2 text-[11px] font-bold" style={{ color: P.brandText }}>
                      View in spotlight <i className="fas fa-arrow-right text-[9px] ml-0.5 group-hover:translate-x-0.5 transition-transform"></i>
                    </p>
                  )}
                </>
              );
              const className = 'group text-left rounded-xl ring-1 ring-inset ring-[var(--border)] p-3.5 transition-all duration-200';
              // Only advisers in this ranking can be loaded into the spotlight.
              return inRanking ? (
                <button
                  key={item.note}
                  type="button"
                  onClick={() => setSpotlightName(inRanking.name)}
                  className={`${className} hover:-translate-y-px hover:shadow-sm hover:ring-[color-mix(in_srgb,var(--ph-c-navy)_35%,transparent)]`}
                >
                  {card}
                </button>
              ) : (
                <div key={item.note} className={className}>{card}</div>
              );
            })}
          </ProgramHeadPanel>

          <ProgramHeadPanel
            className="xl:col-span-2"
            title="Advising Load"
            action={<span className="text-xs text-[var(--muted)]">Recommended cap: <strong className="text-[var(--text)]">{ADVISING_CAP}</strong> projects</span>}
            bodyClassName="p-4 space-y-3"
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Projects', value: totalProjects, color: P.brandText },
                { label: 'Avg / adviser', value: ranked.length ? Math.round(totalProjects / ranked.length) : 0, color: P.brandText },
                { label: 'Over cap', value: overCap, color: overCap ? `color-mix(in srgb, ${P.gold} 70%, var(--text))` : P.brandText }
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] px-3 py-2 text-center">
                  <p className="text-lg font-extrabold tabular-nums leading-none" style={{ color: stat.color }}><AnimatedNumber value={stat.value} /></p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{stat.label}</p>
                </div>
              ))}
            </div>
            <ul className="space-y-2.5 ph-stagger">
              {byLoad.slice(0, 5).map((adviser) => {
                const color = loadColor(adviser.projectsSupervised);
                return (
                  <li key={adviser.name}>
                    <button type="button" onClick={() => setSpotlightName(adviser.name)} className="w-full text-left group" title={`${adviser.projectsSupervised} of ${ADVISING_CAP} recommended`}>
                      <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                        <span className="font-semibold text-[var(--text)] truncate group-hover:underline">{adviser.name}</span>
                        <span className="font-bold tabular-nums whitespace-nowrap" style={{ color: adviser.projectsSupervised > ADVISING_CAP ? `color-mix(in srgb, ${P.gold} 70%, var(--text))` : 'var(--text)' }}>
                          {adviser.projectsSupervised}/{ADVISING_CAP}
                          {adviser.projectsSupervised > ADVISING_CAP && <i className="fas fa-triangle-exclamation ml-1 text-[10px]" style={{ color: P.gold }}></i>}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="h-2 w-full rounded-full bg-[var(--surface-alt)] ring-1 ring-inset ring-[var(--border)] overflow-hidden ph-anim-meter">
                          <div className="h-full rounded-full" style={{ width: `${(adviser.projectsSupervised / loadScale) * 100}%`, backgroundColor: color }}></div>
                        </div>
                        {/* Cap marker */}
                        <span className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-[var(--text)] opacity-40" style={{ left: `${(ADVISING_CAP / loadScale) * 100}%` }}></span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ProgramHeadPanel>
        </div>
      </div>

      <ProgramHeadDrawer maxWidth={520} open={Boolean(profile)} title="Adviser Profile" onClose={() => setProfileName(null)}>
        {profile ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <ProgramHeadAvatar name={profile.name} />
              <div>
                <h3 className="m-0 text-lg font-bold text-[var(--text)]">{profile.name}</h3>
                <span className="text-sm text-[var(--muted)]">{profile.department} Department</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">Overall score</span>
                <span className="text-lg font-extrabold tabular-nums" style={{ color: P.brandText }}>{profile.overallScore}%</span>
              </div>
              <div className="flex"><ScoreBar pct={profile.overallScore} color={scoreColor(profile.overallScore)} /></div>
            </div>
            <ProgramHeadDetailGrid
              items={[
                ['Projects', profile.projectsSupervised],
                ['Completion', `${profile.completionRate}%`],
                ['Satisfaction', profile.satisfaction],
                ['Tech transfers', profile.techTransferCount]
              ]}
            />
            <div className="flex gap-3 pt-1">
              <button type="button" className="flex-1 h-10 rounded-xl ring-1 ring-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors" onClick={() => setProfileName(null)}>Close</button>
              <button type="button" className="flex-1 h-10 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: P.navy }}>
                <i className="fas fa-file-pdf"></i> Full Report
              </button>
            </div>
          </div>
        ) : null}
      </ProgramHeadDrawer>

      <ProgramHeadModal open={evaluationOpen} title="Adviser Evaluation Form" onClose={() => setEvaluationOpen(false)}>
        <div className="ph-form-field">
          <label htmlFor="ph-eval-adviser">Adviser</label>
          {/* Keyed so it preselects whoever is in the spotlight when the form opens */}
          <select key={spotlight?.name} className="ph-select" id="ph-eval-adviser" defaultValue={spotlight?.name ?? PROGRAM_HEAD_ADVISERS[0]?.name}>
            {PROGRAM_HEAD_ADVISERS.map((a) => <option key={a.name}>{a.name}</option>)}
          </select>
        </div>
        <div className="ph-form-field">
          <label htmlFor="ph-eval-period">Evaluation Period</label>
          <select className="ph-select" id="ph-eval-period" defaultValue="First Semester 2025-2026">
            <option>First Semester 2025-2026</option><option>Second Semester 2025-2026</option>
          </select>
        </div>
        <div className="ph-form-field"><label htmlFor="ph-eval-mentorship">Student Mentorship (30%)</label><input className="ph-range" defaultValue={85} id="ph-eval-mentorship" max={100} min={0} type="range" /></div>
        <div className="ph-form-field"><label htmlFor="ph-eval-completion">Project Completion (30%)</label><input className="ph-range" defaultValue={88} id="ph-eval-completion" max={100} min={0} type="range" /></div>
        <div className="ph-form-field"><label htmlFor="ph-eval-output">Research Output (20%)</label><input className="ph-range" defaultValue={82} id="ph-eval-output" max={100} min={0} type="range" /></div>
        <div className="ph-form-field"><label htmlFor="ph-eval-engagement">Industry Engagement (20%)</label><input className="ph-range" defaultValue={75} id="ph-eval-engagement" max={100} min={0} type="range" /></div>
        <div className="ph-form-field"><label htmlFor="ph-eval-comments">Comments</label><textarea className="ph-textarea" id="ph-eval-comments" rows={3} /></div>
        <div className="ph-modal-actions">
          <ProgramHeadButton onClick={() => setEvaluationOpen(false)}>Cancel</ProgramHeadButton>
          <ProgramHeadButton variant="primary" onClick={() => setEvaluationOpen(false)}>Submit Evaluation</ProgramHeadButton>
        </div>
      </ProgramHeadModal>
    </ProgramHeadShell>
  );
}
