export const CHART_COLORS = {
  dark: '#1A1851',
  primary: '#003A8F',
  secondary: '#60A5FA',
  hover: '#002C6B',
  gold: '#F6BE00',
  neutral: '#CBD5E1',
  slate: '#94A3B8',
  green: '#0F766E'
} as const;

export const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '12px',
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)'
} as const;

export const AXIS_TICK = {
  fill: '#4B5563',
  fontSize: 11,
  fontWeight: 600
} as const;

export const YEAR_LABELS = {
  '2024': 'Academic Year: 2023-2024',
  '2023': 'Academic Year: 2022-2023',
  '2022': 'Academic Year: 2021-2022'
} as const;

export const DEPARTMENTS = [
  {
    id: 'IT',
    shortLabel: 'IT',
    name: 'Information Technology',
    totalProjects: 42,
    completed: 18,
    inProgress: 24,
    pendingReview: 6,
    delayed: 3,
    students: 0,
    advisers: 8,
    successRate: 86,
    deployed: 8
  },
  {
    id: 'TCM',
    shortLabel: 'TCM',
    name: 'Technology Communication Management',
    totalProjects: 19,
    completed: 7,
    inProgress: 12,
    pendingReview: 3,
    delayed: 1,
    students: 0,
    advisers: 4,
    successRate: 82,
    deployed: 4
  },
  {
    id: 'MET',
    shortLabel: 'MET',
    name: 'Manufacturing Engineering Technology',
    totalProjects: 28,
    completed: 10,
    inProgress: 18,
    pendingReview: 4,
    delayed: 2,
    students: 0,
    advisers: 6,
    successRate: 78,
    deployed: 5
  },
  {
    id: 'ESM',
    shortLabel: 'ESM',
    name: 'Energy Systems and Management',
    totalProjects: 35,
    completed: 12,
    inProgress: 23,
    pendingReview: 3,
    delayed: 4,
    students: 0,
    advisers: 7,
    successRate: 74,
    deployed: 3
  },
  {
    id: 'NAME',
    shortLabel: 'NAME',
    name: 'Naval Architecture and Marine Engineering',
    totalProjects: 32,
    completed: 11,
    inProgress: 21,
    pendingReview: 2,
    delayed: 3,
    students: 0,
    advisers: 5,
    successRate: 79,
    deployed: 3
  }
] as const;

export const BASE_MONTHLY_TRENDS = {
  '2024': [
    { month: 'Aug', submissions: 18, approvals: 12, completions: 7 },
    { month: 'Sep', submissions: 24, approvals: 17, completions: 10 },
    { month: 'Oct', submissions: 26, approvals: 19, completions: 12 },
    { month: 'Nov', submissions: 22, approvals: 18, completions: 11 },
    { month: 'Dec', submissions: 20, approvals: 15, completions: 9 },
    { month: 'Jan', submissions: 28, approvals: 20, completions: 13 },
    { month: 'Feb', submissions: 30, approvals: 24, completions: 16 }
  ],
  '2023': [
    { month: 'Aug', submissions: 15, approvals: 10, completions: 5 },
    { month: 'Sep', submissions: 19, approvals: 14, completions: 8 },
    { month: 'Oct', submissions: 21, approvals: 15, completions: 9 },
    { month: 'Nov', submissions: 20, approvals: 14, completions: 8 },
    { month: 'Dec', submissions: 17, approvals: 12, completions: 7 },
    { month: 'Jan', submissions: 22, approvals: 16, completions: 10 },
    { month: 'Feb', submissions: 24, approvals: 18, completions: 12 }
  ],
  '2022': [
    { month: 'Aug', submissions: 12, approvals: 8, completions: 4 },
    { month: 'Sep', submissions: 14, approvals: 10, completions: 5 },
    { month: 'Oct', submissions: 17, approvals: 12, completions: 6 },
    { month: 'Nov', submissions: 15, approvals: 11, completions: 6 },
    { month: 'Dec', submissions: 13, approvals: 10, completions: 5 },
    { month: 'Jan', submissions: 18, approvals: 13, completions: 8 },
    { month: 'Feb', submissions: 20, approvals: 15, completions: 9 }
  ]
} as const;

export const ADVISER_LOADS = [
  { name: 'Dr. Ricardo Cruz', department: 'IT', projects: 12 },
  { name: 'Prof. Maria Ramos', department: 'MET', projects: 8 },
  { name: 'Dr. Anna Reyes', department: 'TCM', projects: 6 },
  { name: 'Prof. Jose Lopez', department: 'ESM', projects: 9 },
  { name: 'Dr. Elena Aquino', department: 'NAME', projects: 7 },
  { name: 'Dr. Samantha Uy', department: 'IT', projects: 10 },
  { name: 'Prof. Carlo Garcia', department: 'MET', projects: 6 },
  { name: 'Dr. Liza Bautista', department: 'ESM', projects: 5 }
] as const;

export const RECENT_PROJECTS = [
  {
    id: 'proj-1',
    title: 'AI-Powered Learning Platform',
    department: 'IT',
    stage: 'Final technical review',
    statusLabel: 'Approved',
    statusClass: 'status-approved',
    adviser: 'Dr. Cruz',
    date: 'Jan 15, 2024'
  },
  {
    id: 'proj-2',
    title: 'Smart Irrigation System',
    department: 'MET',
    stage: 'Pending endorsement release',
    statusLabel: 'Pending',
    statusClass: 'status-pending',
    adviser: 'Prof. Ramos',
    date: 'Jan 20, 2024'
  },
  {
    id: 'proj-3',
    title: 'Herbal Medicine Database',
    department: 'TCM',
    stage: 'Awaiting revised documentation',
    statusLabel: 'Needs Revision',
    statusClass: 'status-review',
    adviser: 'Dr. Reyes',
    date: 'Jan 25, 2024'
  },
  {
    id: 'proj-4',
    title: 'Waste-to-Energy Converter',
    department: 'ESM',
    stage: 'Deployment clearance issued',
    statusLabel: 'Approved',
    statusClass: 'status-approved',
    adviser: 'Dr. Santos',
    date: 'Jan 28, 2024'
  },
  {
    id: 'proj-5',
    title: 'Marine Navigation System',
    department: 'NAME',
    stage: 'Waiting for defense panel schedule',
    statusLabel: 'Pending',
    statusClass: 'status-pending',
    adviser: 'Prof. Lopez',
    date: 'Feb 1, 2024'
  }
] as const;
