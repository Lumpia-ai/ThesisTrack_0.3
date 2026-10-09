'use client';

import Link from 'next/link';
import { FocalPersonShell } from '@/components/focal-person/focal-person-shell';
import { canForward, formatDateTime } from '@/components/focal-person/focal-person-data';
import { useFocalProjects } from '@/components/focal-person/focal-person-store';
import { ProgressCell, ScopeNotice, ValidationBadge, projectHref } from '@/components/focal-person/focal-person-ui';

export function FocalPersonReturned() {
  const { loading, scope, items } = useFocalProjects();
  const returned = items
    .filter((item) => item.workflow.status === 'Returned')
    .sort(
      (left, right) =>
        new Date(right.workflow.lastReturn?.returnedAt ?? 0).getTime() - new Date(left.workflow.lastReturn?.returnedAt ?? 0).getTime()
    );

  return (
    <FocalPersonShell activeNav="returned" title="Returned / Needs Revision">
      <div className="admin-page-stack repo-page focal-page">
        <header className="repo-page-header">
          <div>
            <h1>Returned / Needs Revision</h1>
            <p className="admin-note">
              Projects the Research Head returned. Coordinate the corrections with the researchers, adviser, or Program Head, then forward again.
            </p>
          </div>
        </header>

        <ScopeNotice loading={loading} scope={scope} />

        {!loading && scope ? (
          returned.length ? (
            <div className="focal-returned-list">
              {returned.map((item) => {
                const { project, workflow, validation, documents } = item;
                const details = workflow.lastReturn;
                const verified = project.documents.filter((document) => document.status === 'Verified').length;

                return (
                  <article key={project.id} className="admin-section-card focal-returned-card">
                    <header className="focal-returned-card-head">
                      <div>
                        <Link className="focal-link" href={projectHref(project.id)}>
                          <strong>{project.title}</strong>
                        </Link>
                        <span className="repo-doc-id">{project.id} · {project.program} · {project.researchers.join(', ')}</span>
                      </div>
                      <div className="record-modal-meta">
                        <span className="status-badge status-critical">Returned</span>
                        <ValidationBadge complete={validation.complete} />
                      </div>
                    </header>

                    <dl className="record-details-list record-details-list--4">
                      <div className="record-details-wide">
                        <dt>Reason for Return</dt>
                        <dd>{details?.reason ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Date Returned</dt>
                        <dd>{formatDateTime(details?.returnedAt)}</dd>
                      </div>
                      <div>
                        <dt>Returned By</dt>
                        <dd>{details?.returnedBy ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Current Progress</dt>
                        <dd><ProgressCell value={project.progressValue} label={project.milestone} /></dd>
                      </div>
                      <div>
                        <dt>Supporting Documents</dt>
                        <dd>
                          {project.documents.length} files · {verified} verified · {documents.label} required
                        </dd>
                      </div>
                      <div className="record-details-wide">
                        <dt>Research Head&apos;s Comments</dt>
                        <dd className="focal-abstract">{details?.comments || 'No comments.'}</dd>
                      </div>
                      <div className="record-details-wide">
                        <dt>Required Corrections</dt>
                        <dd>
                          {details?.requiredCorrections.length ? (
                            <ul className="record-list">
                              {details.requiredCorrections.map((correction) => <li key={correction}>{correction}</li>)}
                            </ul>
                          ) : (
                            'None listed.'
                          )}
                        </dd>
                      </div>
                    </dl>

                    <footer className="focal-returned-card-foot">
                      <span className="admin-note">
                        {canForward(item)
                          ? 'The checklist is complete. This project can be forwarded again.'
                          : `${validation.missing.length} requirement${validation.missing.length === 1 ? '' : 's'} still missing.`}
                      </span>
                      <span className="repo-action-group">
                        <Link className="btn btn-outline repo-btn" href={projectHref(project.id, 'documents')}>
                          Documents
                        </Link>
                        <Link className="btn btn-primary repo-btn" href={projectHref(project.id, 'validation')}>
                          {canForward(item) ? 'Review & Forward Again' : 'Review Requirements'}
                        </Link>
                      </span>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : (
            <section className="admin-section-card repo-records">
              <div className="admin-empty-state">No projects are currently returned for revision.</div>
            </section>
          )
        ) : null}
      </div>
    </FocalPersonShell>
  );
}
