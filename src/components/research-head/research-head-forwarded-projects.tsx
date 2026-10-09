'use client';

import { useEffect, useMemo, useState } from 'react';
import { TruncatedText } from '@/components/shared/truncated-text';
import { getStoredUser } from '@/lib/mock/auth';
import { INVENTORY_RECORDS } from '@/components/research-head/research-head-projects-data';
import {
  formatDateTime,
  getValidationResult,
  getWorkflowRecord,
  type WorkflowRecord
} from '@/components/focal-person/focal-person-data';
import {
  approveForwardedProject,
  returnForwardedProject,
  useWorkflowState
} from '@/components/focal-person/focal-person-store';
import type { InventoryRecord } from '@/components/research-head/research-head-projects-data';

type ForwardedItem = { project: InventoryRecord; workflow: WorkflowRecord };

// Projects the Research Focal Person validated and forwarded. The decision (approve or return)
// belongs to the Research Head; the focal person is notified either way.
export function ResearchHeadForwardedProjects() {
  const state = useWorkflowState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const forwarded = useMemo<ForwardedItem[]>(
    () =>
      INVENTORY_RECORDS.map((project) => ({ project, workflow: getWorkflowRecord(state, project.id) }))
        .filter((item) => item.workflow.status === 'Forwarded to Research Head')
        .sort(
          (left, right) =>
            new Date(right.workflow.forward?.forwardedAt ?? 0).getTime() - new Date(left.workflow.forward?.forwardedAt ?? 0).getTime()
        ),
    [state]
  );

  const selected = forwarded.find((item) => item.project.id === selectedId) ?? null;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <section className="admin-section-card repo-records">
      <div className="admin-section-head repo-records-head">
        <h3>Forwarded by Research Focal Person</h3>
        <span className={`status-badge ${forwarded.length ? 'status-pending' : 'status-neutral'}`}>
          {forwarded.length ? `${forwarded.length} awaiting decision` : 'None waiting'}
        </span>
      </div>

      {forwarded.length ? (
        <div className="table-scroll">
          <table className="repo-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Program</th>
                <th>Forwarded By</th>
                <th>Forwarded On</th>
                <th>Progress</th>
                <th>Documents</th>
                <th>Validation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forwarded.map(({ project, workflow }) => (
                <tr key={project.id}>
                  <td className="repo-col-title">
                    <TruncatedText text={project.title} className="table-title" />
                    <span className="repo-doc-id">{project.id} · {project.adviser}</span>
                  </td>
                  <td><span className="dept-badge">{project.program}</span></td>
                  <td>{workflow.forward?.forwardedBy ?? '—'}</td>
                  <td>{formatDateTime(workflow.forward?.forwardedAt)}</td>
                  <td>{project.progressValue}%</td>
                  <td>{workflow.forward?.documentCompletion ?? '—'} required</td>
                  <td><span className="status-badge status-approved">{workflow.forward?.validationResult ?? 'Complete'}</span></td>
                  <td>
                    <button className="btn btn-outline repo-btn" type="button" onClick={() => setSelectedId(project.id)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">No projects are waiting for your decision.</div>
      )}

      {selected ? (
        <ForwardedReviewModal
          item={selected}
          onClose={() => setSelectedId(null)}
          onDone={(text) => {
            setSelectedId(null);
            setMessage(text);
          }}
        />
      ) : null}

      {message ? (
        <div className="notification-toast" role="status">
          <i className="fas fa-check-circle" style={{ color: 'var(--success)' }} aria-hidden="true"></i>
          <span>{message}</span>
        </div>
      ) : null}
    </section>
  );
}

function ForwardedReviewModal({
  item,
  onClose,
  onDone
}: {
  item: ForwardedItem;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { project, workflow } = item;
  const [mode, setMode] = useState<'review' | 'return'>('review');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [corrections, setCorrections] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const validation = getValidationResult(project);

  useEffect(() => {
    // The decision is the Research Head's; other roles that can open this portal only view.
    const role = getStoredUser()?.role;
    setCanDecide(role === 'research_head' || role === 'admin');

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const approve = () => {
    const result = approveForwardedProject(project.id, remarks);
    if (result.ok) onDone('Project approved. The Research Focal Person was notified.');
    else setError(result.error);
  };

  const sendBack = () => {
    const result = returnForwardedProject(project.id, {
      reason,
      comments,
      requiredCorrections: corrections.split('\n')
    });
    if (result.ok) onDone('Project returned for revision. The Research Focal Person was notified.');
    else setError(result.error);
  };

  return (
    <div className="modal show" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content record-modal" role="dialog" aria-modal="true" aria-labelledby="forwarded-review-title">
        <div className="modal-header">
          <div>
            <h3 id="forwarded-review-title">{project.title}</h3>
            <p className="record-modal-meta">
              <span>{project.id} · {project.program}</span>
              <span className="status-badge status-info">Forwarded</span>
            </p>
          </div>
          <button className="close-modal" type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <section className="record-modal-section">
            <h4>Focal Person Validation</h4>
            <dl className="record-details-list">
              <div>
                <dt>Forwarded By</dt>
                <dd>{workflow.forward?.forwardedBy ?? '—'}</dd>
              </div>
              <div>
                <dt>Forwarded On</dt>
                <dd>{formatDateTime(workflow.forward?.forwardedAt)}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>{project.progressValue}% · {project.milestone}</dd>
              </div>
              <div>
                <dt>Document Completion</dt>
                <dd>{workflow.forward?.documentCompletion ?? '—'} required documents</dd>
              </div>
              <div>
                <dt>Current Checklist</dt>
                <dd>
                  <span className={`status-badge ${validation.complete ? 'status-approved' : 'status-review'}`}>
                    {validation.complete ? 'Complete' : `${validation.missing.length} missing`}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Researchers</dt>
                <dd>{project.researchers.join(', ')}</dd>
              </div>
              <div className="record-details-wide">
                <dt>Validation Notes</dt>
                <dd>{workflow.forward?.notes || 'No validation notes.'}</dd>
              </div>
            </dl>
          </section>

          {canDecide && mode === 'review' ? (
            <div className="form-group">
              <label htmlFor="forwarded-remarks">Approval remarks (optional)</label>
              <textarea id="forwarded-remarks" rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            </div>
          ) : null}

          {canDecide && mode === 'return' ? (
            <section className="record-modal-section">
              <h4>Return for Revision</h4>
              <div className="form-group">
                <label htmlFor="return-reason">Reason for return</label>
                <input id="return-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="return-comments">Comments</label>
                <textarea id="return-comments" rows={3} value={comments} onChange={(event) => setComments(event.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="return-corrections">Required corrections (one per line)</label>
                <textarea id="return-corrections" rows={3} value={corrections} onChange={(event) => setCorrections(event.target.value)} />
              </div>
            </section>
          ) : null}

          {!canDecide ? <p className="admin-note">Only the Research Head can approve or return forwarded projects.</p> : null}
          {error ? <p className="admin-field-error" role="alert">{error}</p> : null}
        </div>
        <div className="modal-footer">
          {mode === 'return' ? (
            <>
              <button className="btn btn-outline" type="button" onClick={() => setMode('review')}>
                Back
              </button>
              <button className="btn btn-primary" type="button" disabled={!reason.trim()} onClick={sendBack}>
                Return to Focal Person
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-outline" type="button" onClick={onClose}>
                Close
              </button>
              {canDecide ? (
                <>
                  <button className="btn btn-outline" type="button" onClick={() => setMode('return')}>
                    Return for Revision
                  </button>
                  <button className="btn btn-primary" type="button" onClick={approve}>
                    Approve
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
