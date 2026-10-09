import type { ReactNode } from 'react';

type ResearchHeadChartCardProps = {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ResearchHeadChartCard({
  title,
  description,
  badge,
  actions,
  children,
  className
}: ResearchHeadChartCardProps) {
  return (
    <section className={`admin-section-card dashboard-card${className ? ` ${className}` : ''}`}>
      <div className="admin-section-head dashboard-card-head">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="dashboard-card-meta">
          {badge ? <span className="admin-inline-badge">{badge}</span> : null}
          {actions}
        </div>
      </div>
      <div className="admin-section-body dashboard-card-body">{children}</div>
    </section>
  );
}
