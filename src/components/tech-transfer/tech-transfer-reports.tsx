'use client';

import { useMemo, useState } from 'react';
import {
  TECH_TRANSFER_EXPORTS,
  TECH_TRANSFER_SCHEDULED_REPORTS,
  getTechTransferStatusTone,
  type ScheduledReport
} from '@/components/tech-transfer/tech-transfer-data';
import {
  TechTransferButton,
  TechTransferModal,
  TechTransferStatCard,
  TechTransferStatusBadge
} from '@/components/tech-transfer/tech-transfer-primitives';
import { TechTransferShell } from '@/components/tech-transfer/tech-transfer-shell';

const EMPTY_SCHEDULE: ScheduledReport = {
  id: '',
  reportType: 'Commercialization Summary',
  coverage: '',
  frequency: 'Monthly',
  nextRun: '',
  delivery: 'Dashboard Only'
};

export function TechTransferReports() {
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport>(EMPTY_SCHEDULE);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedules, setSchedules] = useState(() => [...TECH_TRANSFER_SCHEDULED_REPORTS]);

  const exports = useMemo(() => {
    return TECH_TRANSFER_EXPORTS.filter((item) => {
      return statusFilter === 'All Status' || item.status === statusFilter;
    });
  }, [statusFilter]);

  return (
    <TechTransferShell
      activeNav="reports"
      title="Reports"
      description="Generate, schedule, and export commercialization and deployment summaries"
      notificationCount={2}
    >
      <div className="filter-bar">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Status</option>
          <option>Ready</option>
          <option>Processing</option>
        </select>
        <input placeholder="Search reports..." type="text" />
        <TechTransferButton variant="primary" onClick={() => setGenerateOpen(true)}>
          <i aria-hidden="true" className="fas fa-file-export" />
          Generate Report
        </TechTransferButton>
      </div>

      <div className="stats-grid">
        <TechTransferStatCard title="Recent Exports" value={TECH_TRANSFER_EXPORTS.length} />
        <TechTransferStatCard title="Scheduled Reports" value={schedules.length} />
        <TechTransferStatCard title="Ready Packages" value={TECH_TRANSFER_EXPORTS.filter((item) => item.status === 'Ready').length} />
        <TechTransferStatCard title="Processing Jobs" value={TECH_TRANSFER_EXPORTS.filter((item) => item.status === 'Processing').length} />
      </div>

      <section className="table-container">
        <div className="table-head">
          <div>
            <h3>Recent Exports</h3>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Coverage</th>
                <th>Generated</th>
                <th>Status</th>
                <th>Format</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((item) => (
                <tr key={item.id}>
                  <td>{item.report}</td>
                  <td>{item.coverage}</td>
                  <td>{item.generated}</td>
                  <td>
                    <TechTransferStatusBadge tone={getTechTransferStatusTone(item.status)}>
                      {item.status}
                    </TechTransferStatusBadge>
                  </td>
                  <td>{item.format}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-container">
        <div className="table-head">
          <div>
            <h3>Scheduled Reports</h3>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Report Type</th>
                <th>Coverage</th>
                <th>Frequency</th>
                <th>Next Run</th>
                <th>Delivery</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.reportType}</td>
                  <td>{schedule.coverage}</td>
                  <td>{schedule.frequency}</td>
                  <td>{schedule.nextRun}</td>
                  <td>{schedule.delivery}</td>
                  <td>
                    <TechTransferButton
                      small
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setScheduleOpen(true);
                      }}
                    >
                      Edit
                    </TechTransferButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TechTransferModal
        open={generateOpen}
        title="Generate Report"
        onClose={() => setGenerateOpen(false)}
        footer={
          <>
            <TechTransferButton onClick={() => setGenerateOpen(false)}>Cancel</TechTransferButton>
            <TechTransferButton variant="primary" onClick={() => setGenerateOpen(false)}>
              Generate Report
            </TechTransferButton>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="tt-report-type">Report Type</label>
          <select defaultValue="Commercialization Summary" id="tt-report-type">
            <option>Commercialization Summary</option>
            <option>Deployment Tracker</option>
            <option>Impact Review</option>
            <option>Document Status</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="tt-report-coverage">Coverage Period</label>
          <input defaultValue="March 2026" id="tt-report-coverage" />
        </div>
        <div className="form-group">
          <label htmlFor="tt-report-format">Export Format</label>
          <select defaultValue="PDF" id="tt-report-format">
            <option>PDF</option>
            <option>CSV</option>
            <option>JSON</option>
          </select>
        </div>
      </TechTransferModal>

      <TechTransferModal
        open={scheduleOpen}
        title="Edit Schedule"
        onClose={() => setScheduleOpen(false)}
        footer={
          <>
            <TechTransferButton onClick={() => setScheduleOpen(false)}>Cancel</TechTransferButton>
            {editingSchedule.id ? (
              <TechTransferButton
                variant="danger"
                onClick={() => {
                  setSchedules((current) => current.filter((item) => item.id !== editingSchedule.id));
                  setScheduleOpen(false);
                }}
              >
                Delete
              </TechTransferButton>
            ) : null}
            <TechTransferButton
              variant="primary"
              onClick={() => {
                setSchedules((current) =>
                  current.map((item) => (item.id === editingSchedule.id ? editingSchedule : item))
                );
                setScheduleOpen(false);
              }}
            >
              Save Changes
            </TechTransferButton>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="tt-schedule-type">Report Type</label>
          <select
            id="tt-schedule-type"
            value={editingSchedule.reportType}
            onChange={(event) => setEditingSchedule((current) => ({ ...current, reportType: event.target.value }))}
          >
            <option>Commercialization Summary</option>
            <option>Deployment Tracker</option>
            <option>Impact Review</option>
            <option>Document Status</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="tt-schedule-frequency">Frequency</label>
          <select
            id="tt-schedule-frequency"
            value={editingSchedule.frequency}
            onChange={(event) =>
              setEditingSchedule((current) => ({ ...current, frequency: event.target.value as ScheduledReport['frequency'] }))
            }
          >
            <option>Weekly</option>
            <option>Bi-weekly</option>
            <option>Monthly</option>
            <option>Quarterly</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="tt-schedule-delivery">Delivery</label>
          <select
            id="tt-schedule-delivery"
            value={editingSchedule.delivery}
            onChange={(event) =>
              setEditingSchedule((current) => ({ ...current, delivery: event.target.value as ScheduledReport['delivery'] }))
            }
          >
            <option>Dashboard Only</option>
            <option>Email</option>
            <option>Both</option>
          </select>
        </div>
      </TechTransferModal>
    </TechTransferShell>
  );
}
