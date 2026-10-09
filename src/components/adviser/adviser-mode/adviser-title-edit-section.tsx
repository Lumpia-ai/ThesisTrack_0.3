'use client';

import { useEffect, useState } from 'react';

// Adviser-only title correction panel inside the title review drawer.
// Students are permanently locked after submitting (src/lib/title-lock.ts), so
// this is where a submitted title or backup title changes. Editing never
// schedules a new Concept Presentation; that stays an explicit defense action.

type Backup = { id: string; title: string; description: string | null };
type HistoryEntry = {
  id: string;
  previousTitle: string;
  updatedTitle: string;
  target: 'primary' | 'backup';
  remarks: string | null;
  changedBy: string;
  changedAt: string;
};

function formatChangedAt(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
}

export function AdviserTitleEditSection({
  projectId,
  onTitleChanged,
  onMessage
}: {
  projectId: string;
  onTitleChanged: (title: string) => void;
  onMessage: (message: string, type: 'success' | 'error') => void;
}) {
  const [currentTitle, setCurrentTitle] = useState('');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 'primary' | backup id | null — which title is currently being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [remarks, setRemarks] = useState('');
  const [confirmPromoteId, setConfirmPromoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/title-submissions/${projectId}/title`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to load this group’s titles.');
      }

      setCurrentTitle(payload.title || '');
      setBackups(payload.backups || []);
      setHistory(payload.history || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load this group’s titles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setEditingId(null);
    setConfirmPromoteId(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setDraftText(text);
    setRemarks('');
    setConfirmPromoteId(null);
  };

  const run = async (request: () => Promise<Response>, successMessage: string, nextPrimary?: string) => {
    setIsSaving(true);

    try {
      const response = await request();
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save the title change.');
      }

      if (nextPrimary) {
        onTitleChanged(nextPrimary);
      }

      setEditingId(null);
      setConfirmPromoteId(null);
      onMessage(successMessage, 'success');
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Unable to save the title change.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const savePrimary = () => {
    const title = draftText.trim();
    run(
      () =>
        fetch(`/api/title-submissions/${projectId}/title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, remarks })
        }),
      'Title updated. The group stays locked and has been notified.',
      title
    );
  };

  const saveBackup = (backupId: string) => {
    run(
      () =>
        fetch('/api/title-drafts/adviser', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: backupId, decision: 'edit', title: draftText.trim(), remarks })
        }),
      'Backup title updated.'
    );
  };

  const promoteBackup = (backup: Backup) => {
    run(
      () =>
        fetch(`/api/title-submissions/${projectId}/title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupDraftId: backup.id, remarks })
        }),
      `"${backup.title}" is now the primary title. The previous title moved to the backups.`,
      backup.title
    );
  };

  const editor = (onSave: () => void) => (
    <div className="adviser-title-edit-form">
      <textarea
        className="adviser-tdm-textarea"
        rows={2}
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
        aria-label="Corrected title"
      />
      <textarea
        className="adviser-tdm-textarea"
        rows={2}
        placeholder="Reason for the change (optional, shown to the group)"
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        aria-label="Reason for the change"
      />
      <div className="adviser-tdm-actions">
        <button type="button" className="adviser-tdm-btn is-primary" disabled={isSaving || !draftText.trim()} onClick={onSave}>
          <i className="fas fa-floppy-disk" aria-hidden="true" />
          {isSaving ? 'Saving…' : 'Save title'}
        </button>
        <button type="button" className="adviser-tdm-btn" disabled={isSaving} onClick={() => setEditingId(null)}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <section className="adviser-tdm-section">
      <h3>Edit title</h3>
      <p className="adviser-tdm-note">
        The group can&apos;t edit their submitted titles. Only you can correct the title or switch to a backup. This does not
        schedule a new Concept Presentation.
      </p>

      {isLoading ? (
        <p className="adviser-tdm-muted">Loading titles…</p>
      ) : loadError ? (
        <p className="adviser-tdm-muted">{loadError}</p>
      ) : (
        <>
          <label className="adviser-tdm-label">Primary title</label>
          {editingId === 'primary' ? (
            editor(savePrimary)
          ) : (
            <div className="adviser-title-edit-row">
              <span>{currentTitle}</span>
              <button type="button" className="adviser-tdm-btn" disabled={isSaving} onClick={() => startEdit('primary', currentTitle)}>
                <i className="fas fa-pen" aria-hidden="true" />
                Edit
              </button>
            </div>
          )}

          <label className="adviser-tdm-label">Backup titles</label>
          {backups.length ? (
            <ol className="adviser-title-edit-backups">
              {backups.map((backup) => (
                <li key={backup.id}>
                  {editingId === backup.id ? (
                    editor(() => saveBackup(backup.id))
                  ) : (
                    <div className="adviser-title-edit-row">
                      <span>{backup.title}</span>
                      <div className="adviser-title-edit-row-actions">
                        {confirmPromoteId === backup.id ? (
                          <>
                            <button type="button" className="adviser-tdm-btn is-primary" disabled={isSaving} onClick={() => promoteBackup(backup)}>
                              Confirm switch
                            </button>
                            <button type="button" className="adviser-tdm-btn" disabled={isSaving} onClick={() => setConfirmPromoteId(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="adviser-tdm-btn"
                              disabled={isSaving}
                              title="Make this the primary title; the current primary moves to the backups"
                              onClick={() => {
                                setEditingId(null);
                                setRemarks('');
                                setConfirmPromoteId(backup.id);
                              }}
                            >
                              <i className="fas fa-arrow-up" aria-hidden="true" />
                              Use as primary
                            </button>
                            <button type="button" className="adviser-tdm-btn" disabled={isSaving} onClick={() => startEdit(backup.id, backup.title)}>
                              <i className="fas fa-pen" aria-hidden="true" />
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="adviser-tdm-muted">No backup titles were submitted.</p>
          )}

          {history.length ? (
            <>
              <label className="adviser-tdm-label">Change history</label>
              <ul className="adviser-title-edit-history">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <small>
                      {entry.target === 'primary' ? 'Primary' : 'Backup'} · {entry.changedBy} · {formatChangedAt(entry.changedAt)}
                    </small>
                    <s>{entry.previousTitle}</s>
                    <strong>{entry.updatedTitle}</strong>
                    {entry.remarks ? <em>“{entry.remarks}”</em> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
