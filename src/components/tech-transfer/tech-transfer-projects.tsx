'use client';

import { useMemo, useState } from 'react';
import {
  TECH_TRANSFER_PROJECTS,
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

export function TechTransferProjects() {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const projects = useMemo(() => {
    return TECH_TRANSFER_PROJECTS.filter((project) => {
      const matchesDepartment =
        departmentFilter === 'All Departments' || project.department === departmentFilter;
      const matchesStatus = statusFilter === 'All Status' || project.status === statusFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term || project.title.toLowerCase().includes(term) || project.summary.toLowerCase().includes(term);

      return matchesDepartment && matchesStatus && matchesSearch;
    });
  }, [departmentFilter, search, statusFilter]);

  const selectedProject =
    TECH_TRANSFER_PROJECTS.find((project) => project.id === selectedProjectId) ?? TECH_TRANSFER_PROJECTS[0];

  return (
    <TechTransferShell
      activeNav="projects"
      title="Transferable Projects"
      description="Manage projects prepared for partner review, endorsement, and commercialization"
      notificationCount={3}
    >
      <div className="filter-bar">
        <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
          <option>All Departments</option>
          <option>IT</option>
          <option>MET</option>
          <option>TCM</option>
          <option>ESM</option>
          <option>NAME</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Status</option>
          <option>Ready</option>
          <option>Processing</option>
          <option>Matched</option>
          <option>Deployed</option>
        </select>
        <input
          placeholder="Search transferable projects..."
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="stats-grid">
        <TechTransferStatCard title="Projects Ready for Transfer" value={TECH_TRANSFER_PROJECTS.filter((item) => item.status === 'Ready').length} />
        <TechTransferStatCard title="Active Partner Leads" value="8" />
        <TechTransferStatCard title="Matched Projects" value={TECH_TRANSFER_PROJECTS.filter((item) => item.status === 'Matched').length} />
        <TechTransferStatCard title="Deployed Projects" value={TECH_TRANSFER_PROJECTS.filter((item) => item.status === 'Deployed').length} />
      </div>

      <section className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Department</th>
                <th>Category</th>
                <th>Readiness</th>
                <th>Partner Interest</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <strong>{project.title}</strong>
                    <span className="table-note">{project.summary}</span>
                  </td>
                  <td><TechTransferDepartmentBadge>{project.department}</TechTransferDepartmentBadge></td>
                  <td>{project.category}</td>
                  <td>{project.readiness}</td>
                  <td>{project.partnerInterest}</td>
                  <td>
                    <TechTransferStatusBadge tone={getTechTransferStatusTone(project.status)}>
                      {project.status}
                    </TechTransferStatusBadge>
                  </td>
                  <td>
                    <TechTransferButton small onClick={() => setSelectedProjectId(project.id)}>
                      Open
                    </TechTransferButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TechTransferModal
        open={Boolean(selectedProjectId)}
        title={selectedProject.title}
        onClose={() => setSelectedProjectId('')}
        footer={<TechTransferButton variant="primary" onClick={() => setSelectedProjectId('')}>Close</TechTransferButton>}
      >
        <p><strong>Department:</strong> {selectedProject.department}</p>
        <p><strong>Adviser:</strong> {selectedProject.adviser}</p>
        <p><strong>Category:</strong> {selectedProject.category}</p>
        <p><strong>Readiness:</strong> {selectedProject.readiness}</p>
        <p>{selectedProject.summary}</p>
      </TechTransferModal>
    </TechTransferShell>
  );
}
