'use client';

import { useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';

const PERFORMANCE_ROWS = [
  { name: 'Information Technology', projects: 42, successRate: 86, width: 86 },
  { name: 'Manufacturing Engineering Technology', projects: 28, successRate: 78, width: 78 },
  { name: 'Technology Communication Management', projects: 19, successRate: 82, width: 82 },
  { name: 'Energy Systems and Management', projects: 35, successRate: 74, width: 74 },
  { name: 'Naval Architecture and Marine Engineering', projects: 32, successRate: 79, width: 79 }
];

const WATCHLIST = [
  { title: 'School-wide accreditation pack', note: 'Update adviser productivity charts.', status: 'Due today' },
  { title: 'IT transfer memo briefing', note: 'Finalize the partner-ready summary for the top three pilots.', status: 'Needs release' },
  { title: 'ESM defense backlog review', note: 'Three projects pending compliance evidence.', status: 'Escalate' },
  { title: 'NAME deployment follow-up', note: 'Confirm post-adoption metrics for the marine pollution detector.', status: 'External partner' }
];

const PORTFOLIO_STATUS = [
  { label: 'Active research projects', short: 'Active', value: 156, percentage: '45.6%', width: 45.6, color: 'rgb(96, 165, 250)' },
  { label: 'Completed projects', short: 'Completed', value: 124, percentage: '36.3%', width: 36.3, color: 'rgb(246, 190, 0)' },
  { label: 'Pending projects', short: 'Pending', value: 38, percentage: '11.1%', width: 11.1, color: 'rgb(0, 58, 143)' },
  { label: 'On-hold projects', short: 'On-hold', value: 24, percentage: '7.0%', width: 7, color: 'rgb(203, 213, 225)' }
];

const PORTFOLIO_TOTAL = PORTFOLIO_STATUS.reduce((sum, item) => sum + item.value, 0);

// Donut segments on a circle with circumference 100, so each dash length equals its percentage.
// Offset 25 starts the first segment at 12 o'clock.
const DONUT_SEGMENTS = PORTFOLIO_STATUS.reduce<{ label: string; color: string; length: number; offset: number }[]>(
  (segments, item) => {
    const start = segments.reduce((sum, segment) => sum + segment.length, 0);
    return [...segments, { label: item.label, color: item.color, length: item.width, offset: 25 - start }];
  },
  []
);

const YEAR_GROWTH = [
  { year: '2020-2021', count: '187 projects', trend: '' },
  { year: '2021-2022', count: '234 projects', trend: '+25%' },
  { year: '2022-2023', count: '298 projects', trend: '+27%' },
  { year: '2023-2024', count: '342 projects', trend: '+15%' }
];

const BRIEFING_PACKAGES = [
  { title: 'Project Inventory Report', description: 'Projects by department, adviser, status, and year.', action: 'Export' },
  { title: 'Progress Monitoring Report', description: 'Project stages, delays, at-risk projects, and pending approvals.', action: 'Export' }
];

const ADVISER_TABLE = [
  { adviser: 'Dr. Ricardo Cruz', department: 'IT', supervised: 12, completionRate: '92%', avgScore: '89%' },
  { adviser: 'Prof. Maria Ramos', department: 'MET', supervised: 8, completionRate: '85%', avgScore: '86%' },
  { adviser: 'Dr. Anna Reyes', department: 'TCM', supervised: 6, completionRate: '88%', avgScore: '87%' },
  { adviser: 'Prof. Jose Lopez', department: 'ESM', supervised: 9, completionRate: '82%', avgScore: '84%' },
  { adviser: 'Dr. Elena Aquino', department: 'NAME', supervised: 7, completionRate: '86%', avgScore: '85%' }
];

export function ResearchHeadReports() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  return (
    <>
      <ResearchHeadShell
        activeNav="reports"
        title="Analytics & Reports"
        description="Review executive research outcomes, adviser coverage, and transfer-ready outputs in one reporting workspace."
      >
        <div className="rh-reports rh-wide-page">
          <section className="rh-panel admin-section-card">
            <div className="rh-header-top">
              <div>
                <h1>Executive Reporting Center</h1>
                <p className="rh-header-meta admin-note">
                  <span>Refreshed 8:00 AM</span>
                  <span><strong>6</strong> queued briefings</span>
                  <span><strong>3</strong> scheduled digests</span>
                </p>
              </div>
              <div className="rh-actions">
                <button className="btn btn-primary rh-btn" type="button" onClick={() => setReportModalOpen(true)}>
                  <i className="fas fa-file-lines" aria-hidden="true"></i>
                  Generate Report
                </button>
                <button className="btn btn-outline rh-btn" type="button" onClick={() => setScheduleModalOpen(true)}>
                  <i className="fas fa-calendar-days" aria-hidden="true"></i>
                  Schedule Digest
                </button>
              </div>
            </div>

            <div className="rh-header-filters">
              <div className="rh-field">
                <label htmlFor="rh-report-department">Department</label>
                <select id="rh-report-department" className="admin-toolbar-select" defaultValue="All Departments">
                  <option>All Departments</option>
                  <option>IT</option>
                  <option>MET</option>
                  <option>TCM</option>
                  <option>ESM</option>
                  <option>NAME</option>
                </select>
              </div>
              <div className="rh-field">
                <label htmlFor="rh-report-year">Academic Year</label>
                <select id="rh-report-year" className="admin-toolbar-select" defaultValue="AY 2023-2024">
                  <option>AY 2023-2024</option>
                  <option>AY 2022-2023</option>
                </select>
              </div>
              <div className="rh-field">
                <label htmlFor="rh-report-type">Report Type</label>
                <select id="rh-report-type" className="admin-toolbar-select" defaultValue="Project Inventory Report">
                  <option>Project Inventory Report</option>
                  <option>Progress Monitoring Report</option>
                </select>
              </div>
              <div className="rh-actions">
                <button className="btn btn-primary rh-btn" type="button">
                  <i className="fas fa-file-pdf" aria-hidden="true"></i>
                  Export PDF
                </button>
                <button className="btn btn-outline rh-btn" type="button">
                  <i className="fas fa-file-excel" aria-hidden="true"></i>
                  Export Excel
                </button>
              </div>
            </div>
          </section>

          <section className="rh-kpis" aria-label="Key metrics">
            <article className="rh-panel rh-kpi admin-kpi-card">
              <span className="rh-kpi-label">Total Active Projects</span>
              <strong className="rh-kpi-value">342</strong>
              <div className="rh-kpi-foot admin-note">
                <span className="rh-chip status-badge status-success">Strong pipeline</span>
                <span>+12% vs last AY</span>
              </div>
            </article>
            <article className="rh-panel rh-kpi admin-kpi-card">
              <span className="rh-kpi-label">Completion Readiness</span>
              <strong className="rh-kpi-value">124</strong>
              <div className="rh-kpi-foot admin-note">
                <span className="rh-chip status-badge status-approved">36.3% completed</span>
              </div>
            </article>
            <article className="rh-panel rh-kpi admin-kpi-card">
              <span className="rh-kpi-label">Adviser Coverage</span>
              <strong className="rh-kpi-value">48</strong>
              <div className="rh-kpi-foot admin-note">
                <span className="rh-chip status-badge status-review">7 near capacity</span>
                <span>Active advisers</span>
              </div>
            </article>
          </section>

          <section className="rh-panel admin-section-card">
            <div className="rh-panel-head admin-section-head">
              <h2>Department Performance</h2>
            </div>
            <ul className="rh-rows">
              {PERFORMANCE_ROWS.map((row) => (
                <li key={row.name} className="rh-row">
                  <div className="rh-dept-line">
                    <span className="rh-row-title">{row.name}</span>
                    <span className="rh-dept-stat admin-note">{row.projects} projects</span>
                    <span className="rh-dept-stat admin-note">
                      <strong>{row.successRate}%</strong> success
                    </span>
                  </div>
                  <div className="rh-bar admin-progress-track" role="presentation">
                    <div className="admin-progress-bar" style={{ width: `${row.width}%` }}></div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="rh-split rh-split--match">
            <section className="rh-panel admin-section-card">
              <div className="rh-panel-head admin-section-head">
                <h2>Portfolio Health</h2>
              </div>
              <div className="rh-portfolio">
                <div className="rh-donut">
                  <svg
                    viewBox="0 0 42 42"
                    role="img"
                    aria-label={`Project status distribution: ${PORTFOLIO_STATUS.map((item) => `${item.short} ${item.value} (${item.percentage})`).join(', ')}`}
                  >
                    <circle className="rh-donut-track" cx="21" cy="21" r="15.9155" />
                    {DONUT_SEGMENTS.map((segment) => (
                      <circle
                        key={segment.label}
                        cx="21"
                        cy="21"
                        r="15.9155"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="5"
                        strokeDasharray={`${segment.length} ${100 - segment.length}`}
                        strokeDashoffset={segment.offset}
                      />
                    ))}
                  </svg>
                  <div className="rh-donut-center">
                    <strong>{PORTFOLIO_TOTAL}</strong>
                    <span className="admin-note">Total Projects</span>
                  </div>
                </div>

                <ul className="rh-legend">
                  {PORTFOLIO_STATUS.map((item) => (
                    <li key={item.label}>
                      <span className="rh-row-title">
                        <span className="rh-dot" style={{ background: item.color }} aria-hidden="true"></span>
                        {item.short}
                      </span>
                      <strong className="rh-legend-value">{item.value}</strong>
                      <span className="rh-chip status-badge admin-inline-badge">{item.percentage}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <h3 className="rh-subhead">Academic Year History</h3>
              <ul className="rh-years">
                {YEAR_GROWTH.map((row) => (
                  <li key={row.year} className="rh-year admin-list-item">
                    <strong>{row.year}</strong>
                    <span className="admin-note">{row.count}</span>
                    {row.trend ? <span className="rh-chip status-badge status-approved">{row.trend}</span> : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rh-panel admin-section-card">
              <div className="rh-panel-head admin-section-head">
                <h2>Research Head Watchlist</h2>
              </div>
              <ul className="rh-rows">
                {WATCHLIST.map((item) => (
                  <li key={item.title} className="rh-row rh-row--action">
                    <div>
                      <span className="rh-row-title">{item.title}</span>
                      <span className="rh-row-desc admin-table-meta">{item.note}</span>
                    </div>
                    <span className="rh-chip status-badge status-review">{item.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="rh-split rh-split--table rh-split--match">
            <section className="rh-panel admin-section-card">
              <div className="rh-panel-head admin-section-head">
                <h2>Adviser Productivity</h2>
              </div>
              <div className="rh-table-wrap">
                <table className="rh-table">
                  <thead>
                    <tr>
                      <th>Adviser</th>
                      <th>Department</th>
                      <th className="rh-num">Projects Supervised</th>
                      <th className="rh-num">Completion Rate</th>
                      <th className="rh-num">Avg. Student Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ADVISER_TABLE.map((row) => (
                      <tr key={row.adviser}>
                        <td>{row.adviser}</td>
                        <td><span className="dept-badge">{row.department}</span></td>
                        <td className="rh-num">{row.supervised}</td>
                        <td className="rh-num">
                          <span className="rh-rate">
                            <span className="rh-rate-bar admin-progress-track" aria-hidden="true">
                              <span className="admin-progress-bar" style={{ width: row.completionRate }}></span>
                            </span>
                            {row.completionRate}
                          </span>
                        </td>
                        <td className="rh-num">{row.avgScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rh-panel admin-section-card">
              <div className="rh-panel-head admin-section-head">
                <h2>Ready-made Reports</h2>
              </div>
              <ul className="rh-rows">
                {BRIEFING_PACKAGES.map((item) => (
                  <li key={item.title} className="rh-row rh-report">
                    <span className="rh-row-title">{item.title}</span>
                    <span className="rh-row-desc admin-table-meta">{item.description}</span>
                    <button className="btn btn-outline rh-btn rh-btn-sm" type="button">
                      <i className="fas fa-file-export" aria-hidden="true"></i>
                      {item.action}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </ResearchHeadShell>

      {reportModalOpen ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && setReportModalOpen(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3>Generate Custom Report</h3>
                <p>Build an executive output tailored to your selected reporting scope.</p>
              </div>
              <button className="close-modal" type="button" onClick={() => setReportModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="admin-form-grid">
                <div className="form-group">
                  <label>Report Type</label>
                  <select defaultValue="Project Inventory Report">
                    <option>Project Inventory Report</option>
                    <option>Progress Monitoring Report</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select defaultValue="All Departments">
                    <option>All Departments</option>
                    <option>IT</option>
                    <option>MET</option>
                    <option>TCM</option>
                    <option>ESM</option>
                    <option>NAME</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select defaultValue="AY 2023-2024">
                    <option>AY 2023-2024</option>
                    <option>AY 2022-2023</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Output Format</label>
                  <select defaultValue="PDF">
                    <option>PDF</option>
                    <option>Excel</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setReportModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={() => setReportModalOpen(false)}>
                Generate
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scheduleModalOpen ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && setScheduleModalOpen(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3>Schedule Report Digest</h3>
                <p>Set a recurring summary delivery for leadership and research office stakeholders.</p>
              </div>
              <button className="close-modal" type="button" onClick={() => setScheduleModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="admin-form-grid">
                <div className="form-group">
                  <label>Frequency</label>
                  <select defaultValue="Weekly">
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Audience</label>
                  <input placeholder="Research council, deans, chairs" />
                </div>
                <div className="form-group">
                  <label>Delivery Format</label>
                  <select defaultValue="Email + PDF">
                    <option>Email + PDF</option>
                    <option>Email only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Delivery Time</label>
                  <input type="time" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setScheduleModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={() => setScheduleModalOpen(false)}>
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
