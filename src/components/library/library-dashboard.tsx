'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ChartResponsiveContainer } from '@/components/shared/chart-responsive-container';
import { LibraryChartCard } from '@/components/library/library-chart-card';
import {
  LIBRARY_DEPARTMENT_SUMMARY,
  LIBRARY_EMERGING_TOPICS,
  LIBRARY_KEYWORD_TRENDS,
  LIBRARY_PROJECTS,
  LIBRARY_RECOMMENDED_READING,
  LIBRARIAN_PICKS_OF_THE_MONTH,
  type LibraryDepartment
} from '@/components/library/library-data';
import { LibraryShell } from '@/components/library/library-shell';

const CHART_COLORS = {
  primary: '#003A8F',
  primaryDark: '#002C6B',
  secondary: '#2563EB',
  blueLight: '#60A5FA',
  gold: '#F6BE00',
  emerald: '#10B981',
  purple: '#8B5CF6',
  neutral: '#94A3B8',
  danger: '#EF4444'
};

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #E2E8F0',
  borderRadius: '0.6rem',
  boxShadow: '0 10px 25px rgba(0, 58, 143, 0.08)',
  fontSize: '0.82rem',
  padding: '0.6rem 0.9rem'
};

const AXIS_TICK = { fill: '#64748B', fontSize: 11 };

const YEAR_LABELS = {
  '2024': 'AY 2023-2024',
  '2023': 'AY 2022-2023',
  '2022': 'AY 2021-2022'
} as const;

type AcademicYearKey = keyof typeof YEAR_LABELS;

type DeptStats = {
  id: LibraryDepartment;
  name: string;
  shortLabel: string;
  totalCataloged: number;
  digitized: number;
  inReview: number;
  clearancePending: number;
  totalViews: number;
  downloads: number;
  utilizationRate: number;
};

const LIBRARY_DEPT_DETAILS: DeptStats[] = [
  {
    id: 'NAME',
    name: 'Naval Architecture & Marine Eng',
    shortLabel: 'BSNAME',
    totalCataloged: 104,
    digitized: 99,
    inReview: 4,
    clearancePending: 1,
    totalViews: 5240,
    downloads: 1540,
    utilizationRate: 97
  },
  {
    id: 'IT',
    name: 'Information Technology',
    shortLabel: 'BSIT',
    totalCataloged: 88,
    digitized: 84,
    inReview: 3,
    clearancePending: 1,
    totalViews: 4180,
    downloads: 1250,
    utilizationRate: 95
  },
  {
    id: 'ESM',
    name: 'Engineering & Sustainability',
    shortLabel: 'BSESM',
    totalCataloged: 72,
    digitized: 68,
    inReview: 3,
    clearancePending: 1,
    totalViews: 2850,
    downloads: 870,
    utilizationRate: 94
  },
  {
    id: 'MET',
    name: 'Manufacturing Engineering Tech',
    shortLabel: 'BSMET',
    totalCataloged: 67,
    digitized: 62,
    inReview: 4,
    clearancePending: 1,
    totalViews: 2140,
    downloads: 690,
    utilizationRate: 92
  },
  {
    id: 'TCM',
    name: 'Tech Communication Management',
    shortLabel: 'BSTCM',
    totalCataloged: 45,
    digitized: 43,
    inReview: 1,
    clearancePending: 1,
    totalViews: 1380,
    downloads: 480,
    utilizationRate: 95
  }
];

const BASE_MONTHLY_CIRCULATION: Record<
  AcademicYearKey,
  { month: string; views: number; downloads: number; citations: number }[]
> = {
  '2024': [
    { month: 'Jan', views: 820, downloads: 240, citations: 65 },
    { month: 'Feb', views: 1140, downloads: 350, citations: 90 },
    { month: 'Mar', views: 1650, downloads: 520, citations: 140 },
    { month: 'Apr', views: 2180, downloads: 690, citations: 185 },
    { month: 'May', views: 2450, downloads: 780, citations: 210 },
    { month: 'Jun', views: 1980, downloads: 610, citations: 160 },
    { month: 'Jul', views: 1320, downloads: 410, citations: 115 },
    { month: 'Aug', views: 1540, downloads: 470, citations: 130 },
    { month: 'Sep', views: 2260, downloads: 710, citations: 195 },
    { month: 'Oct', views: 2610, downloads: 830, citations: 230 },
    { month: 'Nov', views: 2340, downloads: 740, citations: 205 },
    { month: 'Dec', views: 1890, downloads: 580, citations: 155 }
  ],
  '2023': [
    { month: 'Jan', views: 710, downloads: 210, citations: 55 },
    { month: 'Feb', views: 980, downloads: 290, citations: 75 },
    { month: 'Mar', views: 1420, downloads: 430, citations: 115 },
    { month: 'Apr', views: 1890, downloads: 590, citations: 150 },
    { month: 'May', views: 2120, downloads: 660, citations: 180 },
    { month: 'Jun', views: 1710, downloads: 520, citations: 135 },
    { month: 'Jul', views: 1150, downloads: 350, citations: 95 },
    { month: 'Aug', views: 1340, downloads: 410, citations: 110 },
    { month: 'Sep', views: 1950, downloads: 600, citations: 165 },
    { month: 'Oct', views: 2240, downloads: 700, citations: 190 },
    { month: 'Nov', views: 2010, downloads: 630, citations: 170 },
    { month: 'Dec', views: 1620, downloads: 490, citations: 130 }
  ],
  '2022': [
    { month: 'Jan', views: 590, downloads: 170, citations: 40 },
    { month: 'Feb', views: 820, downloads: 240, citations: 60 },
    { month: 'Mar', views: 1190, downloads: 360, citations: 95 },
    { month: 'Apr', views: 1580, downloads: 480, citations: 125 },
    { month: 'May', views: 1780, downloads: 540, citations: 145 },
    { month: 'Jun', views: 1430, downloads: 430, citations: 110 },
    { month: 'Jul', views: 960, downloads: 290, citations: 75 },
    { month: 'Aug', views: 1120, downloads: 340, citations: 90 },
    { month: 'Sep', views: 1630, downloads: 490, citations: 135 },
    { month: 'Oct', views: 1870, downloads: 570, citations: 155 },
    { month: 'Nov', views: 1690, downloads: 510, citations: 140 },
    { month: 'Dec', views: 1350, downloads: 400, citations: 105 }
  ]
};

// =========================================================================
// OFFICIAL DEPARTMENT THEMES & COLORS (USTP STANDARDS)
// =========================================================================
export const DEPARTMENT_THEMES: Record<
  string,
  {
    name: string;
    shortLabel: string;
    color: string;
    bg: string;
    border: string;
    text: string;
  }
> = {
  IT: {
    name: 'Information Technology',
    shortLabel: 'BSIT',
    color: '#FACC15',
    bg: 'rgba(254, 240, 138, 0.45)',
    border: 'rgba(234, 179, 8, 0.45)',
    text: '#854D0E'
  },
  BSIT: {
    name: 'Information Technology',
    shortLabel: 'BSIT',
    color: '#FACC15',
    bg: 'rgba(254, 240, 138, 0.45)',
    border: 'rgba(234, 179, 8, 0.45)',
    text: '#854D0E'
  },
  IR: {
    name: 'Information Technology',
    shortLabel: 'BSIT',
    color: '#FACC15',
    bg: 'rgba(254, 240, 138, 0.45)',
    border: 'rgba(234, 179, 8, 0.45)',
    text: '#854D0E'
  },
  BSIR: {
    name: 'Information Technology',
    shortLabel: 'BSIT',
    color: '#FACC15',
    bg: 'rgba(254, 240, 138, 0.45)',
    border: 'rgba(234, 179, 8, 0.45)',
    text: '#854D0E'
  },
  MET: {
    name: 'Manufacturing Engineering Tech',
    shortLabel: 'BSMET',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.25)',
    text: '#DC2626'
  },
  BSMET: {
    name: 'Manufacturing Engineering Tech',
    shortLabel: 'BSMET',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.25)',
    text: '#DC2626'
  },
  TCM: {
    name: 'Tech Communication Management',
    shortLabel: 'BSTCM',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.30)',
    text: '#059669'
  },
  BSTCM: {
    name: 'Tech Communication Management',
    shortLabel: 'BSTCM',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.30)',
    text: '#059669'
  },
  ESM: {
    name: 'Engineering & Sustainability',
    shortLabel: 'BSESM',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.28)',
    text: '#7C3AED'
  },
  BSESM: {
    name: 'Engineering & Sustainability',
    shortLabel: 'BSESM',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.28)',
    text: '#7C3AED'
  },
  NAME: {
    name: 'Naval Architecture & Marine Eng',
    shortLabel: 'BSNAME',
    color: '#003A8F',
    bg: 'rgba(0, 58, 143, 0.10)',
    border: 'rgba(0, 58, 143, 0.25)',
    text: '#003A8F'
  },
  BSNAME: {
    name: 'Naval Architecture & Marine Eng',
    shortLabel: 'BSNAME',
    color: '#003A8F',
    bg: 'rgba(0, 58, 143, 0.10)',
    border: 'rgba(0, 58, 143, 0.25)',
    text: '#003A8F'
  }
};

export function getDepartmentTheme(dept: string) {
  const clean = dept ? dept.toUpperCase() : 'IT';
  return (
    DEPARTMENT_THEMES[clean] ||
    DEPARTMENT_THEMES[clean.replace(/^BS/, '')] || {
      name: dept,
      shortLabel: dept,
      color: '#FACC15',
      bg: 'rgba(254, 240, 138, 0.45)',
      border: 'rgba(234, 179, 8, 0.45)',
      text: '#854D0E'
    }
  );
}

export function DepartmentBadge({
  department,
  label,
  style
}: {
  department: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  const theme = getDepartmentTheme(department);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.22rem 0.58rem',
        borderRadius: '999px',
        fontSize: '0.74rem',
        fontWeight: 700,
        lineHeight: 1,
        backgroundColor: theme.bg,
        border: `1px solid ${theme.border}`,
        color: theme.text,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: theme.color,
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      {label || theme.shortLabel || department}
    </span>
  );
}

// =========================================================================
// DATA FOR MOST WATCHED ARTICLES & WHO DEPARTMENTS REVIEW IT
// =========================================================================
export type ArticleDepartmentReview = {
  deptId: LibraryDepartment;
  shortLabel: string;
  name: string;
  reviews: number;
  percentage: number;
  color: string;
};

export type WatchedArticleData = {
  id: number;
  title: string;
  department: LibraryDepartment;
  authors: string;
  year: number;
  adviser: string;
  type: string;
  totalViews: number;
  reviewCount: number;
  reviewingDepartments: ArticleDepartmentReview[];
};

