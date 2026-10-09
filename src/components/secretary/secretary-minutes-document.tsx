'use client';

import { STAGE_META, formatDate, formatDateTime, formatTime, type DefenseMeeting } from '@/components/secretary/secretary-data';
import { StatusDot, VerdictDot } from '@/components/secretary/secretary-ui';

// Read-only, printable minutes — the "report of the meeting".
export function MinutesDocument({ meeting }: { meeting: DefenseMeeting }) {
  const { minutes } = meeting;
  const present = minutes.attendees.filter((person) => person.present);
  const absent = minutes.attendees.filter((person) => !person.present);

  return (
    <article className="secretary-doc" aria-label={`Minutes of ${STAGE_META[meeting.stage].label}`}>
      <header className="secretary-doc-head">
        <span className="secretary-doc-kicker">
          <i className={`fas ${STAGE_META[meeting.stage].icon}`} aria-hidden="true"></i> Minutes of the {STAGE_META[meeting.stage].label}
        </span>
        <h2>{meeting.title}</h2>
        <dl className="secretary-doc-meta">
          <div><dt>Group</dt><dd>{meeting.groupName}</dd></div>
          <div><dt>Program</dt><dd>{meeting.program}</dd></div>
          <div><dt>Date</dt><dd>{formatDate(meeting.date)}</dd></div>
          <div><dt>Venue</dt><dd>{meeting.venue}</dd></div>
          <div><dt>Called to order</dt><dd>{minutes.calledToOrder || '—'}</dd></div>
          <div><dt>Adjourned</dt><dd>{minutes.adjourned || '—'}</dd></div>
          <div><dt>Reference</dt><dd>{meeting.id}</dd></div>
          <div><dt>Status</dt><dd><StatusDot status={meeting.status} /></dd></div>
        </dl>
      </header>

      <section>
        <h3>Attendance</h3>
        <ul className="secretary-doc-attendance">
          {present.map((person) => (
            <li key={person.id}>
              <i className="fas fa-check secretary-text-emerald" aria-hidden="true"></i>
              <span>{person.name}</span>
              <span className="secretary-muted">{person.role}</span>
            </li>
          ))}
          {absent.map((person) => (
            <li key={person.id}>
              <i className="fas fa-xmark secretary-text-rose" aria-hidden="true"></i>
              <span>{person.name}</span>
              <span className="secretary-muted">{person.role} · Absent</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Presentation Summary</h3>
        <p className="secretary-doc-text">{minutes.presentationSummary || '—'}</p>
      </section>

      <section>
        <h3>Questions and Answers</h3>
        {minutes.questions.length ? (
          <ol className="secretary-doc-list">
            {minutes.questions.map((item) => (
              <li key={item.id}>
                <strong>{item.askedBy}:</strong> {item.question}
                <p className="secretary-doc-answer"><span>Response:</span> {item.response || '—'}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="secretary-muted">No questions recorded.</p>
        )}
      </section>

      <section>
        <h3>Required Revisions</h3>
        {minutes.revisions.length ? (
          <ol className="secretary-doc-list">
            {minutes.revisions.map((item) => (
              <li key={item.id}>
                {item.item} <span className="secretary-muted">— {item.raisedBy}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="secretary-muted">No revisions required.</p>
        )}
      </section>

      <section>
        <h3>Verdict</h3>
        <p><VerdictDot verdict={minutes.verdict} /></p>
        {minutes.remarks ? <p className="secretary-doc-text">{minutes.remarks}</p> : null}
      </section>

      <footer className="secretary-doc-signatures">
        <div>
          <span className="secretary-doc-sign-line"></span>
          <strong>Defense Secretary</strong>
          <span className="secretary-muted">
            {meeting.submittedAt ? `Submitted ${formatDateTime(meeting.submittedAt)}` : 'Not yet submitted'}
          </span>
        </div>
        <div>
          <span className="secretary-doc-sign-line"></span>
          <strong>{meeting.chair}</strong>
          <span className="secretary-muted">
            Panel Chair · {meeting.confirmedAt ? `Confirmed ${formatDate(meeting.confirmedAt)} ${formatTime(meeting.confirmedAt)}` : 'Awaiting confirmation'}
          </span>
        </div>
      </footer>
    </article>
  );
}
