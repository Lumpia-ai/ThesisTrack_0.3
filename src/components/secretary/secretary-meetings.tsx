'use client';

import { useEffect, useState } from 'react';
import { SecretaryShell } from '@/components/secretary/secretary-shell';
import { DEFENSE_STAGES, MINUTES_STATUSES, STAGE_META, type DefenseStage } from '@/components/secretary/secretary-data';
import { sortByDate, useSecretary } from '@/components/secretary/secretary-store';
import { MeetingsTable, StatusLegend } from '@/components/secretary/secretary-ui';

const ALL = 'all';
// "open" = anything the secretary still has to write (dashboard shortcut).
const OPEN = 'open';

export function SecretaryMeetings() {
  const { meetings } = useSecretary();
  const [stage, setStage] = useState<DefenseStage | typeof ALL>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('status');
    if (fromUrl && (fromUrl === OPEN || (MINUTES_STATUSES as string[]).includes(fromUrl))) setStatus(fromUrl);
  }, []);

  const needle = query.trim().toLowerCase();
  const filtered = sortByDate(
    meetings.filter(
      (meeting) =>
        (stage === ALL || meeting.stage === stage) &&
        (status === ALL ||
          (status === OPEN ? meeting.status === 'To Record' || meeting.status === 'Draft' : meeting.status === status)) &&
        (!needle ||
          [meeting.title, meeting.groupName, meeting.chair, meeting.id, meeting.adviser].some((value) => value.toLowerCase().includes(needle)))
    ),
    'desc'
  );

  return (
    <SecretaryShell activeNav="meetings" title="Defense Meetings">
      <div className="admin-page-stack repo-page secretary-page">
        <header className="repo-page-header">
          <div>
            <h1>Defense Meetings</h1>
            <p className="admin-note">Every defense you are assigned to as secretary, with the state of its minutes.</p>
          </div>
        </header>

        <div className="fra-tabs-bar" role="tablist" aria-label="Defense stage">
          <button className={`fra-tab${stage === ALL ? ' is-active' : ''}`} role="tab" aria-selected={stage === ALL} type="button" onClick={() => setStage(ALL)}>
            All Defenses <span className="fra-tab-count">{meetings.length}</span>
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
              <span className="fra-tab-count">{meetings.filter((meeting) => meeting.stage === item).length}</span>
            </button>
          ))}
        </div>

        <section className="admin-section-card repo-records">
          <div className="repo-filter-bar">
            <label className="repo-filter-search">
              <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
              <input
                className="repo-filter-input"
                placeholder="Search title, group, chair…"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select className="repo-filter-select" aria-label="Minutes status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value={ALL}>All statuses</option>
              <option value={OPEN}>To record / draft</option>
              {MINUTES_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <MeetingsTable rows={filtered} emptyMessage="No defense meetings match the current filters." />
          <StatusLegend />
        </section>
      </div>
    </SecretaryShell>
  );
}