export const TOP_WATCHED_ARTICLES: WatchedArticleData[] = [
  {
    id: 5,
    title: 'Autonomous Marine Drone for Coastal Environmental Surveying',
    department: 'NAME',
    authors: 'R. K. Tanaka, J. P. Mendoza, D. E. Cruz',
    year: 2024,
    adviser: 'Engr. Roberto Diaz',
    type: 'Machine / Device',
    totalViews: 1480,
    reviewCount: 385,
    reviewingDepartments: [
      { deptId: 'NAME', shortLabel: 'BSNAME', name: 'Naval Architecture & Marine Eng', reviews: 168, percentage: 43.6, color: '#003A8F' },
      { deptId: 'IT', shortLabel: 'BSIT', name: 'Information Technology', reviews: 102, percentage: 26.5, color: '#FACC15' },
      { deptId: 'MET', shortLabel: 'BSMET', name: 'Manufacturing Engineering Tech', reviews: 58, percentage: 15.1, color: '#EF4444' },
      { deptId: 'ESM', shortLabel: 'BSESM', name: 'Engineering & Sustainability', reviews: 36, percentage: 9.4, color: '#8B5CF6' },
      { deptId: 'TCM', shortLabel: 'BSTCM', name: 'Tech Communication Management', reviews: 21, percentage: 5.4, color: '#10B981' }
    ]
  },
  {
    id: 1,
    title: 'AI-Powered Learning Management System with Predictive Analytics',
    department: 'IT',
    authors: 'J. M. Reyes, A. L. Santos, P. D. Garcia',
    year: 2024,
    adviser: 'Dr. Ricardo Cruz',
    type: 'AI/ML System',
    totalViews: 1234,
    reviewCount: 312,
    reviewingDepartments: [
      { deptId: 'IT', shortLabel: 'BSIT', name: 'Information Technology', reviews: 132, percentage: 42.3, color: '#FACC15' },
      { deptId: 'TCM', shortLabel: 'BSTCM', name: 'Tech Communication Management', reviews: 74, percentage: 23.7, color: '#10B981' },
      { deptId: 'ESM', shortLabel: 'BSESM', name: 'Engineering & Sustainability', reviews: 48, percentage: 15.4, color: '#8B5CF6' },
      { deptId: 'MET', shortLabel: 'BSMET', name: 'Manufacturing Engineering Tech', reviews: 36, percentage: 11.5, color: '#EF4444' },
      { deptId: 'NAME', shortLabel: 'BSNAME', name: 'Naval Architecture & Marine Eng', reviews: 22, percentage: 7.1, color: '#003A8F' }
    ]
  },
  {
    id: 2,
    title: 'Smart Solar Energy Monitor with Automated Load Balancing',
    department: 'MET',
    authors: 'P. M. Alcantara, L. B. Torres',
    year: 2024,
    adviser: 'Prof. Maria Ramos',
    type: 'IoT System',
    totalViews: 890,
    reviewCount: 218,
    reviewingDepartments: [
      { deptId: 'MET', shortLabel: 'BSMET', name: 'Manufacturing Engineering Tech', reviews: 88, percentage: 40.4, color: '#EF4444' },
      { deptId: 'ESM', shortLabel: 'BSESM', name: 'Engineering & Sustainability', reviews: 58, percentage: 26.6, color: '#8B5CF6' },
      { deptId: 'IT', shortLabel: 'BSIT', name: 'Information Technology', reviews: 44, percentage: 20.2, color: '#FACC15' },
      { deptId: 'TCM', shortLabel: 'BSTCM', name: 'Tech Communication Management', reviews: 17, percentage: 7.8, color: '#10B981' },
      { deptId: 'NAME', shortLabel: 'BSNAME', name: 'Naval Architecture & Marine Eng', reviews: 11, percentage: 5.0, color: '#003A8F' }
    ]
  },
  {
    id: 4,
    title: 'Sustainable Agriculture IoT Monitoring System for Hydroponics',
    department: 'ESM',
    authors: 'C. V. Morales, K. T. Fernandez',
    year: 2024,
    adviser: 'Dr. Anna Reyes',
    type: 'IoT System',
    totalViews: 780,
    reviewCount: 196,
    reviewingDepartments: [
      { deptId: 'ESM', shortLabel: 'BSESM', name: 'Engineering & Sustainability', reviews: 86, percentage: 43.9, color: '#8B5CF6' },
      { deptId: 'IT', shortLabel: 'BSIT', name: 'Information Technology', reviews: 52, percentage: 26.5, color: '#FACC15' },
      { deptId: 'MET', shortLabel: 'BSMET', name: 'Manufacturing Engineering Tech', reviews: 31, percentage: 15.8, color: '#EF4444' },
      { deptId: 'TCM', shortLabel: 'BSTCM', name: 'Tech Communication Management', reviews: 19, percentage: 9.7, color: '#10B981' },
      { deptId: 'NAME', shortLabel: 'BSNAME', name: 'Naval Architecture & Marine Eng', reviews: 8, percentage: 4.1, color: '#003A8F' }
    ]
  },
  {
    id: 12,
    title: 'Hospital Patient Records Management System with Role Access',
    department: 'IT',
    authors: 'A. S. Ramos, V. T. Santiago',
    year: 2023,
    adviser: 'Prof. Maria Ramos',
    type: 'Web-Based',
    totalViews: 721,
    reviewCount: 184,
    reviewingDepartments: [
      { deptId: 'IT', shortLabel: 'BSIT', name: 'Information Technology', reviews: 89, percentage: 48.4, color: '#FACC15' },
      { deptId: 'TCM', shortLabel: 'BSTCM', name: 'Tech Communication Management', reviews: 48, percentage: 26.1, color: '#10B981' },
      { deptId: 'ESM', shortLabel: 'BSESM', name: 'Engineering & Sustainability', reviews: 24, percentage: 13.0, color: '#8B5CF6' },
      { deptId: 'MET', shortLabel: 'BSMET', name: 'Manufacturing Engineering Tech', reviews: 15, percentage: 8.2, color: '#EF4444' },
      { deptId: 'NAME', shortLabel: 'BSNAME', name: 'Naval Architecture & Marine Eng', reviews: 8, percentage: 4.3, color: '#003A8F' }
    ]
  },
  {
    id: 3,
    title: 'Herbal Medicine Database & Digital Formulation Repository',
    department: 'TCM',
    authors: 'M. S. Bautista, C. L. Dizon',
    year: 2023,
    adviser: 'Dr. Anna Reyes',
    type: 'Web-Based',
    totalViews: 642,
    reviewCount: 165,
    reviewingDepartments: [
      { deptId: 'TCM', shortLabel: 'BSTCM', name: 'Tech Communication Management', reviews: 48, percentage: 29.1, color: '#10B981' },
      { deptId: 'IT', shortLabel: 'BSIT', name: 'Information Technology', reviews: 45, percentage: 27.3, color: '#FACC15' },
      { deptId: 'ESM', shortLabel: 'BSESM', name: 'Engineering & Sustainability', reviews: 36, percentage: 21.8, color: '#8B5CF6' },
      { deptId: 'MET', shortLabel: 'BSMET', name: 'Manufacturing Engineering Tech', reviews: 22, percentage: 13.3, color: '#EF4444' },
      { deptId: 'NAME', shortLabel: 'BSNAME', name: 'Naval Architecture & Marine Eng', reviews: 14, percentage: 8.5, color: '#003A8F' }
    ]
  }
];

// =========================================================================
// DATA FOR OVERALL DEPARTMENT REVIEW ACTIVITY (WHO FREQUENTLY REVIEWS)
// =========================================================================
export const OVERALL_DEPT_REVIEW_ACTIVITY = [
  {
    rank: 1,
    deptId: 'NAME',
    shortLabel: 'BSNAME',
    name: 'Naval Architecture & Marine Eng',
    totalReviews: 5240,
    share: 33.2,
    reviewVelocity: '41.8 / day',
    crossDeptRate: 62,
    frequencyBadge: 'Most Frequent Reviewer',
    badgeColor: '#003A8F',
    color: '#003A8F'
  },
  {
    rank: 2,
    deptId: 'IT',
    shortLabel: 'BSIT',
    name: 'Information Technology',
    totalReviews: 4180,
    share: 26.5,
    reviewVelocity: '33.2 / day',
    crossDeptRate: 64,
    frequencyBadge: 'High Review Activity',
    badgeColor: '#854D0E',
    color: '#FACC15'
  },
  {
    rank: 3,
    deptId: 'ESM',
    shortLabel: 'BSESM',
    name: 'Engineering & Sustainability',
    totalReviews: 2850,
    share: 18.1,
    reviewVelocity: '22.8 / day',
    crossDeptRate: 58,
    frequencyBadge: 'Active Reviewer',
    badgeColor: '#8B5CF6',
    color: '#8B5CF6'
  },
  {
    rank: 4,
    deptId: 'MET',
    shortLabel: 'BSMET',
    name: 'Manufacturing Engineering Tech',
    totalReviews: 2140,
    share: 13.6,
    reviewVelocity: '17.1 / day',
    crossDeptRate: 52,
    frequencyBadge: 'Steady Reviewer',
    badgeColor: '#EF4444',
    color: '#EF4444'
  },
  {
    rank: 5,
    deptId: 'TCM',
    shortLabel: 'BSTCM',
    name: 'Tech Communication Management',
    totalReviews: 1380,
    share: 8.6,
    reviewVelocity: '11.0 / day',
    crossDeptRate: 71,
    frequencyBadge: 'Highest Cross-Dept (71%)',
    badgeColor: '#059669',
    color: '#10B981'
  }
];

const DEPARTMENT_COLLECTION_FORMATS: Record<
  LibraryDepartment,
  { name: string; value: number; color: string }[]
