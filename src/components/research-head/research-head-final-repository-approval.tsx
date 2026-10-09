'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';
import { TruncatedText } from '@/components/shared/truncated-text';

type AdviserReviewStatus = 'APPROVED' | 'NEEDS_REVISION' | 'UNDER_REVIEW' | null;

type RepositoryApprovalRecord = {
  projectId: string;
  projectTitle: string;
  department: string | null;
  submittedBy: string | null;
  adviserName: string | null;
  adviserReviewStatus: AdviserReviewStatus;
  lastActivityAt: string;
  fileCount: number;
  totalFileSize: string;
  isPublished: boolean;
  publishedAt: string | null;
};

type QueueTab = 'ready' | 'published';

const QUEUE_TABS: Array<{ key: QueueTab; label: string; icon: string }> = [
  { key: 'ready', label: 'Ready for Approval', icon: 'fa-clock' },
  { key: 'published', label: 'Published to Repository', icon: 'fa-circle-check' }
];

const ADVISER_REVIEW_LABEL: Record<string, string> = {
  APPROVED: 'Approved',
  NEEDS_REVISION: 'Needs Revision',
  UNDER_REVIEW: 'Under Review'
};

const ADVISER_REVIEW_CLASS: Record<string, string> = {
  APPROVED: 'status-approved',
  NEEDS_REVISION: 'status-critical',
  UNDER_REVIEW: 'status-pending'
};

// Last loaded records, kept for the browser session so returning to this page shows the list
// immediately while a fresh copy loads in the background. Kept per mode, since the focal
// person's list is scoped to their department and the Research Head's is not.
const cachedRecordsByMode: Record<'approve' | 'overview', RepositoryApprovalRecord[] | null> = {
  approve: null,
  overview: null
};

// The Research Head oversees this queue read-only; the department's Research
// Focal Person gives the final approval.
export function ResearchHeadFinalRepositoryApproval() {
  return (
    <RepositoryApprovalBoard
      canApprove={false}
      renderShell={(children) => (
        <ResearchHeadShell
          activeNav="final-repository-approval"
          title="Final Repository Approval"
          description="Overview of completed thesis and capstone projects and their repository approval by each department's Research Focal Person."
        >
          {children}
        </ResearchHeadShell>
      )}
    />
  );
}

