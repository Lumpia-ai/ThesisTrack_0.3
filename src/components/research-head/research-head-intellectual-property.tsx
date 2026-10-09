'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';
import { findInventoryRecord, type InventoryRecord } from '@/components/research-head/research-head-projects-data';
import {
  IP_DOCUMENT_BADGE,
  IP_RECORDS,
  IP_REVIEW_BADGE,
  IP_STATUSES,
  IP_STATUS_BADGE,
  IP_TRANSFER_BADGE,
  IP_TRANSFER_STATUSES,
  IP_TYPES,
  getIpStatus,
  isDocumentProvided,
  type IpRecord,
  type IpStatus,
  type IpTransferStatus
} from '@/components/research-head/research-head-ip-data';
import { TruncatedText } from '@/components/shared/truncated-text';

// Each IP record is resolved against Project Inventory; the page never stores its own copy of
// project details. The overall status is derived from the review and the transfer stage.
type ResolvedIpRecord = IpRecord & {
  project: InventoryRecord | null;
  projectTitle: string;
  department: string;
  status: IpStatus;
};

const ALL_TYPES = 'All Types';
const ALL_STATUSES = 'All Statuses';
const ALL_DEPARTMENTS = 'All Departments';
const DEPARTMENTS = ['IT', 'MET', 'TCM', 'ESM', 'NAME'];
const NOT_DETERMINED = 'To be determined';

const orDash = (value: string | null | undefined) => value || '—';

