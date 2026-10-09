'use client';

import { useMemo, useState } from 'react';
import {
  PARTNER_REQUESTS,
  getPartnerRequest,
  getPartnerStatusTone
} from '@/components/partner/partner-data';
import {
  PartnerDepartmentBadge,
  PartnerModal,
  PartnerStatusBadge
} from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';

const REQUEST_STATS = [
  {
    title: 'Total Requests',
    icon: 'fa-folder-open',
    accent: '#2563EB',
    soft: 'rgba(37, 99, 235, 0.14)',
    note: 'All time',
    value: () => PARTNER_REQUESTS.length
  },
  {
    title: 'Pending Review',
    icon: 'fa-clock',
    accent: '#F59E0B',
    soft: 'rgba(245, 158, 11, 0.14)',
    note: 'Awaiting action',
    value: () => PARTNER_REQUESTS.filter((request) => request.status === 'Pending').length
  },
  {
    title: 'Approved',
    icon: 'fa-check-circle',
    accent: '#16A34A',
    soft: 'rgba(22, 163, 74, 0.14)',
    note: 'Ready for MOA',
    value: () => PARTNER_REQUESTS.filter((request) => request.status === 'Approved').length
  },
  {
    title: 'In Negotiation',
    icon: 'fa-handshake',
    accent: '#8B5CF6',
    soft: 'rgba(139, 92, 246, 0.14)',
    note: 'Terms being finalized',
    value: () => PARTNER_REQUESTS.filter((request) => request.status === 'Negotiation').length
  }
];

export function PartnerRequests() {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [search, setSearch] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');

  const filteredRequests = useMemo(() => {
    return PARTNER_REQUESTS.filter((request) => {
      const matchesDepartment =
        departmentFilter === 'All Departments' || request.department === departmentFilter;
      const matchesStatus = statusFilter === 'All Statuses' || request.status === statusFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term || request.projectTitle.toLowerCase().includes(term) || request.id.toLowerCase().includes(term);

      return matchesDepartment && matchesStatus && matchesSearch;
    });
  }, [departmentFilter, search, statusFilter]);

  const selectedRequest = getPartnerRequest(selectedRequestId || null);

  return (
    <PartnerShell
      activeNav="requests"
      title="My Adoption Requests"
      description="Track and manage your technology adoption requests"
      notificationCount={1}
    >
      <div className="flex flex-col gap-8">
        {/* KPI Stat Bar */}
        <section className="grid grid-cols-1 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {REQUEST_STATS.map((stat) => (
            <div key={stat.title} className="flex items-center gap-4 p-5">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
                style={{ background: stat.soft, color: stat.accent }}
              >
                <i aria-hidden="true" className={`fas ${stat.icon}`} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{stat.title}</p>
                <p className="text-2xl font-extrabold leading-tight text-[var(--text)]">{stat.value()}</p>
                <p className="truncate text-xs font-medium text-[var(--muted)]">{stat.note}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex min-w-[300px] flex-1 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5">
            <i aria-hidden="true" className="fas fa-search text-sm text-[var(--muted)]" />
            <input
              placeholder="Search by project title or ID..."
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] outline-none"
          >
            <option>All Departments</option>
            <option>IT</option>
            <option>MET</option>
            <option>TCM</option>
            <option>ESM</option>
            <option>NAME</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] outline-none"
          >
            <option>All Statuses</option>
            <option>Pending</option>
            <option>Under Review</option>
            <option>Approved</option>
            <option>Negotiation</option>
            <option>Completed</option>
          </select>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-6 py-5">
            <h3 className="text-lg font-extrabold text-[var(--text)]">Active Requests</h3>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--border)] text-xs font-bold uppercase tracking-wide text-[var(--text-meta)]">
                  <th className="px-4 py-4">Request ID</th>
                  <th className="px-4 py-4">Project Title</th>
                  <th className="px-4 py-4">Department</th>
                  <th className="px-4 py-4">Request Date</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request, i) => (
                  <tr
                    key={request.id}
                    className={`transition hover:bg-[var(--surface-alt)] ${i === filteredRequests.length - 1 ? '' : 'border-b border-[var(--border)]'}`}
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--muted)]">{request.id}</td>
                    <td className="px-4 py-4 font-bold text-[var(--text)]">{request.projectTitle}</td>
                    <td className="px-4 py-4">
                      <PartnerDepartmentBadge>{request.department}</PartnerDepartmentBadge>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--muted)]">{request.requestDate}</td>
                    <td className="px-4 py-4">
                      <PartnerStatusBadge tone={getPartnerStatusTone(request.status)}>{request.status}</PartnerStatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRequestId(request.id)}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        >
                          View
                        </button>
                        {request.status === 'Approved' ? (
                          <button className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110">
                            Proceed to MOA
                          </button>
                        ) : request.status === 'Pending' ? (
                          <button className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-bold text-[var(--danger)] transition hover:brightness-95">
                            Cancel
                          </button>
                        ) : (
                          <button className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                            Continue
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <PartnerModal
        open={Boolean(selectedRequestId)}
        title={`Request Details - ${selectedRequest.id}`}
        onClose={() => setSelectedRequestId('')}
        footer={
          <div className="flex w-full justify-end gap-4">
            <button
              type="button"
              onClick={() => setSelectedRequestId('')}
              className="rounded-xl border border-[var(--border-strong)] px-5 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setSelectedRequestId('')}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Download MOA Draft <i aria-hidden="true" className="fas fa-file-download" />
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-1">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4">
            <h4 className="mb-3 text-base font-extrabold text-[var(--text)]">{selectedRequest.projectTitle}</h4>
            <div className="flex flex-wrap items-center gap-3">
              <PartnerDepartmentBadge>{selectedRequest.department}</PartnerDepartmentBadge>
              <PartnerStatusBadge tone={getPartnerStatusTone(selectedRequest.status)}>{selectedRequest.status}</PartnerStatusBadge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Request Date</span>
              <strong className="text-sm text-[var(--text)]">{selectedRequest.requestDate}</strong>
            </div>
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Budget Range</span>
              <strong className="text-sm text-[var(--text)]">{selectedRequest.budgetRange}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Timeline</span>
              <strong className="text-sm text-[var(--text)]">{selectedRequest.timeline}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Implementation Plan</span>
              <p className="text-sm leading-relaxed text-[var(--muted)]">{selectedRequest.implementationPlan}</p>
            </div>
            {selectedRequest.comments ? (
              <div className="rounded-xl border-l-4 border-[var(--warning)] bg-[var(--warning-soft)] p-4 sm:col-span-2">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--warning)]">TTO Comments</span>
                <p className="text-sm text-[var(--muted-strong)]">{selectedRequest.comments}</p>
              </div>
            ) : null}
          </div>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
