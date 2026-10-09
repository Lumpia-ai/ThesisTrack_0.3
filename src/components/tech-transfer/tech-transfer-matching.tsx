'use client';

import { useMemo, useState } from 'react';
import {
  TECH_TRANSFER_MATCHES,
  getTechTransferStatusTone
} from '@/components/tech-transfer/tech-transfer-data';
import {
  TechTransferButton,
  TechTransferDepartmentBadge,
  TechTransferModal,
  TechTransferStatCard,
  TechTransferStatusBadge
} from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

export function TechTransferMatching() {
  const [statusFilter, setStatusFilter] = useState('All Matches');
  const [selectedMatchId, setSelectedMatchId] = useState('');

  const matches = useMemo(() => {
    return TECH_TRANSFER_MATCHES.filter((match) => {
      return statusFilter === 'All Matches' || match.status === statusFilter;
    });
  }, [statusFilter]);

  const selectedMatch = TECH_TRANSFER_MATCHES.find((match) => match.id === selectedMatchId) ?? TECH_TRANSFER_MATCHES[0];

  return (
    <TechTransferShell
      activeNav="matching"
      title="Partner Matching"
      description="Review partner alignment, fit scores, and outbound transfer proposals"
      notificationCount={3}
    >
      <div className="filter-bar">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Matches</option>
          <option>High Fit</option>
          <option>Needs Validation</option>
          <option>Proposal Sent</option>
        </select>
      </div>

      <div className="stats-grid">
        <TechTransferStatCard title="High-Fit Partners" value={TECH_TRANSFER_MATCHES.filter((item) => item.status === 'High Fit').length} />
        <TechTransferStatCard title="Proposal Sent" value={TECH_TRANSFER_MATCHES.filter((item) => item.status === 'Proposal Sent').length} />
        <TechTransferStatCard title="Needs Validation" value={TECH_TRANSFER_MATCHES.filter((item) => item.status === 'Needs Validation').length} />
        <TechTransferStatCard title="Average Match Score" value="87%" />
      </div>

      <div className="features-grid">
        {matches.map((match) => (
          <article className="feature-card" key={match.id}>
            <h3>{match.project}</h3>
            <div className="badge-row">
              <TechTransferDepartmentBadge>{match.department}</TechTransferDepartmentBadge>
              <TechTransferStatusBadge tone={getTechTransferStatusTone(match.status)}>
                {match.status}
              </TechTransferStatusBadge>
            </div>
            <p><strong>Partner:</strong> {match.partner}</p>
            <p><strong>Focus:</strong> {match.focus}</p>
            <div className="progress-container">
              <span className="progress-fill" style={{ width: `${match.score}%` }} />
            </div>
            <p>Fit Score: {match.score}%</p>
            <TechTransferButton onClick={() => setSelectedMatchId(match.id)}>Open Match</TechTransferButton>
          </article>
        ))}
      </div>

      <TechTransferModal
        open={Boolean(selectedMatchId)}
        title={`${selectedMatch.project} - Match Review`}
        onClose={() => setSelectedMatchId('')}
        footer={
          <>
            <TechTransferButton onClick={() => setSelectedMatchId('')}>Close</TechTransferButton>
            <TechTransferButton variant="primary" onClick={() => setSelectedMatchId('')}>
              Send Follow-up
            </TechTransferButton>
          </>
        }
      >
        <p><strong>Partner:</strong> {selectedMatch.partner}</p>
        <p><strong>Fit Score:</strong> {selectedMatch.score}%</p>
        <p><strong>Focus Area:</strong> {selectedMatch.focus}</p>
        <p>Use this match record to coordinate proposal packets, demos, and alignment validation.</p>
      </TechTransferModal>
    </TechTransferShell>
  );
}
