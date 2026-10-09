'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FocalPersonShell } from '@/components/focal-person/focal-person-shell';
import {
  FORWARDABLE_STATUSES,
  canForward,
  formatDateTime,
  getMilestoneSummary,
  isProjectInScope,
  resolveFocalProject,
  type FocalProject
} from '@/components/focal-person/focal-person-data';
import {
  forwardToResearchHead,
  saveValidationNote,
  useFocalScope,
  useWorkflowState
} from '@/components/focal-person/focal-person-store';
import {
  HistoryTable,
  ProgressCell,
  ResearchStateBadge,
  ScopeNotice,
  ValidationBadge,
  WorkflowBadge
} from '@/components/focal-person/focal-person-ui';
import { findInventoryRecord, type InventoryDocument } from '@/components/research-head/research-head-projects-data';
import { TruncatedText } from '@/components/shared/truncated-text';

const TABS = [
  { key: 'information', label: 'Project Information' },
  { key: 'progress', label: 'Progress Monitoring' },
  { key: 'documents', label: 'Supporting Documents' },
  { key: 'validation', label: 'Validation' },
  { key: 'history', label: 'History' }
] as const;

type ProjectDetailsTab = (typeof TABS)[number]['key'];

const isProjectDetailsTab = (value: string | undefined): value is ProjectDetailsTab =>
  TABS.some((tab) => tab.key === value);

const MILESTONE_BADGE = { Completed: 'status-approved', Ongoing: 'status-info', Pending: 'status-neutral' } as const;
const DOCUMENT_BADGE = { Verified: 'status-approved', 'Pending Verification': 'status-pending', Rejected: 'status-critical' } as const;

