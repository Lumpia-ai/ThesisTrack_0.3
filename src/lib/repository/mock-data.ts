// Temporary fallback content, used only when the repository database is unreachable
// (REPOSITORY_DATABASE_URL currently does not resolve). Remove once that connection
// is restored — the real /api/repository routes already query the live database
// first and only fall back to this data on a connection failure.

export type MockRepositoryFile = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  uploadedAt: string | null;
};

export type MockRepositoryProject = {
  id: string;
  title: string;
  abstract: string | null;
  adviser: string | null;
  program: string | null;
  department: string | null;
  schoolYear: string | null;
  keywords: string[];
  manuscriptUrl: string | null;
  status: string | null;
  publishedAt: string | null;
  authors: string[];
  files: MockRepositoryFile[];
  problemStatement?: string | null;
  objectives?: string[] | null;
  scope?: string | null;
  deploymentStatus?: string | null;
  deploymentPartner?: string | null;
  deploymentDate?: string | null;
  moaUrl?: string | null;
};

export const MOCK_REPOSITORY_PROJECTS: MockRepositoryProject[] = [
  {
    id: 'mock-ai-inventory',
    title: 'AI-Powered Inventory Management System',
    abstract:
      'A machine learning-based inventory forecasting platform with real-time analytics for logistics, retail, and warehouse operations. Pilot tests showed a 40% reduction in stockouts and a 25% decrease in excess inventory costs.',
    adviser: 'Dr. Ricardo Cruz',
    program: 'BS Information Technology',
    department: 'IT',
    schoolYear: '2023-2024',
    keywords: ['Machine Learning', 'Inventory Forecasting', 'Logistics', 'Analytics'],
    manuscriptUrl: null,
    status: 'ARCHIVED',
    publishedAt: '2024-02-01T00:00:00.000Z',
    authors: ['Juan Miguel Santos', 'Alyssa Marie Reyes', 'Carlo Dominic Bautista'],
    files: [],
    deploymentStatus: 'DEPLOYED',
    deploymentPartner: 'Northbridge Logistics Corp.',
    deploymentDate: '2024-09-15T00:00:00.000Z',
    moaUrl: null
  },
  {
    id: 'mock-solar-monitor',
    title: 'Smart Solar Energy Monitor',
    abstract:
      'An IoT-based solar panel performance monitoring system with anomaly detection, maintenance alerts, and mobile reporting for facilities management teams.',
    adviser: 'Prof. Maria Ramos',
    program: 'BS Electronics Engineering',
    department: 'ESM',
    schoolYear: '2023-2024',
    keywords: ['IoT', 'Solar Energy', 'Predictive Maintenance'],
    manuscriptUrl: null,
    status: 'ARCHIVED',
    publishedAt: '2024-01-20T00:00:00.000Z',
    authors: ['Kristine Joy Villanueva', 'Mark Anthony Dela Cruz'],
    files: []
  },
  {
    id: 'mock-agri-iot',
    title: 'Sustainable Agriculture IoT System',
    abstract:
      'A soil, irrigation, and crop condition monitoring platform that supports automated farming interventions for community-scale deployments, reducing water waste and improving yield decisions.',
    adviser: 'Prof. Jose Lopez',
    program: 'BS Manufacturing Engineering Technology',
    department: 'MET',
    schoolYear: '2022-2023',
    keywords: ['IoT', 'Agriculture', 'Automation'],
    manuscriptUrl: null,
    status: 'ARCHIVED',
    publishedAt: '2023-11-10T00:00:00.000Z',
    authors: ['Ronel James Fernandez', 'Patricia Anne Morales', 'Jerico Paul Aquino'],
    files: [],
    deploymentStatus: 'PROPOSED',
    deploymentPartner: 'Lumbia Farmers Cooperative',
    deploymentDate: null,
    moaUrl: null
  },
  {
    id: 'mock-marine-drone',
    title: 'Marine Pollution Detection Drone',
    abstract:
      'An autonomous drone system for monitoring coastal waste and pollution using multispectral imagery and automated alerts, supporting recurring monitoring routes for LGU environment offices.',
    adviser: 'Dr. Elena Aquino',
    program: 'BS Naval Architecture and Marine Engineering',
    department: 'NAME',
    schoolYear: '2022-2023',
    keywords: ['Computer Vision', 'UAV', 'Coastal Monitoring'],
    manuscriptUrl: null,
    status: 'ARCHIVED',
    publishedAt: '2023-08-05T00:00:00.000Z',
    authors: ['Bea Camille Ramirez', 'Vince Gabriel Torres'],
    files: []
  },
  {
    id: 'mock-thesistrack',
    title:
      'ThesisTrack: Development of a Thesis and Capstone Project Inventory, Progress Monitoring, and Technology Transfer Management System for Higher Education Institutions',
    abstract:
      'A centralized, role-based web platform for higher education institutions that unifies thesis and capstone project inventory, real-time progress monitoring, adviser and panel evaluation, and technology transfer tracking. The system addresses the reliance on hardbound manuscripts, scattered files, and manual coordination between students, advisers, panels, department chairs, the research office, library staff, and external partners by providing a single, auditable workflow from title registration through repository archiving and industry adoption. Developed using Rapid Application Development and evaluated against ISO/IEC 25010 quality standards alongside the System Usability Scale and User Acceptance Testing.',
    adviser: 'Jimvy P. Salise, MIT',
    program: 'BS Information Technology',
    department: 'IT',
    schoolYear: '2025-2026',
    keywords: ['Research Repository', 'Progress Monitoring', 'Technology Transfer', 'Thesis Management', 'RAD'],
    manuscriptUrl: '/manuscripts/thesistrack-capstone-manuscript.docx',
    status: 'ARCHIVED',
    publishedAt: '2026-04-14T00:00:00.000Z',
    authors: ['Princess Mae Camille N. Achas', 'Ivy A. Bitos', 'Kyle Japheth C. Graniten', 'James Anthony Z. Juntilla'],
    files: [],
    problemStatement:
      'Higher education institutions struggle with decentralized research management and inconsistent progress monitoring due to underutilized digital tools. A lack of structured technology transfer and weak industry ties also prevent academic discoveries from reaching real-world application, particularly in Philippine state universities.',
    objectives: [
      'Develop a digital inventory repository for thesis and capstone projects',
      'Implement a progress monitoring system for ongoing research and development',
      'Create a technology transfer module linking academic outputs to industry and community partners',
      'Provide dashboards and reports for research, extension, and industry collaboration',
      'Evaluate the system using ISO/IEC 25010 quality standards'
    ],
    scope:
      'Built for the University of Science and Technology of Southern Philippines – Jasaan Campus (BSIT, BETMET, BSESM, BSTCM, BSNAME). Covers title/abstract/author metadata, milestone-based progress tracking, adviser and panel evaluation, repository archiving, and a technology transfer module for matching completed projects with industry and community partners.'
  }
];

export function getMockRepositoryProjects(filters: { search?: string; department?: string; schoolYear?: string }) {
  const search = filters.search?.trim().toLowerCase();

  return MOCK_REPOSITORY_PROJECTS.filter((project) => {
    if (filters.department && filters.department !== 'all' && project.department !== filters.department) {
      return false;
    }
    if (filters.schoolYear && filters.schoolYear !== 'all' && project.schoolYear !== filters.schoolYear) {
      return false;
    }
    if (search) {
      const haystack = `${project.title} ${project.abstract ?? ''} ${project.keywords.join(' ')} ${project.authors.join(' ')}`.toLowerCase();
      return haystack.includes(search);
    }
    return true;
  });
}

export function getMockRepositoryProjectById(id: string) {
  return MOCK_REPOSITORY_PROJECTS.find((project) => project.id === id) ?? null;
}

export function isDatabaseConnectivityError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P1001' || code === 'P1002' || code === 'P1017';
}
