import { memo, useEffect, useRef, useState } from 'react';
import type { PortalRole, ProjectFileRecord } from '@/components/students/student-project-files.shared';
import {
  formatProjectFileDate,
  formatProjectFileAdviserStatus,
  getProjectFileCategoryLabel,
  getProjectFileTone,
  getProjectFileTypeIcon,
  getProjectFileVersionLabel,
  isProjectFileApproveAllowed,
  isProjectFileDeleteAllowed
} from '@/components/students/student-project-files.shared';

type FileItemProps = {
  file: ProjectFileRecord;
  currentUserRole: PortalRole;
  currentUserId: string;
  onView: (file: ProjectFileRecord) => void;
  onDownload: (file: ProjectFileRecord) => void;
  onDelete: (file: ProjectFileRecord) => void;
  onApprove: (file: ProjectFileRecord) => void;
  onViewHistory: (file: ProjectFileRecord) => void;
  onViewComments?: (file: ProjectFileRecord) => void;
  variant?: 'row' | 'repository';
};

type RowMenuAction = { label: string; icon: string; onSelect: () => void; danger?: boolean };

// Three-dot row menu. The table scrolls horizontally, which would clip a
// normal absolutely-positioned dropdown, so the menu is fixed-positioned
// from the button's on-screen rect and closes on scroll/resize/outside click.
function RowActionsMenu({ label, actions }: { label: string; actions: RowMenuAction[] }) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!position) return;

    const close = () => setPosition(null);
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [position]);

  const toggle = () => {
    if (position) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        aria-label={`Actions for ${label}`}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${
          position ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-[var(--text-meta)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
        }`}
      >
        <i className="fas fa-ellipsis-vertical" aria-hidden="true" />
      </button>
      {position ? (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: position.top, right: position.right }}
          className="z-50 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setPosition(null);
                action.onSelect();
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition ${
                action.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-[var(--text)] hover:bg-[var(--surface-alt)]'
              }`}
            >
              <i className={`fas ${action.icon} w-4 text-center text-xs ${action.danger ? '' : 'text-[var(--text-meta)]'}`} aria-hidden="true" />
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

// Status as a dot + dark text: easier to read than pale pills in a long list.
const STATUS_TEXT_TONE: Record<'success' | 'warning' | 'danger' | 'info', string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
  info: 'text-blue-700'
};

