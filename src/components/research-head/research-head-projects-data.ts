// Project Inventory sample records. Shared so other modules (Intellectual Property, the Research
// Focal Person workspace) can reference a project by id instead of duplicating its details.
// Replace with the real Project Inventory data source when it is connected.
//
// `milestones` is the project's Progress Monitoring record and `documents` its supporting files;
// other modules read them from here and never keep their own copies.

export type InventoryMilestoneStatus = 'Completed' | 'Ongoing' | 'Pending';

export type InventoryMilestone = {
  title: string;
  status: InventoryMilestoneStatus;
  dueDate: string;
  completedDate: string | null;
};

export type InventoryDocumentStatus = 'Verified' | 'Pending Verification' | 'Rejected';

export type InventoryDocument = {
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  status: InventoryDocumentStatus;
  // UploadedFile id, when the record is backed by a stored file (/api/document-files/[id]).
  fileId?: string;
};

export type InventoryApproval = {
  role: 'Adviser' | 'Program Head';
  status: 'Approved' | 'Pending';
  by: string;
  date: string | null;
};

export type InventoryRecord = {
  id: string;
  title: string;
  department: string;
  program: string;
  adviser: string;
  researchers: string[];
  researchType: string;
  abstract: string;
  dateStarted: string;
  lastUpdated: string; // ISO date
  year: string;
  status: string;
  statusClass: string;
  milestone: string; // current research stage
  progressValue: number;
  delayed: boolean;
  keywords: string;
  partner: string;
  transferStatus: string;
  transferStatusClass: string;
  similarity: string;
  milestones: InventoryMilestone[];
  approvals: InventoryApproval[];
  documents: InventoryDocument[];
};

