'use client';

import { useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';
import { TruncatedText } from '@/components/shared/truncated-text';

const TRANSFER_PROJECTS = [
  {
    id: 'TT-2026-001',
    title: 'AI Inventory System',
    department: 'IT',
    partner: 'TechCorp Inc.',
    status: 'Deployed',
    statusClass: 'status-approved',
    adoptionDate: 'Jan 2024',
    impact: '5/5',
    note: 'Operational pilot deployed for inventory visibility and audit automation.'
  },
  {
    id: 'TT-2026-002',
    title: 'Smart Energy Monitor',
    department: 'MET',
    partner: 'GreenEnergy PH',
    status: 'Testing',
    statusClass: 'status-info',
    adoptionDate: 'Feb 2024',
    impact: '4/5',
    note: 'Validation phase underway ahead of a broader sustainability trial.'
  },
  {
    id: 'TT-2026-003',
    title: 'Marine Pollution Detector',
    department: 'NAME',
    partner: 'OceanTech Inc.',
    status: 'Operational',
    statusClass: 'status-approved',
    adoptionDate: 'Dec 2023',
    impact: '5/5',
    note: 'Integrated into a live environmental monitoring workflow.'
  },
  {
    id: 'TT-2026-004',
    title: 'Herbal Medicine Knowledge Portal',
    department: 'TCM',
    partner: 'HealthNet Foundation',
    status: 'Pending',
    statusClass: 'status-pending',
    adoptionDate: '—',
    impact: '—',
    note: 'Awaiting partner agreement finalization.'
  }
];

export function ResearchHeadTechnologyTransfer() {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? TRANSFER_PROJECTS : TRANSFER_PROJECTS.filter((p) => p.status === filter);
  const deployed = TRANSFER_PROJECTS.filter((p) => p.status === 'Deployed' || p.status === 'Operational').length;

  const stats = [
    { label: 'Transfer Projects', value: TRANSFER_PROJECTS.length, icon: 'fa-handshake-angle' },
    { label: 'Deployed / Operational', value: deployed, icon: 'fa-rocket' },
    { label: 'Testing Phase', value: TRANSFER_PROJECTS.filter((p) => p.status === 'Testing').length, icon: 'fa-flask' },
    { label: 'Pending Agreements', value: TRANSFER_PROJECTS.filter((p) => p.status === 'Pending').length, icon: 'fa-file-signature' }
  ];

  return (
    <ResearchHeadShell
      activeNav="technology-transfer"
      title="Technology Transfer"
      description="Monitor deployment-ready projects, partner adoptions, and technology transfer outcomes across departments."
    >
      <div className="admin-page-stack rh-wide-page repo-page">
        <header className="repo-page-header">
          <h1>Technology Transfer</h1>
        </header>

        <section className="repo-stats-grid repo-stats-grid--4" aria-label="Technology transfer statistics">
          {stats.map((stat) => (
            <article key={stat.label} className="repo-stat-card">
              <div className="repo-stat-icon">
                <i className={`fas ${stat.icon}`} aria-hidden="true"></i>
              </div>
              <div className="repo-stat-body">
                <span className="repo-stat-label">{stat.label}</span>
                <strong className="repo-stat-value">{stat.value}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="admin-section-card repo-records">
          <div className="admin-section-head repo-records-head">
            <h3>Transfer Registry</h3>
            <span className="status-badge status-info">{filtered.length} shown</span>
          </div>

          <div className="repo-filter-bar">
            <select className="repo-filter-select" aria-label="Transfer status" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="All">All Statuses</option>
              <option>Deployed</option>
              <option>Operational</option>
              <option>Testing</option>
              <option>Pending</option>
            </select>
          </div>

          {filtered.length ? (
            <div className="table-scroll">
              <table className="repo-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Department</th>
                    <th>Partner</th>
                    <th>Status</th>
                    <th>Adoption Date</th>
                    <th>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((project) => (
                    <tr key={project.id}>
                      <td className="repo-col-title">
                        <TruncatedText text={project.title} className="table-title" />
                        <TruncatedText text={`${project.id} · ${project.note}`} className="repo-doc-id" />
                      </td>
                      <td><span className="dept-badge">{project.department}</span></td>
                      <td>{project.partner}</td>
                      <td><span className={`status-badge ${project.statusClass}`}>{project.status}</span></td>
                      <td>{project.adoptionDate}</td>
                      <td><strong>{project.impact}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">No transfer projects match this status.</div>
          )}
        </section>
      </div>
    </ResearchHeadShell>
  );
}
