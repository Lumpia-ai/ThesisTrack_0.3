'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';
import { TruncatedText } from '@/components/shared/truncated-text';
import { INVENTORY_RECORDS, type InventoryRecord } from '@/components/research-head/research-head-projects-data';

const DEPARTMENT_OPTIONS = ['All Departments', 'IT', 'MET', 'TCM', 'ESM', 'NAME'];
const YEAR_OPTIONS = ['All Years', '2026', '2025', '2024'];
const STATUS_OPTIONS = ['All Statuses', 'Active', 'Pending Review', 'At Risk', 'Completed'];

export function ResearchHeadProjects() {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [adviserFilter, setAdviserFilter] = useState('All Advisers');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [academicYear, setAcademicYear] = useState('All Years');
  const [query, setQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const adviserOptions = useMemo(
    () => ['All Advisers', ...Array.from(new Set(INVENTORY_RECORDS.map((record) => record.adviser))).sort()],
    []
  );

  const filteredRecords = useMemo(
    () =>
      INVENTORY_RECORDS.filter((record) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesDepartment = departmentFilter === 'All Departments' || record.department === departmentFilter;
        const matchesAdviser = adviserFilter === 'All Advisers' || record.adviser === adviserFilter;
        const matchesStatus = statusFilter === 'All Statuses' || record.status === statusFilter;
        const matchesYear = academicYear === 'All Years' || record.year === academicYear;
        const matchesQuery =
          !normalizedQuery ||
          record.title.toLowerCase().includes(normalizedQuery) ||
          record.keywords.toLowerCase().includes(normalizedQuery) ||
          record.adviser.toLowerCase().includes(normalizedQuery) ||
          record.id.toLowerCase().includes(normalizedQuery);

        return matchesDepartment && matchesAdviser && matchesStatus && matchesYear && matchesQuery;
      }),
    [academicYear, adviserFilter, departmentFilter, query, statusFilter]
  );

  const selectedRecord = INVENTORY_RECORDS.find((record) => record.id === selectedRecordId) ?? null;
  const activeProjects = INVENTORY_RECORDS.filter((record) => record.status === 'Active').length;
  const atRiskProjects = INVENTORY_RECORDS.filter((record) => record.delayed || record.status === 'At Risk').length;
  const documentCount = INVENTORY_RECORDS.reduce((sum, record) => sum + record.documents.length, 0);
  const transferTagged = INVENTORY_RECORDS.filter((record) => record.transferStatus !== 'Not Tagged').length;

  const stats = [
    { label: 'Inventory Records', value: INVENTORY_RECORDS.length, icon: 'fa-boxes' },
    { label: 'Active Projects', value: activeProjects, icon: 'fa-bars-progress' },
    { label: 'At Risk / Delayed', value: atRiskProjects, icon: 'fa-triangle-exclamation' },
    { label: 'Uploaded Documents', value: documentCount, icon: 'fa-file-lines' },
    { label: 'Transfer Tagged', value: transferTagged, icon: 'fa-handshake-angle' }
  ];

  return (
    <>
      <ResearchHeadShell
        activeNav="projects"
        title="Project Inventory"
        description="View all thesis and capstone projects, monitor progress, and inspect uploaded research documents."
      >
        <div className="admin-page-stack repo-page">
          <header className="repo-page-header">
            <h1>Project Inventory</h1>
          </header>

          <section className="repo-stats-grid" aria-label="Inventory statistics">
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

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Inventory Directory</h3>
              <span className="status-badge status-info">{filteredRecords.length} shown</span>
            </div>

            <div className="repo-filter-bar">
              <div className="repo-filter-search">
                <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  className="repo-filter-input"
                  aria-label="Search projects"
                  placeholder="Search title, adviser, code, or keywords..."
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select className="repo-filter-select" aria-label="Department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                {DEPARTMENT_OPTIONS.map((department) => <option key={department}>{department}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Adviser" value={adviserFilter} onChange={(event) => setAdviserFilter(event.target.value)}>
                {adviserOptions.map((adviser) => <option key={adviser}>{adviser}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Year" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>
                {YEAR_OPTIONS.map((year) => <option key={year}>{year}</option>)}
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

            {filteredRecords.length ? (
              <div className="table-scroll">
                <table className="repo-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Department</th>
                      <th>Adviser</th>
                      <th>Status</th>
                      <th>Project Stage Progress</th>
                      <th>Transfer</th>
                      <th>Documents</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="repo-col-title">
                          <TruncatedText text={record.title} className="table-title" />
                          <span className="repo-doc-id">{record.id}</span>
                        </td>
                        <td><span className="dept-badge">{record.department}</span></td>
                        <td>{record.adviser}</td>
                        <td>
                          <span className={`status-badge ${record.statusClass}`}>{record.status}</span>
                          {record.delayed ? <span className="repo-doc-id">Delayed project stage</span> : null}
                        </td>
                        <td className="repo-col-milestone">
                          <div className="repo-milestone-cell">
                            <TruncatedText text={record.milestone} />
                            <div className="repo-milestone-progress">
                              <div className="admin-progress-track">
                                <div className="admin-progress-bar" style={{ width: `${record.progressValue}%` }}></div>
                              </div>
                              <span>{record.progressValue}%</span>
                            </div>
                          </div>
                        </td>
                        <td><span className={`status-badge ${record.transferStatusClass}`}>{record.transferStatus}</span></td>
                        <td>{record.documents.length} files</td>
                        <td>
                          <button
                            className="btn btn-outline repo-btn"
                            type="button"
                            aria-label={`View details for ${record.title}`}
                            onClick={() => setSelectedRecordId(record.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">No projects match the current filters.</div>
            )}
          </section>
        </div>
      </ResearchHeadShell>

      {selectedRecord ? (
        <ProjectDetailsModal record={selectedRecord} onClose={() => setSelectedRecordId(null)} />
      ) : null}
    </>
  );
}

function ProjectDetailsModal({
  record,
  onClose
}: {
  record: InventoryRecord;
  onClose: () => void;
}) {
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
      <div className="modal-content record-modal record-modal--wide" role="dialog" aria-modal="true" aria-labelledby="project-record-title">
        <div className="modal-header">
          <div>
            <h3 id="project-record-title">{record.title}</h3>
            <p className="record-modal-meta">
              <span>{record.id}</span>
              <span className={`status-badge ${record.statusClass}`}>{record.status}</span>
            </p>
          </div>
          <button className="close-modal" type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <section className="record-modal-section" aria-labelledby="project-section-overview">
            <h4 id="project-section-overview">Overview</h4>
            <dl className="record-details-list record-details-list--4">
              <div>
                <dt>Department</dt>
                <dd>{record.department}</dd>
              </div>
              <div>
                <dt>Program</dt>
                <dd>{record.program}</dd>
              </div>
              <div>
                <dt>Adviser</dt>
                <dd>{record.adviser}</dd>
              </div>
              <div>
                <dt>Academic Year</dt>
                <dd>{record.year}</dd>
              </div>
              <div>
                <dt>Transfer</dt>
                <dd>
                  <span className={`status-badge ${record.transferStatusClass}`}>{record.transferStatus}</span>
                </dd>
              </div>
              <div>
                <dt>Partner</dt>
                <dd>{record.partner || 'Not yet matched'}</dd>
              </div>
              <div>
                <dt>Similarity</dt>
                <dd>{record.similarity}</dd>
              </div>
              <div className="record-details-wide">
                <dt>Keywords</dt>
                <dd>{record.keywords}</dd>
              </div>
            </dl>
          </section>

          <div className="record-modal-columns">
            <section className="record-modal-section" aria-labelledby="project-section-progress">
              <h4 id="project-section-progress">Project Stage Progress</h4>
              <div className="record-progress-line">
                <span>{record.milestone}</span>
                <span className={`status-badge ${record.delayed ? 'status-critical' : 'status-approved'}`}>
                  {record.delayed ? 'Delayed / At Risk' : 'On Track'}
                </span>
              </div>
              <div className="admin-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={record.progressValue}>
                <div className="admin-progress-bar" style={{ width: `${record.progressValue}%` }}></div>
              </div>
              <span className="admin-note">{record.progressValue}% completed</span>
            </section>

            <section className="record-modal-section" aria-labelledby="project-section-documents">
              <h4 id="project-section-documents">
                Documents <span className="admin-note">({record.documents.length})</span>
              </h4>
              <ul className="record-row-list">
                {record.documents.map((document) => (
                  <li key={document.name}>
                    <div className="record-row-main">
                      <TruncatedText text={document.name} />
                      <span className="admin-note">
                        {document.type} · {document.uploadedBy} · {document.uploadedAt}
                      </span>
                    </div>
                    <button className="btn btn-outline small" type="button" aria-label={`View ${document.name}`}>
                      View
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
