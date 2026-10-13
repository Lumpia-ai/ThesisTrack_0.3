export type LibraryDepartment = 'IT' | 'MET' | 'TCM' | 'ESM' | 'NAME';
export type LibraryProjectType =
  | 'Web-Based'
  | 'Mobile Application'
  | 'IoT System'
  | 'AI/ML System'
  // Not every study is software: other departments build machines and products,
  // and some studies are purely paper-based.
  | 'Machine / Device'
  | 'Product / Fabrication'
  | 'Research Paper';
export type LibraryDocumentType =
  | 'Manuscript'
  | 'Presentation'
  | 'Technical Report'
  | 'Certificate'
  | 'Supporting Data';
export type LibraryNotificationCategory =
  | 'New Publications'
  | 'Repository Updates'
  | 'Research Insights Digest';

export type LibraryProject = {
  id: number;
  title: string;
  detailTitle?: string;
  authors: string[];
  department: LibraryDepartment;
  year: number;
  adviser: string;
  type: LibraryProjectType;
  keywords: string[];
  abstract: string;
  views: number;
  authorsShort?: string;
  statusLabel?: string;
  technologies?: string[];
  achievements?: string[];
  transfer?: {
    partner: string;
    status: string;
    impact: string;
  };
  relatedStudyIds?: number[];
  // Set only when the study was published as a journal manuscript; citing is
  // offered only for these.
  publication?: {
    journal: string;
    year: number;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
  };
};

export type LibraryDocument = {
  id: string;
  fileName: string;
  projectId: number;
  projectTitle: string;
  department: LibraryDepartment;
  type: LibraryDocumentType;
  size: string;
  dateLabel: string;
  categoryLabel: string;
};

export type LibraryNotification = {
  id: string;
  category: LibraryNotificationCategory;
  title: string;
  message: string;
  timeLabel: string;
  unread: boolean;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'muted';
};

export type LibraryDepartmentSummary = {
  department: LibraryDepartment;
  label: string;
  count: number;
};

