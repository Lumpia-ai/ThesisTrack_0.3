'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';
import { TruncatedText } from '@/components/shared/truncated-text';
import { ResearchHeadForwardedProjects } from '@/components/research-head/research-head-forwarded-projects';

const APPROVAL_RECORDS = [
  {
    id: 'APR-2026-018',
    title: 'AI-Powered Learning Management System',
    department: 'IT',
    adviser: 'Dr. Ricardo Cruz',
    type: 'Final manuscript clearance',
    status: 'Pending Approval',
    statusClass: 'status-pending',
    submittedAt: 'Apr 28, 2026',
    dueIn: '18 hours',
    risk: 'Normal',
    milestone: 'Final Review',
    progress: 88,
    notes: 'Ready for Research Head endorsement after final similarity check.'
  },
  {
    id: 'APR-2026-019',
    title: 'Smart Solar Energy Monitoring System',
    department: 'MET',
    adviser: 'Prof. Maria Ramos',
    type: 'Pilot testing evidence',
    status: 'Needs Revision',
    statusClass: 'status-review',
    submittedAt: 'Apr 26, 2026',
    dueIn: 'Overdue 1 day',
    risk: 'At Risk',
    milestone: 'Pilot Validation',
    progress: 61,
    notes: 'Deployment photos are present, but utilization checklist is incomplete.'
  },
  {
    id: 'APR-2026-020',
    title: 'Herbal Medicine Knowledge Portal',
    department: 'TCM',
    adviser: 'Dr. Anna Reyes',
    type: 'Revised Chapters 1-3',
    status: 'Pending Approval',
    statusClass: 'status-pending',
    submittedAt: 'Apr 25, 2026',
    dueIn: 'Overdue 2 days',
    risk: 'Delayed',
    milestone: 'Revision Compliance',
    progress: 44,
    notes: 'Adviser comments remain unresolved on methodology scope.'
  }
];

const MILESTONE_ROWS = [
  { label: 'Proposal Clearance', completed: 42, pending: 4, progress: 91 },
  { label: 'Ethics / Similarity Review', completed: 31, pending: 9, progress: 78 },
  { label: 'Final Manuscript', completed: 24, pending: 12, progress: 67 }
];

const STATUS_OPTIONS = ['All Statuses', 'Pending Approval', 'Under Review', 'Needs Revision'];
const RISK_OPTIONS = ['All Risk Levels', 'Normal', 'At Risk', 'Delayed'];

const riskBadgeClass = (risk: string) =>
  risk === 'Normal' ? 'status-approved' : risk === 'At Risk' ? 'status-review' : 'status-critical';

type ApprovalRecord = (typeof APPROVAL_RECORDS)[number];