export const FileItem = memo(function FileItem({
  file,
  currentUserRole,
  currentUserId,
  onView,
  onDownload,
  onDelete,
  onApprove,
  onViewHistory,
  onViewComments,
  variant = 'row'
}: FileItemProps) {
  const categoryLabel = (file.label || getProjectFileCategoryLabel(file.category));
  const statusTone = getProjectFileTone(file.status);
  const showDelete = isProjectFileDeleteAllowed(file, currentUserRole, currentUserId);
  const showApprove = isProjectFileApproveAllowed(file, currentUserRole);
  const versionLabel = getProjectFileVersionLabel(file);

  if (variant === 'repository') {
    return (
      <article className="project-files-repository-item">
        <div className="project-files-repository-head">
          <span className="project-files-repository-lock">
            <i className="fas fa-lock" aria-hidden="true" />
          </span>
          <div className="project-files-repository-copy">
            <strong>{file.fileName}</strong>
            <p className="project-files-repository-subcopy">
              <span>{categoryLabel}</span>
              <span>{file.sizeLabel}</span>
            </p>
          </div>
          <div className="chip-row project-files-repository-badges">
            <span className="ui-badge is-success">
              <i className="fas fa-circle-check" aria-hidden="true" /> Final Approved Version
            </span>
            <span className="project-files-version-badge">{versionLabel}</span>
          </div>
        </div>

        <div className="project-files-repository-meta">
          <span><i className="fas fa-user" aria-hidden="true" /> {file.uploadedBy}</span>
          <span><i className="fas fa-calendar-days" aria-hidden="true" /> Verified {formatProjectFileDate(file.reviewedAt || file.uploadedAt)}</span>
          {file.reviewedBy ? <span><i className="fas fa-user-check" aria-hidden="true" /> {file.reviewedBy}</span> : null}
        </div>

        <p className="project-files-repository-note">{file.versionNotes}</p>

        <div className="project-files-repository-actions">
          <button className="table-btn" type="button" onClick={() => onView(file)}>
            <i className="fas fa-eye" aria-hidden="true" /> View
          </button>
          <button className="table-btn" type="button" onClick={() => onViewHistory(file)}>
            <i className="fas fa-clock-rotate-left" aria-hidden="true" /> View History
          </button>
          <button className="table-btn" type="button" onClick={() => onDownload(file)}>
            <i className="fas fa-download" aria-hidden="true" /> Download
          </button>
        </div>
      </article>
    );
  }

  // One row = one document: name with its category/version underneath, a
  // single status badge (the old mini progress tracker repeated it), who
  // uploaded it and when, and the actions.
  const uploadedAt = new Date(file.uploadedAt);
  // Short stage name for the Stage column ("Concept", "Proposal", ...).
  // Pre-Final is no longer a stage; older files filed under it count as Final.
  const rawStageName = file.stageLabel || (file.label?.includes(' · ') ? file.label.split(' · ')[0] : null);
  const stageName = rawStageName === 'Pre-Final' ? 'Final' : rawStageName;
  // Days a file has been waiting for an adviser decision.
  const isWaiting = !file.isSuperseded && (file.status === 'pending' || file.status === 'under_review');
  const waitingDays = isWaiting && Number.isFinite(uploadedAt.getTime())
    ? Math.max(0, Math.floor((Date.now() - uploadedAt.getTime()) / 86_400_000))
    : null;

  return (
    <tr className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-alt)]${file.isSuperseded ? ' opacity-60' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Clicking the file (icon or name) opens the in-page preview. */}
          <button
            type="button"
            onClick={() => onView(file)}
            aria-label={`Preview ${file.fileName}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100"
          >
            <i className={`fas ${getProjectFileTypeIcon(file.fileName, file.fileType)}`} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            {/* Name with a small comment chip beside it; one plain details line below. */}
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onView(file)}
                className="min-w-0 truncate text-left text-sm font-bold text-[var(--text)] transition hover:text-[var(--primary)] hover:underline"
                title={`Preview ${file.fileName}`}
              >
                {file.fileName}
              </button>
              {file.reviewComments?.length && !file.isSuperseded ? (
                <button
                  type="button"
                  onClick={() => (onViewComments ?? onViewHistory)(file)}
                  title={`Read ${file.reviewComments.length} adviser comment${file.reviewComments.length === 1 ? '' : 's'}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#003A8F] transition hover:bg-blue-100"
                >
                  <i className="fas fa-comment text-[9px]" aria-hidden="true" />
                  {file.reviewComments.length}
                </button>
              ) : null}
            </div>
            <span className="block truncate text-xs text-[var(--muted)]">
              {categoryLabel} · {versionLabel}
            </span>
            {file.status === 'rejected' && file.rejectionReason && !file.isSuperseded ? (
              <p className="mt-0.5 text-xs font-semibold text-red-600">{file.rejectionReason}</p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {stageName ? (
          <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{stageName}</span>
        ) : (
          <span className="text-xs text-[var(--text-meta)]">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {file.isSuperseded ? (
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-meta)]" title="Replaced by a newer submission">
            <span className="h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
            Replaced
          </span>
        ) : (
          <span className={`inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold ${STATUS_TEXT_TONE[statusTone]}`}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
            {formatProjectFileAdviserStatus(file.status, file)}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {/* Who reviewed it and when — or how long it has been waiting. */}
        {file.reviewedAt ? (
          <>
            <span className="block text-[13px] font-semibold text-[var(--text)]">{formatProjectFileDate(file.reviewedAt)}</span>
            <span className="block truncate text-xs text-[var(--muted)]">{file.reviewedBy ? `by ${file.reviewedBy}` : 'Reviewed'}</span>
          </>
        ) : waitingDays !== null ? (
          <span className={`text-xs font-semibold ${waitingDays >= 7 ? 'text-amber-700' : 'text-[var(--muted)]'}`}>
            <i className="fas fa-hourglass-half mr-1 text-[10px]" aria-hidden="true" />
            Waiting · {waitingDays === 0 ? 'today' : `${waitingDays} day${waitingDays === 1 ? '' : 's'}`}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-meta)]">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="block text-[13px] font-semibold text-[var(--text)]">{formatProjectFileDate(file.uploadedAt)}</span>
        <span className="block text-xs text-[var(--muted)]">
          {Number.isFinite(uploadedAt.getTime()) ? uploadedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
          {file.uploadedBy ? ` · ${file.uploadedBy}` : ''}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)] whitespace-nowrap">{file.sizeLabel || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
        <RowActionsMenu
          label={file.fileName}
          actions={[
            { label: 'Version history', icon: 'fa-clock-rotate-left', onSelect: () => onViewHistory(file) },
            ...(showApprove ? [{ label: 'Approve', icon: 'fa-circle-check', onSelect: () => onApprove(file) }] : []),
            ...(showDelete ? [{ label: 'Delete', icon: 'fa-trash-can', onSelect: () => onDelete(file), danger: true }] : [])
          ]}
        />
        </div>
      </td>
    </tr>
  );
});