export const INVENTORY_RECORDS: InventoryRecord[] = [
  {
    id: 'CAP-IT-2025-014',
    title: 'AI-Powered Learning Management System with Predictive Analytics',
    department: 'IT',
    program: 'BSIT',
    adviser: 'Dr. Ricardo Cruz',
    researchers: ['Juan Dela Cruz', 'Maria Santos', 'Paolo Reyes'],
    researchType: 'Capstone Project',
    abstract:
      'A learning management system that uses student activity data to predict course performance and flag learners who may need early intervention from instructors.',
    dateStarted: 'Aug 12, 2025',
    lastUpdated: '2026-09-22',
    year: '2025',
    status: 'Active',
    statusClass: 'status-info',
    milestone: 'Final technical review',
    progressValue: 78,
    delayed: false,
    keywords: 'AI, Education, Predictive Analytics',
    partner: 'CDO Learning Resource Center',
    transferStatus: 'Under Review',
    transferStatusClass: 'status-review',
    similarity: '12% match',
    milestones: [
      { title: 'Title Proposal', status: 'Completed', dueDate: 'Aug 30, 2025', completedDate: 'Aug 28, 2025' },
      { title: 'Chapters 1-3 Approval', status: 'Completed', dueDate: 'Nov 15, 2025', completedDate: 'Nov 12, 2025' },
      { title: 'System Development', status: 'Completed', dueDate: 'Jun 30, 2026', completedDate: 'Jul 3, 2026' },
      { title: 'Final Technical Review', status: 'Ongoing', dueDate: 'Oct 10, 2026', completedDate: null },
      { title: 'Final Defense', status: 'Pending', dueDate: 'Nov 20, 2026', completedDate: null }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Dr. Ricardo Cruz', date: 'Sep 18, 2026' },
      { role: 'Program Head', status: 'Approved', by: 'Prof. Elena Martinez', date: 'Sep 20, 2026' }
    ],
    documents: [
      { name: 'CAP-IT-2025-014-Manuscript.pdf', type: 'Manuscript', uploadedBy: 'Uploader pending', uploadedAt: 'Jan 15, 2025', status: 'Verified' },
      { name: 'Predictive-Analytics-Dataset.xlsx', type: 'Dataset', uploadedBy: 'Dr. Ricardo Cruz', uploadedAt: 'Jan 18, 2025', status: 'Verified' },
      { name: 'Final-Defense-Presentation.pptx', type: 'Presentation', uploadedBy: 'Research Group', uploadedAt: 'Jan 22, 2025', status: 'Verified' },
      { name: 'Signed-Approval-Sheet.pdf', type: 'Approval Sheet', uploadedBy: 'Prof. Elena Martinez', uploadedAt: 'Sep 20, 2026', status: 'Verified' },
      { name: 'Progress-Report-Q3-2026.pdf', type: 'Progress Report', uploadedBy: 'Juan Dela Cruz', uploadedAt: 'Sep 15, 2026', status: 'Verified' }
    ]
  },
  {
    id: 'CAP-IT-2026-003',
    title: 'Barangay Health Records Mobile Application with Offline Sync',
    department: 'IT',
    program: 'BSIT',
    adviser: 'Prof. Liza Manalo',
    researchers: ['Carlo Mendoza', 'Angela Torres'],
    researchType: 'Capstone Project',
    abstract:
      'A mobile application for barangay health workers to record household health visits without internet access and synchronize records with the municipal health office once a connection is available.',
    dateStarted: 'Jan 20, 2026',
    lastUpdated: '2026-09-26',
    year: '2026',
    status: 'Active',
    statusClass: 'status-info',
    milestone: 'System testing',
    progressValue: 72,
    delayed: false,
    keywords: 'Mobile, Health Records, Offline-First',
    partner: '',
    transferStatus: 'Not Tagged',
    transferStatusClass: 'status-neutral',
    similarity: '9% match',
    milestones: [
      { title: 'Title Proposal', status: 'Completed', dueDate: 'Feb 10, 2026', completedDate: 'Feb 6, 2026' },
      { title: 'Chapters 1-3 Approval', status: 'Completed', dueDate: 'Apr 30, 2026', completedDate: 'Apr 24, 2026' },
      { title: 'System Development', status: 'Completed', dueDate: 'Aug 15, 2026', completedDate: 'Aug 14, 2026' },
      { title: 'System Testing', status: 'Ongoing', dueDate: 'Oct 5, 2026', completedDate: null },
      { title: 'Final Defense', status: 'Pending', dueDate: 'Nov 25, 2026', completedDate: null }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Prof. Liza Manalo', date: 'Sep 23, 2026' },
      { role: 'Program Head', status: 'Approved', by: 'Prof. Elena Martinez', date: 'Sep 25, 2026' }
    ],
    documents: [
      { name: 'Health-Records-App-Manuscript.pdf', type: 'Manuscript', uploadedBy: 'Carlo Mendoza', uploadedAt: 'Sep 21, 2026', status: 'Verified' },
      { name: 'Signed-Approval-Sheet.pdf', type: 'Approval Sheet', uploadedBy: 'Prof. Elena Martinez', uploadedAt: 'Sep 25, 2026', status: 'Verified' },
      { name: 'Progress-Report-Sept-2026.pdf', type: 'Progress Report', uploadedBy: 'Angela Torres', uploadedAt: 'Sep 24, 2026', status: 'Verified' },
      { name: 'Field-Test-Evidence.zip', type: 'Evidence', uploadedBy: 'Carlo Mendoza', uploadedAt: 'Sep 26, 2026', status: 'Verified' }
    ]
  },
  {
    id: 'CAP-IT-2026-007',
    title: 'Campus Parking Availability Monitoring Using Computer Vision',
    department: 'IT',
    program: 'BSIT',
    adviser: 'Dr. Ricardo Cruz',
    researchers: ['Nathan Lim', 'Bea Villanueva', 'Kyle Ramos'],
    researchType: 'Thesis',
    abstract:
      'A camera-based system that detects occupied and vacant parking slots on campus and publishes live availability to a web dashboard.',
    dateStarted: 'Feb 3, 2026',
    lastUpdated: '2026-09-25',
    year: '2026',
    status: 'Active',
    statusClass: 'status-info',
    milestone: 'Chapter 4 drafting',
    progressValue: 48,
    delayed: false,
    keywords: 'Computer Vision, Smart Campus, Object Detection',
    partner: '',
    transferStatus: 'Not Tagged',
    transferStatusClass: 'status-neutral',
    similarity: '14% match',
    milestones: [
      { title: 'Title Proposal', status: 'Completed', dueDate: 'Feb 28, 2026', completedDate: 'Feb 26, 2026' },
      { title: 'Chapters 1-3 Approval', status: 'Completed', dueDate: 'May 15, 2026', completedDate: null },
      { title: 'Model Training', status: 'Ongoing', dueDate: 'Sep 30, 2026', completedDate: null },
      { title: 'Chapter 4-5 Drafting', status: 'Pending', dueDate: 'Nov 10, 2026', completedDate: null },
      { title: 'Final Defense', status: 'Pending', dueDate: 'Jan 20, 2027', completedDate: null }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Dr. Ricardo Cruz', date: 'Sep 19, 2026' },
      { role: 'Program Head', status: 'Pending', by: 'Prof. Elena Martinez', date: null }
    ],
    documents: [
      { name: 'Parking-CV-Chapters-1-3.pdf', type: 'Manuscript', uploadedBy: 'Nathan Lim', uploadedAt: 'Sep 18, 2026', status: 'Pending Verification' },
      { name: 'Progress-Report-Sept-2026.pdf', type: 'Progress Report', uploadedBy: 'Bea Villanueva', uploadedAt: 'Sep 25, 2026', status: 'Verified' }
    ]
  },
  {
    id: 'CAP-IS-2026-002',
    title: 'Inventory and Procurement Tracking System for Local Government Units',
    department: 'IT',
    program: 'BSIS',
    adviser: 'Prof. Daniel Ong',
    researchers: ['Patricia Gomez', 'Miguel Navarro'],
    researchType: 'Capstone Project',
    abstract:
      'A web-based system that tracks supply requests, purchase orders, and deliveries for LGU offices, replacing spreadsheet-based procurement monitoring.',
    dateStarted: 'Jan 13, 2026',
    lastUpdated: '2026-09-26',
    year: '2026',
    status: 'Pending Review',
    statusClass: 'status-pending',
    milestone: 'Final manuscript revision',
    progressValue: 85,
    delayed: false,
    keywords: 'Procurement, Inventory, Government Systems',
    partner: 'Municipality of Opol',
    transferStatus: 'Matched',
    transferStatusClass: 'status-success',
    similarity: '11% match',
    milestones: [
      { title: 'Title Proposal', status: 'Completed', dueDate: 'Feb 5, 2026', completedDate: 'Feb 2, 2026' },
      { title: 'Chapters 1-3 Approval', status: 'Completed', dueDate: 'Apr 20, 2026', completedDate: 'Apr 17, 2026' },
      { title: 'System Development', status: 'Completed', dueDate: 'Jul 31, 2026', completedDate: 'Jul 29, 2026' },
      { title: 'User Acceptance Testing', status: 'Completed', dueDate: 'Sep 5, 2026', completedDate: 'Sep 4, 2026' },
      { title: 'Final Manuscript Revision', status: 'Ongoing', dueDate: 'Oct 3, 2026', completedDate: null }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Prof. Daniel Ong', date: 'Sep 17, 2026' },
      { role: 'Program Head', status: 'Approved', by: 'Prof. Elena Martinez', date: 'Sep 20, 2026' }
    ],
    documents: [
      { name: 'LGU-Procurement-Manuscript-v2.pdf', type: 'Manuscript', uploadedBy: 'Patricia Gomez', uploadedAt: 'Sep 26, 2026', status: 'Verified' },
      { name: 'Signed-Approval-Sheet.pdf', type: 'Approval Sheet', uploadedBy: 'Prof. Elena Martinez', uploadedAt: 'Sep 20, 2026', status: 'Verified' },
      { name: 'Progress-Report-Aug-2026.pdf', type: 'Progress Report', uploadedBy: 'Miguel Navarro', uploadedAt: 'Aug 30, 2026', status: 'Verified' },
      { name: 'UAT-Results-Opol.xlsx', type: 'Evidence', uploadedBy: 'Patricia Gomez', uploadedAt: 'Sep 26, 2026', status: 'Verified' }
    ]
  },
  {
    id: 'CAP-IT-2026-011',
    title: 'Online Thesis Defense Scheduling and Panel Evaluation System',
    department: 'IT',
    program: 'BSIT',
    adviser: 'Prof. Liza Manalo',
    researchers: ['Rafael Aquino', 'Janelle Cruz', 'Mark Villareal'],
    researchType: 'Capstone Project',
    abstract:
      'A scheduling and rubric-based evaluation system for thesis defenses that removes conflicts between panel availability and room bookings.',
    dateStarted: 'Aug 18, 2025',
    lastUpdated: '2026-09-15',
    year: '2026',
    status: 'Completed',
    statusClass: 'status-approved',
    milestone: 'Output archived',
    progressValue: 100,
    delayed: false,
    keywords: 'Scheduling, Evaluation, Academic Systems',
    partner: '',
    transferStatus: 'Not Tagged',
    transferStatusClass: 'status-neutral',
    similarity: '7% match',
    milestones: [
      { title: 'Title Proposal', status: 'Completed', dueDate: 'Sep 5, 2025', completedDate: 'Sep 2, 2025' },
      { title: 'Chapters 1-3 Approval', status: 'Completed', dueDate: 'Dec 1, 2025', completedDate: 'Nov 27, 2025' },
      { title: 'System Development', status: 'Completed', dueDate: 'Apr 30, 2026', completedDate: 'Apr 28, 2026' },
      { title: 'Final Defense', status: 'Completed', dueDate: 'Jul 15, 2026', completedDate: 'Jul 14, 2026' },
      { title: 'Final Manuscript Submission', status: 'Completed', dueDate: 'Aug 30, 2026', completedDate: 'Aug 26, 2026' }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Prof. Liza Manalo', date: 'Aug 27, 2026' },
      { role: 'Program Head', status: 'Approved', by: 'Prof. Elena Martinez', date: 'Aug 29, 2026' }
    ],
    documents: [
      { name: 'Defense-Scheduler-Final-Manuscript.pdf', type: 'Manuscript', uploadedBy: 'Rafael Aquino', uploadedAt: 'Aug 26, 2026', status: 'Verified' },
      { name: 'Signed-Approval-Sheet.pdf', type: 'Approval Sheet', uploadedBy: 'Prof. Elena Martinez', uploadedAt: 'Aug 29, 2026', status: 'Verified' },
      { name: 'Final-Progress-Report.pdf', type: 'Progress Report', uploadedBy: 'Janelle Cruz', uploadedAt: 'Aug 26, 2026', status: 'Verified' },
      { name: 'Source-Code-Archive.zip', type: 'Source Code', uploadedBy: 'Mark Villareal', uploadedAt: 'Aug 26, 2026', status: 'Verified' }
    ]
  },
  {
    id: 'CAP-MET-2025-021',
    title: 'Smart Solar Energy Monitoring System',
    department: 'MET',
    program: 'BSMET',
    adviser: 'Prof. Maria Ramos',
    researchers: ['Research Group'],
    researchType: 'Capstone Project',
    abstract: 'An IoT monitoring system for rooftop solar installations that tracks generation, load, and panel efficiency.',
    dateStarted: 'Aug 4, 2025',
    lastUpdated: '2025-02-02',
    year: '2025',
    status: 'Pending Review',
    statusClass: 'status-pending',
    milestone: 'Pilot testing validation',
    progressValue: 60,
    delayed: true,
    keywords: 'Solar, IoT, Energy Efficiency',
    partner: 'GreenEnergy PH',
    transferStatus: 'Matched',
    transferStatusClass: 'status-success',
    similarity: '8% match',
    milestones: [
      { title: 'Chapters 1-3 Approval', status: 'Completed', dueDate: 'Nov 15, 2024', completedDate: 'Nov 20, 2024' },
      { title: 'Pilot Testing Validation', status: 'Ongoing', dueDate: 'Jan 31, 2025', completedDate: null }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Prof. Maria Ramos', date: 'Jan 28, 2025' },
      { role: 'Program Head', status: 'Pending', by: 'Program Head', date: null }
    ],
    documents: [
      { name: 'Pilot-Test-Checklist.pdf', type: 'Evidence', uploadedBy: 'Prof. Maria Ramos', uploadedAt: 'Jan 28, 2025', status: 'Verified' },
      { name: 'Solar-Monitoring-Chapter4.docx', type: 'Manuscript', uploadedBy: 'Uploader pending', uploadedAt: 'Feb 2, 2025', status: 'Pending Verification' }
    ]
  },
  {
    id: 'CAP-TCM-2025-008',
    title: 'Herbal Medicine Knowledge Portal',
    department: 'TCM',
    program: 'BSTCM',
    adviser: 'Dr. Anna Reyes',
    researchers: ['Research Group'],
    researchType: 'Thesis',
    abstract: 'A searchable knowledge portal documenting local herbal medicine practices and their reported uses.',
    dateStarted: 'Aug 11, 2025',
    lastUpdated: '2025-02-07',
    year: '2025',
    status: 'At Risk',
    statusClass: 'status-critical',
    milestone: 'Chapter 1-3 revision',
    progressValue: 42,
    delayed: true,
    keywords: 'Knowledge Management, Herbal Medicine, Repository',
    partner: '',
    transferStatus: 'Not Tagged',
    transferStatusClass: 'status-neutral',
    similarity: '19% match',
    milestones: [
      { title: 'Title Proposal', status: 'Completed', dueDate: 'Sep 1, 2024', completedDate: 'Sep 3, 2024' },
      { title: 'Chapters 1-3 Revision', status: 'Ongoing', dueDate: 'Jan 30, 2025', completedDate: null }
    ],
    approvals: [
      { role: 'Adviser', status: 'Pending', by: 'Dr. Anna Reyes', date: null },
      { role: 'Program Head', status: 'Pending', by: 'Program Head', date: null }
    ],
    documents: [
      { name: 'Revision-Memo.pdf', type: 'Review Note', uploadedBy: 'Dr. Anna Reyes', uploadedAt: 'Feb 4, 2025', status: 'Verified' },
      { name: 'Chapter-1-3-Draft.docx', type: 'Manuscript', uploadedBy: 'Research Group', uploadedAt: 'Feb 7, 2025', status: 'Pending Verification' }
    ]
  },
  {
    id: 'CAP-ESM-2025-017',
    title: 'Sustainable Agriculture IoT System',
    department: 'ESM',
    program: 'BSESM',
    adviser: 'Prof. Jose Lopez',
    researchers: ['Research Group'],
    researchType: 'Capstone Project',
    abstract: 'Soil moisture and weather sensors that drive irrigation scheduling for a partner farmers cooperative.',
    dateStarted: 'Aug 6, 2024',
    lastUpdated: '2025-02-13',
    year: '2025',
    status: 'Active',
    statusClass: 'status-info',
    milestone: 'Implementation',
    progressValue: 82,
    delayed: false,
    keywords: 'Agriculture, IoT, Sustainability',
    partner: 'Lumbia Farmers Cooperative',
    transferStatus: 'Deployed',
    transferStatusClass: 'status-approved',
    similarity: '10% match',
    milestones: [
      { title: 'System Development', status: 'Completed', dueDate: 'Dec 15, 2024', completedDate: 'Dec 12, 2024' },
      { title: 'Implementation', status: 'Ongoing', dueDate: 'Mar 1, 2025', completedDate: null }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Prof. Jose Lopez', date: 'Feb 10, 2025' },
      { role: 'Program Head', status: 'Approved', by: 'Program Head', date: 'Feb 12, 2025' }
    ],
    documents: [
      { name: 'Deployment-Photos.zip', type: 'Evidence', uploadedBy: 'Prof. Jose Lopez', uploadedAt: 'Feb 11, 2025', status: 'Verified' },
      { name: 'Utilization-Report.pdf', type: 'Impact Report', uploadedBy: 'Tech Transfer Officer', uploadedAt: 'Feb 13, 2025', status: 'Verified' }
    ]
  },
  {
    id: 'CAP-NAME-2024-011',
    title: 'Marine Pollution Detection Drone',
    department: 'NAME',
    program: 'BSNAME',
    adviser: 'Dr. Elena Aquino',
    researchers: ['Research Group'],
    researchType: 'Capstone Project',
    abstract: 'A drone platform with water-surface imaging that detects and maps floating marine debris.',
    dateStarted: 'Aug 7, 2023',
    lastUpdated: '2025-01-10',
    year: '2024',
    status: 'Completed',
    statusClass: 'status-approved',
    milestone: 'Output archived',
    progressValue: 96,
    delayed: false,
    keywords: 'Drone, Marine, Pollution Detection',
    partner: 'OceanTech Inc.',
    transferStatus: 'In Use',
    transferStatusClass: 'status-info',
    similarity: '6% match',
    milestones: [
      { title: 'Final Defense', status: 'Completed', dueDate: 'Jun 15, 2024', completedDate: 'Jun 12, 2024' },
      { title: 'Output Archiving', status: 'Completed', dueDate: 'Dec 1, 2024', completedDate: 'Nov 28, 2024' }
    ],
    approvals: [
      { role: 'Adviser', status: 'Approved', by: 'Dr. Elena Aquino', date: 'Jun 20, 2024' },
      { role: 'Program Head', status: 'Approved', by: 'Program Head', date: 'Jun 25, 2024' }
    ],
    documents: [
      { name: 'Signed-MOA-OceanTech.pdf', type: 'MOA', uploadedBy: 'Research Head Office', uploadedAt: 'Dec 6, 2024', status: 'Verified' },
      { name: 'Post-Adoption-Feedback.pdf', type: 'Partner Feedback', uploadedBy: 'OceanTech Inc.', uploadedAt: 'Jan 10, 2025', status: 'Verified' }
    ]
  }
];

export const findInventoryRecord = (id: string | null | undefined) =>
  (id ? INVENTORY_RECORDS.find((record) => record.id === id) : undefined) ?? null;
