/**
 * MOCK DATA for the System Admin dashboard (/system-admin/dashboard).
 *
 * Shaped like the future API response so the page can switch to a real endpoint by replacing
 * `getSystemAdminDashboardMock()` with a fetch. See PLACEHOLDERS.md for each section's data source.
 */

export type DashboardKpis = {
  totalUsers: number;
  newUsersThisWeek: number;
  /** New sign-ups per day for the last 7 days, oldest first (today last). Sums to `newUsersThisWeek`. */
  signupsLast7Days: number[];
  activeAccounts: number;
  suspendedAccounts: number;
  suspensionsExpiringThisWeek: number;
  staffAccounts: number;
  /** Admin-issued staff accounts by role; sums to `staffAccounts`. */
  staffByRole: { group: DashboardRoleGroup; count: number }[];
};

export type DashboardRoleGroup = 'students' | 'advisers_panelists' | 'program_heads' | 'partners' | 'other_staff';

export type DashboardRoleCount = {
  group: DashboardRoleGroup;
  count: number;
};

export type DashboardActivity =
  | { id: string; type: 'account_created'; occurredAt: string; subjectName: string; subjectRole: string }
  | { id: string; type: 'account_suspended'; occurredAt: string; subjectName: string; durationDays: number }
  | { id: string; type: 'account_restored'; occurredAt: string; subjectName: string }
  | { id: string; type: 'branding_updated'; occurredAt: string; area: string };

export type DashboardAttentionKind = 'suspensions_ending' | 'temporary_passwords' | 'new_registrations';

export type DashboardAttentionItem = {
  id: string;
  kind: DashboardAttentionKind;
  count: number;
  /** 'warning' shows a gold dot, 'neutral' a gray one; the text always states the issue too. */
  tone: 'warning' | 'neutral';
  href: string;
};

export type DashboardPortalStatus = {
  serverStatus: 'online' | 'degraded' | 'offline';
  maintenanceMode: boolean;
  academicYear: string;
  studentRegistration: 'open' | 'closed';
  lastBrandingUpdate: string;
};

/**
 * Period within a school year for the activity summary. Two semesters, no summer term:
 * 1st semester = Aug–Dec, 2nd semester = Jan–May.
 */
export type DashboardSchoolTerm = 'year' | 'first' | 'second';

export type DashboardSummaryMetricKey =
  | 'new_signups'
  | 'sign_ins'
  | 'staff_created'
  | 'suspensions'
  | 'restorations'
  | 'password_resets'
  | 'failed_sign_ins'
  | 'config_changes';

export type DashboardSummaryMetric = {
  key: DashboardSummaryMetricKey;
  /**
   * Monthly counts per school year (key = school year, e.g. "2025–2026"): 10 values, August → May
   * (no summer term). A school year still in progress may have fewer values.
   */
  monthly: Record<string, number[]>;
};

export type DashboardSummary = {
  /** School years with data, newest (current) first. */
  schoolYears: string[];
  metrics: DashboardSummaryMetric[];
};

export type SystemAdminDashboardData = {
  kpis: DashboardKpis;
  usersByRole: DashboardRoleCount[];
  recentActivity: DashboardActivity[];
  needsAttention: DashboardAttentionItem[];
  portalStatus: DashboardPortalStatus;
  summary: DashboardSummary;
};

/** Small seeded PRNG (mulberry32) so the mock is identical on the server and the client. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOCK_SCHOOL_YEARS = ['2025–2026', '2024–2025', '2023–2024'];

/**
 * Relative activity per month of the school year (Aug → May, no summer): busy at the start of each
 * semester (enrolment, capstone kick-off in January) and around defenses (Nov, Apr).
 * Counts are platform-wide, not per capstone batch.
 */
const ACADEMIC_RHYTHM = [1.5, 1.1, 1.0, 1.2, 0.7, 1.4, 1.0, 1.0, 1.3, 1.1];

/**
 * One metric: `perMonth` is the typical monthly count for the current school year; earlier years
 * are a little smaller (`growth` per year) so the year-over-year change is realistic.
 */
function mockMetric(key: DashboardSummaryMetricKey, seed: number, perMonth: number, growth = 0.12): DashboardSummaryMetric {
  const monthly: Record<string, number[]> = {};

  MOCK_SCHOOL_YEARS.forEach((schoolYear, yearsBack) => {
    const random = seeded(seed + yearsBack * 97);
    const scale = perMonth / (1 + growth) ** yearsBack;
    monthly[schoolYear] = ACADEMIC_RHYTHM.map((weight) => Math.max(0, Math.round(scale * weight * (0.75 + random() * 0.5))));
  });

  return { key, monthly };
}

/** ISO timestamp for today (or `daysAgo` days back) at a given local time, so relative labels stay realistic. */
function at(hours: number, minutes: number, daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function getSystemAdminDashboardMock(): SystemAdminDashboardData {
  return {
    kpis: {
      totalUsers: 1284,
      newUsersThisWeek: 32,
      signupsLast7Days: [4, 3, 5, 6, 2, 0, 12],
      activeAccounts: 1261,
      suspendedAccounts: 23,
      suspensionsExpiringThisWeek: 4,
      staffAccounts: 47,
      staffByRole: [
        { group: 'advisers_panelists', count: 24 },
        { group: 'program_heads', count: 5 },
        { group: 'other_staff', count: 18 }
      ]
    },
    usersByRole: [
      { group: 'students', count: 1152 },
      { group: 'advisers_panelists', count: 58 },
      { group: 'program_heads', count: 5 },
      { group: 'partners', count: 19 },
      { group: 'other_staff', count: 50 }
    ],
    recentActivity: [
      { id: 'act-1', type: 'account_created', occurredAt: at(10, 42), subjectName: 'M. Reyes', subjectRole: 'Adviser' },
      { id: 'act-2', type: 'account_suspended', occurredAt: at(9, 15), subjectName: 'J. Cruz', durationDays: 7 },
      { id: 'act-3', type: 'account_restored', occurredAt: at(8, 30), subjectName: 'A. Lim' },
      { id: 'act-4', type: 'branding_updated', occurredAt: at(16, 5, 1), area: 'colors' },
      { id: 'act-5', type: 'account_created', occurredAt: at(14, 20, 2), subjectName: 'R. Santos', subjectRole: 'Panelist' },
      { id: 'act-6', type: 'branding_updated', occurredAt: at(11, 0, 3), area: 'logo' }
    ],
    needsAttention: [
      { id: 'att-1', kind: 'suspensions_ending', count: 4, tone: 'warning', href: '/system-admin/users' },
      { id: 'att-2', kind: 'temporary_passwords', count: 6, tone: 'warning', href: '/system-admin/users' },
      { id: 'att-3', kind: 'new_registrations', count: 12, tone: 'neutral', href: '/system-admin/users' }
    ],
    portalStatus: {
      serverStatus: 'online',
      maintenanceMode: false,
      academicYear: '2025–2026',
      studentRegistration: 'open',
      lastBrandingUpdate: at(16, 5, 1)
    },
    summary: {
      schoolYears: MOCK_SCHOOL_YEARS,
      metrics: [
        mockMetric('new_signups', 11, 110, 0.18),
        mockMetric('sign_ins', 21, 9800, 0.1),
        mockMetric('staff_created', 31, 4, 0.05),
        mockMetric('suspensions', 41, 3, -0.08),
        mockMetric('restorations', 51, 2, 0),
        mockMetric('password_resets', 61, 30, 0.04),
        mockMetric('failed_sign_ins', 71, 260, -0.1),
        mockMetric('config_changes', 81, 6, 0.02)
      ]
    }
  };
}