export function ResearchHeadApprovals() {
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [riskFilter, setRiskFilter] = useState('All Risk Levels');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  const filteredApprovals = useMemo(
    () =>
      APPROVAL_RECORDS.filter((record) => {
        const matchesStatus = statusFilter === 'All Statuses' || record.status === statusFilter;
        const matchesRisk = riskFilter === 'All Risk Levels' || record.risk === riskFilter;
        const matchesDepartment = departmentFilter === 'All Departments' || record.department === departmentFilter;

        return matchesStatus && matchesRisk && matchesDepartment;
      }),
    [departmentFilter, riskFilter, statusFilter]
  );

  const selectedApproval = APPROVAL_RECORDS.find((record) => record.id === selectedApprovalId) ?? null;
  const pendingCount = APPROVAL_RECORDS.filter((record) => record.status === 'Pending Approval').length;
  const atRiskCount = APPROVAL_RECORDS.filter((record) => record.risk !== 'Normal').length;
  const averageProgress = Math.round(APPROVAL_RECORDS.reduce((sum, record) => sum + record.progress, 0) / APPROVAL_RECORDS.length);

  const stats = [
    { label: 'Pending Approvals', value: pendingCount, icon: 'fa-clock' },
    { label: 'At Risk / Delayed', value: atRiskCount, icon: 'fa-triangle-exclamation' },
    { label: 'Avg. Project Stage Progress', value: `${averageProgress}%`, icon: 'fa-bars-progress' },
    { label: 'Due Within 48 Hours', value: 2, icon: 'fa-hourglass-half' }
  ];

  return (
    <>
      <ResearchHeadShell
        activeNav="approvals"
        title="Approvals and Monitoring"
        description="Review pending approvals, track project status, and prioritize delayed or at-risk research work."
      >
        <div className="admin-page-stack rh-wide-page repo-page">
          <header className="repo-page-header">
            <h1>Approvals &amp; Monitoring</h1>
          </header>

          <section className="repo-stats-grid repo-stats-grid--4" aria-label="Approval statistics">
            {stats.map((stat) => (
              <article key={stat.label} className="repo-stat-card">
                <div className="repo-stat-icon">
                  <i className={`fas ${stat.icon}`} aria-hidden="true"></i>
                </div>
                <div className="repo-stat-body">
                  <span className="repo-stat-label">{stat.label}</span>
                  <strong className="repo-stat-value">{stat.value}</strong>
                </div>
              </article>
            ))}
          </section>

          <ResearchHeadForwardedProjects />

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Approval Queue</h3>
              <span className="status-badge status-info">{filteredApprovals.length} items</span>
            </div>

            <div className="repo-filter-bar">
              <select className="repo-filter-select" aria-label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Risk" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                {RISK_OPTIONS.map((risk) => <option key={risk}>{risk}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                {['All Departments', 'IT', 'MET', 'TCM', 'ESM'].map((department) => <option key={department}>{department}</option>)}
              </select>
              <div className="repo-filter-actions">
                <button className="btn btn-outline repo-btn" type="button">
                  <i className="fas fa-file-pdf" aria-hidden="true"></i>
                  Export PDF
                </button>
                <button className="btn btn-outline repo-btn" type="button">
                  <i className="fas fa-file-excel" aria-hidden="true"></i>
                  Export Excel
                </button>
              </div>
            </div>

            {filteredApprovals.length ? (
              <div className="table-scroll">
                <table className="repo-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Department</th>
                      <th>Request Type</th>
                      <th>Status</th>
                      <th>Risk</th>
                      <th>Project Stage</th>
                      <th>Due</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApprovals.map((record) => (
                      <tr key={record.id}>
                        <td className="repo-col-title">
                          <TruncatedText text={record.title} className="table-title" />
                          <span className="repo-doc-id">{record.id} · {record.adviser}</span>
                        </td>
                        <td><span className="dept-badge">{record.department}</span></td>
                        <td>{record.type}</td>
                        <td><span className={`status-badge ${record.statusClass}`}>{record.status}</span></td>
                        <td><span className={`status-badge ${riskBadgeClass(record.risk)}`}>{record.risk}</span></td>
                        <td className="repo-col-milestone">
                          <div className="repo-milestone-cell">
                            <TruncatedText text={record.milestone} />
                            <div className="repo-milestone-progress">
                              <div className="admin-progress-track">
                                <div className="admin-progress-bar" style={{ width: `${record.progress}%` }}></div>
                              </div>
                              <span>{record.progress}%</span>
                            </div>
                          </div>
                        </td>
                        <td>{record.dueIn}</td>
                        <td>
                          <button className="btn btn-outline repo-btn" type="button" onClick={() => setSelectedApprovalId(record.id)}>
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">No approvals match the current filters.</div>
            )}
          </section>

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Project Stage Progress</h3>
            </div>
            <div className="repo-summary-grid">
              {MILESTONE_ROWS.map((row) => (
                <div key={row.label} className="repo-summary-item">
                  <div className="repo-summary-item-head">
                    <strong>{row.label}</strong>
                    <span className="admin-note">{row.completed} complete · {row.pending} pending</span>
                  </div>
                  <div className="admin-progress-track" role="progressbar" aria-label={row.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.progress}>
                    <div className="admin-progress-bar" style={{ width: `${row.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </ResearchHeadShell>

      {selectedApproval ? (
        <ApprovalReviewModal record={selectedApproval} onClose={() => setSelectedApprovalId(null)} />
      ) : null}
    </>
  );
}

function ApprovalReviewModal({ record, onClose }: { record: ApprovalRecord; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal show" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content record-modal" role="dialog" aria-modal="true" aria-labelledby="approval-record-title">
        <div className="modal-header">
          <div>
            <h3 id="approval-record-title">{record.title}</h3>
            <p className="record-modal-meta">
              <span>{record.id} · {record.type}</span>
              <span className={`status-badge ${record.statusClass}`}>{record.status}</span>
            </p>
          </div>
          <button className="close-modal" type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <section className="record-modal-section" aria-labelledby="approval-section-notes">
            <h4 id="approval-section-notes">Notes</h4>
            <p className="admin-note">{record.notes}</p>
          </section>
          <section className="record-modal-section" aria-labelledby="approval-section-details">
            <h4 id="approval-section-details">Details</h4>
            <dl className="record-details-list">
              <div>
                <dt>Department</dt>
                <dd>{record.department}</dd>
              </div>
              <div>
                <dt>Adviser</dt>
                <dd>{record.adviser}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{record.submittedAt}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>{record.dueIn}</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd><span className={`status-badge ${riskBadgeClass(record.risk)}`}>{record.risk}</span></dd>
              </div>
              <div>
                <dt>Project Stage</dt>
                <dd>{record.progress}% · {record.milestone}</dd>
              </div>
            </dl>
          </section>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" type="button" onClick={onClose}>
            Mark Reviewed
          </button>
        </div>
      </div>
    </div>
  );
}
