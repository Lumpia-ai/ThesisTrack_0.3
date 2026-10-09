'use client';

import Link from 'next/link';
import { TruncatedText } from '@/components/shared/truncated-text';
import {
  MINUTES_STATUS_META,
  STAGE_META,
  VERDICT_TONE,
  formatDate,
  formatTime,
  meetingHref,
  type DefenseMeeting,
  type DefenseStage,
  type MinutesStatus,
  type Verdict
} from '@/components/secretary/secretary-data';

// Dot + dark text (not pale pills) so status stays readable in dense tables.
export function StatusDot({ status }: { status: MinutesStatus }) {
  const meta = MINUTES_STATUS_META[status];
  return (
    <span className={`secretary-dot secretary-tone-${meta.tone}`} title={meta.hint}>
      <span className="secretary-dot-mark" aria-hidden="true"></span>
      {status}
    </span>
  );
}

export function VerdictDot({ verdict }: { verdict: Verdict | '' }) {
  if (!verdict) return <span className="secretary-muted">Not recorded</span>;
  return (
    <span className={`secretary-dot secretary-tone-${VERDICT_TONE[verdict]}`}>
      <span className="secretary-dot-mark" aria-hidden="true"></span>
      {verdict}
    </span>
  );
}

export function StageTag({ stage }: { stage: DefenseStage }) {
  return (
    <span className="secretary-stage-tag">
      <i className={`fas ${STAGE_META[stage].icon}`} aria-hidden="true"></i>
      {STAGE_META[stage].label}
    </span>
  );
}

export function actionLabel(status: MinutesStatus) {
  switch (status) {
    case 'To Record':
      return 'Record Minutes';
    case 'Draft':
      return 'Continue';
    case 'Returned':
      return 'Correct Minutes';
    default:
      return 'View';
  }
}

export function MeetingsTable({ rows, emptyMessage }: { rows: DefenseMeeting[]; emptyMessage: string }) {
  if (!rows.length) {
    return <div className="admin-empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-scroll">
      <table className="repo-table secretary-table">
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Defense</th>
            <th>Project Title</th>
            <th>Panel Chair</th>
            <th>Venue</th>
            <th>Minutes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((meeting) => {
            const primary = meeting.status === 'To Record' || meeting.status === 'Draft' || meeting.status === 'Returned';
            return (
              <tr key={meeting.id}>
                <td>
                  <strong>{formatDate(meeting.date)}</strong>
                  <span className="repo-doc-id">{formatTime(meeting.date)}</span>
                </td>
                <td><StageTag stage={meeting.stage} /></td>
                <td className="repo-col-title">
                  <TruncatedText text={meeting.title} className="table-title" />
                  <span className="repo-doc-id">{meeting.id} · {meeting.groupName}</span>
                </td>
                <td>{meeting.chair}</td>
                <td>{meeting.venue}</td>
                <td><StatusDot status={meeting.status} /></td>
                <td>
                  <Link
                    className={`btn repo-btn ${primary ? 'btn-primary' : 'btn-outline'}`}
                    href={meetingHref(meeting.id)}
                    aria-label={`${actionLabel(meeting.status)}: ${meeting.title}`}
                  >
                    {actionLabel(meeting.status)}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StatusLegend() {
  return (
    <ul className="secretary-legend" aria-label="Minutes status legend">
      {(Object.keys(MINUTES_STATUS_META) as MinutesStatus[]).map((status) => (
        <li key={status}>
          <StatusDot status={status} />
        </li>
      ))}
    </ul>
  );
}