export function RepositoryApprovalBoard({
  canApprove,
  renderShell
}: {
  canApprove: boolean;
  renderShell: (children: ReactNode) => ReactNode;
}) {
  const mode = canApprove ? 'approve' : 'overview';
  const cachedRecords = cachedRecordsByMode[mode];
  const [records, setRecords] = useState<RepositoryApprovalRecord[]>(() => cachedRecords ?? []);
  // The full-page loading state is only for the very first load; later loads refresh in place.
  const [isLoading, setIsLoading] = useState(() => cachedRecords === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<QueueTab>('ready');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [query, setQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<RepositoryApprovalRecord | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const getApiErrorMessage = async (response: Response) => {
    try {
      const payload = await response.json();
      return payload?.message || 'Repository publication failed.';
    } catch {
      return 'Repository publication failed.';
    }
  };

  async function loadRecords() {
    if (cachedRecordsByMode[mode] === null) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setLoadError(null);

    try {
      const response = await fetch('/api/admin/repository-approvals', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to load repository approval records.');
      }

      cachedRecordsByMode[mode] = payload.records;
      setRecords(payload.records);
    } catch (error) {
      if (cachedRecordsByMode[mode] === null) {
        setLoadError((error as Error).message);
      } else {
        // Keep showing the last loaded list; just report that the refresh failed.
        showToast((error as Error).message, 'warning');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesTab = activeTab === 'ready' ? !record.isPublished : record.isPublished;
        const matchesDept = departmentFilter === 'All Departments' || record.department === departmentFilter;
        const matchesQuery =
          !query ||
          record.projectTitle.toLowerCase().includes(query.toLowerCase()) ||
          (record.submittedBy || '').toLowerCase().includes(query.toLowerCase());

        return matchesTab && matchesDept && matchesQuery;
      }),
    [activeTab, departmentFilter, query, records]
  );

  const readyCount = records.filter((record) => !record.isPublished).length;
  const publishedCount = records.filter((record) => record.isPublished).length;

  const handleApprove = async (record: RepositoryApprovalRecord) => {
    setPublishingId(record.projectId);

    try {
      const response = await fetch('/api/repository/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: record.projectId })
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response));
      }

      setSelectedRecord(null);
      showToast(`"${record.projectTitle}" approved and moved to the Official Institutional Repository.`, 'success');
      await loadRecords();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Repository publication failed.', 'warning');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <>
      {renderShell(
        <div className="admin-page-stack rh-wide-page repo-page">
          <header className="repo-page-header">
            <h1>Final Repository Approval</h1>
          </header>

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <div className="fra-tabs-bar" role="tablist" aria-label="Repository queue">
                {QUEUE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    className={`fra-tab${activeTab === tab.key ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <i className={`fas ${tab.icon}`} aria-hidden="true"></i>
                    <span>{tab.label}</span>
                    <span className="fra-tab-count">{tab.key === 'ready' ? readyCount : publishedCount}</span>
                  </button>
                ))}
              </div>
              <span className="status-badge status-info">
                {isRefreshing ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
                    Refreshing…
                  </>
                ) : (
                  <>{filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'} shown</>
                )}
              </span>
            </div>

            <div className="repo-filter-bar">
              <div className="repo-filter-search">
                <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  className="repo-filter-input"
                  aria-label="Search projects"
                  placeholder="Search by project title or student..."
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {/* The focal person's queue is already limited to their department. */}
              {!canApprove ? (
                <select
                  className="repo-filter-select"
                  aria-label="Department"
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                >
                  <option>All Departments</option>
                  <option>IT</option>
                  <option>MET</option>
                  <option>TCM</option>
                  <option>ESM</option>
                  <option>NAME</option>
                </select>
              ) : null}
            </div>

            {loadError ? (
              <div className="admin-empty-state">
                <p>{loadError}</p>
                <button className="btn btn-outline repo-btn" type="button" onClick={() => void loadRecords()}>
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="admin-empty-state">Loading records…</div>
            ) : filteredRecords.length > 0 ? (
              <div className="table-scroll">
                <table className="repo-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Submitted By</th>
                      <th>Adviser</th>
                      <th>Adviser Review</th>
                      <th>{activeTab === 'ready' ? 'Last Activity' : 'Published'}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.projectId}>
                        <td className="repo-col-title">
                          <TruncatedText text={record.projectTitle} className="table-title" />
                          <span className="repo-doc-id">
                            {record.department || 'No department'} · {record.fileCount} files · {record.totalFileSize}
                          </span>
                        </td>
                        <td>{record.submittedBy || <span className="admin-note">Not on record</span>}</td>
                        <td>{record.adviserName || <span className="admin-note">Not assigned</span>}</td>
                        <td>
                          {record.adviserReviewStatus ? (
                            <span className={`status-badge ${ADVISER_REVIEW_CLASS[record.adviserReviewStatus]}`}>
                              {ADVISER_REVIEW_LABEL[record.adviserReviewStatus]}
                            </span>
                          ) : (
                            <span className="status-badge status-pending">No submission</span>
                          )}
                        </td>
                        <td>
                          {record.isPublished
                            ? record.publishedAt
                              ? new Date(record.publishedAt).toLocaleDateString()
                              : 'Published'
                            : new Date(record.lastActivityAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="repo-action-group">
                            <button className="btn btn-outline repo-btn" type="button" onClick={() => setSelectedRecord(record)}>
                              Review
                            </button>
                            {canApprove && !record.isPublished && (
                              <button
                                className="btn btn-primary repo-btn"
                                type="button"
                                disabled={publishingId === record.projectId}
                                onClick={() => handleApprove(record)}
                              >
                                {publishingId === record.projectId ? 'Publishing...' : 'Approve'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">No records in this queue match your current filters.</div>
            )}
          </section>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedRecord ? (
        <div
          className="modal show"
          onClick={(event) => event.target === event.currentTarget && setSelectedRecord(null)}
        >
          <div className="modal-content fra-review-modal">
            <div className="modal-header">
              <div>
                <h3>{selectedRecord.projectTitle}</h3>
                <p className="record-modal-meta">
                  <span className={`status-badge ${selectedRecord.isPublished ? 'status-approved' : 'status-pending'}`}>
                    {selectedRecord.isPublished ? 'Published to Repository' : 'Ready for Approval'}
                  </span>
                </p>
              </div>
              <button
                className="close-modal"
                type="button"
                aria-label="Close"
                onClick={() => setSelectedRecord(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="fra-review-layout">
                <section className="fra-review-details">
                  {[
                    ['Department', selectedRecord.department || 'Not on record'],
                    ['Submitted By', selectedRecord.submittedBy || 'Not on record'],
                    ['Adviser', selectedRecord.adviserName || 'Not assigned'],
                    ['Last Activity', new Date(selectedRecord.lastActivityAt).toLocaleDateString()],
                    ['Files', `${selectedRecord.fileCount} files (${selectedRecord.totalFileSize})`]
                  ].map(([label, value]) => (
                    <div key={label} className="fra-review-detail-item">
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </section>

                <section className="fra-approval-chain">
                  <strong className="fra-chain-title">Approval Chain</strong>
                  <div className="fra-chain-steps">
                    <div className="fra-chain-step is-complete">
                      <div className="fra-chain-icon"><i className="fas fa-user-graduate"></i></div>
                      <div>
                        <strong>Student Submission</strong>
                        <span>{selectedRecord.submittedBy || 'Not on record'}</span>
                      </div>
                    </div>
                    <div className={`fra-chain-step ${selectedRecord.adviserReviewStatus === 'APPROVED' ? 'is-complete' : selectedRecord.adviserReviewStatus === 'NEEDS_REVISION' ? 'is-returned' : 'is-pending'}`}>
                      <div className="fra-chain-icon"><i className="fas fa-chalkboard-user"></i></div>
                      <div>
                        <strong>Adviser Review</strong>
                        <span>
                          {selectedRecord.adviserName || 'Not assigned'} —{' '}
                          {selectedRecord.adviserReviewStatus ? ADVISER_REVIEW_LABEL[selectedRecord.adviserReviewStatus] : 'No submission on record'}
                        </span>
                      </div>
                    </div>
                    <div className={`fra-chain-step ${selectedRecord.isPublished ? 'is-complete' : 'is-current'}`}>
                      <div className="fra-chain-icon"><i className="fas fa-building-columns"></i></div>
                      <div>
                        <strong>Research Focal Person Approval</strong>
                        <span>
                          {selectedRecord.isPublished
                            ? `Approved — published${selectedRecord.publishedAt ? ` on ${new Date(selectedRecord.publishedAt).toLocaleDateString()}` : ''}`
                            : 'Awaiting approval'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
              {canApprove && !selectedRecord.isPublished && (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={publishingId === selectedRecord.projectId}
                  onClick={() => handleApprove(selectedRecord)}
                >
                  <i className="fas fa-circle-check"></i>
                  {publishingId === selectedRecord.projectId ? 'Publishing...' : 'Approve to Repository'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast Notification */}
      {toast ? (
        <div className={`fra-toast fra-toast-${toast.type}`} role="status">
          <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : toast.type === 'warning' ? 'triangle-exclamation' : 'info-circle'}`}></i>
          <span>{toast.message}</span>
        </div>
      ) : null}
    </>
  );
}