> = {
  NAME: [
    { name: 'Machine & Device Fabrications', value: 44, color: CHART_COLORS.primary },
    { name: 'IoT & Telemetry Systems', value: 28, color: CHART_COLORS.secondary },
    { name: 'AI / Hydrodynamic Simulation', value: 16, color: CHART_COLORS.gold },
    { name: 'Web & Fleet Portals', value: 12, color: CHART_COLORS.emerald },
    { name: 'Maritime Policy & Survey Papers', value: 4, color: CHART_COLORS.neutral }
  ],
  IT: [
    { name: 'Web-Based Platforms', value: 46, color: CHART_COLORS.primary },
    { name: 'AI / Machine Learning', value: 26, color: CHART_COLORS.gold },
    { name: 'IoT Systems & Mobile Apps', value: 12, color: CHART_COLORS.secondary },
    { name: 'Research & Architecture Papers', value: 4, color: CHART_COLORS.neutral }
  ],
  ESM: [
    { name: 'IoT & Environmental Monitoring', value: 34, color: CHART_COLORS.secondary },
    { name: 'Sustainability & Policy Studies', value: 22, color: CHART_COLORS.emerald },
    { name: 'Web & Analytics Systems', value: 10, color: CHART_COLORS.primary },
    { name: 'AI & Renewable Models', value: 6, color: CHART_COLORS.gold }
  ],
  MET: [
    { name: 'Product & Fabrication Prototypes', value: 36, color: CHART_COLORS.emerald },
    { name: 'IoT & Smart Sensors', value: 20, color: CHART_COLORS.secondary },
    { name: 'Web & Industrial Automation', value: 7, color: CHART_COLORS.primary },
    { name: 'Machine Learning Quality Control', value: 4, color: CHART_COLORS.gold }
  ],
  TCM: [
    { name: 'Technical Docs & Communication', value: 22, color: CHART_COLORS.primary },
    { name: 'Web & Multimedia Systems', value: 16, color: CHART_COLORS.secondary },
    { name: 'Policy & Information Architecture', value: 7, color: CHART_COLORS.neutral }
  ]
};

const DEPARTMENT_KEYWORDS: Record<LibraryDepartment, { label: string; count: number }[]> = {
  IT: [
    { label: 'Artificial Intelligence', count: 45 },
    { label: 'Machine Learning', count: 38 },
    { label: 'Predictive Analytics', count: 28 },
    { label: 'Blockchain', count: 15 },
    { label: 'Data Analytics', count: 34 },
    { label: 'Web Applications', count: 32 }
  ],
  NAME: [
    { label: 'Autonomous Drones', count: 26 },
    { label: 'Marine Telemetry', count: 24 },
    { label: 'Hydrodynamics', count: 22 },
    { label: 'Coastal Surveillance', count: 18 },
    { label: 'Fleet Optimization', count: 14 }
  ],
  MET: [
    { label: 'Solar Energy', count: 28 },
    { label: 'IoT Sensors', count: 24 },
    { label: 'CNC Fabrication', count: 19 },
    { label: 'EV Charging', count: 16 },
    { label: 'Smart Grid', count: 14 }
  ],
  ESM: [
    { label: 'Sustainability', count: 28 },
    { label: 'Hydroponics IoT', count: 22 },
    { label: 'Renewable Microgrid', count: 19 },
    { label: 'Carbon Accounting', count: 15 },
    { label: 'Water Quality', count: 12 }
  ],
  TCM: [
    { label: 'Herbal Medicine Database', count: 20 },
    { label: 'Technical Documentation', count: 18 },
    { label: 'Marketing Analytics', count: 15 },
    { label: 'Information Architecture', count: 12 },
    { label: 'Usability Engineering', count: 9 }
  ]
};

const DEPARTMENT_EMERGING_TOPICS: Record<LibraryDepartment, { label: string; growth: string }[]> = {
  IT: [
    { label: 'AI in Education & Student Analytics', growth: '+156% growth' },
    { label: 'Federated Edge AI on Campus', growth: '+92% growth' },
    { label: 'Decentralized Identity & Blockchain', growth: '+74% growth' }
  ],
  NAME: [
    { label: 'Autonomous Coastal Patrol Drones', growth: '+124% growth' },
    { label: 'Underwater Acoustic Telemetry', growth: '+85% growth' },
    { label: 'Marine Decarbonization Analytics', growth: '+68% growth' }
  ],
  MET: [
    { label: 'Smart Microgrid & EV Integration', growth: '+118% growth' },
    { label: 'Automated Additive Manufacturing', growth: '+76% growth' },
    { label: 'Sensory Tool Wear Forecasting', growth: '+58% growth' }
  ],
  ESM: [
    { label: 'Closed-Loop Circular Hydroponics', growth: '+135% growth' },
    { label: 'Campus Carbon Neutrality Auditing', growth: '+88% growth' },
    { label: 'Real-Time Watershed Quality IoT', growth: '+62% growth' }
  ],
  TCM: [
    { label: 'Digital Formulation Knowledge Portals', growth: '+142% growth' },
    { label: 'UX Architecture for Open Repositories', growth: '+81% growth' },
    { label: 'Multimedia Technical Dissemination', growth: '+54% growth' }
  ]
};

const RESEARCH_GAPS = [
  {
    title: 'Limited Empirical Studies on AI Ethics in Higher Education',
    department: 'IT',
    urgency: 'High Priority',
    note: 'While 45+ studies leverage ML, only 2 address algorithmic accountability, bias, and student data privacy.'
  },
  {
    title: 'Privacy-Preserving Federated Learning in Campus Portals',
    department: 'IT',
    urgency: 'Medium Priority',
    note: 'High demand for distributed neural network models that train without centralizing student records.'
  },
  {
    title: 'Sparse Circular Economy & Zero-Waste Resource Modeling',
    department: 'ESM',
    urgency: 'High Priority',
    note: 'Opportunity exists to integrate lifecycle assessment and industrial symbiosis into renewable energy projects.'
  },
  {
    title: 'Campus Microgrid Decarbonization and Real-Time IoT Carbon Tracking',
    department: 'ESM',
    urgency: 'Medium Priority',
    note: 'Limited real-world telemetry on local rooftop solar balancing and battery lifecycle degradation.'
  },
  {
    title: 'Specialized Autonomous Maritime IoT Systems',
    department: 'NAME',
    urgency: 'High Priority',
    note: 'High local demand for coastal telemetry and vessel fuel efficiency monitoring using low-power IoT networks.'
  },
  {
    title: 'Hydrodynamic Efficiency Telemetry for Archipelagic Patrol Craft',
    department: 'NAME',
    urgency: 'Medium Priority',
    note: 'Absence of localized wave resistance benchmarks for shallow-draft inter-island transport vessels.'
  },
  {
    title: 'Cross-Disciplinary Industry Fabrication Systems',
    department: 'MET',
    urgency: 'High Priority',
    note: 'Integration of real-time computer vision into automated manufacturing and CNC monitoring lines.'
  },
  {
    title: 'Predictive Maintenance Sensors in Additive Manufacturing Lines',
    department: 'MET',
    urgency: 'Medium Priority',
    note: 'Need for high-temperature vibration sensors detecting filament jams in industrial 3D printing.'
  },
  {
    title: 'Empirical Usability Frameworks for Technical Documentation Portals',
    department: 'TCM',
    urgency: 'High Priority',
    note: 'Critical shortage of user-experience evaluations for multilingual digital research archiving.'
  },
  {
    title: 'Cross-Lingual Information Architecture in Maritime & Tech Portals',
    department: 'TCM',
    urgency: 'Medium Priority',
    note: 'Evaluating how localized terminology influences discovery rates across cross-college research.'
  }
] as const;

const SUGGESTED_TOPICS = [
  {
    title: 'Explainable AI Architectures for Academic Intervention',
    domain: 'Artificial Intelligence',
    impact: 'High Impact',
    department: 'IT'
  },
  {
    title: 'Blockchain Credential Verification for University Transcripts',
    domain: 'Decentralized Tech',
    impact: 'Institutional',
    department: 'IT'
  },
  {
    title: 'Smart CNC Tool Wear Monitoring Using Acoustic Sensors',
    domain: 'Manufacturing Tech',
    impact: 'Industry-Ready',
    department: 'MET'
  },
  {
    title: 'Closed-Loop Material Recycling for Industrial 3D Printing',
    domain: 'Fabrication Engineering',
    impact: 'High Impact',
    department: 'MET'
  },
  {
    title: 'Real-Time Marine Fleet Emissions and Telemetry Analysis',
    domain: 'Maritime Engineering',
    impact: 'Industry-Ready',
    department: 'NAME'
  },
  {
    title: 'Autonomous Hull Inspection Robotics with Underwater Computer Vision',
    domain: 'Marine Robotics',
    impact: 'High Impact',
    department: 'NAME'
  },
  {
    title: 'Hybrid Renewable Microgrid Energy Optimization via Edge IoT',
    domain: 'Clean Technology',
    impact: 'High Impact',
    department: 'ESM'
  },
  {
    title: 'Lifecycle Carbon Accounting for University Infrastructure',
    domain: 'Environmental Science',
    impact: 'Policy-Ready',
    department: 'ESM'
  },
  {
    title: 'Usability Engineering in Technical Knowledge Portals',
    domain: 'Communication Systems',
    impact: 'High Impact',
    department: 'TCM'
  },
  {
    title: 'Multimedia Accessibility Standards for Digital Library Repositories',
    domain: 'Information Architecture',
    impact: 'Institutional',
    department: 'TCM'
  }
] as const;

const BENCHMARK_READING_LIST = [
  {
    title: 'AI in Higher Education',
    description: 'Comprehensive review of AI applications in academic settings.',
    department: 'IT',
    projectId: 1
  },
  {
    title: 'Hospital Patient Records Management System',
    description: 'Enterprise healthcare data security and role-based clearance framework.',
    department: 'IT',
    projectId: 12
  },
  {
    title: 'Sustainable Manufacturing Practices',
    description: 'Case studies on green manufacturing and automated CNC fabrication.',
    department: 'MET',
    projectId: 2
  },
  {
    title: 'Smart EV Charging Station & Load Balancing',
    description: 'Grid-connected charging controller and campus-wide telemetry.',
    department: 'MET',
    projectId: 7
  },
  {
    title: 'Marine Ecosystem Monitoring & Autonomous Surveying',
    description: 'Advanced unmanned naval telemetry and coastal water analysis.',
    department: 'NAME',
    projectId: 5
  },
  {
    title: 'Sustainable Agriculture IoT & Soil Telemetry',
    description: 'Automated hydroponics irrigation and nutrient sensor networks.',
    department: 'ESM',
    projectId: 4
  },
  {
    title: 'Herbal Medicine Database & Formulation Repository',
    description: 'Evidence-based digital repository and traditional botanical documentation.',
    department: 'TCM',
    projectId: 3
  },
  {
    title: 'Digital Marketing & Technical Communication Framework',
    description: 'Quantitative analytics for academic technology dissemination and outreach.',
    department: 'TCM',
    projectId: 8
  }
];

