'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ResearchHeadChartCard } from '@/components/research-head/research-head-chart-card';
import { ChartResponsiveContainer } from '@/components/shared/chart-responsive-container';
import {
  ADVISER_LOADS,
  AXIS_TICK,
  BASE_MONTHLY_TRENDS,
  CHART_COLORS,
  DEPARTMENTS,
  TOOLTIP_STYLE,
  YEAR_LABELS
} from '@/components/research-head/research-head-dashboard-data';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';

const formatAcademicYear = (year: keyof typeof YEAR_LABELS) => YEAR_LABELS[year];

export function ResearchHeadDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState<keyof typeof YEAR_LABELS>('2024');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const selectedDepartment = DEPARTMENTS.find((department) => department.id === deptFilter) ?? null;
  const filteredDepartments = selectedDepartment ? [selectedDepartment] : DEPARTMENTS;
  const adviserLoadData = (
    selectedDepartment
      ? ADVISER_LOADS.filter((adviser) => adviser.department === selectedDepartment.id)
      : ADVISER_LOADS
  )
    .slice()
    .sort((left, right) => right.projects - left.projects)
    .slice(0, 6);

  const totalProjects = DEPARTMENTS.reduce((sum, department) => sum + department.totalProjects, 0);
  const totalStudents = DEPARTMENTS.reduce((sum, department) => sum + department.students, 0);
  const totalAdvisers = DEPARTMENTS.reduce((sum, department) => sum + department.advisers, 0);
  const totalUsers = DEPARTMENTS.reduce((sum, department) => sum + department.students + department.advisers, 0);
  const totalCompleted = DEPARTMENTS.reduce((sum, department) => sum + department.completed, 0);
  const totalActiveProjects = DEPARTMENTS.reduce((sum, department) => sum + department.inProgress, 0);
  const totalDeployed = DEPARTMENTS.reduce((sum, department) => sum + department.deployed, 0);
  const totalPendingReview = DEPARTMENTS.reduce((sum, department) => sum + department.pendingReview, 0);
  const totalDelayed = DEPARTMENTS.reduce((sum, department) => sum + department.delayed, 0);
  const scopeLabel = selectedDepartment ? `${selectedDepartment.name} Department` : 'All Departments';
  const scopeShare = selectedDepartment ? selectedDepartment.totalProjects / totalProjects : 1;
  const scopedTotalProjects = selectedDepartment ? selectedDepartment.totalProjects : totalProjects;
  const scopedCompleted = selectedDepartment ? selectedDepartment.completed : totalCompleted;
  const scopedActiveProjects = selectedDepartment ? selectedDepartment.inProgress : totalActiveProjects;
  const scopedDeployed = selectedDepartment ? selectedDepartment.deployed : totalDeployed;
  const scopedPendingReview = selectedDepartment ? selectedDepartment.pendingReview : totalPendingReview;
  const scopedDelayed = selectedDepartment ? selectedDepartment.delayed : totalDelayed;
  const scopedStudents = selectedDepartment ? selectedDepartment.students : totalStudents;
  const scopedAdvisers = selectedDepartment ? selectedDepartment.advisers : totalAdvisers;
  const scopedPeople = selectedDepartment ? selectedDepartment.students + selectedDepartment.advisers : totalUsers;
  const completionRate = Math.round((scopedCompleted / Math.max(scopedTotalProjects, 1)) * 100);
  const deploymentRate = Math.round((scopedDeployed / Math.max(scopedTotalProjects, 1)) * 100);
  const reviewLoad = scopedPendingReview + scopedDelayed;
  const reviewPressureRate = Math.round((reviewLoad / Math.max(scopedActiveProjects, 1)) * 100);
  const leadingDepartment = DEPARTMENTS.slice().sort((left, right) => right.successRate - left.successRate)[0];
  const flaggedDepartment = DEPARTMENTS.slice().sort(
    (left, right) => right.pendingReview + right.delayed - (left.pendingReview + left.delayed)
  )[0];

  const statusOverviewData = selectedDepartment
    ? [
        { name: 'Completed', value: selectedDepartment.completed, color: CHART_COLORS.primary },
        {
          name: 'In Progress',
          value: Math.max(selectedDepartment.inProgress - selectedDepartment.pendingReview - selectedDepartment.delayed, 0),
          color: CHART_COLORS.secondary
        },
        { name: 'Pending Review', value: selectedDepartment.pendingReview, color: CHART_COLORS.gold },
        { name: 'Delayed', value: selectedDepartment.delayed, color: CHART_COLORS.neutral }
      ]
    : [
        { name: 'Completed', value: totalCompleted, color: CHART_COLORS.primary },
        {
          name: 'In Progress',
          value: Math.max(totalActiveProjects - totalPendingReview - totalDelayed, 0),
          color: CHART_COLORS.secondary
        },
        { name: 'Pending Review', value: totalPendingReview, color: CHART_COLORS.gold },
        { name: 'Delayed', value: totalDelayed, color: CHART_COLORS.neutral }
      ];

  const monthlyTrendData = BASE_MONTHLY_TRENDS[yearFilter].map((entry) => ({
    month: entry.month,
    submissions: Math.max(2, Math.round(entry.submissions * scopeShare)),
    approvals: Math.max(1, Math.round(entry.approvals * scopeShare)),
    completions: Math.max(1, Math.round(entry.completions * scopeShare))
  }));

  const departmentComparisonData = DEPARTMENTS.map((department) => ({
    id: department.id,
    name: department.shortLabel,
    totalProjects: department.totalProjects,
    completed: department.completed,
    successRate: department.successRate,
    isSelected: selectedDepartment ? department.id === selectedDepartment.id : true
  }));

  const approvalQueueData = [
    { label: 'Pending', value: selectedDepartment ? selectedDepartment.pendingReview : 18, color: CHART_COLORS.gold },
    { label: 'Approved', value: Math.max(2, Math.round(42 * scopeShare)), color: CHART_COLORS.primary },
    { label: 'Needs Revision', value: Math.max(1, Math.round(11 * scopeShare)), color: CHART_COLORS.secondary },
    { label: 'Rejected', value: Math.max(1, Math.round(4 * scopeShare)), color: CHART_COLORS.neutral }
  ];

  const totalTrackedStatus = statusOverviewData.reduce((sum, item) => sum + item.value, 0);
  const pendingApprovals = approvalQueueData[0].value;

  // One row of headline numbers. Each figure appears once; supporting counts sit in the detail line.
  const kpis = [
    { label: 'Active Projects', value: scopedActiveProjects, detail: `${scopedCompleted} completed`, icon: 'fa-diagram-project' },
    { label: 'Completion Rate', value: `${completionRate}%`, detail: `${scopedCompleted} of ${scopedTotalProjects} records`, icon: 'fa-circle-check' },
    { label: 'Pending Approvals', value: pendingApprovals, detail: '6 due within 48 hours', icon: 'fa-clock' },
    { label: 'Review Pressure', value: `${reviewPressureRate}%`, detail: `${scopedPendingReview} pending · ${scopedDelayed} delayed`, icon: 'fa-triangle-exclamation' },
    { label: 'Deployment Rate', value: `${deploymentRate}%`, detail: `${scopedDeployed} transfer-ready`, icon: 'fa-handshake-angle' },
    { label: 'People Monitored', value: scopedPeople, detail: `${scopedStudents} students · ${scopedAdvisers} advisers`, icon: 'fa-users-line' }
  ];

  return (
    <>
      <ResearchHeadShell
        activeNav="dashboard"
        title="Research Head Dashboard"
        description="Monitor academic project performance, review pipeline health, and manage institutional reporting from one official oversight workspace."
      >
        <div className="admin-page-stack rh-wide-page rh-dash">
          <header className="rh-dash-header">
            <div>
              <h1>Research Overview</h1>
              <p className="admin-note">
                {scopeLabel} · {formatAcademicYear(yearFilter)}
              </p>
            </div>
            <div className="rh-dash-controls">
              <select
                aria-label="Department"
                className="rh-dash-select"
                value={deptFilter}
                onChange={(event) => setDeptFilter(event.target.value)}
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              <select
                aria-label="Academic year"
                className="rh-dash-select"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value as keyof typeof YEAR_LABELS)}
              >
                <option value="2024">AY 2023-2024</option>
                <option value="2023">AY 2022-2023</option>
                <option value="2022">AY 2021-2022</option>
              </select>
              <button className="btn btn-outline rh-dash-btn" type="button" onClick={() => showToast('Data exported successfully.', 'success')}>
                <i className="fas fa-download" aria-hidden="true"></i>
                Export Data
              </button>
              <button className="btn btn-primary rh-dash-btn" type="button" onClick={() => setModalOpen(true)}>
                <i className="fas fa-chart-line" aria-hidden="true"></i>
                Generate Report
              </button>
            </div>
          </header>

          <section className="rh-dash-kpis" aria-label="Summary metrics">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="rh-dash-kpi">
                <span className="rh-dash-kpi-icon" aria-hidden="true">
                  <i className={`fas ${kpi.icon}`}></i>
                </span>
                <div>
                  <span className="rh-dash-kpi-label">{kpi.label}</span>
                  <strong className="rh-dash-kpi-value">{kpi.value}</strong>
                  <span className="rh-dash-kpi-detail">{kpi.detail}</span>
                </div>
              </article>
            ))}
          </section>

          <section className="rh-dash-grid rh-dash-grid--3">
            <ResearchHeadChartCard title="Project Status">
              <div className="dashboard-chart-frame dashboard-chart-frame-donut rh-dash-donut">
                <ChartResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusOverviewData} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none">
                      {statusOverviewData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ChartResponsiveContainer>
                <div className="dashboard-donut-center">
                  <span>Total Tracked</span>
                  <strong>{totalTrackedStatus}</strong>
                </div>
              </div>
              <ul className="rh-dash-legend">
                {statusOverviewData.map((entry) => (
                  <li key={entry.name}>
                    <span className="rh-dash-legend-name">
                      <span className="rh-dash-dot" style={{ backgroundColor: entry.color }} aria-hidden="true"></span>
                      {entry.name}
                    </span>
                    <span className="rh-dash-legend-value">
                      <strong>{entry.value}</strong> · {Math.round((entry.value / Math.max(totalTrackedStatus, 1)) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </ResearchHeadChartCard>

            <ResearchHeadChartCard title="Approval Queue">
              <div className="dashboard-chart-frame dashboard-chart-frame-compact">
                <ChartResponsiveContainer width="100%" height="100%">
                  <BarChart data={approvalQueueData}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tick={AXIS_TICK} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={AXIS_TICK} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {approvalQueueData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartResponsiveContainer>
              </div>
              <ul className="rh-dash-legend rh-dash-legend--inline">
                {approvalQueueData.map((entry) => (
                  <li key={entry.label}>
                    <span className="rh-dash-legend-name">
                      <span className="rh-dash-dot" style={{ backgroundColor: entry.color }} aria-hidden="true"></span>
                      {entry.label}
                    </span>
                    <strong>{entry.value}</strong>
                  </li>
                ))}
              </ul>
            </ResearchHeadChartCard>

            <ResearchHeadChartCard title="Adviser Load">
              <div className="dashboard-chart-frame dashboard-chart-frame-large">
                <ChartResponsiveContainer width="100%" height="100%">
                  <BarChart data={adviserLoadData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" horizontal={false} />
                    <XAxis allowDecimals={false} axisLine={false} tick={AXIS_TICK} tickLine={false} type="number" />
                    <YAxis axisLine={false} dataKey="name" tick={AXIS_TICK} tickLine={false} type="category" width={116} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="projects" radius={[0, 8, 8, 0]}>
                      {adviserLoadData.map((adviser, index) => (
                        <Cell key={adviser.name} fill={index === 0 ? CHART_COLORS.primary : CHART_COLORS.secondary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartResponsiveContainer>
              </div>
            </ResearchHeadChartCard>
          </section>

          <section className="rh-dash-grid rh-dash-grid--2">
            <ResearchHeadChartCard badge={formatAcademicYear(yearFilter)} title="Monthly Submissions and Completions">
              <div className="dashboard-chart-frame dashboard-chart-frame-large">
                <ChartResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="month" tick={AXIS_TICK} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={AXIS_TICK} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line dataKey="submissions" dot={{ r: 3 }} stroke={CHART_COLORS.primary} strokeWidth={3} type="monotone" />
                    <Line dataKey="approvals" dot={{ r: 3 }} stroke={CHART_COLORS.secondary} strokeWidth={3} type="monotone" />
                    <Line dataKey="completions" dot={{ r: 3 }} stroke={CHART_COLORS.hover} strokeWidth={3} type="monotone" />
                  </LineChart>
                </ChartResponsiveContainer>
              </div>
              <div className="dashboard-chart-legend">
                <span><i className="fas fa-circle" style={{ color: CHART_COLORS.primary }}></i> Submissions</span>
                <span><i className="fas fa-circle" style={{ color: CHART_COLORS.secondary }}></i> Approvals</span>
                <span><i className="fas fa-circle" style={{ color: CHART_COLORS.hover }}></i> Completions</span>
              </div>
            </ResearchHeadChartCard>

            <ResearchHeadChartCard
              title="Department Performance"
              description={`${leadingDepartment.shortLabel} leads success rate at ${leadingDepartment.successRate}% · ${flaggedDepartment.shortLabel} has the largest review load`}
            >
              <div className="dashboard-chart-frame dashboard-chart-frame-large">
                <ChartResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={departmentComparisonData}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="name" tick={AXIS_TICK} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={AXIS_TICK} tickLine={false} yAxisId="left" />
                    <YAxis allowDecimals={false} axisLine={false} orientation="right" tick={AXIS_TICK} tickFormatter={(value: number) => `${value}%`} tickLine={false} yAxisId="right" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar barSize={18} dataKey="totalProjects" radius={[6, 6, 0, 0]} yAxisId="left">
                      {departmentComparisonData.map((entry) => (
                        <Cell key={`total-${entry.id}`} fill={selectedDepartment && !entry.isSelected ? '#DBEAFE' : CHART_COLORS.secondary} />
                      ))}
                    </Bar>
                    <Bar barSize={18} dataKey="completed" radius={[6, 6, 0, 0]} yAxisId="left">
                      {departmentComparisonData.map((entry) => (
                        <Cell key={`completed-${entry.id}`} fill={selectedDepartment && !entry.isSelected ? CHART_COLORS.neutral : CHART_COLORS.primary} />
                      ))}
                    </Bar>
                    <Line dataKey="successRate" dot={{ fill: CHART_COLORS.gold, r: 4 }} stroke={CHART_COLORS.gold} strokeWidth={3} type="monotone" yAxisId="right" />
                  </ComposedChart>
                </ChartResponsiveContainer>
              </div>
              <div className="dashboard-chart-legend">
                <span><i className="fas fa-circle" style={{ color: CHART_COLORS.secondary }}></i> Total projects</span>
                <span><i className="fas fa-circle" style={{ color: CHART_COLORS.primary }}></i> Completed</span>
                <span><i className="fas fa-circle" style={{ color: CHART_COLORS.gold }}></i> Success rate</span>
              </div>
            </ResearchHeadChartCard>
          </section>

          <section className="admin-section-card rh-dash-table-card">
            <div className="admin-section-head rh-dash-table-head">
              <h3>Department Overview</h3>
            </div>
            <div className="table-scroll">
              <table className="rh-dash-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="rh-num">Total</th>
                    <th className="rh-num">Completed</th>
                    <th className="rh-num">In Progress</th>
                    <th className="rh-num">Pending Review</th>
                    <th className="rh-num">Delayed</th>
                    <th className="rh-num">Students</th>
                    <th className="rh-num">Advisers</th>
                    <th>Success Rate</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((department) => (
                    <tr key={department.id}>
                      <td>
                        <span className="dept-badge">{department.shortLabel}</span>
                        <span className="rh-dash-dept-name">{department.name}</span>
                      </td>
                      <td className="rh-num">{department.totalProjects}</td>
                      <td className="rh-num">{department.completed}</td>
                      <td className="rh-num">{department.inProgress}</td>
                      <td className="rh-num">{department.pendingReview}</td>
                      <td className="rh-num">{department.delayed}</td>
                      <td className="rh-num">{department.students}</td>
                      <td className="rh-num">{department.advisers}</td>
                      <td>
                        <div className="progress-cluster">
                          <div className="progress-container">
                            <div className="progress-fill" style={{ width: `${department.successRate}%` }}></div>
                          </div>
                          <strong>{department.successRate}%</strong>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-outline rh-dash-btn rh-dash-btn--sm" type="button" onClick={() => showToast(`Viewing ${department.name} Department.`)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </ResearchHeadShell>

      {modalOpen ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <div><h3><i className="fas fa-chart-line"></i> Generate Department Report</h3><p>Prepare an official department-focused output for review, endorsement, and executive monitoring.</p></div>
              <button className="close-modal" type="button" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label htmlFor="research-head-report-department">Department</label><select defaultValue={deptFilter} id="research-head-report-department"><option value="all">All Departments</option>{DEPARTMENTS.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
              <div className="form-group"><label htmlFor="research-head-report-year">Academic Year</label><select defaultValue={yearFilter} id="research-head-report-year"><option value="2024">Academic Year: 2023-2024</option><option value="2023">Academic Year: 2022-2023</option><option value="2022">Academic Year: 2021-2022</option></select></div>
              <div className="form-group"><label htmlFor="research-head-report-format">Output Format</label><select id="research-head-report-format"><option>PDF Document</option><option>Excel Workbook</option><option>Executive Briefing Pack</option></select></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={() => { setModalOpen(false); showToast('Report generated successfully.', 'success'); }}>Generate Report</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="notification-toast" role="status">
          <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'info-circle'}`} style={{ color: toast.type === 'success' ? CHART_COLORS.green : CHART_COLORS.primary }}></i>
          <span>{toast.message}</span>
        </div>
      ) : null}
    </>
  );
}
