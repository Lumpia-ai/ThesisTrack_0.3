'use client';

import { useState } from 'react';
import {
  TECH_TRANSFER_IMPACTS,
  TECH_TRANSFER_MONTHLY_ADOPTION,
  getTechTransferStatusTone
} from '@/components/tech-transfer/tech-transfer-data';
import {
  TechTransferButton,
  TechTransferModal,
  TechTransferStatCard,
  TechTransferStatusBadge
} from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

export function TechTransferImpact() {
  const [selectedImpactId, setSelectedImpactId] = useState('');
  const selectedImpact = TECH_TRANSFER_IMPACTS.find((impact) => impact.id === selectedImpactId) ?? TECH_TRANSFER_IMPACTS[0];

  return (
    <TechTransferShell
      activeNav="impact"
      title="Impact Monitoring"
      description="Track operational outcomes and validation records after deployment"
      notificationCount={2}
    >
      <div className="stats-grid">
        <TechTransferStatCard title="Validated Impact Records" value={TECH_TRANSFER_IMPACTS.filter((item) => item.status === 'Validated').length} />
        <TechTransferStatCard title="Active Monitoring Records" value={TECH_TRANSFER_IMPACTS.filter((item) => item.status === 'Active').length} />
        <TechTransferStatCard title="Needs Update" value={TECH_TRANSFER_IMPACTS.filter((item) => item.status === 'Needs Update').length} />
        <TechTransferStatCard title="Partner Sites" value="7" />
      </div>

      <div className="chart-grid">
        <section className="summary-card">
          <h3>Deployment Activity</h3>
          <div className="chart-bars">
            {TECH_TRANSFER_MONTHLY_ADOPTION.map((item) => (
              <div className="chart-bar-row" key={item.month}>
                <div className="chart-bar-label">
                  <span>{item.month}</span>
                  <span>{item.deployments}</span>
                </div>
                <div className="chart-bar-track">
                  <span className="chart-bar-fill" style={{ width: `${item.deployments * 6}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="summary-card">
          <h3>Validated Outcomes</h3>
          <div className="metric-list">
            <p><strong>Inventory accuracy:</strong> 30% improvement from pilot baseline</p>
            <p><strong>Water use:</strong> 18% reduction across agri-tech trial plots</p>
            <p><strong>Evidence capture:</strong> 2x faster coastal incident reporting</p>
          </div>
        </section>
      </div>

      <section className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Partner</th>
                <th>Metric</th>
                <th>Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {TECH_TRANSFER_IMPACTS.map((impact) => (
                <tr key={impact.id}>
                  <td>{impact.project}</td>
                  <td>{impact.partner}</td>
                  <td>{impact.metric}</td>
                  <td>{impact.value}</td>
                  <td>
                    <TechTransferStatusBadge tone={getTechTransferStatusTone(impact.status)}>
                      {impact.status}
                    </TechTransferStatusBadge>
                  </td>
                  <td>
                    <TechTransferButton small onClick={() => setSelectedImpactId(impact.id)}>
                      Review
                    </TechTransferButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TechTransferModal
        open={Boolean(selectedImpactId)}
        title={`${selectedImpact.project} Impact Record`}
        onClose={() => setSelectedImpactId('')}
        footer={<TechTransferButton variant="primary" onClick={() => setSelectedImpactId('')}>Close</TechTransferButton>}
      >
        <p><strong>Partner:</strong> {selectedImpact.partner}</p>
        <p><strong>Metric:</strong> {selectedImpact.metric}</p>
        <p><strong>Value:</strong> {selectedImpact.value}</p>
        <p><strong>Status:</strong> {selectedImpact.status}</p>
      </TechTransferModal>
    </TechTransferShell>
  );
}
