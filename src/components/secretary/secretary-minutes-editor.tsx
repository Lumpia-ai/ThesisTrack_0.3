'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SecretaryShell } from '@/components/secretary/secretary-shell';
import {
  STAGE_META,
  VERDICTS,
  formatDate,
  formatDateTime,
  formatTime,
  type MinutesRecord,
  type Verdict
} from '@/components/secretary/secretary-data';
import { useSecretary } from '@/components/secretary/secretary-store';
import { MinutesDocument } from '@/components/secretary/secretary-minutes-document';
import { StageTag, StatusDot } from '@/components/secretary/secretary-ui';

const EDITABLE = new Set(['To Record', 'Draft', 'Returned']);

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;

function missingFields(minutes: MinutesRecord) {
  const missing: string[] = [];
  if (!minutes.calledToOrder) missing.push('time called to order');
  if (!minutes.adjourned) missing.push('time adjourned');
  if (!minutes.attendees.some((person) => person.present)) missing.push('attendance');
  if (!minutes.presentationSummary.trim()) missing.push('presentation summary');
  if (!minutes.verdict) missing.push('verdict');
  return missing;
}

export function SecretaryMinutesEditor({ meetingId }: { meetingId: string }) {
  const { meetings, saveMinutes, submitToChair } = useSecretary();
  const meeting = meetings.find((item) => item.id === meetingId);
  const [draft, setDraft] = useState<MinutesRecord | null>(meeting?.minutes ?? null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'emerald' | 'rose'; text: string } | null>(null);

  // Pick up stored (localStorage) minutes once the store hydrates, unless the user has started typing.
  useEffect(() => {
    if (meeting && !dirty) setDraft(meeting.minutes);
  }, [dirty, meeting]);

  if (!meeting || !draft) {
    return (
      <SecretaryShell activeNav="meetings" title="Minutes of Meeting">
        <div className="admin-page-stack repo-page secretary-page">
          <Link className="secretary-back-link" href="/secretary/meetings">
            <i className="fas fa-arrow-left" aria-hidden="true"></i> Back to Defense Meetings
          </Link>
          <div className="admin-empty-state">This defense meeting was not found.</div>
        </div>
      </SecretaryShell>
    );
  }

  const editable = EDITABLE.has(meeting.status);
  const update = (patch: Partial<MinutesRecord>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setNotice(null);
  };

  const handleSave = () => {
    saveMinutes(meeting.id, draft);
    setDirty(false);
    setNotice({ tone: 'emerald', text: 'Draft saved.' });
  };

  const handleSubmit = () => {
    const missing = missingFields(draft);
    if (missing.length) {
      setNotice({ tone: 'rose', text: `Complete the ${missing.join(', ')} before submitting.` });
      return;
    }
    submitToChair(meeting.id, draft);
    setDirty(false);
    setNotice({ tone: 'emerald', text: `Submitted to ${meeting.chair} for confirmation.` });
  };

  const breadcrumb = (
    <Link className="secretary-back-link" href="/secretary/meetings">
      <i className="fas fa-arrow-left" aria-hidden="true"></i> Back to Defense Meetings
    </Link>
  );

  const header = (
    <header className="repo-page-header secretary-meeting-header">
      <div>
        <StageTag stage={meeting.stage} />
        <h1>{meeting.title}</h1>
        <p className="admin-note">
          {meeting.groupName} · {formatDate(meeting.date)}, {formatTime(meeting.date)} · {meeting.venue}
        </p>
        <p className="admin-note">
          Chair: {meeting.chair} · Members: {meeting.members.join(', ')} · Adviser: {meeting.adviser}
        </p>
      </div>
      <div className="repo-page-actions secretary-header-actions">
        <StatusDot status={meeting.status} />
        {!editable && meeting.status !== 'Upcoming' ? (
          <button className="btn btn-outline repo-btn" type="button" onClick={() => window.print()}>
            <i className="fas fa-print" aria-hidden="true"></i> Print Report
          </button>
        ) : null}
      </div>
    </header>
  );

  if (meeting.status === 'Upcoming') {
    return (
      <SecretaryShell activeNav="meetings" title="Minutes of Meeting">
        <div className="admin-page-stack repo-page secretary-page">
          {breadcrumb}
          {header}
          <div className="repo-import-notice" role="status">
            <i className="fas fa-lock" aria-hidden="true"></i>
            <div>
              <strong>Minutes open on the day of the defense</strong>
              <p>
                This {STAGE_META[meeting.stage].label.toLowerCase()} is scheduled for {formatDateTime(meeting.date)}. You can record the minutes once
                the panel chair starts the session.
              </p>
            </div>
          </div>
        </div>
      </SecretaryShell>
    );
  }

  if (!editable) {
    return (
      <SecretaryShell activeNav="meetings" title="Minutes of Meeting">
        <div className="admin-page-stack repo-page secretary-page">
          {breadcrumb}
          {header}
          {notice ? <p className={`secretary-notice secretary-tone-${notice.tone}`} role="status">{notice.text}</p> : null}
          {meeting.status === 'Submitted to Chair' ? (
            <div className="repo-import-notice" role="status">
              <i className="fas fa-hourglass-half" aria-hidden="true"></i>
              <div>
                <strong>Waiting for the panel chair</strong>
                <p>{meeting.chair} will confirm these minutes as the official record, or return them to you for correction.</p>
              </div>
            </div>
          ) : null}
          <MinutesDocument meeting={meeting} />
        </div>
      </SecretaryShell>
    );
  }

  const presentCount = draft.attendees.filter((person) => person.present).length;

  return (
    <SecretaryShell activeNav="meetings" title="Minutes of Meeting">
      <div className="admin-page-stack repo-page secretary-page">
        {breadcrumb}
        {header}

        {meeting.status === 'Returned' && draft.chairNote ? (
          <div className="secretary-chair-note" role="alert">
            <i className="fas fa-rotate-left" aria-hidden="true"></i>
            <div>
              <strong>Returned by {meeting.chair}</strong>
              <p>{draft.chairNote}</p>
            </div>
          </div>
        ) : null}

        <div className="secretary-editor-grid">
          <div className="secretary-editor-main">
            <section className="admin-section-card secretary-editor-card">
              <div className="admin-section-head repo-records-head">
                <h3><i className="fas fa-clock" aria-hidden="true"></i> Session Time</h3>
              </div>
              <div className="secretary-field-row">
                <label className="secretary-field">
                  <span>Called to order</span>
                  <input className="repo-filter-input" type="time" value={draft.calledToOrder} onChange={(event) => update({ calledToOrder: event.target.value })} />
                </label>
                <label className="secretary-field">
                  <span>Adjourned</span>
                  <input className="repo-filter-input" type="time" value={draft.adjourned} onChange={(event) => update({ adjourned: event.target.value })} />
                </label>
              </div>
            </section>

            <section className="admin-section-card secretary-editor-card">
              <div className="admin-section-head repo-records-head">
                <h3><i className="fas fa-person-chalkboard" aria-hidden="true"></i> Presentation Summary</h3>
              </div>
              <textarea
                className="secretary-textarea"
                rows={5}
                placeholder="What the proponents presented: scope, objectives, methods, results or demo."
                value={draft.presentationSummary}
                onChange={(event) => update({ presentationSummary: event.target.value })}
              />
            </section>

            <section className="admin-section-card secretary-editor-card">
              <div className="admin-section-head repo-records-head">
                <h3><i className="fas fa-comments" aria-hidden="true"></i> Questions and Answers</h3>
                <button
                  className="btn btn-outline repo-btn repo-btn-sm"
                  type="button"
                  onClick={() => update({ questions: [...draft.questions, { id: newId('q'), askedBy: meeting.chair, question: '', response: '' }] })}
                >
                  <i className="fas fa-plus" aria-hidden="true"></i> Add Question
                </button>
              </div>
              {draft.questions.length ? (
                <ol className="secretary-entry-list">
                  {draft.questions.map((item, index) => (
                    <li key={item.id} className="secretary-entry">
                      <div className="secretary-entry-head">
                        <span className="secretary-entry-index">Q{index + 1}</span>
                        <select
                          className="repo-filter-select"
                          aria-label="Asked by"
                          value={item.askedBy}
                          onChange={(event) =>
                            update({ questions: draft.questions.map((entry) => (entry.id === item.id ? { ...entry, askedBy: event.target.value } : entry)) })
                          }
                        >
                          {[meeting.chair, ...meeting.members, meeting.adviser].map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <button
                          className="secretary-icon-btn"
                          type="button"
                          aria-label={`Remove question ${index + 1}`}
                          onClick={() => update({ questions: draft.questions.filter((entry) => entry.id !== item.id) })}
                        >
                          <i className="fas fa-trash-can" aria-hidden="true"></i>
                        </button>
                      </div>
                      <textarea
                        className="secretary-textarea"
                        rows={2}
                        placeholder="Question"
                        value={item.question}
                        onChange={(event) =>
                          update({ questions: draft.questions.map((entry) => (entry.id === item.id ? { ...entry, question: event.target.value } : entry)) })
                        }
                      />
                      <textarea
                        className="secretary-textarea"
                        rows={2}
                        placeholder="Proponents' response"
                        value={item.response}
                        onChange={(event) =>
                          update({ questions: draft.questions.map((entry) => (entry.id === item.id ? { ...entry, response: event.target.value } : entry)) })
                        }
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="admin-empty-state">No questions recorded yet.</div>
              )}
            </section>

            <section className="admin-section-card secretary-editor-card">
              <div className="admin-section-head repo-records-head">
                <h3><i className="fas fa-list-check" aria-hidden="true"></i> Required Revisions</h3>
                <button
                  className="btn btn-outline repo-btn repo-btn-sm"
                  type="button"
                  onClick={() => update({ revisions: [...draft.revisions, { id: newId('r'), item: '', raisedBy: meeting.chair }] })}
                >
                  <i className="fas fa-plus" aria-hidden="true"></i> Add Revision
                </button>
              </div>
              {draft.revisions.length ? (
                <ol className="secretary-entry-list">
                  {draft.revisions.map((item, index) => (
                    <li key={item.id} className="secretary-entry secretary-entry-inline">
                      <span className="secretary-entry-index">{index + 1}</span>
                      <input
                        className="repo-filter-input"
                        placeholder="Revision the group must make"
                        value={item.item}
                        onChange={(event) =>
                          update({ revisions: draft.revisions.map((entry) => (entry.id === item.id ? { ...entry, item: event.target.value } : entry)) })
                        }
                      />
                      <select
                        className="repo-filter-select"
                        aria-label="Raised by"
                        value={item.raisedBy}
                        onChange={(event) =>
                          update({ revisions: draft.revisions.map((entry) => (entry.id === item.id ? { ...entry, raisedBy: event.target.value } : entry)) })
                        }
                      >
                        {[meeting.chair, ...meeting.members].map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <button
                        className="secretary-icon-btn"
                        type="button"
                        aria-label={`Remove revision ${index + 1}`}
                        onClick={() => update({ revisions: draft.revisions.filter((entry) => entry.id !== item.id) })}
                      >
                        <i className="fas fa-trash-can" aria-hidden="true"></i>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="admin-empty-state">No revisions recorded yet.</div>
              )}
            </section>

            <section className="admin-section-card secretary-editor-card">
              <div className="admin-section-head repo-records-head">
                <h3><i className="fas fa-gavel" aria-hidden="true"></i> Verdict</h3>
              </div>
              <p className="admin-note">Record the verdict exactly as the panel chair announces it.</p>
              <div className="secretary-verdict-options" role="radiogroup" aria-label="Verdict">
                {VERDICTS.map((verdict) => (
                  <label key={verdict} className={`secretary-verdict-option${draft.verdict === verdict ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="verdict"
                      checked={draft.verdict === verdict}
                      onChange={() => update({ verdict: verdict as Verdict })}
                    />
                    {verdict}
                  </label>
                ))}
              </div>
              <textarea
                className="secretary-textarea"
                rows={3}
                placeholder="Remarks (deadlines for revisions, conditions, next steps)"
                value={draft.remarks}
                onChange={(event) => update({ remarks: event.target.value })}
              />
            </section>
          </div>

          <aside className="secretary-editor-side">
            <section className="admin-section-card secretary-editor-card">
              <div className="admin-section-head repo-records-head">
                <h3><i className="fas fa-user-check" aria-hidden="true"></i> Attendance</h3>
                <span className="admin-note">{presentCount}/{draft.attendees.length} present</span>
              </div>
              <ul className="secretary-attendance">
                {draft.attendees.map((person) => (
                  <li key={person.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={person.present}
                        onChange={(event) =>
                          update({
                            attendees: draft.attendees.map((entry) => (entry.id === person.id ? { ...entry, present: event.target.checked } : entry))
                          })
                        }
                      />
                      <span className="secretary-attendance-name">{person.name}</span>
                      <span className="secretary-muted">{person.role}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin-section-card secretary-editor-card secretary-submit-card">
              <div className="admin-section-head repo-records-head">
                <h3><i className="fas fa-paper-plane" aria-hidden="true"></i> Save &amp; Submit</h3>
              </div>
              <p className="admin-note">
                {meeting.updatedAt && !dirty ? `Last saved ${formatDateTime(meeting.updatedAt)}.` : dirty ? 'You have unsaved changes.' : 'Not saved yet.'}
              </p>
              {notice ? <p className={`secretary-notice secretary-tone-${notice.tone}`} role="status">{notice.text}</p> : null}
              <button className="btn btn-outline repo-btn" type="button" disabled={!dirty} onClick={handleSave}>
                <i className="fas fa-floppy-disk" aria-hidden="true"></i> Save Draft
              </button>
              <button className="btn btn-primary repo-btn" type="button" onClick={handleSubmit}>
                <i className="fas fa-paper-plane" aria-hidden="true"></i> {meeting.status === 'Returned' ? 'Resubmit to Chair' : 'Submit to Chair'}
              </button>
              <p className="admin-note">The chair confirms the minutes as the official record of this defense.</p>
            </section>
          </aside>
        </div>
      </div>
    </SecretaryShell>
  );
}
