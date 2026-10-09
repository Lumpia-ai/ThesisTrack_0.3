'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TechTransferButton,
  TechTransferDepartmentBadge,
  TechTransferModal,
  TechTransferStatCard,
  TechTransferStatusBadge
} from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

type DeploymentStatus = 'PROPOSED' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

type DeploymentRecord = {
  projectId: string;
  title: string;
  department: string | null;
  publishedToRepository: boolean;
  status: DeploymentStatus | null;
  partnerName: string | null;
  partnerEmail: string | null;
  contactPerson: string | null;
  moaUrl: string | null;
  deploymentDate: string | null;
};

const STATUS_LABELS: Record<DeploymentStatus, string> = {
  PROPOSED: 'Proposed',
  ACTIVE: 'Active Deployment',
  COMPLETED: 'Deployed & Completed',
  TERMINATED: 'Terminated'
};

function getStatusTone(status: DeploymentStatus | null) {
  switch (status) {
    case 'ACTIVE':
    case 'COMPLETED':
      return 'deployed' as const;
    case 'TERMINATED':
      return 'danger' as const;
    case 'PROPOSED':
      return 'pending' as const;
    default:
      return 'active' as const;
  }
}

const EMPTY_FORM = {
  projectId: '',
  partnerName: '',
  partnerEmail: '',
  contactPerson: '',
  status: 'PROPOSED' as DeploymentStatus,
  deploymentDate: '',
  moaUrl: ''
};

