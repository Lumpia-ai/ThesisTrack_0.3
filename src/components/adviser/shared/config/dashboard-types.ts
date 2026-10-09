export type DashboardTone = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface WeeklyScheduleItem {
  id: string;
  dateLabel: string;
  timeLabel: string;
  groupName: string;
  eventType: string;
  location?: string;
  tone?: DashboardTone;
  scheduleType?: string;
  projectId?: string;
  notes?: string;
}

/**
 * Dashboard chart palette, taken from the system theme tokens so charts follow branding
 * and dark mode. Every color ships beside a text label, never alone.
 */
export const DASH_COLORS = {
  // One blue ordinal ramp: the stronger the blue, the healthier the state.
  // Steps are defined per theme as `--dash-blue-*` in adviser-dashboard.css.
  /** Done. */
  good: 'var(--dash-blue-5)',
  /** In progress / informational. */
  series: 'var(--dash-blue-4)',
  /** Waiting on the adviser, or behind pace. */
  warning: 'var(--dash-blue-3)',
  /** Sent back and needs fixing. */
  critical: 'var(--dash-blue-2)',
  /** Terminal failure. */
  criticalStrong: 'var(--dash-blue-1)',
  neutral: 'var(--text-light)'
} as const;

export type DashSlice = { key: string; label: string; value: number; color: string };

export type DashProgressRow = {
  id: string;
  name: string;
  title: string;
  progress: number;
  /** Progress-band color: the same scale as the gauge. */
  progressColor: string;
  detail: string;
  status: { label: string; color: string };
};

export type DashListItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: { label: string; color: string };
  date?: { day: string; month: string };
};