export function LibraryDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState<AcademicYearKey>('2024');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedWatchedArticleId, setSelectedWatchedArticleId] = useState<number>(TOP_WATCHED_ARTICLES[0].id);
  const [activeMainTab, setActiveMainTab] = useState<'trends' | 'insights' | 'benchmarks' | 'catalog' | 'all'>('trends');
  const [intelligenceTab, setIntelligenceTab] = useState<'keywords' | 'emerging' | 'gaps' | 'topics' | 'benchmarks'>('keywords');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  };

  // Librarian's Pick of the Month State & Handlers
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [showcaseCollapsed, setShowcaseCollapsed] = useState(false);

  const currentPick = useMemo(() => {
    return LIBRARIAN_PICKS_OF_THE_MONTH[currentPickIndex] ?? LIBRARIAN_PICKS_OF_THE_MONTH[0];
  }, [currentPickIndex]);

  const featuredPickProject = useMemo(() => {
    return LIBRARY_PROJECTS.find((p) => p.id === currentPick.projectId) ?? LIBRARY_PROJECTS[0];
  }, [currentPick]);

  const handlePrevPick = () => {
    setCurrentPickIndex((prev) => (prev === 0 ? LIBRARIAN_PICKS_OF_THE_MONTH.length - 1 : prev - 1));
  };

  const handleNextPick = () => {
    setCurrentPickIndex((prev) => (prev === LIBRARIAN_PICKS_OF_THE_MONTH.length - 1 ? 0 : prev + 1));
  };

  const handleCopyCitation = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(currentPick.citationText);
      showToast('Academic citation copied to clipboard.', 'success');
    } else {
      showToast('Academic citation copied to clipboard.', 'success');
    }
  };

  const selectedDepartment = LIBRARY_DEPT_DETAILS.find((dept) => dept.id === deptFilter) ?? null;
  const filteredDepartments = selectedDepartment ? [selectedDepartment] : LIBRARY_DEPT_DETAILS;

  // Available Watched Articles (filtered by selected department if filtered, else all)
  const availableWatchedArticles = useMemo(() => {
    if (!selectedDepartment) return TOP_WATCHED_ARTICLES;
    const filtered = TOP_WATCHED_ARTICLES.filter((a) => a.department === selectedDepartment.id);
    return filtered.length > 0 ? filtered : TOP_WATCHED_ARTICLES;
  }, [selectedDepartment]);

  // Selected Most Watched Article data
  const currentWatchedArticle = useMemo(() => {
    const match = availableWatchedArticles.find((a) => a.id === selectedWatchedArticleId);
    return match ?? availableWatchedArticles[0];
  }, [availableWatchedArticles, selectedWatchedArticleId]);

  // Overall Department Review Activity (focused on selected department if filtered)
  const currentDeptReviewActivity = useMemo(() => {
    if (selectedDepartment) {
      return (
        OVERALL_DEPT_REVIEW_ACTIVITY.find((d) => d.deptId === selectedDepartment.id) ??
        OVERALL_DEPT_REVIEW_ACTIVITY[0]
      );
    }
    return OVERALL_DEPT_REVIEW_ACTIVITY[0];
  }, [selectedDepartment]);

  const displayedDeptReviewActivity = useMemo(() => {
    if (selectedDepartment) {
      return OVERALL_DEPT_REVIEW_ACTIVITY.filter((d) => d.deptId === selectedDepartment.id);
    }
    return OVERALL_DEPT_REVIEW_ACTIVITY;
  }, [selectedDepartment]);

  // Institutional Vault Totals across all departments (University-wide benchmarks)
  const totalCatalogedAcrossDepts = LIBRARY_DEPT_DETAILS.reduce((acc, d) => acc + d.totalCataloged, 0);
  const totalDigitized = LIBRARY_DEPT_DETAILS.reduce((acc, d) => acc + d.digitized, 0);
  const totalInReview = LIBRARY_DEPT_DETAILS.reduce((acc, d) => acc + d.inReview, 0);
  const totalClearancePending = LIBRARY_DEPT_DETAILS.reduce((acc, d) => acc + d.clearancePending, 0);
  const totalViews = LIBRARY_DEPT_DETAILS.reduce((acc, d) => acc + d.totalViews, 0);
  const totalDownloads = LIBRARY_DEPT_DETAILS.reduce((acc, d) => acc + d.downloads, 0);

  const scopeLabel = 'All Departments';
  const scopeShare = 1;

  const scopedCataloged = totalCatalogedAcrossDepts;
  const scopedDigitized = totalDigitized;
  const scopedInReview = totalInReview;
  const scopedPendingClearance = totalClearancePending;
  const scopedViews = totalViews;
  const scopedDownloads = totalDownloads;

  const scopedUtilizationRate = Math.round((totalDigitized / Math.max(totalCatalogedAcrossDepts, 1)) * 100);
  const downloadToViewRatio = Math.round((totalDownloads / Math.max(totalViews, 1)) * 100);

  // KPIs - Fixed Institutional Overview (remains stable across all department selections)
  const kpis = [
    {
      label: 'Cataloged Theses',
      value: 376,
      detail: '356 full-text digitized',
      icon: 'fa-book-bookmark'
    },
    {
      label: 'Digitization Rate',
      value: '95%',
      detail: '20 physical archives only',
      icon: 'fa-circle-check'
    },
    {
      label: 'Total Consultations',
      value: '15,790',
      detail: '4,830 PDF downloads',
      icon: 'fa-eye'
    },
    {
      label: 'Department Reviews',
      value: '15,790',
      detail: 'BSNAME leads with 5,240',
      icon: 'fa-clipboard-check'
    },
    {
      label: 'Active Researchers',
      value: '1,420',
      detail: '1280 students · 140 faculty',
      icon: 'fa-users-line'
    }
  ];

  // 1. Donut Chart: Collection by Format/Type (Department specific if chosen, otherwise institutional)
  const collectionTypeData = useMemo(() => {
    if (selectedDepartment && DEPARTMENT_COLLECTION_FORMATS[selectedDepartment.id]) {
      return DEPARTMENT_COLLECTION_FORMATS[selectedDepartment.id];
    }
    return [
      { name: 'Web & Systems', value: 142, color: CHART_COLORS.primary },
      { name: 'IoT & Smart Devices', value: 86, color: CHART_COLORS.secondary },
      { name: 'AI / Machine Learning', value: 58, color: CHART_COLORS.gold },
      { name: 'Fabrications & Products', value: 36, color: CHART_COLORS.emerald },
      { name: 'Research & Policy Papers', value: 20, color: CHART_COLORS.neutral }
    ];
  }, [selectedDepartment]);

  const totalTrackedCollection = useMemo(() => {
    return collectionTypeData.reduce((sum, item) => sum + item.value, 0);
  }, [collectionTypeData]);

  // 2. Bar Chart: Ingestion Pipeline & Archival Status
  const archivalPipelineData = [
    { label: 'Digitized & Public', value: totalDigitized, color: CHART_COLORS.primary },
    { label: 'Campus Only', value: 18, color: CHART_COLORS.secondary },
    { label: 'In Review', value: totalInReview, color: CHART_COLORS.gold },
    { label: 'Clearance Due', value: totalClearancePending, color: CHART_COLORS.danger }
  ];

  // 3. Horizontal Bar Chart: Most Consulted Studies
  const topProjectsData = useMemo(() => {
    const list = selectedDepartment
      ? LIBRARY_PROJECTS.filter((p) => p.department === selectedDepartment.id)
      : LIBRARY_PROJECTS;
    return list
      .slice()
      .sort((a, b) => b.views - a.views)
      .slice(0, 6)
      .map((p) => ({
        name: p.title.length > 24 ? `${p.title.slice(0, 24)}...` : p.title,
        fullTitle: p.title,
        views: p.views,
        department: p.department
      }));
  }, [selectedDepartment]);

  // 4. Line Chart: Monthly Access & Download Trends (Filtered to department when selected)
  const monthlyTrendData = useMemo(() => {
    const base = BASE_MONTHLY_CIRCULATION[yearFilter];
    if (!selectedDepartment) {
      return base.map((entry) => ({
        month: entry.month,
        views: entry.views,
        downloads: entry.downloads
      }));
    }
    const viewRatio = selectedDepartment.totalViews / Math.max(totalViews, 1);
    const downloadRatio = selectedDepartment.downloads / Math.max(totalDownloads, 1);
    return base.map((entry) => ({
      month: entry.month,
      views: Math.round(entry.views * viewRatio),
      downloads: Math.round(entry.downloads * downloadRatio)
    }));
  }, [yearFilter, selectedDepartment, totalViews, totalDownloads]);

  // 5. Composed Chart: Department Repository Performance
  const departmentComparisonData = LIBRARY_DEPT_DETAILS.map((dept) => ({
    id: dept.id,
    name: dept.shortLabel,
    totalCataloged: dept.totalCataloged,
    digitized: dept.digitized,
    utilizationRate: dept.utilizationRate,
    isSelected: selectedDepartment ? dept.id === selectedDepartment.id : true
  }));

  // Intelligence Suite Tab 2 Filtered Lists
  const visibleKeywords = useMemo(() => {
    if (selectedDepartment && DEPARTMENT_KEYWORDS[selectedDepartment.id]) {
      return DEPARTMENT_KEYWORDS[selectedDepartment.id];
    }
    return LIBRARY_KEYWORD_TRENDS;
  }, [selectedDepartment]);

  const visibleEmergingTopics = useMemo(() => {
    if (selectedDepartment && DEPARTMENT_EMERGING_TOPICS[selectedDepartment.id]) {
      return DEPARTMENT_EMERGING_TOPICS[selectedDepartment.id];
    }
    return LIBRARY_EMERGING_TOPICS;
  }, [selectedDepartment]);

  const visibleGaps = useMemo(() => {
    if (!selectedDepartment) return RESEARCH_GAPS;
    const filtered = RESEARCH_GAPS.filter((g) => g.department === selectedDepartment.id);
    return filtered.length > 0 ? filtered : RESEARCH_GAPS;
  }, [selectedDepartment]);

  const visibleTopics = useMemo(() => {
    if (!selectedDepartment) return SUGGESTED_TOPICS;
    const filtered = SUGGESTED_TOPICS.filter((t) => t.department === selectedDepartment.id);
    return filtered.length > 0 ? filtered : SUGGESTED_TOPICS;
  }, [selectedDepartment]);

  const visibleRecommendedReading = useMemo(() => {
    if (!selectedDepartment) return BENCHMARK_READING_LIST;
    const filtered = BENCHMARK_READING_LIST.filter((r) => r.department === selectedDepartment.id);
    return filtered.length > 0 ? filtered : BENCHMARK_READING_LIST;
  }, [selectedDepartment]);

  // Filtered studies for table / quick explorer
  const visibleProjects = useMemo(() => {
    let result = [...LIBRARY_PROJECTS];
    if (selectedDepartment) {
      result = result.filter((p) => p.department === selectedDepartment.id);
    }
    if (collectionFilter !== 'all') {
      result = result.filter((p) => {
        if (collectionFilter === 'ai') return p.type === 'AI/ML System';
        if (collectionFilter === 'web') return p.type === 'Web-Based';
        if (collectionFilter === 'iot') return p.type === 'IoT System';
        if (collectionFilter === 'product') return p.type === 'Product / Fabrication' || p.type === 'Machine / Device';
        return true;
      });
    }
    if (selectedKeyword) {
      result = result.filter((p) =>
        p.keywords.some((k) => k.toLowerCase().includes(selectedKeyword.toLowerCase()))
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors.some((a) => a.toLowerCase().includes(q)) ||
          p.department.toLowerCase().includes(q) ||
          p.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return result;
  }, [selectedDepartment, collectionFilter, selectedKeyword, searchQuery]);

  return (
    <>
      <LibraryShell
        activeNav="dashboard"
        description="Comprehensive repository oversight, access metrics, manuscript cataloging, and thematic research intelligence."
        hideHeader={true}
        title="Institutional Repository Dashboard"
      >
        <div className="admin-page-stack rh-wide-page rh-dash">
          {/* Header & Controls bar matching Research Head */}
          <header className="rh-dash-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: 'rgba(0, 58, 143, 0.1)',
                    color: 'var(--primary)'
                  }}
                >
                  <i className="fas fa-book-bookmark" /> E-Library Vault
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                  Live Repository
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>
                Institutional Repository & Insights
              </h1>
              <p className="admin-note" style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.82rem' }}>
                {scopeLabel} · Academic Year {YEAR_LABELS[yearFilter]} · Curated Accession & Circulation Vault
              </p>
            </div>
            <div className="rh-dash-controls">
              <select
                aria-label="Department scope"
                className="rh-dash-select"
                value={deptFilter}
                onChange={(event) => setDeptFilter(event.target.value)}
              >
                <option value="all">All Departments</option>
                {LIBRARY_DEPARTMENT_SUMMARY.map((dept) => (
                  <option key={dept.department} value={dept.department}>
                    {dept.label} ({dept.department})
                  </option>
                ))}
              </select>

              <select
                aria-label="Academic year"
                className="rh-dash-select"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value as AcademicYearKey)}
              >
                <option value="2024">AY 2023-2024</option>
                <option value="2023">AY 2022-2023</option>
                <option value="2022">AY 2021-2022</option>
              </select>

              <button
                className="btn btn-outline rh-dash-btn"
                type="button"
                onClick={() => showToast('Repository catalog metadata exported successfully.', 'success')}
              >
                <i aria-hidden="true" className="fas fa-download" />
                Export Data
              </button>

              <button
                className="btn btn-primary rh-dash-btn"
                type="button"
                onClick={() => setModalOpen(true)}
              >
                <i aria-hidden="true" className="fas fa-chart-line" />
                Generate Report
              </button>
            </div>
          </header>

          {/* Librarian's Pick of the Month Showcase Banner */}
          <section aria-label="Librarian's Pick of the Month" className="library-pick-showcase-card">
            <div className="library-pick-bg-decoration" />
            <i aria-hidden="true" className="fas fa-crown library-pick-bg-icon" />

            <div className="library-pick-content">
              {/* Header row with badges and monthly switcher */}
              <div className="library-pick-header-row">
                <div className="library-pick-badge-group">
                  <span className="library-pick-crown-badge">
                    <i className="fas fa-crown" />
                    Librarian&apos;s Pick
                  </span>
                  <span className="library-pick-impact-badge">
                    <i className="fas fa-certificate" />
                    {currentPick.impactTag}
                  </span>
                  <span className="library-pick-month-pill">
                    <i className="fas fa-calendar-alt" />
                    {currentPick.month} {currentPick.year}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600 }}>
                    {currentPickIndex + 1} of {LIBRARIAN_PICKS_OF_THE_MONTH.length}
                  </span>
                  <button
                    type="button"
                    className="library-pick-cycle-btn"
                    onClick={handlePrevPick}
                    title="Previous Featured Pick"
                    aria-label="Previous Featured Pick"
                  >
                    <i className="fas fa-chevron-left" />
                  </button>
                  <button
                    type="button"
                    className="library-pick-cycle-btn"
                    onClick={handleNextPick}
                    title="Next Featured Pick"
                    aria-label="Next Featured Pick"
                  >
                    <i className="fas fa-chevron-right" />
                  </button>
                  <button
                    type="button"
                    className="library-pick-cycle-btn"
                    onClick={() => setShowcaseCollapsed((prev) => !prev)}
                    title={showcaseCollapsed ? 'Expand Spotlight Details' : 'Collapse Spotlight'}
                    aria-label={showcaseCollapsed ? 'Expand Spotlight Details' : 'Collapse Spotlight'}
                    style={{ marginLeft: '0.25rem' }}
                  >
                    <i className={`fas ${showcaseCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`} />
                  </button>
                </div>
              </div>

              {/* Title & Lead Meta */}
              <div>
                <h2 className="library-pick-title">{featuredPickProject.title}</h2>
                <div className="library-pick-meta-row" style={{ marginTop: '0.55rem' }}>
                  <span className="library-pick-meta-item">
                    <i className="fas fa-user-edit" style={{ color: '#F6BE00' }} />
                    <span><strong>Lead Authors:</strong> {featuredPickProject.authorsShort || featuredPickProject.authors?.join(', ')}</span>
                  </span>
                  <span className="library-pick-meta-item">
                    <i className="fas fa-building-columns" style={{ color: '#60A5FA' }} />
                    <span><strong>Dept:</strong> {featuredPickProject.department}</span>
                  </span>
                  <span className="library-pick-meta-item">
                    <i className="fas fa-user-tie" style={{ color: '#34D399' }} />
                    <span><strong>Adviser:</strong> {featuredPickProject.adviser}</span>
                  </span>
                  <span className="library-pick-meta-item">
                    <i className="fas fa-tag" style={{ color: '#F472B6' }} />
                    <span><strong>Type:</strong> {featuredPickProject.type}</span>
                  </span>
                </div>
              </div>

              {!showcaseCollapsed && (
                <>
                  {/* Spotlight Curatorial Endorsement Quote */}
                  <div className="library-pick-quote-box">
                    <i className="fas fa-quote-left" style={{ marginRight: '0.5rem', opacity: 0.6 }} />
                    {currentPick.reason}
                  </div>

                  {/* Impact & Metric Badges */}
                  <div className="library-pick-metrics-grid">
                    {currentPick.impactMetrics.map((metric) => (
                      <div key={metric.label} className="library-pick-metric-card">
                        <span className="library-pick-metric-val">
                          <i className={`fas ${metric.icon}`} style={{ color: '#F6BE00', fontSize: '0.9rem' }} />
                          {metric.value}
                        </span>
                        <span className="library-pick-metric-lbl">{metric.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="library-pick-actions-row">
                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <Link
                        href={`/library/project-details?id=${featuredPickProject.id}`}
                        className="library-pick-action-btn-primary"
                      >
                        <i className="fas fa-book-open" />
                        Read Full Manuscript
                      </Link>

                      <button
                        type="button"
                        onClick={handleCopyCitation}
                        className="library-pick-action-btn-secondary"
                        title="Copy official academic citation"
                      >
                        <i className="fas fa-quote-right" />
                        Copy Academic Citation
                      </button>

                      <Link
                        href="/library/engagement"
                        className="library-pick-action-btn-secondary"
                        title="View reader feedback and community queries"
                      >
                        <i className="fas fa-comments" />
                        Reader Discussions
                      </Link>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <i className="fas fa-shield-halved" style={{ color: '#10B981' }} />
                      Verified Archival Capstone Record
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* KPI Metrics Row */}
          <section
            aria-label="Library summary metrics"
            className="rh-dash-kpis"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
          >
            {kpis.map((kpi, idx) => {
              const kpiAccents = [
                { bg: 'rgba(0, 58, 143, 0.09)', color: '#003A8F' }, // Cataloged Theses
                { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' }, // Digitization Rate
                { bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' }, // Total Consultations
                { bg: 'rgba(2, 132, 199, 0.12)', color: '#0284C7' }, // Department Reviews
                { bg: 'rgba(139, 92, 246, 0.12)', color: '#7C3AED' } // Active Researchers
              ];
              const accent = kpiAccents[idx % kpiAccents.length];
              return (
                <article
                  key={kpi.label}
                  className="rh-dash-kpi"
                  style={{
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    cursor: 'default'
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="rh-dash-kpi-icon"
                    style={{
                      background: accent.bg,
                      color: accent.color
                    }}
                  >
                    <i className={`fas ${kpi.icon}`} />
                  </span>
                  <div>
                    <span className="rh-dash-kpi-label">{kpi.label}</span>
                    <strong className="rh-dash-kpi-value">{kpi.value}</strong>
                    <span className="rh-dash-kpi-detail">{kpi.detail}</span>
                  </div>
                </article>
              );
            })}
          </section>

          {/* ========================================================================= */}
          {/* USER FEATURE: MOST WATCHED ARTICLE & WHO DEPARTMENTS REVIEW IT */}
          {/* & OVERALL DEPARTMENT VIEW: WHO FREQUENTLY REVIEWS ARTICLES */}
          {/* ========================================================================= */}
          <section className="rh-dash-grid rh-dash-grid--2" id="article-engagement-analytics">
            {/* PART 1: MOST WATCHED ARTICLE & WHO DEPARTMENTS REVIEW IT */}
            <div
              className="admin-section-card dashboard-card"
              style={{
                borderRadius: '0.85rem',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div className="admin-section-head dashboard-card-head" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        width: '2.2rem',
                        height: '2.2rem',
                        borderRadius: '0.65rem',
                        background: 'rgba(245, 158, 11, 0.16)',
                        color: '#D97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-crown" />
                    </span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                        {selectedDepartment ? `Most Watched ${selectedDepartment.shortLabel} Article & Reviewing Departments` : 'Most Watched Article & Reviewing Departments'}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--muted)' }}>
                        {selectedDepartment ? `Examine readership and see which college departments review ${selectedDepartment.shortLabel}'s leading research` : 'Examine readership, watch counts, and which college departments review it'}
                      </p>
                    </div>
                  </div>

                  {/* Switcher for top watched articles */}
                  <select
                    aria-label="Select watched article"
                    className="rh-dash-select"
                    style={{
                      height: '2.25rem',
                      fontSize: '0.8rem',
                      minWidth: '220px',
                      maxWidth: '290px',
                      borderRadius: '0.55rem',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    value={currentWatchedArticle.id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedWatchedArticleId(id);
                      const art = availableWatchedArticles.find((a) => a.id === id);
                      if (art) showToast(`Viewing readership breakdown for "${art.title.slice(0, 28)}..."`);
                    }}
                  >
                    {availableWatchedArticles.map((art, idx) => (
                      <option key={art.id} value={art.id}>
                        #{idx + 1} {art.title.slice(0, 32)}... ({art.totalViews.toLocaleString()} views)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-section-body dashboard-card-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                {/* Article Snapshot Banner */}
                <div
                  style={{
                    background: 'var(--bg)',
                    borderRadius: '0.75rem',
                    padding: '1.15rem',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <DepartmentBadge department={currentWatchedArticle.department} />
                      <span
                        style={{
                          background: 'rgba(0, 58, 143, 0.08)',
                          color: CHART_COLORS.primary,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {currentWatchedArticle.type}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 600 }}>
                        AY {currentWatchedArticle.year}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          background: 'rgba(0, 58, 143, 0.08)',
                          color: CHART_COLORS.primary,
                          padding: '0.22rem 0.6rem',
                          borderRadius: '999px',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <i className="fas fa-eye" />
                        {currentWatchedArticle.totalViews.toLocaleString()} Watches
                      </span>
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#059669',
                          padding: '0.22rem 0.6rem',
                          borderRadius: '999px',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <i className="fas fa-clipboard-check" />
                        {currentWatchedArticle.reviewCount} Reviews
                      </span>
                    </div>
                  </div>

                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>
                    {currentWatchedArticle.title}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span><strong>Authors:</strong> {currentWatchedArticle.authors}</span>
                    <span><strong>Adviser:</strong> {currentWatchedArticle.adviser}</span>
                  </div>
                </div>

                {/* Who Departments Review It Breakdown */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Who Departments Review This Article:
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Total {currentWatchedArticle.reviewCount} reviews recorded
                    </span>
                  </div>

                  {/* Multi-segment Color Bar */}
                  <div style={{ display: 'flex', height: '10px', width: '100%', borderRadius: '5px', overflow: 'hidden', marginBottom: '1rem', background: 'var(--border, #E2E8F0)' }}>
                    {currentWatchedArticle.reviewingDepartments.map((item) => (
                      <div
                        key={item.deptId}
                        style={{
                          width: `${item.percentage}%`,
                          background: item.color,
                          transition: 'width 0.3s ease'
                        }}
                        title={`${item.shortLabel}: ${item.reviews} reviews (${item.percentage}%)`}
                      />
                    ))}
                  </div>

                  {/* List of reviewing departments with count & progress meters */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {currentWatchedArticle.reviewingDepartments.map((item) => (
                      <div
                        key={item.deptId}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 1fr 85px 48px',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '0.55rem',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <DepartmentBadge department={item.deptId} label={item.shortLabel} style={{ fontSize: '0.7rem', padding: '0.18rem 0.48rem' }} />
                        </div>

                        <div style={{ width: '100%', height: '6px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${item.percentage}%`,
                              height: '100%',
                              background: item.color,
                              borderRadius: '3px'
                            }}
                          />
                        </div>

                        <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                          {item.reviews} reviews
                        </span>

                        <span style={{ textAlign: 'right', fontWeight: 800, color: 'var(--muted)', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insight Callout */}
                <div
                  style={{
                    marginTop: 'auto',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.65rem',
                    background: 'rgba(0, 58, 143, 0.04)',
                    border: '1px solid rgba(0, 58, 143, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
                    <i className="fas fa-lightbulb" style={{ color: CHART_COLORS.gold, marginRight: '0.45rem' }} />
                    Cross-Department Reach: <strong>{(100 - (currentWatchedArticle.reviewingDepartments.find((d) => d.deptId === currentWatchedArticle.department)?.percentage ?? currentWatchedArticle.reviewingDepartments[0].percentage)).toFixed(1)}%</strong> of reviews came from departments outside {getDepartmentTheme(currentWatchedArticle.department).shortLabel} ({getDepartmentTheme(currentWatchedArticle.department).name}).
                  </span>
                  <Link
                    className="btn btn-outline rh-dash-btn rh-dash-btn--sm"
                    href={`/library/project-details?id=${currentWatchedArticle.id}`}
                  >
                    View Study <i className="fas fa-angle-right" style={{ marginLeft: '0.2rem' }} />
                  </Link>
                </div>
              </div>
            </div>

            {/* PART 2: OVERALL DEPARTMENT VIEW - WHO FREQUENTLY REVIEWS ARTICLES */}
            <div
              className="admin-section-card dashboard-card"
              style={{
                borderRadius: '0.85rem',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div className="admin-section-head dashboard-card-head" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        width: '2.2rem',
                        height: '2.2rem',
                        borderRadius: '0.65rem',
                        background: 'rgba(0, 58, 143, 0.1)',
                        color: CHART_COLORS.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-trophy" />
                    </span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                        {selectedDepartment ? `${selectedDepartment.shortLabel} Review Activity & Frequency` : 'Overall Department Review Frequency'}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--muted)' }}>
                        {selectedDepartment ? `Audit of ${selectedDepartment.name} review habits, velocity, and cross-department engagement` : 'Which departments frequently review and consult repository literature'}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      background: 'rgba(0, 58, 143, 0.08)',
                      color: CHART_COLORS.primary,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}
                  >
                    {selectedDepartment ? `${selectedDepartment.shortLabel} Review Benchmark` : 'University-Wide Benchmark'}
                  </span>
                </div>
              </div>

              <div className="admin-section-body dashboard-card-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                {/* Winner / Department Spotlight Banner */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 58, 143, 0.08), rgba(0, 58, 143, 0.02))',
                    borderRadius: '0.75rem',
                    padding: '1.1rem 1.2rem',
                    border: `1.5px solid ${currentDeptReviewActivity.color}45`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '2.6rem',
                        height: '2.6rem',
                        borderRadius: '0.75rem',
                        background: currentDeptReviewActivity.color,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem',
                        fontWeight: 900,
                        boxShadow: `0 3px 10px ${currentDeptReviewActivity.color}35`,
                        flexShrink: 0
                      }}
                    >
                      #{currentDeptReviewActivity.rank}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.96rem', color: currentDeptReviewActivity.color, fontWeight: 800 }}>
                          {currentDeptReviewActivity.shortLabel} — {currentDeptReviewActivity.name}
                        </strong>
                        <span
                          style={{
                            background: `${currentDeptReviewActivity.color}18`,
                            color: currentDeptReviewActivity.badgeColor,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            border: `1px solid ${currentDeptReviewActivity.color}35`
                          }}
                        >
                          {currentDeptReviewActivity.frequencyBadge}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Conducts <strong>{currentDeptReviewActivity.totalReviews.toLocaleString()}</strong> reviews & consultations (<strong>{currentDeptReviewActivity.share}%</strong> university review share)
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                    <strong style={{ display: 'block', fontSize: '1.15rem', color: currentDeptReviewActivity.color, fontWeight: 800 }}>
                      {currentDeptReviewActivity.reviewVelocity}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
                      Daily Review Velocity
                    </span>
                  </div>
                </div>

                {/* Review Activity Bar Chart */}
                <div style={{ height: '145px', width: '100%' }}>
                  <ChartResponsiveContainer height="100%" width="100%">
                    <BarChart data={OVERALL_DEPT_REVIEW_ACTIVITY} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                      <XAxis axisLine={false} dataKey="shortLabel" tick={AXIS_TICK} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tick={AXIS_TICK} tickLine={false} width={42} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={TOOLTIP_STYLE}>
                                <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '0.2rem' }}>
                                  {data.name} ({data.shortLabel})
                                </strong>
                                <span style={{ color: data.color, fontWeight: 700, display: 'block' }}>
                                  {data.totalReviews.toLocaleString()} Total Reviews ({data.share}%)
                                </span>
                                <span style={{ color: '#059669', fontSize: '11px', display: 'block' }}>
                                  Velocity: {data.reviewVelocity} · Cross-Dept: {data.crossDeptRate}%
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="totalReviews" radius={[6, 6, 0, 0]}>
                        {OVERALL_DEPT_REVIEW_ACTIVITY.map((dept) => {
                          const isHighlight = selectedDepartment ? dept.deptId === selectedDepartment.id : true;
                          return (
                            <Cell
                              key={dept.deptId}
                              fill={dept.color}
                              fillOpacity={isHighlight ? 1 : 0.28}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ChartResponsiveContainer>
                </div>

                {/* Ranked Department Review Frequency Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: 'auto' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 95px 1fr 85px 120px',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <span>#</span>
                    <span>Dept</span>
                    <span>Program & Velocity</span>
                    <span style={{ textAlign: 'right' }}>Reviews</span>
                    <span
                      style={{ textAlign: 'right', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}
                      title="Percentage of reviews conducted on articles written by other academic departments"
                    >
                      Other Majors % <i className="fas fa-info-circle" style={{ fontSize: '0.65rem' }} />
                    </span>
                  </div>
                  {displayedDeptReviewActivity.map((dept) => (
                    <div
                      key={dept.deptId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 95px 1fr 85px 120px',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '0.55rem',
                        background: dept.deptId === currentDeptReviewActivity.deptId ? `${dept.color}0D` : 'var(--bg)',
                        border: dept.deptId === currentDeptReviewActivity.deptId ? `1.5px solid ${dept.color}40` : '1px solid var(--border)',
                        fontSize: '0.8rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <strong style={{ color: dept.color, fontSize: '0.88rem' }}>
                        #{dept.rank}
                      </strong>

                      <div>
                        <DepartmentBadge department={dept.deptId} label={dept.shortLabel} />
                      </div>

                      <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dept.name}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                          {dept.reviewVelocity} velocity
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: 'var(--text)', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                          {dept.totalReviews.toLocaleString()}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {dept.share}% share
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          title={`Article Views: ${dept.crossDeptRate}% of ${dept.shortLabel}'s thesis views were on research papers written by other departments (e.g. IT, NAME, ESM), while ${100 - dept.crossDeptRate}% were within ${dept.shortLabel}.`}
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: `${dept.color}15`,
                            color: dept.color,
                            border: `1px solid ${dept.color}35`,
                            whiteSpace: 'nowrap',
                            cursor: 'help'
                          }}
                        >
                          {dept.crossDeptRate}% Other Majors
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* User-friendly Explanatory Box for Cross-Dept / Other Majors */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.55rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(0, 58, 143, 0.04)',
                    border: '1px solid rgba(0, 58, 143, 0.12)',
                    fontSize: '0.74rem',
                    color: 'var(--text)',
                    marginTop: '0.45rem',
                    lineHeight: 1.45
                  }}
                >
                  <i className="fas fa-circle-question" style={{ color: CHART_COLORS.primary, marginTop: '0.15rem', flexShrink: 0 }} />
                  <div>
                    <strong>What does &quot;{currentDeptReviewActivity.crossDeptRate}% Other Majors&quot; mean?</strong>
                    <span style={{ display: 'block', color: 'var(--muted)', marginTop: '0.18rem' }}>
                      It is strictly about <strong>article views</strong>: when <strong>{currentDeptReviewActivity.shortLabel}</strong> students and faculty view thesis papers, <strong>{currentDeptReviewActivity.crossDeptRate}%</strong> of the papers they viewed were from <em>other</em> academic departments, while <strong>{100 - currentDeptReviewActivity.crossDeptRate}%</strong> were within {currentDeptReviewActivity.shortLabel}.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* MAIN SECTION TABS: STREAMLINED, INTUITIVE WORKSPACE */}
          {/* ========================================================================= */}
          <div className="library-dash-tabs-container">
            <div className="library-dash-tabs" role="tablist" aria-label="Dashboard views">
              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'trends'}
                className={`library-dash-tab ${activeMainTab === 'trends' ? 'is-active' : ''}`}
                onClick={() => setActiveMainTab('trends')}
              >
                <i className="fas fa-chart-line" />
                <span>Circulation & Analytics</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'insights'}
                className={`library-dash-tab ${activeMainTab === 'insights' ? 'is-active' : ''}`}
                onClick={() => setActiveMainTab('insights')}
              >
                <i className="fas fa-lightbulb" />
                <span>Research Insights & Horizons</span>
                <span className="library-dash-tab-badge">{selectedDepartment ? visibleTopics.length + visibleGaps.length : 5}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'benchmarks'}
                className={`library-dash-tab ${activeMainTab === 'benchmarks' ? 'is-active' : ''}`}
                onClick={() => setActiveMainTab('benchmarks')}
              >
                <i className="fas fa-building-columns" />
                <span>Department Benchmarks</span>
                <span className="library-dash-tab-badge">{selectedDepartment ? '1 Dept' : '5 Depts'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'catalog'}
                className={`library-dash-tab ${activeMainTab === 'catalog' ? 'is-active' : ''}`}
                onClick={() => setActiveMainTab('catalog')}
              >
                <i className="fas fa-book-open" />
                <span>Theses Repository</span>
                <span className="library-dash-tab-badge">{visibleProjects.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'all'}
                className={`library-dash-tab ${activeMainTab === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveMainTab('all')}
              >
                <i className="fas fa-table-cells-large" />
                <span>View All</span>
              </button>
            </div>

            <span className="library-dash-tab-hint">
              <i className="fas fa-sliders" style={{ marginRight: '0.35rem' }} />
              Switch views to explore details without clutter
            </span>
          </div>

          {/* TAB 1: CIRCULATION & TRENDS */}
          {(activeMainTab === 'trends' || activeMainTab === 'all') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <section className="rh-dash-grid rh-dash-grid--2">
            {/* Monthly Trend Chart */}
            <LibraryChartCard
              badge={selectedDepartment ? `${selectedDepartment.shortLabel} · AY ${YEAR_LABELS[yearFilter]}` : YEAR_LABELS[yearFilter]}
              description={selectedDepartment ? `Monthly repository article views and manuscript consultations for ${selectedDepartment.name}` : "Monthly repository article views and full-text manuscript consultations"}
              title={selectedDepartment ? `${selectedDepartment.shortLabel} Monthly Repository Views & Readership Trends` : "Monthly Repository Views & Readership Trends"}
            >
              <div className="dashboard-chart-frame dashboard-chart-frame-large">
                <ChartResponsiveContainer height="100%" width="100%">
                  <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="month" tick={AXIS_TICK} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={AXIS_TICK} tickLine={false} width={42} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      dataKey="views"
                      dot={{ r: 3 }}
                      name="Article Views"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      type="monotone"
                    />
                    <Line
                      dataKey="downloads"
                      dot={{ r: 3 }}
                      name="Full-Text PDF Reads"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
                </ChartResponsiveContainer>
              </div>
              <div className="dashboard-chart-legend">
                <span>
                  <i className="fas fa-circle" style={{ color: CHART_COLORS.primary }} /> Article Views
                </span>
                <span>
                  <i className="fas fa-circle" style={{ color: CHART_COLORS.secondary }} /> Full-Text PDF Reads
                </span>
              </div>
            </LibraryChartCard>

            {/* Donut Chart: Collection by Research Domain */}
            <LibraryChartCard
              description={selectedDepartment ? `Disciplinary classification of cataloged manuscripts for ${selectedDepartment.name}` : "Classification of cataloged manuscripts by domain & disciplinary format"}
              title={selectedDepartment ? `${selectedDepartment.shortLabel} Collection Distribution by Research Domain` : "Collection Distribution by Research Domain"}
            >
              <div className="dashboard-chart-frame dashboard-chart-frame-donut rh-dash-donut">
                <ChartResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      data={collectionTypeData}
                      dataKey="value"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {collectionTypeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ChartResponsiveContainer>
                <div className="dashboard-donut-center">
                  <span>{selectedDepartment ? `${selectedDepartment.shortLabel} Total` : 'Vault Total'}</span>
                  <strong>{totalTrackedCollection}</strong>
                </div>
              </div>
              <ul className="rh-dash-legend">
                {collectionTypeData.map((entry) => (
                  <li key={entry.name}>
                    <span className="rh-dash-legend-name">
                      <span
                        aria-hidden="true"
                        className="rh-dash-dot"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.name}
                    </span>
                    <span className="rh-dash-legend-value">
                      <strong>{entry.value}</strong> ·{' '}
                      {Math.round((entry.value / Math.max(totalTrackedCollection, 1)) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </LibraryChartCard>
          </section>

          {/* Circulation Digest Highlights */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '1.1rem 1.35rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.65rem',
                  background: 'rgba(0, 58, 143, 0.08)',
                  color: CHART_COLORS.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-fire" />
              </div>
              <div>
                <strong style={{ fontSize: '0.86rem', color: 'var(--text)', display: 'block' }}>Peak Reading Cycle</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {selectedDepartment
                    ? `October records peak traffic (${Math.round(2610 * (selectedDepartment.totalViews / Math.max(totalViews, 1))).toLocaleString()} consultations) during defense periods for ${selectedDepartment.shortLabel}.`
                    : 'October records peak traffic (2,610 consultations) during midterm defense periods.'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.65rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-file-arrow-down" />
              </div>
              <div>
                <strong style={{ fontSize: '0.86rem', color: 'var(--text)', display: 'block' }}>PDF Conversion Rate</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {selectedDepartment
                    ? `${Math.round((selectedDepartment.downloads / Math.max(selectedDepartment.totalViews, 1)) * 100)}% of ${selectedDepartment.shortLabel} catalog visits result in complete thesis manuscript downloads (${selectedDepartment.downloads.toLocaleString()} downloads).`
                    : '31% of repository catalog visits result in complete thesis manuscript downloads.'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.65rem',
                  background: 'rgba(246, 190, 0, 0.15)',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-layer-group" />
              </div>
              <div>
                <strong style={{ fontSize: '0.86rem', color: 'var(--text)', display: 'block' }}>Dominant Formats</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {selectedDepartment
                    ? `${collectionTypeData[0]?.name || 'Primary Format'} (${Math.round(((collectionTypeData[0]?.value || 0) / Math.max(totalTrackedCollection, 1)) * 100)}%) and ${collectionTypeData[1]?.name || 'Secondary Format'} (${Math.round(((collectionTypeData[1]?.value || 0) / Math.max(totalTrackedCollection, 1)) * 100)}%) lead ${selectedDepartment.shortLabel} research outputs.`
                    : 'Web Software (42%) and IoT Devices (25%) account for 67% of university thesis outputs.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESEARCH INSIGHTS & THEMATIC INTELLIGENCE SUITE */}
      {(activeMainTab === 'insights' || activeMainTab === 'all') && (
        <section className="admin-section-card rh-dash-table-card" id="research-insights">
            <div className="admin-section-head rh-dash-table-head" style={{ flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                  <span
                    style={{
                      background: 'rgba(246, 190, 0, 0.18)',
                      color: '#B45309',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}
                  >
                    Intelligence Suite
                  </span>
                  <h3 style={{ margin: 0 }}>Research Insights & Thematic Horizons</h3>
                </div>
                <p className="admin-note">
                  {selectedDepartment
                    ? `Curated keyword density, emerging research directions, gaps, and benchmark standards for ${selectedDepartment.name}.`
                    : 'Cross-departmental keyword density, emerging research directions, gaps, and benchmark standards.'}
                </p>
              </div>

              {selectedKeyword && (
                <button
                  className="btn btn-outline rh-dash-btn rh-dash-btn--sm"
                  type="button"
                  onClick={() => {
                    setSelectedKeyword(null);
                    showToast('Keyword filter cleared.');
                  }}
                >
                  <i className="fas fa-times" /> Clear Keyword: &quot;{selectedKeyword}&quot;
                </button>
              )}
            </div>

            <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column' }}>
              {/* Clean Segmented Tab Switcher */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.45rem',
                  flexWrap: 'wrap',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '0.85rem',
                  marginBottom: '1.25rem'
                }}
              >
                {[
                  { id: 'keywords', label: 'Topical Keywords', icon: 'fa-tags', count: visibleKeywords.length },
                  { id: 'emerging', label: 'Emerging Topics', icon: 'fa-arrow-trend-up', count: visibleEmergingTopics.length },
                  { id: 'gaps', label: 'Research Gaps', icon: 'fa-triangle-exclamation', count: visibleGaps.length },
                  { id: 'topics', label: 'Recommended Directions', icon: 'fa-lightbulb', count: visibleTopics.length },
                  { id: 'benchmarks', label: 'Benchmark Papers', icon: 'fa-award', count: visibleRecommendedReading.length }
                ].map((tab) => {
                  const isActive = intelligenceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setIntelligenceTab(tab.id as any)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '0.55rem',
                        border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: isActive ? 'var(--primary)' : 'var(--surface)',
                        color: isActive ? '#ffffff' : 'var(--text)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className={`fas ${tab.icon}`} />
                      <span>{tab.label}</span>
                      <span
                        style={{
                          padding: '0.1rem 0.42rem',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 58, 143, 0.08)',
                          color: isActive ? '#ffffff' : 'var(--primary)'
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Topical Keywords */}
              {intelligenceTab === 'keywords' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600 }}>
                      Filter repository manuscripts by high-frequency {selectedDepartment ? `${selectedDepartment.shortLabel}` : 'institutional'} keywords:
                    </span>
                    {selectedKeyword && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                        Active filter: &quot;{selectedKeyword}&quot;
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                    {visibleKeywords.map((kw) => {
                      const isActive = selectedKeyword?.toLowerCase() === kw.label.toLowerCase();
                      return (
                        <button
                          key={kw.label}
                          type="button"
                          onClick={() => {
                            const next = isActive ? null : kw.label;
                            setSelectedKeyword(next);
                            if (next) showToast(`Filtered studies by keyword: "${kw.label}"`);
                          }}
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 0.8rem',
                            borderRadius: '0.6rem',
                            border: isActive ? `1.5px solid ${CHART_COLORS.primary}` : '1px solid var(--border)',
                            background: isActive ? 'rgba(0, 58, 143, 0.08)' : 'var(--bg)',
                            color: isActive ? CHART_COLORS.primary : 'var(--text)',
                            fontSize: '0.82rem',
                            fontWeight: isActive ? 800 : 600,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{kw.label}</span>
                          <span
                            style={{
                              background: isActive ? CHART_COLORS.primary : 'rgba(0, 58, 143, 0.12)',
                              color: isActive ? '#ffffff' : CHART_COLORS.primary,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}
                          >
                            {kw.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: Emerging Topics */}
              {intelligenceTab === 'emerging' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {visibleEmergingTopics.map((topic) => (
                    <div
                      key={topic.label}
                      style={{
                        padding: '1rem',
                        borderRadius: '0.65rem',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text)' }}>
                        {topic.label}
                      </span>
                      <span
                        style={{
                          color: CHART_COLORS.emerald,
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <i className="fas fa-arrow-up" style={{ fontSize: '0.72rem' }} />
                        {topic.growth} Year-over-Year Growth
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Research Gaps */}
              {intelligenceTab === 'gaps' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
                  {visibleGaps.map((gap) => (
                    <div
                      key={gap.title}
                      style={{
                        padding: '0.95rem 1.05rem',
                        borderRadius: '0.65rem',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--text)' }}>
                          {gap.title}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background: gap.urgency === 'High Priority' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(246, 190, 0, 0.15)',
                            color: gap.urgency === 'High Priority' ? CHART_COLORS.danger : '#B45309'
                          }}
                        >
                          {gap.urgency}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.45, display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <DepartmentBadge department={gap.department} style={{ fontSize: '0.68rem' }} />
                        {gap.note}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: Recommended Directions */}
              {intelligenceTab === 'topics' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
                  {visibleTopics.map((topic) => (
                    <div
                      key={topic.title}
                      style={{
                        padding: '0.95rem 1.05rem',
                        borderRadius: '0.65rem',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <DepartmentBadge department={topic.department} style={{ fontSize: '0.68rem' }} />
                          <strong style={{ fontSize: '0.86rem', color: 'var(--text)' }}>
                            {topic.title}
                          </strong>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                          Disciplinary Focus: <strong>{topic.domain}</strong>
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          background: 'rgba(0, 58, 143, 0.08)',
                          color: CHART_COLORS.primary,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {topic.impact}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: Benchmark Papers */}
              {intelligenceTab === 'benchmarks' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {visibleRecommendedReading.map((item) => (
                    <article
                      key={item.title}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <DepartmentBadge department={item.department} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
                          Exemplary Standard
                        </span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>
                        {item.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.45, flex: 1 }}>
                        {item.description}
                      </p>
                      <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                        <Link
                          className="btn btn-primary rh-dash-btn rh-dash-btn--sm"
                          href={`/library/project-details?id=${item.projectId}`}
                        >
                          Examine Paper <i className="fas fa-angle-right" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: DEPARTMENT BENCHMARKS */}
        {(activeMainTab === 'benchmarks' || activeMainTab === 'all') && (
          <section className="admin-section-card rh-dash-table-card">
            <div className="admin-section-head rh-dash-table-head" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {selectedDepartment ? `${selectedDepartment.name} Repository Performance & Circulation` : 'Department Repository Performance & Circulation'}
                </h3>
                <p className="admin-note" style={{ margin: '0.2rem 0 0' }}>
                  {selectedDepartment ? `Comprehensive audit of cataloging volume, digitization completion, and consult velocity for ${selectedDepartment.shortLabel}` : 'Comprehensive audit of cataloging volume, digitization completion, and consult velocity'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                  {selectedDepartment ? (
                    <>Audit Focus: <strong style={{ color: getDepartmentTheme(selectedDepartment.id).color }}>{selectedDepartment.shortLabel} ({selectedDepartment.utilizationRate}% Digitized)</strong></>
                  ) : (
                    <>Top Performer: <strong style={{ color: '#003A8F' }}>BSNAME (97% Digitized)</strong></>
                  )}
                </span>
              </div>
            </div>
            <div className="table-scroll">
              <table className="rh-dash-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="rh-num">Cataloged</th>
                    <th className="rh-num">Digitized</th>
                    <th className="rh-num">In Review</th>
                    <th className="rh-num">Consultations</th>
                    <th className="rh-num">Downloads</th>
                    <th>Digitization %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((dept) => (
                    <tr key={dept.id}>
                      <td>
                        <DepartmentBadge department={dept.id} label={dept.shortLabel} />
                        <span className="rh-dash-dept-name" style={{ marginLeft: '0.5rem' }}>{dept.name}</span>
                      </td>
                      <td className="rh-num">{dept.totalCataloged}</td>
                      <td className="rh-num">{dept.digitized}</td>
                      <td className="rh-num">{dept.inReview}</td>
                      <td className="rh-num">{dept.totalViews.toLocaleString()}</td>
                      <td className="rh-num">{dept.downloads.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', minWidth: '135px' }}>
                          <div style={{ width: '84px', height: '7px', background: 'var(--border, #E2E8F0)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${dept.utilizationRate}%`,
                                height: '100%',
                                backgroundColor: getDepartmentTheme(dept.id).color,
                                borderRadius: '999px',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                          <strong style={{ fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>{dept.utilizationRate}%</strong>
                        </div>
                      </td>
                      <td>
                        <Link
                          className="btn btn-outline rh-dash-btn rh-dash-btn--sm"
                          href={`/library/repository?dept=${dept.id}`}
                          onClick={() => showToast(`Filtering repository to ${dept.name}.`)}
                        >
                          Browse Vault
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: THESES REPOSITORY CATALOG */}
        {(activeMainTab === 'catalog' || activeMainTab === 'all') && (
          <section className="admin-section-card rh-dash-table-card">
            <div className="admin-section-head rh-dash-table-head" style={{ flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  {selectedDepartment ? `${selectedDepartment.shortLabel} Digital Theses & Accession Records` : 'Recently Indexed Completed Research'}
                </h3>
                <p className="admin-note" style={{ margin: '0.2rem 0 0' }}>
                  {selectedDepartment ? `Direct accession records and digital manuscripts for ${selectedDepartment.name}` : 'Direct accession records and digital manuscripts available in the university repository'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  aria-label="Filter research records"
                  placeholder="Quick search title, author, keyword..."
                  style={{
                    height: '2.1rem',
                    padding: '0 0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    minWidth: '220px'
                  }}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <select
                  aria-label="Collection format"
                  className="rh-dash-select"
                  style={{ height: '2.1rem', fontSize: '0.78rem', borderRadius: '0.5rem' }}
                  value={collectionFilter}
                  onChange={(event) => setCollectionFilter(event.target.value)}
                >
                  <option value="all">All Formats</option>
                  <option value="web">Web & Software</option>
                  <option value="ai">AI / ML Systems</option>
                  <option value="iot">IoT & Embedded</option>
                  <option value="product">Hardware / Devices</option>
                </select>

                <Link
                  className="btn btn-outline rh-dash-btn rh-dash-btn--sm"
                  href="/library/repository"
                >
                  <i className="fas fa-folder-open" /> Full Catalog
                </Link>
              </div>
            </div>
            <div className="table-scroll">
              <table className="rh-dash-table">
                <thead>
                  <tr>
                    <th>Research Title</th>
                    <th>Department</th>
                    <th>Authors</th>
                    <th>Type</th>
                    <th className="rh-num">Year</th>
                    <th className="rh-num">Views</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProjects.slice(0, 6).map((project) => (
                    <tr key={project.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <strong style={{ color: 'var(--primary-dark)', fontSize: '0.88rem' }}>
                            {project.title}
                          </strong>
                          <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                            Adviser: {project.adviser}
                          </span>
                        </div>
                      </td>
                      <td>
                        <DepartmentBadge department={project.department} />
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                        {project.authorsShort || project.authors.join(', ')}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(0, 58, 143, 0.08)',
                            color: CHART_COLORS.primary
                          }}
                        >
                          {project.type}
                        </span>
                      </td>
                      <td className="rh-num">{project.year}</td>
                      <td className="rh-num">
                        <strong>{project.views.toLocaleString()}</strong>
                      </td>
                      <td>
                        <Link
                          className="btn btn-outline rh-dash-btn rh-dash-btn--sm"
                          href={`/library/project-details?id=${project.id}`}
                        >
                          View Study
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {visibleProjects.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                        No research records match your search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        </div>
      </LibraryShell>

      {/* Generate Report Modal matching Research Head modal */}
      {modalOpen ? (
        <div
          className="modal show"
          onClick={(event) => event.target === event.currentTarget && setModalOpen(false)}
        >
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3>
                  <i className="fas fa-chart-line" /> Generate Library & Repository Report
                </h3>
                <p>
                  Prepare an official institutional archival summary, circulation metrics, and department accession pack.
                </p>
              </div>
              <button
                className="close-modal"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="library-report-department">Department Scope</label>
                <select defaultValue={deptFilter} id="library-report-department">
                  <option value="all">All Departments</option>
                  {LIBRARY_DEPT_DETAILS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.shortLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="library-report-year">Academic Year</label>
                <select defaultValue={yearFilter} id="library-report-year">
                  <option value="2024">Academic Year: 2023-2024</option>
                  <option value="2023">Academic Year: 2022-2023</option>
                  <option value="2022">Academic Year: 2021-2022</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="library-report-format">Output Format</label>
                <select id="library-report-format">
                  <option>PDF Institutional Vault Report</option>
                  <option>Excel Accession & Views Index</option>
                  <option>Executive Research Circulation Pack</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  showToast('Official library repository report generated successfully.', 'success');
                }}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast Notification */}
      {toast ? (
        <div className="notification-toast" role="status">
          <i
            className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'info-circle'}`}
            style={{
              color: toast.type === 'success' ? CHART_COLORS.emerald : CHART_COLORS.primary
            }}
          />
          <span>{toast.message}</span>
        </div>
      ) : null}
    </>
  );
}
