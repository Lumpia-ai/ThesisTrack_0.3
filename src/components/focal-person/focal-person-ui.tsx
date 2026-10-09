'use client';

import Link from 'next/link';
import { TruncatedText } from '@/components/shared/truncated-text';
import {
  formatDate,
  formatDateTime,
  type FocalProject,
  type HistoryEntry,
  type WorkflowStatus
} from '@/components/focal-person/focal-person-data';
import { findInventoryRecord } from '@/components/research-head/research-head-projects-data';

const WORKFLOW_BADGE: Record<WorkflowStatus, { label: string; className: string }> = {
  'Pending Validation': { label: 'Pending Validation', className: 'status-pending' },
  'Forwarded to Research Head': { label: 'Forwarded', className: 'status-info' },
  Returned: { label: 'Returned', className: 'status-critical' },
  Approved: { label: 'Approved', className: 'status-approved' }
};

export function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  const badge = WORKFLOW_BADGE[status];
  return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
}

export function ValidationBadge({ complete }: { complete: boolean }) {
  return (
    <span className={`status-badge ${complete ? 'status-approved' : 'status-review'}`}>
      <i className={`fas ${complete ? 'fa-check' : 'fa-exclamation'}`} aria-hidden="true"></i> {complete ? 'Complete' : 'Incomplete'}
    </span>
  );
}

export function ResearchStateBadge({ state }: { state: 'Ongoing' | 'Completed' }) {
  return <span className={`status-badge ${state === 'Completed' ? 'status-approved' : 'status-neutral'}`}>{state}</span>;
}

export function ProgressCell({ value, label }: { value: number; label?: string }) {
  return (
    <div className="repo-milestone-cell">
      {label ? <TruncatedText text={label} /> : null}
      <div className="repo-milestone-progress">
        <div className="admin-progress-track">
          <div className="admin-progress-bar" style={{ width: `${value}%` }}></div>
        </div>
        <span>{value}%</span>
      </div>
    </div>
  );
}

export const projectHref = (projectId: string, tab?: string) =>
  `/focal-person/projects/${encodeURIComponent(projectId)}${tab ? `?tab=${tab}` : ''}`;

type ProjectsTableProps = {
  rows: FocalProject[];
  // 'workflow' shows the workflow status; 'validation' shows the validation result instead
  // (used on Pending Validation, where every row has the same workflow status).
  statusColumn?: 'workflow' | 'validation';
  emptyMessage: string;
};

export function FocalProjectsTable({ rows, statusColumn = 'workflow', emptyMessage }: ProjectsTableProps) {
  if (!rows.length) {
    return <div className="admin-empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-scroll">
      <table className="repo-table focal-table">
        <thead>
          <tr>
            <th>Project Title</th>
            <th>Researcher(s)</th>
            <th>Adviser</th>
            <th>Program</th>
            <th>Research Type</th>
            <th>Current Stage</th>
            <th>Overall Progress</th>
            <th>Documents</th>
            <th>{statusColumn === 'workflow' ? 'Current Status' : 'Validation'}</th>
            <th>Last Updated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ project, workflow, validation, documents, researchState }) => (
            <tr key={project.id}>
              <td className="repo-col-title">
                <TruncatedText text={project.title} className="table-title" />
                <span className="repo-doc-id">
                  {project.id} · {researchState}
                </span>
              </td>
              <td className="repo-col-people">
                <TruncatedText text={project.researchers.join(', ')} />
              </td>
              <td>{project.adviser}</td>
              <td><span className="dept-badge">{project.program}</span></td>
              <td>{project.researchType}</td>
              <td className="repo-col-milestone"><TruncatedText text={project.milestone} /></td>
              <td className="focal-col-progress"><ProgressCell value={project.progressValue} /></td>
              <td>
                <span className={documents.provided === documents.required ? 'focal-doc-ok' : 'focal-doc-missing'}>
                  {documents.label} required
                </span>
              </td>
              <td>
                {statusColumn === 'workflow' ? (
                  <WorkflowBadge status={workflow.status} />
                ) : (
                  <ValidationBadge complete={validation.complete} />
                )}
              </td>
              <td>{formatDate(project.lastUpdated)}</td>
              <td>
                <Link className="btn btn-outline repo-btn" href={projectHref(project.id)} aria-label={`Open ${project.title}`}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const sortHistory = (entries: HistoryEntry[]) =>
  [...entries].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

export function HistoryTable({ entries, showProject = false }: { entries: HistoryEntry[]; showProject?: boolean }) {
  if (!entries.length) {
    return <div className="admin-empty-state">No validation history recorded yet.</div>;
  }

  return (
    <div className="table-scroll">
      <table className="repo-table focal-history-table">
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            {showProject ? <th>Project</th> : null}
            <th>Action</th>
            <th>Person Responsible</th>
            <th>Previous Status</th>
            <th>New Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {sortHistory(entries).map((entry) => {
            const project = showProject ? findInventoryRecord(entry.projectId) : null;

            return (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.at)}</td>
                {showProject ? (
                  <td className="repo-col-project">
                    <Link className="focal-link" href={projectHref(entry.projectId, 'history')}>
                      <TruncatedText text={project?.title ?? entry.projectId} />
                    </Link>
                  </td>
                ) : null}
                <td><strong>{entry.action}</strong></td>
                <td>
                  {entry.actor}
                  <span className="repo-doc-id">{entry.actorRole}</span>
                </td>
                <td>{entry.previousStatus}</td>
                <td>{entry.newStatus}</td>
                <td className="focal-col-remarks">{entry.remarks || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ScopeNotice({ loading, scope }: { loading: boolean; scope: string | null }) {
  if (loading) {
    return <div className="admin-empty-state">Loading your assigned program…</div>;
  }

  if (!scope) {
    return (
      <div className="repo-import-notice" role="status">
        <i className="fas fa-circle-info" aria-hidden="true"></i>
        <div>
          <strong>No program assigned to your account</strong>
          <p>Ask the System Administrator to set your program or department so its research projects appear here.</p>
        </div>
      </div>
    );
  }

  return null;
}
