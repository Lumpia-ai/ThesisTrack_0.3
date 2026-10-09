'use client';

import Link from 'next/link';
import { getFilePreviewKind, getGoogleViewerUrl } from '@/lib/storage/file-preview';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { DocumentFileSummary } from '@/components/documents/document-file-controls';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import {
  REVIEW_WORKFLOW_STEPS,
  formatSubmissionDate,
  formatSubmissionDateTime,
  getAdviserReviewQueueFiles,
  toAdviserSubmissionRecord,
  type AdviserSubmissionRecord
} from '@/components/adviser/adviser-mode/data/submission-workspace-data';
import {
  SUBMISSION_STATUS_TONE,
  getDeadlineVisual
} from '@/components/adviser/adviser-mode/data/submission-workspace-sections';

type ParsedCommentBody = {
  area: string;
  text: string;
};

function getWorkspaceFileIcon(submission: AdviserSubmissionRecord) {
  const extension = submission.fileExtension.toLowerCase();

  if (extension === 'pdf') return 'fa-file-pdf';
  if (['ppt', 'pptx'].includes(extension)) return 'fa-file-powerpoint';
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'fa-file-excel';
  if (['doc', 'docx'].includes(extension)) return 'fa-file-word';

  return 'fa-file-lines';
}

function formatFileSize(size?: number | null) {
  if (!size) {
    return 'Size unavailable';
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isOfficeDocument(submission: AdviserSubmissionRecord) {
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(submission.fileExtension.toLowerCase());
}

// Only embed what a browser can show: Office via the Google viewer, PDF/images via the preview
// route. Other types return null and the page offers a download instead of auto-downloading.
function getPreviewUrl(submission: AdviserSubmissionRecord, signedUrl: string) {
  const kind = getFilePreviewKind(`file.${submission.fileExtension}`);
  if (kind === 'office') return signedUrl ? getGoogleViewerUrl(signedUrl) : null;
  if (kind === 'none') return null;
  return `/api/document-files/${submission.id}/preview`;
}

function getTimelineEvent(submission: AdviserSubmissionRecord, eventId: string) {
  return submission.timeline.find((event) => event.id === eventId) || null;
}

function getReviewStartedAt(submission: AdviserSubmissionRecord) {
  return getTimelineEvent(submission, 'under-review')?.occurredAt || submission.reviewedAt || submission.submittedAt;
}

function getApprovedAt(submission: AdviserSubmissionRecord) {
  return submission.approvedAt || getTimelineEvent(submission, 'approved')?.occurredAt || submission.reviewedAt || new Date().toISOString();
}

function getReviewDurationLabel(startedAt: string, endedAt: string) {
  const durationInMinutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));

  if (durationInMinutes < 60) {
    return `${durationInMinutes} min`;
  }

  const durationInHours = Math.round(durationInMinutes / 60);

  if (durationInHours < 24) {
    return `${durationInHours} hr${durationInHours === 1 ? '' : 's'}`;
  }

  const durationInDays = Math.round(durationInHours / 24);
  return `${durationInDays} day${durationInDays === 1 ? '' : 's'}`;
}

function getFinalAdviserRemarks(submission: AdviserSubmissionRecord) {
  return submission.comments.find((comment) => comment.category === 'Approved Remark')?.body
    || submission.latestReviewComment?.body
    || null;
}

function getApprovalActor(submission: AdviserSubmissionRecord) {
  return submission.comments.find((comment) => comment.authorName)?.authorName
    || submission.latestReviewComment?.authorName
    || 'Adviser';
}

function isSystemReviewComment(body: string) {
  const normalized = body.trim().toLowerCase();

  return normalized === 'adviser started the formal document review.'
    || normalized === 'adviser started the formal document review. student tracker now shows under adviser review.';
}

function parseCommentBody(body: string): ParsedCommentBody {
  const trimmedBody = body.trim();
  const match = trimmedBody.match(/^Area:\s*(.+?)\n\n([\s\S]*)$/i);

  if (!match) {
    return {
      area: '',
      text: trimmedBody
    };
  }

  return {
    area: match[1]?.trim() || '',
    text: match[2]?.trim() || ''
  };
}

