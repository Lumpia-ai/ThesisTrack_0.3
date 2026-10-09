'use client';

import { useMemo, useState } from 'react';
import {
  TECH_TRANSFER_MONTHLY_ADOPTION,
  TECH_TRANSFER_REQUESTS,
  getTechTransferStatusTone,
  type TechTransferDepartment,
  type TransferRequestRecord
} from '@/components/tech-transfer/tech-transfer-data';
import {
  TechTransferButton,
  TechTransferDepartmentBadge,
  TechTransferModal,
  TechTransferStatCard,
  TechTransferStatusBadge
} from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

type NewRequestDraft = {
  project: string;
  partner: string;
  department: TechTransferDepartment;
};

const INITIAL_DRAFT: NewRequestDraft = {
  project: '',
  partner: '',
  department: 'IT'
};

export function TechTransferDashboard() {
  const [requests, setRequests] = useState<TransferRequestRecord[]>(() => [...TECH_TRANSFER_REQUESTS]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [draft, setDraft] = useState(INITIAL_DRAFT);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      return departmentFilter === 'all' || request.department === departmentFilter;
    });
  }, [departmentFilter, requests]);

  const readyCount = requests.filter((request) => request.status === 'Pending MOA').length;
  const activeMoaCount = 8 + requests.filter((request) => request.status === 'Pending MOA').length;

  const reviewedRequest = requests.find((request) => request.id === reviewId) ?? null;

  return (
    <TechTransferShell
      activeNav="dashboard"
      title="Technology Transfer Office"
      description="Facilitating innovation adoption with real-time insights"
      notificationCount={requests.filter((request) => request.status === 'Under Review').length}
    >
      <div className="stats-grid">
        <TechTransferStatCard title="Projects Ready for Transfer" value={readyCount} />
        <TechTransferStatCard title="Active MOAs" value={activeMoaCount} />
        <TechTransferStatCard title="Partners / Beneficiaries" value="15" />
        <TechTransferStatCard title="Successful Deployments" value="23" />
      </div>

      <div className="filter-bar">
        <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
          <option value="all">All Departments</option>
          <option value="IT">IT</option>
          <option value="MET">MET</option>
          <option value="TCM">TCM</option>
          <option value="ESM">ESM</option>
          <option value="NAME">NAME</option>
        </select>
        <TechTransferButton variant="primary" onClick={() => setModalOpen(true)}>
          <i aria-hidden="true" className="fas fa-plus-circle" />
          New MOA
        </TechTransferButton>
      </div>

      <section className="table-container">
        <div className="table-head">
          <div>
            <h3>Pending Transfer Requests</h3>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Department</th>
                <th>Partner / Beneficiary</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td><strong>{request.project}</strong></td>
                  <td><TechTransferDepartmentBadge>{request.department}</TechTransferDepartmentBadge></td>
                  <td>{request.partner}</td>
                  <td>{request.date}</td>
                  <td>
                    <TechTransferStatusBadge tone={getTechTransferStatusTone(request.status)}>
                      {request.status}
                    </TechTransferStatusBadge>
                  </td>
                  <td>
                    <div className="table-actions">
                      <TechTransferButton small onClick={() => setReviewId(request.id)}>
                        Review
                      </TechTransferButton>
                      {request.status === 'Pending MOA' ? (
                        <TechTransferButton
                          small
                          variant="primary"
                          onClick={() => {
                            setRequests((current) => current.filter((item) => item.id !== request.id));
                          }}
                        >
                          Process MOA
                        </TechTransferButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="chart-grid">
        <section className="summary-card">
          <h3>Tech Adoption (last 6 months)</h3>
          <div className="chart-bars">
            {TECH_TRANSFER_MONTHLY_ADOPTION.map((item) => (
              <div className="chart-bar-row" key={item.month}>
                <div className="chart-bar-label">
                  <span>{item.month}</span>
                  <span>{item.deployments} deployments</span>
                </div>
                <div className="chart-bar-track">
                  <span className="chart-bar-fill" style={{ width: `${item.deployments * 6}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="summary-card">
          <h3>MOA Growth Trend</h3>
          <div className="chart-bars">
            {TECH_TRANSFER_MONTHLY_ADOPTION.map((item) => (
              <div className="chart-bar-row" key={`${item.month}-moa`}>
                <div className="chart-bar-label">
                  <span>{item.month}</span>
                  <span>{item.moas} active MOAs</span>
                </div>
                <div className="chart-bar-track">
                  <span
                    className="chart-bar-fill"
                    style={{ width: `${item.moas * 10}%`, background: 'linear-gradient(90deg, var(--portal-secondary), var(--portal-primary))' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <TechTransferModal
        open={modalOpen}
        title="Register New MOA"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <TechTransferButton onClick={() => setModalOpen(false)}>Cancel</TechTransferButton>
            <TechTransferButton
              variant="primary"
              onClick={() => {
                if (!draft.project.trim() || !draft.partner.trim()) {
                  return;
                }

                setRequests((current) => [
                  {
                    id: Math.max(...current.map((item) => item.id), 100) + 1,
                    project: draft.project.trim(),
                    partner: draft.partner.trim(),
                    department: draft.department,
                    date: 'Apr 9, 2026',
                    status: 'Under Review'
                  },
                  ...current
                ]);
                setDraft(INITIAL_DRAFT);
                setModalOpen(false);
              }}
            >
              Create MOA
            </TechTransferButton>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="tt-dashboard-project">Project Name</label>
          <input
            id="tt-dashboard-project"
            placeholder="e.g., Smart Irrigation System"
            value={draft.project}
            onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="tt-dashboard-partner">Partner / Beneficiary</label>
          <input
            id="tt-dashboard-partner"
            placeholder="Organization name"
            value={draft.partner}
            onChange={(event) => setDraft((current) => ({ ...current, partner: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="tt-dashboard-department">Department</label>
          <select
            id="tt-dashboard-department"
            value={draft.department}
            onChange={(event) =>
              setDraft((current) => ({ ...current, department: event.target.value as TechTransferDepartment }))
            }
          >
            <option>IT</option>
            <option>MET</option>
            <option>TCM</option>
            <option>ESM</option>
            <option>NAME</option>
          </select>
        </div>
      </TechTransferModal>

      <TechTransferModal
        open={Boolean(reviewedRequest)}
        title="Transfer Request Review"
        onClose={() => setReviewId(null)}
        footer={
          <>
            <TechTransferButton onClick={() => setReviewId(null)}>Close</TechTransferButton>
            {reviewedRequest ? (
              <TechTransferButton
                variant="primary"
                onClick={() => {
                  setRequests((current) =>
                    current.map((item) =>
                      item.id === reviewedRequest.id ? { ...item, status: 'Pending MOA' } : item
                    )
                  );
                  setReviewId(null);
                }}
              >
                Approve Review
              </TechTransferButton>
            ) : null}
          </>
        }
      >
        {reviewedRequest ? (
          <>
            <p><strong>Project:</strong> {reviewedRequest.project}</p>
            <p><strong>Department:</strong> {reviewedRequest.department}</p>
            <p><strong>Partner:</strong> {reviewedRequest.partner}</p>
            <p><strong>Status:</strong> {reviewedRequest.status}</p>
            <div className="form-group">
              <label htmlFor="tt-review-notes">Review Notes</label>
              <textarea
                defaultValue="Alignment is acceptable. Complete department endorsement and move to MOA processing."
                id="tt-review-notes"
                rows={4}
              />
            </div>
          </>
        ) : null}
      </TechTransferModal>
    </TechTransferShell>
  );
}
