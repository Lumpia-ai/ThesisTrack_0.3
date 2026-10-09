'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SecretaryShell } from '@/components/secretary/secretary-shell';
import {
  DEFENSE_STAGES,
  STAGE_META,
  VERDICTS,
  VERDICT_TONE,
  formatDate,
  meetingHref,
  type DefenseStage
} from '@/components/secretary/secretary-data';
import { sortByDate, useSecretary } from '@/components/secretary/secretary-store';
import { StageTag, StatusDot, VerdictDot } from '@/components/secretary/secretary-ui';
import { TruncatedText } from '@/components/shared/truncated-text';

const ALL = 'all';

export function SecretaryReports() {
  const { meetings } = useSecretary();
  const [stage, setStage] = useState<DefenseStage | typeof ALL>(ALL);
  const [includePending, setIncludePending] = useState(false);

  // Reports are built from minutes that are at least submitted; confirmed ones are the official record.
  const reportable = meetings.filter(
    (meeting) => meeting.status === 'Confirmed' || (includePending && meeting.status === 'Submitted to Chair')
  );
  const rows = sortByDate(reportable.filter((meeting) => stage === ALL || meeting.stage === stage), 'desc');

  const verdictCounts = VERDICTS.map((verdict) => ({ verdict, count: rows.filter((meeting) => meeting.minutes.verdict === verdict).length }));
  const maxVerdict = Math.max(1, ...verdictCounts.map((row) => row.count));
  const totalRevisions = rows.reduce((sum, meeting) => sum + meeting.minutes.revisions.length, 0);
  const totalQuestions = rows.reduce((sum, meeting) => sum + meeting.minutes.questions.length, 0);

  return (
    <SecretaryShell activeNav="reports" title="Meeting Reports">
      <div className="admin-page-stack repo-page secretary-page">
        <header className="repo-page-header">
          <div>
            <h1>Meeting Reports</h1>
            <p className="admin-note">Reports of the defense meetings you recorded, by stage. Confirmed minutes are the official record.</p>
          </div>
          <div className="repo-page-actions">
            <button className="btn btn-outline repo-btn" type="button" onClick={() => window.print()}>
              <i className="fas fa-print" aria-hidden="true"></i> Print Summary
            </button>
          </div>
        </header>

        <div className="fra-tabs-bar" role="tablist" aria-label="Defense stage">
          <button className={`fra-tab${stage === ALL ? ' is-active' : ''}`} role="tab" aria-selected={stage === ALL} type="button" onClick={() => setStage(ALL)}>
            All Defenses <span className="fra-tab-count">{reportable.length}</span>
          </button>
          {DEFENSE_STAGES.map((item) => (
            <button
              key={item}
              className={`fra-tab${stage === item ? ' is-active' : ''}`}
              role="tab"
              aria-selected={stage === item}
              type="button"
              onClick={() => setStage(item)}
            >
              <i className={`fas ${STAGE_META[item].icon}`} aria-hidden="true"></i> {STAGE_META[item].label}
              <span className="fra-tab-count">{reportable.filter((meeting) => meeting.stage === item).length}</span>
            </button>
          ))}
        </div>

        <section className="repo-stats-grid secretary-report-stats" aria-label="Report summary">
          <div className="repo-stat-card secretary-tone-emerald">
            <div className="repo-stat-icon secretary-stat-icon"><i className="fas fa-file-signature" aria-hidden="true"></i></div>
            <div className="repo-stat-body">
              <span className="repo-stat-label">Meetings Reported</span>
              <strong className="repo-stat-value">{rows.length}</strong>
            </div>
          </div>
          <div className="repo-stat-card secretary-tone-blue">
            <div className="repo-stat-icon secretary-stat-icon"><i className="fas fa-comments" aria-hidden="true"></i></div>
            <div className="repo-stat-body">
              <span className="repo-stat-label">Questions Recorded</span>
              <strong className="repo-stat-value">{totalQuestions}</strong>
            </div>
          </div>
          <div className="repo-stat-card secretary-tone-amber">
            <div className="repo-stat-icon secretary-stat-icon"><i className="fas fa-list-check" aria-hidden="true"></i></div>
            <div className="repo-stat-body">
              <span className="repo-stat-label">Revisions Required</span>
              <strong className="repo-stat-value">{totalRevisions}</strong>
            </div>
          </div>
        </section>

        <div className="secretary-dash-grid">
          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Verdict Summary</h3>
              <span className="admin-note">{rows.length} meeting{rows.length === 1 ? '' : 's'}</span>
            </div>
            <ul className="secretary-stage-bars" aria-label="Meetings by verdict">
              {verdictCounts.map((row) => (
                <li key={row.verdict}>
                  <span className="secretary-stage-bars-label">{row.verdict}</span>
                  <span className="secretary-stage-bars-track">
                    <span
                      className={`secretary-stage-bars-fill secretary-fill-${VERDICT_TONE[row.verdict]}`}
                      style={{ width: `${(row.count / maxVerdict) * 100}%` }}
                    ></span>
                  </span>
                  <strong className="secretary-stage-bars-value">{row.count}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-section-card repo-records">
            <div className="admin-section-head repo-records-head">
              <h3>Report Scope</h3>
            </div>
            <label className="secretary-check">
              <input type="checkbox" checked={includePending} onChange={(event) => setIncludePending(event.target.checked)} />
              Include minutes still awaiting the chair&apos;s confirmation
            </label>
            <p className="admin-note">
              Open a meeting to view and print its full report: attendance, presentation summary, questions and answers, required revisions,
              verdict, and signatures.
            </p>
          </section>
        </div>

        <section className="admin-section-card repo-records">
          <div className="admin-section-head repo-records-head">
            <h3>Meeting Reports</h3>
          </div>
          {rows.length ? (
            <div className="table-scroll">
              <table className="repo-table secretary-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Defense</th>
                    <th>Project Title</th>
                    <th>Panel Chair</th>
                    <th>Verdict</th>
                    <th>Revisions</th>
                    <th>Minutes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((meeting) => (
                    <tr key={meeting.id}>
                      <td>{formatDate(meeting.date)}</td>
                      <td><StageTag stage={meeting.stage} /></td>
                      <td className="repo-col-title">
                        <TruncatedText text={meeting.title} className="table-title" />
                        <span className="repo-doc-id">{meeting.id} · {meeting.groupName}</span>
                      </td>
                      <td>{meeting.chair}</td>
                      <td><VerdictDot verdict={meeting.minutes.verdict} /></td>
                      <td>{meeting.minutes.revisions.length}</td>
                      <td><StatusDot status={meeting.status} /></td>
                      <td>
                        <Link className="btn btn-outline repo-btn" href={meetingHref(meeting.id)}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">No reports for this stage yet.</div>
          )}
        </section>
      </div>
    </SecretaryShell>
  );
}
