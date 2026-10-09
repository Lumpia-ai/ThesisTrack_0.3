import { ResearchHeadShell } from '@/components/research-head/research-head-shell';

const IT_ADMIN_RESPONSIBILITIES = [
  'System updates and release deployment',
  'Security configuration and incident response',
  'Database backup, restore, and maintenance',
  'Server monitoring, diagnostics, and uptime work',
  'Bug fixing, cache management, and theme customization'
];

export function ResearchHeadMaintenance() {
  return (
    <ResearchHeadShell
      activeNav="settings"
      title="IT Administrator Handoff"
      description="Technical maintenance is represented separately from the Research Head workflow."
    >
      <div className="admin-page-stack">
        <section className="admin-section-card">
          <div className="admin-section-body">
            <div className="admin-result-banner is-warning">
              <div>
                <strong>This route no longer exposes Research Head maintenance controls.</strong>
                <p>
                  Research Head access is limited to research oversight. Technical maintenance belongs to the IT
                  Administrator/System Admin role outside the research workflow.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section-card">
          <div className="admin-section-head">
            <div>
              <h3>Technical Maintenance Owner</h3>
              <p>Responsibilities listed here are informational only for Research Head users.</p>
            </div>
            <span className="status-badge status-neutral">View-only</span>
          </div>
          <div className="admin-section-body">
            <div className="admin-list">
              {IT_ADMIN_RESPONSIBILITIES.map((item) => (
                <div key={item} className="admin-list-item">
                  <strong>{item}</strong>
                  <span className="status-badge status-info">IT Admin/System Admin</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </ResearchHeadShell>
  );
}