export function AdviserSubmissionReviewWorkspace({ fileId }: { fileId: string }) {
  const [files, setFiles] = useState<DocumentFileSummary[]>([]);
  const [signedUrl, setSignedUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const file = useMemo(() => files.find((item) => item.id === fileId) || null, [fileId, files]);
  const submission = useMemo(
    () => file ? toAdviserSubmissionRecord(file, files.findIndex((item) => item.id === file.id)) : null,
    [file, files]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/document-files?bucketName=${DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS}`, {
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load review workspace.');
        }

        const nextFiles = getAdviserReviewQueueFiles(payload?.files || []);
        const selectedFile = nextFiles.find((item) => item.id === fileId) || null;

        if (!selectedFile) {
          throw new Error('The selected submission was not found in your assigned review queue.');
        }

        const signedResponse = await fetch(`/api/document-files/${fileId}/signed-url`, { method: 'POST' });
        const signedPayload = await signedResponse.json().catch(() => null);

        if (!signedResponse.ok) {
          throw new Error(signedPayload?.message || 'Unable to open the document preview.');
        }

        if (!cancelled) {
          setFiles(nextFiles);
          setSignedUrl(signedPayload.signedUrl || '');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load review workspace.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (isLoading) {
    return (
      <div className="adviser-review-workspace px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px] space-y-4">
          <div className="h-12 w-44 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-[640px] animate-pulse rounded-2xl border border-slate-100 bg-white" />
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="adviser-review-workspace px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-red-100 bg-white p-8 text-center shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <i className="fas fa-circle-exclamation text-lg" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-950">Review workspace unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'The selected submission could not be loaded.'}</p>
          <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#003A8F] px-4 text-sm font-black text-white" href="/adviser/adviser-mode/submissions">
            <i className="fas fa-arrow-left text-xs" aria-hidden="true" />
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  const status = SUBMISSION_STATUS_TONE[submission.status];
  const previewUrl = getPreviewUrl(submission, signedUrl);
  const downloadUrl = `/api/document-files/${submission.id}/download`;
  const isUnderReview = submission.status === 'under-review';
  const isApproved = submission.status === 'approved';
  const reviewStartedAt = getReviewStartedAt(submission);
  const approvedAt = getApprovedAt(submission);
  const approvalActor = getApprovalActor(submission);
  const finalRemarks = getFinalAdviserRemarks(submission);
  const adviserComments = submission.comments.filter((comment) => !isSystemReviewComment(comment.body));
  const deadline = getDeadlineVisual(submission.deadline, submission.status);

  const statusLine = isApproved
    ? `Approved by ${approvalActor} on ${formatSubmissionDateTime(approvedAt)} · reviewed in ${getReviewDurationLabel(reviewStartedAt, approvedAt)}.`
    : isUnderReview
      ? `Review started ${formatSubmissionDateTime(reviewStartedAt)}. The student sees this as under adviser review.`
      : submission.status === 'needs-revision'
        ? 'Revision requested. Waiting for the group to upload a new version.'
        : 'Waiting for your review.';

  return (
    <div className="adviser-dash adviser-rws">
      <header className="adviser-rws-head">
        <Link className="adviser-rws-back" href="/adviser/adviser-mode/submissions">
          <i className="fas fa-arrow-left" aria-hidden="true" />
          Submissions
        </Link>
        <span className="adviser-subs-file" aria-hidden="true">
          <i className={`fas ${getWorkspaceFileIcon(submission)}`} />
        </span>
        <div className="adviser-tdm-heading">
          <h1 title={submission.submissionTitle}>{submission.submissionTitle}</h1>
          <p className="adviser-tdm-meta">
            <span className="adviser-tdm-code">{submission.groupId}</span>
            <span>{submission.projectTitle}</span>
            <span>{submission.milestone}</span>
            <span>{submission.version}</span>
            <span>Submitted {formatSubmissionDate(submission.submittedAt)} by {submission.submittedBy || 'a project member'}</span>
          </p>
        </div>
        <span className="adviser-tdm-status" style={{ '--tone': status.color } as CSSProperties}>
          <span aria-hidden="true" />
          {submission.statusLabel}
        </span>
        <div className="adviser-tdm-file-actions">
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" title="Open in a new tab">
              <i className="fas fa-up-right-from-square" aria-hidden="true" />
              Open
            </a>
          ) : null}
          <a href={downloadUrl} target="_blank" rel="noreferrer" title="Download">
            <i className="fas fa-download" aria-hidden="true" />
            Download
          </a>
        </div>
      </header>

      <div className="adviser-tdm-body adviser-rws-body">
        <section className="adviser-tdm-preview" aria-label="Document preview">
          <div className="adviser-tdm-viewer">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                title={`${submission.submissionTitle} preview`}
                onLoad={() => {
                  if (signedUrl && !isOfficeDocument(submission)) {
                    URL.revokeObjectURL(signedUrl);
                  }
                }}
              />
            ) : (
              <div className="adviser-tdm-state">
                <i className="fas fa-file-circle-question" aria-hidden="true" />
                <p>No inline preview for this file type</p>
                <a href={downloadUrl} target="_blank" rel="noreferrer">Download the file instead</a>
              </div>
            )}
          </div>
        </section>

        <aside className="adviser-tdm-aside" aria-label="Review details">
          <section className="adviser-tdm-section">
            <h3>Status</h3>
            <p className="adviser-tdm-text">{statusLine}</p>
            {!isApproved && submission.deadline ? (
              <p className="adviser-subs-due" style={{ '--tone': deadline.color } as CSSProperties}>
                <i className={`fas ${deadline.icon}`} aria-hidden="true" />
                {deadline.label} · {formatSubmissionDate(submission.deadline)}
              </p>
            ) : null}
            <p className="adviser-tdm-muted">
              This page is read-only. Approve or request changes from{' '}
              <Link href="/adviser/adviser-mode/title-approvals">Title &amp; Evidence Approval</Link>.
            </p>
          </section>

          <section className="adviser-tdm-section">
            <h3>{isApproved ? 'Final remarks' : `Comments (${adviserComments.length})`}</h3>
            {isApproved ? (
              finalRemarks ? (
                <CommentBody body={finalRemarks} meta={`${approvalActor} · ${formatSubmissionDateTime(approvedAt)}`} />
              ) : (
                <p className="adviser-tdm-muted">No remarks were recorded with the approval.</p>
              )
            ) : adviserComments.length ? (
              <ul className="adviser-rws-comments">
                {adviserComments.map((comment) => (
                  <li key={comment.id}>
                    <CommentBody body={comment.body} meta={`${comment.authorName || 'Adviser'} · ${formatSubmissionDateTime(comment.createdAt)}`} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adviser-tdm-muted">No comments on this version yet.</p>
            )}
          </section>

          <section className="adviser-tdm-section">
            <h3>Review progress</h3>
            <ol className="adviser-rws-steps">
              {REVIEW_WORKFLOW_STEPS.map((step) => {
                const event = getTimelineEvent(submission, step.id);
                const isCurrent =
                  (isUnderReview && step.id === 'under-review') ||
                  (submission.status === 'needs-revision' && step.id === 'revision-requested') ||
                  (isApproved && step.id === 'approved');
                const isComplete =
                  step.id === 'submitted' || Boolean(event?.isComplete) || (isApproved && ['under-review', 'approved'].includes(step.id));
                const when = isApproved && step.id === 'approved'
                  ? formatSubmissionDateTime(approvedAt)
                  : isCurrent && isUnderReview
                    ? 'In progress'
                    : event?.isComplete
                      ? formatSubmissionDateTime(event.occurredAt)
                      : isComplete
                        ? 'Done'
                        : 'Not yet';

                return (
                  <li key={step.id} className={isCurrent ? 'is-current' : isComplete ? 'is-done' : undefined}>
                    <span aria-hidden="true">
                      <i className={`fas ${isComplete && !isCurrent ? 'fa-check' : step.icon}`} />
                    </span>
                    <div>
                      <strong>{step.id === 'approved' ? event?.label ?? step.label : step.label}</strong>
                      <small>{when}</small>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {submission.versionHistory.length > 1 ? (
            <section className="adviser-tdm-section">
              <h3>Versions</h3>
              <ul className="adviser-tdm-list">
                {submission.versionHistory.map((version) => (
                  <li key={version.id}>
                    <span>
                      {version.version} · {formatSubmissionDate(version.uploadedAt)} · {version.uploader}
                    </span>
                    {version.isCurrent ? <strong>Current</strong> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="adviser-tdm-section">
            <h3>File</h3>
            <dl className="adviser-rws-facts">
              <div>
                <dt>Type</dt>
                <dd>{submission.fileExtension ? submission.fileExtension.toUpperCase() : 'Document'}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatFileSize(file?.fileSize)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{submission.documentCategory}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CommentBody({ body, meta }: { body: string; meta: string }) {
  const parsed = parseCommentBody(body);
  return (
    <div className="adviser-rws-comment">
      {parsed.area ? (
        <span className="adviser-rws-area">
          <i className="fas fa-location-dot" aria-hidden="true" />
          {parsed.area}
        </span>
      ) : null}
      <p className="adviser-tdm-text">{parsed.text}</p>
      <small>{meta}</small>
    </div>
  );
}