export const LIBRARY_NAV_ITEMS = [
  { key: 'dashboard', href: '/library/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
  { key: 'browse', href: '/library/browse', label: 'Browse Projects', icon: 'fa-search' },
  { key: 'repository', href: '/library/repository', label: 'Repository', icon: 'fa-folder-open' },
  { key: 'approval', href: '/library/approval', label: 'Repository Approval', icon: 'fa-clipboard-check' },
  { key: 'engagement', href: '/library/engagement', label: 'Views & Comments', icon: 'fa-eye' }
] as const;

export type LibraryNavKey = (typeof LIBRARY_NAV_ITEMS)[number]['key'] | 'insights';

export const LIBRARY_DEPARTMENT_SUMMARY: readonly LibraryDepartmentSummary[] = [
  { department: 'NAME', label: 'Naval Architecture & Marine Eng', count: 104 },
  { department: 'IT', label: 'Information Technology', count: 98 },
  { department: 'ESM', label: 'Engineering & Sustainability', count: 72 },
  { department: 'MET', label: 'Manufacturing Engineering Tech', count: 67 },
  { department: 'TCM', label: 'Tech Communication Management', count: 45 }
] as const;

export const LIBRARY_PROJECTS: readonly LibraryProject[] = [
  {
    id: 1,
    title: 'AI-Powered Learning Management System',
    detailTitle: 'AI-Powered Learning Management System with Predictive Analytics',
    authors: ['Juan M. Reyes', 'Ana L. Santos', 'Paolo D. Garcia'],
    authorsShort: 'J. M. Reyes, A. L. Santos, P. D. Garcia',
    department: 'IT',
    year: 2024,
    adviser: 'Dr. Ricardo Cruz',
    type: 'AI/ML System',
    keywords: ['Artificial Intelligence', 'Machine Learning', 'Education Technology', 'Predictive Analytics', 'Learning Management System'],
    abstract:
      'This study develops an AI-powered Learning Management System that utilizes machine learning algorithms to predict student performance and provide personalized learning recommendations. The system was tested with 200 students and showed a 25% improvement in learning outcomes through real-time analytics, personalized learning paths, and early warning support for at-risk students.',
    views: 1234,
    statusLabel: 'Published | Completed 2024',
    technologies: ['Python', 'Django', 'React', 'PostgreSQL', 'TensorFlow', 'Scikit-learn', 'Docker', 'AWS'],
    achievements: [
      'Best Research Paper - National Research Symposium 2024',
      'Published in International Journal of Educational Technology',
      'Featured in University Research Showcase'
    ],
    transfer: {
      partner: 'TechCorp Inc.',
      status: 'Deployed & Operational',
      impact: '40% reduction in stockouts in pilot implementation'
    },
    relatedStudyIds: [6, 8],
    // Sample journal record (no DOI on file).
    publication: {
      journal: 'International Journal of Educational Technology',
      year: 2024,
      volume: '12',
      issue: '3',
      pages: '45–62'
    }
  },
  {
    id: 2,
    title: 'Smart Solar Energy Monitoring System',
    authors: ['Authors pending'],
    authorsShort: 'Pending',
    department: 'MET',
    year: 2024,
    adviser: 'Prof. Maria Ramos',
    type: 'IoT System',
    keywords: ['Solar', 'IoT', 'Energy', 'Monitoring'],
    abstract: 'Real-time solar panel efficiency monitoring system with campus-level deployment insights.',
    views: 876,
    technologies: ['Monocrystalline solar panel', 'Current and voltage sensors', 'ESP32 microcontroller', 'Charge controller', 'Digital multimeter'],
    relatedStudyIds: [7, 4]
  },
  {
    id: 3,
    title: 'Herbal Medicine Database System',
    authors: ['Authors pending'],
    authorsShort: 'Pending',
    department: 'TCM',
    year: 2023,
    adviser: 'Dr. Anna Reyes',
    type: 'Web-Based',
    keywords: ['Database', 'Medicine', 'Herbal'],
    abstract: 'Digital repository of traditional herbal medicines and evidence-based formulation data.',
    views: 642
  },
  {
    id: 4,
    title: 'Sustainable Agriculture IoT System',
    authors: ['Authors pending'],
    authorsShort: 'Pending',
    department: 'ESM',
    year: 2024,
    adviser: 'Prof. Jose Lopez',
    type: 'IoT System',
    keywords: ['Agriculture', 'IoT', 'Sustainability'],
    abstract: 'Automated irrigation and soil monitoring system for resource-efficient agriculture.',
    views: 591
  },
  {
    id: 5,
    title: 'Marine Pollution Detection Drone',
    authors: ['Authors pending'],
    authorsShort: 'Pending',
    department: 'NAME',
    year: 2023,
    adviser: 'Dr. Elena Aquino',
    type: 'Machine / Device',
    keywords: ['Drone', 'Marine', 'Pollution'],
    abstract: 'Autonomous drone system for marine pollution detection and coastal mapping.',
    views: 1480,
    technologies: ['Quadcopter frame', 'Waterproof sensor housing', 'pH and turbidity sensors', 'GPS module', 'LiPo battery pack', 'Marine-grade sealant']
  },
  {
    id: 6,
    title: 'Blockchain-Based Grade Management',
    authors: ['Authors pending'],
    authorsShort: 'Pending',
    department: 'IT',
    year: 2023,
    adviser: 'Dr. Ricardo Cruz',
    type: 'Web-Based',
    keywords: ['Blockchain', 'Grades', 'Security'],
    abstract: 'Secure academic records and grade verification using distributed ledger technology.',
    views: 534
  },
  {
    id: 7,
    title: 'Electric Vehicle Charging Station',
    authors: ['Authors pending'],
    authorsShort: 'Pending',
    department: 'MET',
    year: 2024,
    adviser: 'Prof. Maria Ramos',
    type: 'Product / Fabrication',
    keywords: ['EV', 'Charging', 'Smart Grid'],
    abstract: 'Smart EV charging station with load balancing and usage analytics.',
    views: 488,
    technologies: ['Steel enclosure fabrication', 'Type 2 charging connector', 'Contactor relay', 'Energy meter', 'Arduino Mega', 'CNC plasma cutter']
  },
  {
    id: 8,
    title: 'Digital Marketing Analytics Platform',
    authors: ['Authors pending'],
    authorsShort: 'Pending',
    department: 'TCM',
    year: 2023,
    adviser: 'Dr. Anna Reyes',
    type: 'Web-Based',
    keywords: ['Marketing', 'Analytics', 'Digital'],
    abstract: 'Analytics platform for campaign monitoring, attribution, and digital engagement analysis.',
    views: 452
  },
  // Extra sample IT studies so the title similarity checker has realistic
  // neighbours to compare against (thesis tracking, project monitoring, records).
  {
    id: 9,
    title: 'Thesis Monitoring and Tracking System',
    authors: ['Kristine A. Lopez', 'Mark J. Dela Cruz'],
    authorsShort: 'K. A. Lopez, M. J. Dela Cruz',
    department: 'IT',
    year: 2023,
    adviser: 'Dr. Ricardo Cruz',
    type: 'Web-Based',
    keywords: ['Thesis', 'Monitoring', 'Tracking', 'Academic Records'],
    abstract: 'A web-based system that tracks thesis milestones, adviser feedback, and defense schedules for graduating students.',
    views: 640
  },
  {
    id: 10,
    title: 'Development of a Thesis Management System',
    authors: ['Joanna P. Rivera', 'Carlo M. Mendoza'],
    authorsShort: 'J. P. Rivera, C. M. Mendoza',
    department: 'IT',
    year: 2022,
    adviser: 'Prof. Liza Navarro',
    type: 'Web-Based',
    keywords: ['Thesis', 'Document Management', 'Workflow'],
    abstract: 'A centralized system for storing thesis manuscripts, routing approvals, and managing adviser assignments.',
    views: 512
  },
  {
    id: 11,
    title: 'Research Project Monitoring System',
    authors: ['Daniel R. Aquino', 'Patricia L. Gomez'],
    authorsShort: 'D. R. Aquino, P. L. Gomez',
    department: 'IT',
    year: 2024,
    adviser: 'Dr. Anna Reyes',
    type: 'Web-Based',
    keywords: ['Research', 'Project Monitoring', 'Dashboard'],
    abstract: 'A dashboard for monitoring research project progress, deliverables, and deadlines across departments.',
    views: 398
  },
  {
    id: 12,
    title: 'Hospital Patient Records Management System',
    authors: ['Angela S. Ramos', 'Victor T. Santiago'],
    authorsShort: 'A. S. Ramos, V. T. Santiago',
    department: 'IT',
    year: 2023,
    adviser: 'Prof. Maria Ramos',
    type: 'Web-Based',
    keywords: ['Healthcare', 'Patient Records', 'Information System'],
    abstract: 'A records system for patient admission, medical history, and billing in a community hospital.',
    views: 721
  }
] as const;

export const LIBRARY_RECENT_STUDIES = [
  { title: 'AI-Powered Learning Management System', department: 'IT', authors: 'Pending', year: 2024, projectId: 1 },
  { title: 'Smart Solar Energy Monitor', department: 'MET', authors: 'Pending', year: 2024, projectId: 2 },
  { title: 'Herbal Medicine Database System', department: 'TCM', authors: 'Pending', year: 2023, projectId: 3 },
  { title: 'Sustainable Agriculture IoT System', department: 'ESM', authors: 'Pending', year: 2024, projectId: 4 }
] as const;

export const LIBRARY_DOCUMENTS: readonly LibraryDocument[] = [
  {
    id: 'doc-1',
    fileName: 'AI_Learning_System_Manuscript.pdf',
    projectId: 1,
    projectTitle: 'AI-Powered Learning System',
    department: 'IT',
    type: 'Manuscript',
    size: '2.4 MB',
    dateLabel: 'Feb 2024',
    categoryLabel: 'Full Manuscripts'
  },
  {
    id: 'doc-2',
    fileName: 'Smart_Solar_Energy_Monitor_Manuscript.pdf',
    projectId: 2,
    projectTitle: 'Smart Solar Energy Monitor',
    department: 'MET',
    type: 'Manuscript',
    size: '3.2 MB',
    dateLabel: 'Jan 2024',
    categoryLabel: 'Full Manuscripts'
  },
  {
    id: 'doc-3',
    fileName: 'Marine_Detector_Technical_Report.pdf',
    projectId: 5,
    projectTitle: 'Marine Pollution Detector',
    department: 'NAME',
    type: 'Technical Report',
    size: '1.8 MB',
    dateLabel: 'Dec 2023',
    categoryLabel: 'Technical Reports'
  },
  {
    id: 'doc-4',
    fileName: 'Blockchain_Grade_Management_Certificate.pdf',
    projectId: 6,
    projectTitle: 'Blockchain-Based Grade Management',
    department: 'IT',
    type: 'Certificate',
    size: '0.9 MB',
    dateLabel: 'Nov 2023',
    categoryLabel: 'Certificates'
  },
  {
    id: 'doc-5',
    fileName: 'Sustainable_Agriculture_IoT_Manuscript.pdf',
    projectId: 4,
    projectTitle: 'Sustainable Agriculture IoT System',
    department: 'ESM',
    type: 'Manuscript',
    size: '2.7 MB',
    dateLabel: 'Feb 2024',
    categoryLabel: 'Full Manuscripts'
  }
] as const;

export const LIBRARY_NOTIFICATIONS: readonly LibraryNotification[] = [
  {
    id: 'notif-1',
    category: 'New Publications',
    title: 'New Publication Added',
    message: '"Blockchain-Based Supply Chain System" from IT Department has been published in the repository.',
    timeLabel: '2 hours ago',
    unread: true,
    icon: 'fa-file-alt',
    tone: 'success'
  },
  {
    id: 'notif-3',
    category: 'Research Insights Digest',
    title: 'Research Insights Digest',
    message: 'The weekly repository trend digest is ready, with AI in Education still leading.',
    timeLabel: '2 days ago',
    unread: false,
    icon: 'fa-chart-line',
    tone: 'primary'
  },
  {
    id: 'notif-4',
    category: 'Repository Updates',
    title: 'Weekly Repository Digest',
    message: '4 new projects were added this week. Most viewed: Smart Solar Energy Monitor.',
    timeLabel: '3 days ago',
    unread: false,
    icon: 'fa-users',
    tone: 'muted'
  }
] as const;

export const LIBRARY_KEYWORD_TRENDS = [
  { label: 'Artificial Intelligence', count: 45 },
  { label: 'Machine Learning', count: 38 },
  { label: 'IoT', count: 42 },
  { label: 'Sustainability', count: 28 },
  { label: 'Blockchain', count: 15 },
  { label: 'Data Analytics', count: 52 },
  { label: 'Mobile Applications', count: 35 }
] as const;

export const LIBRARY_YEAR_COUNTS = [
  { year: '2024', count: 85, tone: 'success' },
  { year: '2023', count: 112, tone: 'primary' },
  { year: '2022', count: 98, tone: 'primary' },
  { year: '2021', count: 47, tone: 'muted' }
] as const;

export const LIBRARY_EMERGING_TOPICS = [
  { label: 'AI in Education', growth: '+156% growth' },
  { label: 'Sustainable Energy Solutions', growth: '+89%' },
  { label: 'Marine Technology', growth: '+67%' },
  { label: 'Digital Transformation', growth: '+45%' }
] as const;

export const LIBRARY_RECOMMENDED_READING = [
  {
    title: 'AI in Higher Education',
    description: 'Comprehensive review of AI applications in academic settings.',
    department: 'IT',
    projectId: 1
  },
  {
    title: 'Sustainable Manufacturing Practices',
    description: 'Case studies on green manufacturing technologies.',
    department: 'MET',
    projectId: 2
  },
  {
    title: 'Marine Ecosystem Monitoring',
    description: 'Advanced technologies for ocean conservation.',
    department: 'NAME',
    projectId: 5
  }
] as const;

export const LIBRARY_DOCUMENT_CATEGORY_COUNTS = [
  { label: 'Full Manuscripts', count: 342 },
  { label: 'Defense Presentations', count: 156 },
  { label: 'Technical Reports', count: 48 },
  { label: 'Certificates & Awards', count: 89 },
  { label: 'Supporting Data', count: 23 }
] as const;

export function getDepartmentLabel(department: LibraryDepartment) {
  return LIBRARY_DEPARTMENT_SUMMARY.find((item) => item.department === department)?.label ?? department;
}

export function getProjectById(projectId: number) {
  return LIBRARY_PROJECTS.find((project) => project.id === projectId) ?? LIBRARY_PROJECTS[0];
}

// Grouped for filter dropdowns (rendered as <optgroup>s).
export const PROJECT_TYPE_GROUPS: Array<{ label: string; types: LibraryProjectType[] }> = [
  { label: 'Software & Systems', types: ['Web-Based', 'Mobile Application', 'IoT System', 'AI/ML System'] },
  { label: 'Machines & Products', types: ['Machine / Device', 'Product / Fabrication'] },
  { label: 'Paper-based', types: ['Research Paper'] }
];

export function getProjectIcon(projectType: LibraryProjectType) {
  switch (projectType) {
    case 'Machine / Device':
      return 'fa-gears';
    case 'Product / Fabrication':
      return 'fa-cube';
    case 'Research Paper':
      return 'fa-file-lines';
    case 'AI/ML System':
      return 'fa-brain';
    case 'IoT System':
      return 'fa-microchip';
    case 'Mobile Application':
      return 'fa-mobile-screen-button';
    case 'Web-Based':
    default:
      return 'fa-globe';
  }
}

export function getNotificationToneClass(tone: LibraryNotification['tone']) {
  switch (tone) {
    case 'success':
      return 'is-success';
    case 'warning':
      return 'is-warning';
    case 'muted':
      return 'is-muted';
    case 'primary':
    default:
      return 'is-primary';
  }
}

// Student ratings and comments on repository studies (sample data — new ones
// added in the UI last for the session only; not persisted yet).
export type LibraryReview = {
  id: string;
  projectId: number;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  dateLabel: string;
};

export const LIBRARY_REVIEWS: readonly LibraryReview[] = [
  { id: 'rev-1', projectId: 1, author: 'Mika Torres', rating: 5, comment: 'Very clear methodology section. The early-warning feature gave us ideas for our own adviser dashboard.', dateLabel: 'Sep 12, 2026' },
  { id: 'rev-2', projectId: 1, author: 'Leo Bautista', rating: 4, comment: 'Helpful related-literature chapter. Would have liked more detail on how the model was evaluated.', dateLabel: 'Aug 30, 2026' },
  { id: 'rev-3', projectId: 2, author: 'Carla Mendoza', rating: 4, comment: 'Good reference for sensor calibration and power monitoring setup.', dateLabel: 'Sep 2, 2026' },
  { id: 'rev-4', projectId: 4, author: 'Rico Villanueva', rating: 5, comment: 'The soil-moisture threshold table is really useful for anyone doing irrigation automation.', dateLabel: 'Jul 18, 2026' },
  { id: 'rev-5', projectId: 6, author: 'Jessa Ramirez', rating: 3, comment: 'Interesting idea, but the scalability discussion is short.', dateLabel: 'Jun 5, 2026' }
];

// The "technologies used" list means different things per department: software
// stacks for IT, materials and equipment for engineering builds, methods for
// communication studies and paper-based research.
export function getTechnologyLabel(project: Pick<LibraryProject, 'department' | 'type'>) {
  if (project.type === 'Research Paper') return 'Research methods & instruments';

  switch (project.department) {
    case 'MET':
    case 'NAME':
      return 'Materials & equipment';
    case 'ESM':
      return 'Equipment & instruments';
    case 'TCM':
      return 'Methods & tools';
    case 'IT':
    default:
      return 'Technologies used';
  }
}

export type LibrarianPick = {
  id: string;
  month: string;
  year: number;
  projectId: number;
  badgeLabel: string;
  impactTag: string;
  reason: string;
  impactMetrics: {
    label: string;
    value: string;
    icon: string;
  }[];
  citationText: string;
};

export const LIBRARIAN_PICKS_OF_THE_MONTH: LibrarianPick[] = [
  {
    id: 'pick-oct-2024',
    month: 'October',
    year: 2024,
    projectId: 1,
    badgeLabel: "Librarian's Pick of the Month · October 2024",
    impactTag: 'Community & Academic Distinction',
    reason: 'Selected by the University Library Council for pioneering educational machine learning. Successfully validated across 200 pilot students with an accredited 25% improvement in learning outcomes, national research symposium distinction, and open-source dataset accession.',
    impactMetrics: [
      { label: 'Pilot Validation', value: '200 Students', icon: 'fa-user-graduate' },
      { label: 'Demonstrated Impact', value: '+25% Outcomes', icon: 'fa-chart-line' },
      { label: 'Accreditation', value: 'Best Paper Award', icon: 'fa-award' },
      { label: 'Public Readership', value: '1,234 Reads', icon: 'fa-eye' }
    ],
    citationText: 'Reyes, J. M., Santos, A. L., & Garcia, P. D. (2024). AI-Powered Learning Management System with Predictive Analytics. International Journal of Educational Technology, 12(3), 45–62.'
  },
  {
    id: 'pick-sep-2024',
    month: 'September',
    year: 2024,
    projectId: 5,
    badgeLabel: "Librarian's Pick of the Month · September 2024",
    impactTag: 'High Community & Ecological Impact',
    reason: 'Recognized for outstanding environmental robotics innovation. Low-cost autonomous surface vessel integrated with marine turbidity sensors, successfully deployed in 3 coastal barangay waterways and cited by municipal conservation offices.',
    impactMetrics: [
      { label: 'Coastal Scope', value: '3 Estuaries', icon: 'fa-water' },
      { label: 'Hardware Cost', value: '70% Lower Cost', icon: 'fa-microchip' },
      { label: 'Public Readership', value: '1,480 Reads', icon: 'fa-eye' },
      { label: 'Adviser Distinction', value: 'Dept Commendation', icon: 'fa-certificate' }
    ],
    citationText: 'Lim, A., Delgado, J., & Reyes, M. (2023). Marine Pollution Detection Drone with Waterproof Telemetry. University Thesis Vault, Call No. LIB-2023-NAME-005.'
  },
  {
    id: 'pick-aug-2024',
    month: 'August',
    year: 2024,
    projectId: 2,
    badgeLabel: "Librarian's Pick of the Month · August 2024",
    impactTag: 'Industry Transfer & Sustainability',
    reason: 'Distinguished renewable energy capstone featuring real-time ESP32 microcontroller telemetry and charge controller data logging. Benchmarked by 5 incoming senior engineering teams for exceptional documentation.',
    impactMetrics: [
      { label: 'System Type', value: 'Solar IoT', icon: 'fa-solar-panel' },
      { label: 'Hardware Spec', value: 'ESP32 Telemetry', icon: 'fa-bolt' },
      { label: 'Benchmarked By', value: '5 Capstone Teams', icon: 'fa-users' },
      { label: 'Public Readership', value: '876 Reads', icon: 'fa-eye' }
    ],
    citationText: 'Flores, C., et al. (2024). Smart Solar Energy Monitoring System with Real-Time Efficiency Logging. University Thesis Vault, Call No. LIB-2024-MET-002.'
  }
];