export function TechTransferDeployment() {
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function loadDeployments() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/tech-transfer/deployments');
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to load deployment records.');
      }

      setDeployments(payload.deployments);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDeployments();
  }, []);

  const filteredDeployments = useMemo(() => {
    return deployments.filter((deployment) => {
      const matchesDepartment = departmentFilter === 'all' || deployment.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;
      return matchesDepartment && matchesStatus;
    });
  }, [departmentFilter, deployments, statusFilter]);

  const activeCount = deployments.filter((item) => item.status === 'ACTIVE' || item.status === 'COMPLETED').length;
  const proposedCount = deployments.filter((item) => item.status === 'PROPOSED').length;
  const notYetCount = deployments.filter((item) => !item.status).length;

  function openRecordModal(deployment?: DeploymentRecord) {
    setSubmitError(null);
    setFieldErrors({});

    if (deployment) {
      setForm({
        projectId: deployment.projectId,
        partnerName: deployment.partnerName || '',
        partnerEmail: deployment.partnerEmail || '',
        contactPerson: deployment.contactPerson || '',
        status: deployment.status || 'PROPOSED',
        deploymentDate: deployment.deploymentDate ? deployment.deploymentDate.slice(0, 10) : '',
        moaUrl: deployment.moaUrl || ''
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setRecordModalOpen(true);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/tech-transfer/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        throw new Error(payload.message || 'Unable to save this deployment record.');
      }

      setRecordModalOpen(false);
      await loadDeployments();
    } catch (error) {
      setSubmitError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TechTransferShell
      activeNav="deployment"
      title="Deployment Tracking"
      description="Record real industry adoption for published research so guests can see the evidence"
      notificationCount={0}
    >
      <div className="filter-bar">
        <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
          <option value="all">All Departments</option>
          <option value="IT">IT</option>
          <option value="MET">MET</option>
          <option value="TCM">TCM</option>
          <option value="ESM">ESM</option>
          <option value="NAME">NAME</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Statuses</option>
          <option value="PROPOSED">Proposed</option>
          <option value="ACTIVE">Active Deployment</option>
          <option value="COMPLETED">Deployed &amp; Completed</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <TechTransferButton variant="primary" onClick={() => openRecordModal()}>
          <i aria-hidden="true" className="fas fa-plus" />
          Record Deployment
        </TechTransferButton>
      </div>

      <div className="stats-grid">
        <TechTransferStatCard title="Eligible Projects" value={deployments.length} />
        <TechTransferStatCard title="Active or Completed" value={activeCount} />
        <TechTransferStatCard title="Proposed" value={proposedCount} />
        <TechTransferStatCard title="Not Yet Deployed" value={notYetCount} />
      </div>

      <section className="table-container">
        <div className="table-head">
          <div>
            <h3>Deployment Portfolio</h3>
            <p>Only projects with an APPROVED, DEFENSE_SCHEDULED, COMPLETED, or ARCHIVED status are eligible.</p>
          </div>
        </div>

        {loadError ? (
          <div className="modal-body">
            <p>{loadError}</p>
          </div>
        ) : isLoading ? (
          <div className="modal-body">
            <p>Loading deployment records...</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Department</th>
                  <th>In Repository</th>
                  <th>Partner Company</th>
                  <th>Deployment Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeployments.map((deployment) => (
                  <tr key={deployment.projectId}>
                    <td>{deployment.title}</td>
                    <td>{deployment.department ? <TechTransferDepartmentBadge>{deployment.department}</TechTransferDepartmentBadge> : '—'}</td>
                    <td>{deployment.publishedToRepository ? 'Yes' : 'Not published yet'}</td>
                    <td>{deployment.partnerName || '—'}</td>
                    <td>{deployment.deploymentDate ? new Date(deployment.deploymentDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <TechTransferStatusBadge tone={getStatusTone(deployment.status)}>
                        {deployment.status ? STATUS_LABELS[deployment.status] : 'Not Yet Deployed'}
                      </TechTransferStatusBadge>
                    </td>
                    <td>
                      <TechTransferButton small onClick={() => openRecordModal(deployment)}>
                        {deployment.status ? 'Update' : 'Record'}
                      </TechTransferButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TechTransferModal
        open={recordModalOpen}
        title="Record Deployment"
        onClose={() => setRecordModalOpen(false)}
        footer={
          <>
            <TechTransferButton onClick={() => setRecordModalOpen(false)}>Cancel</TechTransferButton>
            <TechTransferButton variant="primary" onClick={handleSubmit}>
              {isSubmitting ? 'Saving...' : 'Save Deployment'}
            </TechTransferButton>
          </>
        }
      >
        {submitError ? <p style={{ color: '#B91C1C' }}>{submitError}</p> : null}

        <div className="form-group">
          <label htmlFor="tt-deploy-project">Project</label>
          <select
            id="tt-deploy-project"
            value={form.projectId}
            onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
          >
            <option value="">Select a project</option>
            {deployments.map((deployment) => (
              <option key={deployment.projectId} value={deployment.projectId}>{deployment.title}</option>
            ))}
          </select>
          {fieldErrors.projectId ? <p style={{ color: '#B91C1C' }}>{fieldErrors.projectId}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="tt-deploy-partner">Partner Organization</label>
          <input
            id="tt-deploy-partner"
            value={form.partnerName}
            onChange={(event) => setForm((current) => ({ ...current, partnerName: event.target.value }))}
          />
          {fieldErrors.partnerName ? <p style={{ color: '#B91C1C' }}>{fieldErrors.partnerName}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="tt-deploy-email">Partner Contact Email</label>
          <input
            id="tt-deploy-email"
            type="email"
            value={form.partnerEmail}
            onChange={(event) => setForm((current) => ({ ...current, partnerEmail: event.target.value }))}
          />
          {fieldErrors.partnerEmail ? <p style={{ color: '#B91C1C' }}>{fieldErrors.partnerEmail}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="tt-deploy-contact">Contact Person (optional)</label>
          <input
            id="tt-deploy-contact"
            value={form.contactPerson}
            onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="tt-deploy-status">Status</label>
          <select
            id="tt-deploy-status"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as DeploymentStatus }))}
          >
            <option value="PROPOSED">Proposed</option>
            <option value="ACTIVE">Active Deployment</option>
            <option value="COMPLETED">Deployed &amp; Completed</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          {fieldErrors.status ? <p style={{ color: '#B91C1C' }}>{fieldErrors.status}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="tt-deploy-date">Deployment Date (optional)</label>
          <input
            id="tt-deploy-date"
            type="date"
            value={form.deploymentDate}
            onChange={(event) => setForm((current) => ({ ...current, deploymentDate: event.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="tt-deploy-moa">MOA Link (optional)</label>
          <input
            id="tt-deploy-moa"
            type="url"
            placeholder="https://..."
            value={form.moaUrl}
            onChange={(event) => setForm((current) => ({ ...current, moaUrl: event.target.value }))}
          />
          <p className="inline-note">Link to where the signed MOA is stored. Guests browsing the public repository will see this link if the project is published.</p>
        </div>
      </TechTransferModal>
    </TechTransferShell>
  );
}
