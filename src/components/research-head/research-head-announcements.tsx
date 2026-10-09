'use client';

import { useMemo, useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';

const ACTIVE_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'Final Defense Schedule',
    summary: 'All thesis defense scheduled for March 15-20, 2024',
    department: 'All',
    postedAt: 'Feb 1, 2024',
    expiresAt: 'Mar 20, 2024',
    priority: 'High'
  },
  {
    id: 'ann-2',
    title: 'Submission Deadline Extension',
    summary: 'Chapter 3 submission extended to Feb 20, 2024',
    department: 'IT',
    postedAt: 'Jan 28, 2024',
    expiresAt: 'Feb 20, 2024',
    priority: 'Medium'
  },
  {
    id: 'ann-3',
    title: 'Research Symposium 2024',
    summary: 'Call for papers for the Annual Research Symposium',
    department: 'All',
    postedAt: 'Jan 15, 2024',
    expiresAt: 'Mar 30, 2024',
    priority: 'Normal'
  }
];

const ARCHIVED_ANNOUNCEMENTS = [
  {
    id: 'arch-1',
    title: 'Proposal Defense Schedule',
    postedAt: 'Dec 15, 2023',
    archivedAt: 'Jan 30, 2024'
  }
];

export function ResearchHeadAnnouncements() {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [modalOpen, setModalOpen] = useState(false);

  const filteredAnnouncements = useMemo(
    () =>
      ACTIVE_ANNOUNCEMENTS.filter((announcement) => {
        const matchesDepartment =
          departmentFilter === 'All Departments' ||
          announcement.department === departmentFilter ||
          announcement.department === 'All';
        const matchesPriority = statusFilter === 'All Statuses' || announcement.priority === statusFilter;
        return matchesDepartment && matchesPriority;
      }),
    [departmentFilter, statusFilter]
  );

  const priorityClassName = (priority: string) => {
    if (priority === 'High') return 'status-success';
    if (priority === 'Medium') return 'status-review';
    return 'status-neutral';
  };

  return (
    <>
      <ResearchHeadShell
        activeNav="announcements"
        title="Announcements"
        description="Create research announcements and notify the relevant users by department, role, or institutional audience."
      >
        <div className="admin-page-stack rh-wide-page">
          <div className="admin-toolbar compact">
            <div className="span-2">
              <select className="admin-toolbar-select" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                <option>All Departments</option>
                <option>IT</option>
                <option>MET</option>
                <option>TCM</option>
                <option>ESM</option>
                <option>NAME</option>
              </select>
            </div>
            <div className="span-2">
              <select className="admin-toolbar-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>All Statuses</option>
                <option>High</option>
                <option>Medium</option>
                <option>Normal</option>
              </select>
            </div>
            <div className="span-3 admin-toolbar-actions">
              <button className="btn btn-primary" type="button" onClick={() => setModalOpen(true)}>
                <i className="fas fa-plus"></i>
                New Announcement
              </button>
            </div>
          </div>

          <section className="admin-section-card">
            <div className="admin-section-head">
              <div>
                <h3>Active Announcements</h3>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Date Posted</th>
                    <th>Expiry Date</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id}>
                      <td>
                        <span className="table-title">{announcement.title}</span>
                        <span className="table-subtitle">{announcement.summary}</span>
                      </td>
                      <td>
                        <span className="dept-badge">{announcement.department}</span>
                      </td>
                      <td>{announcement.postedAt}</td>
                      <td>{announcement.expiresAt}</td>
                      <td>
                        <span className={`status-badge ${priorityClassName(announcement.priority)}`}>{announcement.priority}</span>
                      </td>
                      <td>
                        <div className="admin-action-row">
                          <button className="btn btn-outline small" type="button">
                            Edit
                          </button>
                          <button className="btn btn-outline small" type="button">
                            Notify
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section-card">
            <div className="admin-section-head">
              <div>
                <h3>Archived Announcements</h3>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date Posted</th>
                    <th>Archived Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ARCHIVED_ANNOUNCEMENTS.map((announcement) => (
                    <tr key={announcement.id}>
                      <td>{announcement.title}</td>
                      <td>{announcement.postedAt}</td>
                      <td>{announcement.archivedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </ResearchHeadShell>

      {modalOpen ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3>Create Announcement</h3>
                <p>Publish a new notice and send notifications to the relevant research users.</p>
              </div>
              <button className="close-modal" type="button" onClick={() => setModalOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input placeholder="Announcement title" />
              </div>
              <div className="admin-form-grid">
                <div className="form-group">
                  <label>Target Department</label>
                  <select defaultValue="All">
                    <option>All</option>
                    <option>IT</option>
                    <option>MET</option>
                    <option>TCM</option>
                    <option>ESM</option>
                    <option>NAME</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Recipient Audience</label>
                  <select defaultValue="All Research Users">
                    <option>All Research Users</option>
                    <option>Students</option>
                    <option>Advisers</option>
                    <option>Program Heads</option>
                    <option>Library Personnel</option>
                    <option>Tech Transfer Officers</option>
                    <option>Industry Partners</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select defaultValue="Medium">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Normal</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea placeholder="Write the full announcement content"></textarea>
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input type="date" />
              </div>
              <label className="admin-check-card">
                <input defaultChecked type="checkbox" />
                <span>
                  <strong>Send portal notification to selected users</strong>
                  <small className="admin-note">Notification delivery follows the selected department and audience filters.</small>
                </span>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={() => setModalOpen(false)}>
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