export function FocalPersonProjectDetails({ projectId, initialTab }: { projectId: string; initialTab?: string }) {
  const { loading, scope } = useFocalScope();
  const state = useWorkflowState();
  const [tab, setTab] = useState<ProjectDetailsTab>(isProjectDetailsTab(initialTab) ? initialTab : 'information');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const project = findInventoryRecord(projectId);
  // A focal person can open only projects in their assigned program.
  const inScope = Boolean(project && scope && isProjectInScope(project, scope));
  const item = useMemo(() => (project && inScope ? resolveFocalProject(state, project) : null), [inScope, project, state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleForward = () => {
    const result = forwardToResearchHead(projectId);
    setConfirmOpen(false);
    setToast(
      result.ok
        ? { message: 'Project forwarded to the Research Head. They have been notified.', tone: 'success' }
        : { message: result.error, tone: 'error' }
    );
  };

  return (
    <FocalPersonShell activeNav="projects" title="Project Details">
      <div className="admin-page-stack repo-page focal-page">
        <Link className="focal-back-link" href="/focal-person/projects">
          <i className="fas fa-arrow-left" aria-hidden="true"></i> Research Projects
        </Link>

        <ScopeNotice loading={loading} scope={scope} />

        {!loading && scope && !item ? (
          <div className="admin-empty-state">
            This project was not found in your assigned program ({scope}).
          </div>
        ) : null}

        {item ? (
          <>
            <ProjectHeader item={item} onForward={() => setConfirmOpen(true)} onShowValidation={() => setTab('validation')} />

            {item.workflow.status === 'Returned' && item.workflow.lastReturn ? <ReturnedBanner item={item} /> : null}

            <section className="admin-section-card repo-records">
              <div className="admin-section-head repo-records-head">
                <div className="fra-tabs-bar" role="tablist" aria-label="Project record sections">
                  {TABS.map((entry) => (
                    <button
                      key={entry.key}
                      aria-selected={tab === entry.key}
                      className={`fra-tab${tab === entry.key ? ' is-active' : ''}`}
                      role="tab"
                      type="button"
                      onClick={() => setTab(entry.key)}
                    >
                      {entry.label}
                      {entry.key === 'validation' ? (
                        <span className="fra-tab-count">{item.validation.items.filter((check) => check.passed).length}/{item.validation.items.length}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
              <div className="focal-tab-panel" role="tabpanel">
                {tab === 'information' ? <InformationTab item={item} /> : null}
                {tab === 'progress' ? <ProgressTab item={item} /> : null}
                {tab === 'documents' ? <DocumentsTab item={item} /> : null}
                {tab === 'validation' ? <ValidationTab item={item} onForward={() => setConfirmOpen(true)} onSaved={(message, tone) => setToast({ message, tone })} /> : null}
                {tab === 'history' ? <HistoryTable entries={state.history.filter((entry) => entry.projectId === projectId)} /> : null}
              </div>
            </section>
          </>
        ) : null}
      </div>

      {confirmOpen && item ? <ForwardModal item={item} onCancel={() => setConfirmOpen(false)} onConfirm={handleForward} /> : null}

      {toast ? (
        <div className="notification-toast" role="status">
          <i
            className={`fas ${toast.tone === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`}
            style={{ color: toast.tone === 'success' ? 'var(--success)' : 'var(--danger)' }}
            aria-hidden="true"
          ></i>
          <span>{toast.message}</span>
        </div>
      ) : null}
    </FocalPersonShell>
  );
}

function ForwardAction({ item, onForward, onShowValidation }: { item: FocalProject; onForward: () => void; onShowValidation?: () => void }) {
  const { workflow, validation } = item;

  if (workflow.status === 'Forwarded to Research Head') {
    return (
      <p className="focal-action-hint">
        <i className="fas fa-share-from-square" aria-hidden="true"></i> Forwarded {formatDateTime(workflow.forward?.forwardedAt)} by {workflow.forward?.forwardedBy}. It can be forwarded again only if the Research Head returns it.
      </p>
    );
  }

  if (workflow.status === 'Approved') {
    return (
      <p className="focal-action-hint">
        <i className="fas fa-circle-check" aria-hidden="true"></i> Approved by the Research Head {formatDateTime(workflow.decidedAt)}.
      </p>
    );
  }

  return (
    <div className="focal-forward-action">
      <button className="btn btn-primary repo-btn" type="button" disabled={!canForward(item)} onClick={onForward}>
        <i className="fas fa-share-from-square" aria-hidden="true"></i>
        {workflow.status === 'Returned' ? 'Forward Again to Research Head' : 'Forward to Research Head'}
      </button>
      {!validation.complete ? (
        <span className="focal-action-hint">
          {validation.missing.length} requirement{validation.missing.length === 1 ? '' : 's'} missing.{' '}
          {onShowValidation ? (
            <button className="focal-inline-link" type="button" onClick={onShowValidation}>
              See what to complete
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function ProjectHeader({ item, onForward, onShowValidation }: { item: FocalProject; onForward: () => void; onShowValidation: () => void }) {
  const { project, workflow, validation, researchState } = item;

  return (
    <header className="focal-project-header">
      <div className="focal-project-heading">
        <h1>{project.title}</h1>
        <p className="record-modal-meta">
          <span className="repo-doc-id">{project.id} · {project.program}</span>
          <WorkflowBadge status={workflow.status} />
          <ValidationBadge complete={validation.complete} />
          <ResearchStateBadge state={researchState} />
        </p>
      </div>
      <ForwardAction item={item} onForward={onForward} onShowValidation={onShowValidation} />
    </header>
  );
}

function ReturnedBanner({ item }: { item: FocalProject }) {
  const returned = item.workflow.lastReturn!;

  return (
    <section className="focal-returned-banner" aria-label="Returned by Research Head">
      <div className="focal-returned-head">
        <i className="fas fa-rotate-left" aria-hidden="true"></i>
        <strong>Returned by {returned.returnedBy}</strong>
        <span className="admin-note">{formatDateTime(returned.returnedAt)}</span>
      </div>
      <p><strong>Reason:</strong> {returned.reason}</p>
      {returned.comments ? <p><strong>Comments:</strong> {returned.comments}</p> : null}
      {returned.requiredCorrections.length ? (
        <div>
          <strong>Required corrections</strong>
          <ul className="record-list">
            {returned.requiredCorrections.map((correction) => <li key={correction}>{correction}</li>)}
          </ul>
        </div>
      ) : null}
      <p className="admin-note">
        Coordinate the corrections with the researchers, adviser, or Program Head. Once the checklist is complete, forward the project again.
      </p>
    </section>
  );
}

function InformationTab({ item }: { item: FocalProject }) {
  const { project } = item;

  return (
    <div className="record-modal-section">
      <dl className="record-details-list record-details-list--3">
        <div className="record-details-wide">
          <dt>Title</dt>
          <dd>{project.title}</dd>
        </div>
        <div>
          <dt>Researchers</dt>
          <dd>{project.researchers.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt>Adviser</dt>
          <dd>{project.adviser || '—'}</dd>
        </div>
        <div>
          <dt>Program</dt>
          <dd>{project.program}</dd>
        </div>
        <div>
          <dt>Research Type</dt>
          <dd>{project.researchType || '—'}</dd>
        </div>
        <div>
          <dt>Date Started</dt>
          <dd>{project.dateStarted || '—'}</dd>
        </div>
        <div>
          <dt>Current Research Stage</dt>
          <dd>{project.milestone}</dd>
        </div>
        <div className="record-details-wide">
          <dt>Abstract / Description</dt>
          <dd className="focal-abstract">{project.abstract || '—'}</dd>
        </div>
        <div className="record-details-wide">
          <dt>Keywords</dt>
          <dd>{project.keywords || '—'}</dd>
        </div>
      </dl>
      <p className="admin-note focal-readonly-note">
        <i className="fas fa-lock" aria-hidden="true"></i> From Project Inventory. Official project information is maintained by the researchers, adviser, and Program Head.
      </p>
    </div>
  );
}

function ProgressTab({ item }: { item: FocalProject }) {
  const { project } = item;
  const summary = getMilestoneSummary(project);

  return (
    <div className="record-modal-section">
      <div className="focal-progress-summary">
        <div className="focal-progress-overall">
          <span className="admin-note">Overall completion</span>
          <ProgressCell value={project.progressValue} />
        </div>
        <dl className="focal-milestone-counts">
          <div><dt>Completed</dt><dd>{summary.completed}</dd></div>
          <div><dt>Ongoing</dt><dd>{summary.ongoing}</dd></div>
          <div><dt>Pending</dt><dd>{summary.pending}</dd></div>
        </dl>
      </div>

      {project.milestones.length ? (
        <div className="table-scroll">
          <table className="repo-table focal-compact-table">
            <thead>
              <tr>
                <th>Project Stage</th>
                <th>Status</th>
                <th>Target Date</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {project.milestones.map((milestone) => (
                <tr key={milestone.title}>
                  <td><strong>{milestone.title}</strong></td>
                  <td><span className={`status-badge ${MILESTONE_BADGE[milestone.status]}`}>{milestone.status}</span></td>
                  <td>{milestone.dueDate}</td>
                  <td>
                    {milestone.completedDate ?? (milestone.status === 'Completed' ? <span className="focal-doc-missing">Date missing</span> : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">No project stages are recorded in Progress Monitoring.</div>
      )}
      <p className="admin-note focal-readonly-note">
        <i className="fas fa-lock" aria-hidden="true"></i> From Progress Monitoring (read-only). Milestones are updated by the research group and adviser.
      </p>
    </div>
  );
}

function DocumentActions({ document }: { document: InventoryDocument }) {
  if (!document.fileId) {
    return (
      <span className="repo-action-group">
        <button className="btn btn-outline repo-btn repo-btn-sm" type="button" disabled title="No stored file is linked to this record yet.">View</button>
        <button className="btn btn-outline repo-btn repo-btn-sm" type="button" disabled title="No stored file is linked to this record yet.">Download</button>
      </span>
    );
  }

  const id = encodeURIComponent(document.fileId);

  return (
    <span className="repo-action-group">
      <a className="btn btn-outline repo-btn repo-btn-sm" href={`/api/document-files/${id}/preview`} target="_blank" rel="noreferrer">View</a>
      <a className="btn btn-outline repo-btn repo-btn-sm" href={`/api/document-files/${id}/download`}>Download</a>
    </span>
  );
}

function DocumentsTab({ item }: { item: FocalProject }) {
  const { project, documents } = item;

  return (
    <div className="record-modal-section">
      <p className="record-doc-summary">
        <span className={`status-badge ${documents.provided === documents.required ? 'status-approved' : 'status-review'}`}>
          {documents.label} required documents
        </span>
        {documents.missingTypes.length ? <span className="admin-note">Missing: {documents.missingTypes.join(', ')}</span> : null}
      </p>

      {project.documents.length ? (
        <div className="table-scroll">
          <table className="repo-table focal-compact-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Upload Date</th>
                <th>Uploaded By</th>
                <th>Verification</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {project.documents.map((document) => (
                <tr key={document.name}>
                  <td className="repo-col-name"><TruncatedText text={document.name} /></td>
                  <td><span className="repo-type-pill">{document.type}</span></td>
                  <td>{document.uploadedAt}</td>
                  <td>{document.uploadedBy}</td>
                  <td><span className={`status-badge ${DOCUMENT_BADGE[document.status]}`}>{document.status}</span></td>
                  <td><DocumentActions document={document} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">No supporting documents are associated with this project.</div>
      )}
      <p className="admin-note focal-readonly-note">
        <i className="fas fa-lock" aria-hidden="true"></i> Documents already stored with the project. Review them here; uploads are made by the research group.
      </p>
    </div>
  );
}

function ValidationTab({
  item,
  onForward,
  onSaved
}: {
  item: FocalProject;
  onForward: () => void;
  onSaved: (message: string, tone: 'success' | 'error') => void;
}) {
  const { validation, workflow } = item;
  const [note, setNote] = useState(workflow.validationNote);
  const editable = FORWARDABLE_STATUSES.includes(workflow.status);

  useEffect(() => setNote(workflow.validationNote), [workflow.validationNote]);

  const saveNote = () => {
    const result = saveValidationNote(item.project.id, note);
    onSaved(result.ok ? 'Validation note saved.' : result.error, result.ok ? 'success' : 'error');
  };

  return (
    <div className="focal-validation">
      <div className={`focal-validation-result ${validation.complete ? 'is-complete' : 'is-incomplete'}`}>
        <i className={`fas ${validation.complete ? 'fa-circle-check' : 'fa-circle-exclamation'}`} aria-hidden="true"></i>
        <div>
          <strong>{validation.complete ? 'Complete' : 'Incomplete'}</strong>
          <span>
            {validation.complete
              ? 'All required information and documents are present.'
              : `${validation.missing.length} item${validation.missing.length === 1 ? '' : 's'} must be completed before forwarding.`}
          </span>
        </div>
      </div>

      <ul className="focal-checklist" aria-label="Validation checklist">
        {validation.items.map((check) => (
          <li key={check.key} className={check.passed ? 'is-passed' : 'is-failed'}>
            <i className={`fas ${check.passed ? 'fa-square-check' : 'fa-square-xmark'}`} aria-hidden="true"></i>
            <div>
              <span className="focal-checklist-label">
                {check.label}
                <span className="sr-only">{check.passed ? ' (complete)' : ' (incomplete)'}</span>
              </span>
              {check.missing.length ? (
                <ul className="focal-checklist-missing">
                  {check.missing.map((missing) => <li key={missing}>{missing}</li>)}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="form-group focal-note">
        <label htmlFor="validation-note">Validation Note</label>
        <textarea
          id="validation-note"
          maxLength={500}
          placeholder={validation.complete ? 'Optional remarks for the Research Head…' : 'Explain what is missing or incorrect…'}
          readOnly={!editable}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="focal-note-actions">
          <span className="admin-note">
            {editable ? `${note.length}/500` : 'Notes are locked while the project is with the Research Head.'}
          </span>
          {editable ? (
            <button className="btn btn-outline repo-btn" type="button" disabled={note.trim() === workflow.validationNote} onClick={saveNote}>
              Save Note
            </button>
          ) : null}
        </div>
      </div>

      <ForwardAction
        item={item}
        onForward={() => {
          // Carry an unsaved note into the forward record.
          if (editable && note.trim() !== workflow.validationNote) {
            saveValidationNote(item.project.id, note);
          }
          onForward();
        }}
      />
    </div>
  );
}

function ForwardModal({ item, onCancel, onConfirm }: { item: FocalProject; onCancel: () => void; onConfirm: () => void }) {
  const { project, workflow, documents, validation } = item;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  return (
    <div className="modal show" onClick={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="modal-content record-modal" role="dialog" aria-modal="true" aria-labelledby="forward-modal-title">
        <div className="modal-header">
          <div>
            <h3 id="forward-modal-title">Forward to Research Head</h3>
            <p>The Research Head will be notified and will make the final decision.</p>
          </div>
          <button className="close-modal" type="button" aria-label="Close" onClick={onCancel}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <dl className="record-details-list">
            <div className="record-details-wide">
              <dt>Project Title</dt>
              <dd>{project.title}</dd>
            </div>
            <div>
              <dt>Current Progress</dt>
              <dd>{project.progressValue}% · {project.milestone}</dd>
            </div>
            <div>
              <dt>Document Completion</dt>
              <dd>{documents.label} required documents</dd>
            </div>
            <div>
              <dt>Validation Result</dt>
              <dd><ValidationBadge complete={validation.complete} /></dd>
            </div>
            <div>
              <dt>Status After Forwarding</dt>
              <dd>Forwarded to Research Head</dd>
            </div>
            <div className="record-details-wide">
              <dt>Validation Notes</dt>
              <dd>{workflow.validationNote || 'No validation notes.'}</dd>
            </div>
          </dl>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" disabled={!canForward(item)} onClick={onConfirm}>
            <i className="fas fa-share-from-square" aria-hidden="true"></i> Confirm &amp; Forward
          </button>
        </div>
      </div>
    </div>
  );
}