export function ResearchHeadIntellectualProperty() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS);
  // Transfer-stage updates made by the Research Head in this session (sample data: not saved).
  const [transferUpdates, setTransferUpdates] = useState<Record<string, IpTransferStatus>>({});

  const records = useMemo<ResolvedIpRecord[]>(
    () =>
      IP_RECORDS.map((record) => {
        const project = findInventoryRecord(record.projectId);
        const transferStatus = transferUpdates[record.id] ?? record.transfer.status;

        return {
          ...record,
          transfer: { ...record.transfer, status: transferStatus },
          project,
          projectTitle: project?.title ?? record.unlinkedProject?.title ?? 'Not linked',
          department: project?.department ?? record.unlinkedProject?.department ?? '—',
          status: getIpStatus(record.review, transferStatus)
        };
      }),
    [transferUpdates]
  );

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesQuery =
        !search ||
        [record.title, record.projectTitle, record.description, ...record.creators].some((value) =>
          value.toLowerCase().includes(search)
        );

      return (
        matchesQuery &&
        (typeFilter === ALL_TYPES || (typeFilter === NOT_DETERMINED ? record.type === null : record.type === typeFilter)) &&
        (statusFilter === ALL_STATUSES || record.status === statusFilter) &&
        (departmentFilter === ALL_DEPARTMENTS || record.department === departmentFilter)
      );
    });
  }, [records, query, typeFilter, statusFilter, departmentFilter]);

  const stats = [
    { label: 'Total IP Records', value: records.length, icon: 'fa-copyright' },
    {
      label: 'Awaiting Review',
      value: records.filter((record) => record.status === 'Pending Review' || record.status === 'Under Evaluation').length,
      icon: 'fa-hourglass-half'
    },
    { label: 'Approved', value: records.filter((record) => record.review.status === 'Approved').length, icon: 'fa-circle-check' },
    {
      label: 'For Technology Transfer',
      value: records.filter((record) => record.status === 'For Technology Transfer' || record.status === 'Transferred').length,
      icon: 'fa-handshake-angle'
    }
  ];

  const selectedRecord = records.find((record) => record.id === selectedId) ?? null;

  return (
    <>
      <ResearchHeadShell
        activeNav="intellectual-property"
        title="Intellectual Property"
        description="Manage and monitor intellectual property generated from institutional research."
      >
        <div className="admin-page-stack rh-wide-page repo-page">
          <header className="repo-page-header">
            <div>
              <h1>Intellectual Property</h1>
              <p className="admin-note">Manage and monitor intellectual property generated from institutional research.</p>
            </div>
            <span className="status-badge admin-inline-badge" title="Records on this page are sample data for demonstration.">
              <i className="fas fa-flask" aria-hidden="true"></i>
              Sample data
            </span>
          </header>

          <section className="repo-stats-grid repo-stats-grid--4" aria-label="Intellectual property statistics">
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
              <h3>IP Records</h3>
              <span className="status-badge status-approved">
                {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            <div className="repo-filter-bar">
              <div className="repo-filter-search">
                <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  className="repo-filter-input"
                  aria-label="Search IP records"
                  placeholder="Search by IP title, project, or creator..."
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select className="repo-filter-select" aria-label="IP type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option>{ALL_TYPES}</option>
                {IP_TYPES.map((type) => <option key={type}>{type}</option>)}
                <option>{NOT_DETERMINED}</option>
              </select>
              <select className="repo-filter-select" aria-label="IP status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>{ALL_STATUSES}</option>
                {IP_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="repo-filter-select" aria-label="Department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                <option>{ALL_DEPARTMENTS}</option>
                {DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}
              </select>
            </div>

            {filteredRecords.length > 0 ? (
              <div className="table-scroll">
                <table className="repo-table">
                  <thead>
                    <tr>
                      <th>IP Title</th>
                      <th>IP Type</th>
                      <th>Linked Project</th>
                      <th>Creator(s)</th>
                      <th>Ownership</th>
                      <th>Status</th>
                      <th>Date Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="repo-col-name">
                          <TruncatedText text={record.title} className="repo-doc-name" />
                          <span className="repo-doc-id">{record.id}</span>
                        </td>
                        <td>
                          {record.type ? (
                            <span className="repo-type-pill">{record.type}</span>
                          ) : (
                            <span className="admin-note">{NOT_DETERMINED}</span>
                          )}
                        </td>
                        <td className="repo-col-project">
                          <TruncatedText text={record.projectTitle} className="table-title" />
                          <span className="repo-doc-id">
                            {record.department}
                            {record.project ? ` · ${record.project.progressValue}% complete` : ' · Not in Project Inventory'}
                          </span>
                        </td>
                        <td className="repo-col-people">
                          {/* Names can be "Last, First M.", so semicolons separate creators. */}
                          <TruncatedText text={record.creators.join('; ')} />
                        </td>
                        <td>{record.ownership}</td>
                        <td>
                          <span className={`status-badge ${IP_STATUS_BADGE[record.status]}`}>{record.status}</span>
                        </td>
                        <td>{record.dateSubmitted ?? <span className="admin-note">—</span>}</td>
                        <td>
                          <button
                            className="btn btn-outline repo-btn"
                            type="button"
                            aria-label={`View details for ${record.title}`}
                            onClick={() => setSelectedId(record.id)}
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
              <div className="admin-empty-state">No IP records match your current search or filters.</div>
            )}
          </section>
        </div>
      </ResearchHeadShell>

      {selectedRecord ? (
        <IpDetailsModal
          record={selectedRecord}
          onClose={() => setSelectedId(null)}
          onTransferStatusChange={(status) => setTransferUpdates((current) => ({ ...current, [selectedRecord.id]: status }))}
        />
      ) : null}
    </>
  );
}

function IpDetailsModal({
  record,
  onClose,
  onTransferStatusChange
}: {
  record: ResolvedIpRecord;
  onClose: () => void;
  onTransferStatusChange: (status: IpTransferStatus) => void;
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

  const { project, review, transfer } = record;
  const providedDocuments = record.documents.filter(isDocumentProvided).length;
  const documentsComplete = record.documents.length > 0 && providedDocuments === record.documents.length;
  // Technology transfer follows university-level approval.
  const canUpdateTransfer = review.status === 'Approved';

  return (
    <div className="modal show" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content record-modal record-modal--wide" role="dialog" aria-modal="true" aria-labelledby="ip-record-title">
        <div className="modal-header">
          <div>
            <h3 id="ip-record-title">{record.title}</h3>
            <p className="record-modal-meta">
              <span>{record.id} · Sample record</span>
              <span className={`status-badge ${IP_STATUS_BADGE[record.status]}`}>{record.status}</span>
            </p>
          </div>
          <button className="close-modal" type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* IP Information, with the linked project read from Project Inventory. */}
          <section className="record-modal-section" aria-labelledby="ip-section-info">
            <h4 id="ip-section-info">IP Information</h4>
            <dl className="record-details-list record-details-list--4">
              <div>
                <dt>IP Type</dt>
                <dd>{record.type ?? NOT_DETERMINED}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{record.ownership}</dd>
              </div>
              <div>
                <dt>Date Submitted</dt>
                <dd>{record.dateSubmitted ?? 'Not yet submitted'}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{record.description}</dd>
              </div>
              <div className="record-details-wide">
                <dt>Creator(s) / Researchers</dt>
                <dd>{record.creators.join('; ')}</dd>
              </div>
            </dl>

            <div className="record-linked-project">
              <div className="record-linked-project-head">
                <strong>Linked Project</strong>
                <span className="admin-note">{project ? 'From Project Inventory' : 'Not linked to a Project Inventory record'}</span>
              </div>
              {project ? (
                <dl className="record-details-list record-details-list--4">
                  <div className="record-details-wide">
                    <dt>Project</dt>
                    <dd>
                      {project.title} <span className="admin-note">({project.id})</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Program / Department</dt>
                    <dd>{project.program} · {project.department}</dd>
                  </div>
                  <div>
                    <dt>Adviser</dt>
                    <dd>{project.adviser}</dd>
                  </div>
                  <div>
                    <dt>Project Status</dt>
                    <dd><span className={`status-badge ${project.statusClass}`}>{project.status}</span></dd>
                  </div>
                  <div>
                    <dt>Current Project Stage</dt>
                    <dd>{project.milestone}</dd>
                  </div>
                  <div className="record-details-wide">
                    <dt>Project Progress</dt>
                    <dd>
                      <div className="record-progress-line">
                        <span>{project.progressValue === 100 ? 'Complete' : `${project.progressValue}% complete`}</span>
                        <strong>{project.progressValue}%</strong>
                      </div>
                      <div className="admin-progress-track" role="progressbar" aria-label="Project progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={project.progressValue}>
                        <div className="admin-progress-bar" style={{ width: `${project.progressValue}%` }}></div>
                      </div>
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className="record-details-list">
                  <div className="record-details-wide">
                    <dt>Project</dt>
                    <dd>{record.projectTitle}</dd>
                  </div>
                  <div>
                    <dt>Department</dt>
                    <dd>{record.department}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          <div className="record-modal-columns record-modal-columns--even">
            <section className="record-modal-section" aria-labelledby="ip-section-review">
              <h4 id="ip-section-review">IP Review</h4>
              <dl className="record-details-list">
                <div>
                  <dt>Review Status</dt>
                  <dd><span className={`status-badge ${IP_REVIEW_BADGE[review.status]}`}>{review.status}</span></dd>
                </div>
                <div>
                  <dt>Reviewed By</dt>
                  <dd>{orDash(review.reviewedBy)}</dd>
                </div>
                <div>
                  <dt>Review Date</dt>
                  <dd>{orDash(review.date)}</dd>
                </div>
                <div className="record-details-wide">
                  <dt>Remarks</dt>
                  <dd>{orDash(review.remarks)}</dd>
                </div>
              </dl>
            </section>

            {/* Supporting documents are referenced from the linked project's files where possible. */}
            <section className="record-modal-section" aria-labelledby="ip-section-documents">
              <h4 id="ip-section-documents">Supporting Documents</h4>
              {record.documents.length ? (
                <>
                  <p className="record-doc-summary">
                    <span className={`status-badge ${documentsComplete ? 'status-approved' : 'status-review'}`}>
                      {documentsComplete ? 'Complete' : 'Incomplete'}
                    </span>
                    <span className="admin-note">
                      {providedDocuments} of {record.documents.length} documents provided
                    </span>
                  </p>
                  <ul className="record-row-list">
                    {record.documents.map((document) => {
                      const projectFile = document.projectDocument
                        ? project?.documents.find((file) => file.name === document.projectDocument)
                        : undefined;

                      return (
                        <li key={document.label}>
                          <div className="record-row-main">
                            <TruncatedText text={document.label} />
                            <span className="admin-note">
                              {projectFile
                                ? `${projectFile.name} · Project Inventory · ${projectFile.uploadedAt}`
                                : document.status === 'Missing'
                                  ? 'Not yet provided'
                                  : 'IP submission document'}
                            </span>
                          </div>
                          <span className={`status-badge ${IP_DOCUMENT_BADGE[document.status]}`}>{document.status}</span>
                          <button
                            className="btn btn-outline small"
                            type="button"
                            disabled
                            title="Sample data: no file is attached"
                            aria-label={`View ${document.label}`}
                          >
                            View
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="admin-note">No supporting documents yet.</p>
              )}
            </section>
          </div>

          {/* Technology Transfer: the stage after university-level approval. Partner and
              collaboration status come from Project Inventory. */}
          <section className="record-modal-section" aria-labelledby="ip-section-transfer">
            <h4 id="ip-section-transfer">Technology Transfer</h4>
            <dl className="record-details-list record-details-list--3">
              <div>
                <dt>Technology Transfer Status</dt>
                <dd>
                  {canUpdateTransfer ? (
                    <select
                      className="repo-filter-select record-inline-select"
                      aria-label="Technology transfer status"
                      value={transfer.status}
                      onChange={(event) => onTransferStatusChange(event.target.value as IpTransferStatus)}
                    >
                      {IP_TRANSFER_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  ) : (
                    <>
                      <span className={`status-badge ${IP_TRANSFER_BADGE[transfer.status]}`}>{transfer.status}</span>
                      <span className="record-field-hint admin-note">Available after the IP is approved.</span>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Potential Application</dt>
                <dd>{orDash(transfer.potentialApplication)}</dd>
              </div>
              <div>
                <dt>Transfer Status</dt>
                <dd>{orDash(transfer.transferDetail)}</dd>
              </div>
              <div>
                <dt>Industry Partner</dt>
                <dd>{orDash(project?.partner)}</dd>
              </div>
              <div>
                <dt>Collaboration Status</dt>
                <dd>
                  {project ? (
                    <span className={`status-badge ${project.transferStatusClass}`}>{project.transferStatus}</span>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>Related Agreement / Document</dt>
                <dd>{transfer.agreement ?? 'None'}</dd>
              </div>
            </dl>
          </section>

          <section className="record-modal-section" aria-labelledby="ip-section-activity">
            <h4 id="ip-section-activity">Activity History</h4>
            {record.activity.length ? (
              <ol className="record-timeline">
                {record.activity.map((entry) => (
                  <li key={`${entry.date}-${entry.label}`}>
                    <span className="record-timeline-date">{entry.date}</span>
                    <span className="record-timeline-label">{entry.label}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="admin-note">No activity recorded yet.</p>
            )}
          </section>
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
