'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  formatIsoDateLabel,
  isImageFileByName,
  type ApiAcademicActivity,
  type ApiAcademicActivityFile
} from '@/components/students/student-academic-activity.shared';

function formatFileSize(size: number | null) {
  if (!size) {
    return 'Size unavailable';
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function EvidenceFileCard({ file }: { file: ApiAcademicActivityFile }) {
  const isImage = isImageFileByName(file.fileName, file.fileType);

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] transition hover:border-blue-300 hover:shadow-sm"
    >
      <div className="flex h-28 items-center justify-center overflow-hidden bg-[var(--surface)]">
        {isImage ? (
          <img src={file.previewUrl} alt={file.fileName} className="h-full w-full object-cover" />
        ) : (
          <i className="fas fa-file-lines text-3xl text-[var(--text-meta)]" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[var(--text)]">{file.fileName}</p>
          <p className="text-[10px] text-[var(--muted)]">{formatFileSize(file.size)}</p>
        </div>
        <i className="fas fa-up-right-from-square shrink-0 text-[10px] text-[var(--text-meta)] transition group-hover:text-brand" aria-hidden="true" />
      </div>
    </a>
  );
}

function MetaField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
        <i className={`fas ${icon}`} aria-hidden="true" /> {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

export function AcademicActivityDetailModal({
  activity,
  onClose,
  onDelete
}: {
  activity: ApiAcademicActivity | null;
  onClose: () => void;
  onDelete?: (activityId: string) => void;
}) {
  // Rendered via a portal straight to document.body — .student-shell (an
  // ancestor of this component wherever it's used) has a backdrop-filter on
  // it, which creates a new CSS containing block for anything position:fixed
  // inside it. Without the portal, the modal's fixed overlay gets trapped to
  // that ancestor's box instead of the real viewport, so the sidebar and top
  // nav render on top of it instead of being covered.
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!activity) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('is-modal-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('is-modal-open');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(activity)]);

  if (!activity || !isMounted) {
    return null;
  }

  return createPortal(
    <div className="modal-shell is-open" role="presentation">
      <button className="modal-backdrop" type="button" aria-label="Close activity details" onClick={onClose} />
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-detail-title"
        style={{ width: 'min(46rem, calc(100vw - 2rem))' }}
      >
        <button className="modal-close" type="button" aria-label="Close activity details" onClick={onClose}>
          <i className="fas fa-times" aria-hidden="true" />
        </button>
        <div className="modal-content">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="section-kicker">{activity.activityType}</span>
              <h3 id="activity-detail-title" className="mt-1.5 text-xl font-black text-[var(--text)]">{activity.eventName}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{activity.description || 'No description provided.'}</p>
            </div>
            {activity.markAsAchievement ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700">
                <i className="fas fa-award" aria-hidden="true" /> Achievement
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetaField icon="fa-calendar-day" label="Date" value={formatIsoDateLabel(activity.eventDate || activity.createdAt)} />
            <MetaField icon="fa-location-dot" label="Venue" value={activity.venue || 'To be announced'} />
            <MetaField icon="fa-circle-check" label="Status" value={activity.status} />
            <MetaField icon="fa-globe" label="Scope" value={activity.scope} />
            <MetaField icon="fa-diagram-project" label="Related Project Stage" value={activity.relatedMilestone || 'Not linked'} />
            <MetaField icon="fa-users" label="Participants" value={activity.participantsOrBeneficiary || 'Not specified'} />
            {activity.createdByName ? (
              <MetaField icon="fa-user" label="Logged By" value={activity.createdByName} />
            ) : null}
            <MetaField icon="fa-timeline" label="On Timeline" value={activity.addToTimeline ? 'Yes' : 'No'} />
          </div>

          <div className="mt-6">
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-meta)]">
              <i className="fas fa-paperclip" aria-hidden="true" /> Evidence {activity.files.length ? `(${activity.files.length})` : ''}
            </p>
            {activity.files.length ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activity.files.map((file) => (
                  <EvidenceFileCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">No evidence file attached to this activity.</p>
            )}
          </div>

          <div className="form-actions mt-6 border-t border-[var(--border)] pt-5">
            {onDelete ? (
              <button
                className="btn btn-secondary"
                type="button"
                style={{ color: '#be123c' }}
                onClick={() => {
                  onDelete(activity.id);
                  onClose();
                }}
              >
                <i className="fas fa-trash-can" aria-hidden="true" /> Remove Activity
              </button>
            ) : <span />}
            <button className="btn btn-primary" type="button" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
