// Intellectual Property SAMPLE DATA for UI demonstration only; replace with an API once IP records
// are stored. ThesisTrack manages the university's internal IP workflow only:
//   researcher submits IP → Research Head reviews → Approved / Rejected → record is monitored
//   → Technology Transfer when applicable.
// External legal registration (government filing, examination, granting) is out of scope.
//
// An IP record holds only IP-specific information. Project details (title, program, department,
// adviser, progress, milestone, partner, documents) come from the linked Project Inventory
// record via `projectId`; they are never copied here.

export const IP_TYPES = [
  'Patent',
  'Utility Model',
  'Industrial Design',
  'Copyright',
  'Trademark',
  'Software/Computer Program'
] as const;

// Overall IP status shown on the page. Derived by getIpStatus(): the review decides the first four;
// after approval the technology-transfer stage decides the rest.
export const IP_STATUSES = [
  'Pending Review',
  'Under Evaluation',
  'Approved',
  'Rejected',
  'For Technology Transfer',
  'Transferred'
] as const;

export const IP_TRANSFER_STATUSES = ['Not Started', 'For Technology Transfer', 'In Progress', 'Transferred'] as const;

export type IpType = (typeof IP_TYPES)[number];
export type IpStatus = (typeof IP_STATUSES)[number];
export type IpReviewStatus = 'Pending Review' | 'Under Evaluation' | 'Approved' | 'Rejected';
export type IpTransferStatus = (typeof IP_TRANSFER_STATUSES)[number];
export type IpDocumentStatus = 'Submitted' | 'Pending' | 'Approved' | 'Missing';

export type IpSupportingDocument = {
  label: string;
  // Name of the file already stored under the linked project in Project Inventory. Absent for
  // IP-specific documents (e.g. the IP disclosure form) that are not part of the project files.
  projectDocument?: string;
  status: IpDocumentStatus;
};

export type IpRecord = {
  id: string;
  title: string;
  type: IpType | null; // null = not yet determined
  description: string;
  projectId: string | null;
  // Only for records with no Project Inventory record to link to.
  unlinkedProject?: { title: string; department: string };
  creators: string[];
  ownership: string;
  dateSubmitted: string | null;
  review: {
    status: IpReviewStatus;
    reviewedBy: string | null;
    date: string | null;
    remarks: string | null;
  };
  transfer: {
    status: IpTransferStatus;
    potentialApplication: string | null;
    transferDetail: string | null;
    agreement: string | null;
  };
  documents: IpSupportingDocument[];
  activity: Array<{ date: string; label: string }>;
};

export function getIpStatus(review: IpRecord['review'], transferStatus: IpTransferStatus): IpStatus {
  if (review.status !== 'Approved') {
    return review.status;
  }

  if (transferStatus === 'Transferred') {
    return 'Transferred';
  }

  return transferStatus === 'Not Started' ? 'Approved' : 'For Technology Transfer';
}

// A document counts as provided once it has been submitted or approved.
export const isDocumentProvided = (document: IpSupportingDocument) =>
  document.status === 'Submitted' || document.status === 'Approved';

const NOT_REVIEWED: IpRecord['review'] = { status: 'Pending Review', reviewedBy: null, date: null, remarks: null };

const NO_TRANSFER: IpRecord['transfer'] = {
  status: 'Not Started',
  potentialApplication: null,
  transferDetail: null,
  agreement: null
};

export const IP_RECORDS: IpRecord[] = [
  {
    id: 'IP-SAMPLE-006',
    title: 'ThesisTrack',
    type: null,
    description: 'Web-Based Information System',
    projectId: null,
    unlinkedProject: {
      title:
        'Development of a Thesis and Capstone Project Inventory, Progress Monitoring, and Technology Transfer Management System for Higher Education Institutions',
      department: 'IT'
    },
    creators: ['Achas, Princess Mae Camille N.', 'Bitos, Ivy A.', 'Graniten, Kyle Jhapeth C.', 'Juntilla, James Anthony Z.'],
    ownership: 'To be determined',
    dateSubmitted: null,
    review: NOT_REVIEWED,
    transfer: NO_TRANSFER,
    documents: [
      { label: 'IP Disclosure / Submission Form', status: 'Missing' },
      { label: 'Technical Documentation', status: 'Missing' },
      { label: 'Final Manuscript', status: 'Missing' }
    ],
    activity: []
  },
  {
    id: 'IP-SAMPLE-001',
    title: 'AI-Powered Learning System',
    type: 'Copyright',
    description: 'Educational software system',
    projectId: 'CAP-IT-2025-014',
    creators: ['Juan Dela Cruz', 'Maria Santos'],
    ownership: 'University',
    dateSubmitted: 'Mar 2, 2026',
    review: {
      status: 'Approved',
      reviewedBy: 'Research Head',
      date: 'Mar 6, 2026',
      remarks: 'IP documentation verified.'
    },
    transfer: {
      status: 'For Technology Transfer',
      potentialApplication: 'Learning management for schools and training centers',
      transferDetail: 'Awaiting partner agreement',
      agreement: null
    },
    documents: [
      { label: 'IP Disclosure / Submission Form', status: 'Approved' },
      { label: 'Technical Documentation', projectDocument: 'Predictive-Analytics-Dataset.xlsx', status: 'Submitted' },
      { label: 'Final Manuscript', projectDocument: 'CAP-IT-2025-014-Manuscript.pdf', status: 'Approved' }
    ],
    activity: [
      { date: 'Mar 2, 2026', label: 'IP submitted' },
      { date: 'Mar 3, 2026', label: 'Review started' },
      { date: 'Mar 6, 2026', label: 'Approved by Research Head' },
      { date: 'Mar 20, 2026', label: 'Marked for technology transfer' }
    ]
  },
  {
    id: 'IP-SAMPLE-002',
    title: 'Smart Energy Monitor',
    type: 'Utility Model',
    description: 'Prototype energy monitoring device',
    projectId: 'CAP-MET-2025-021',
    creators: ['Jose Reyes', 'Ana Garcia'],
    ownership: 'University',
    dateSubmitted: 'Feb 12, 2026',
    review: {
      status: 'Approved',
      reviewedBy: 'Research Head',
      date: 'Feb 26, 2026',
      remarks: 'Pilot test results and technical files are complete.'
    },
    transfer: {
      status: 'In Progress',
      potentialApplication: 'Energy monitoring for campuses and small businesses',
      transferDetail: 'Discussing terms with partner',
      agreement: null
    },
    documents: [
      { label: 'IP Disclosure / Submission Form', status: 'Approved' },
      { label: 'Technical Documentation', projectDocument: 'Pilot-Test-Checklist.pdf', status: 'Approved' },
      { label: 'Final Manuscript', projectDocument: 'Solar-Monitoring-Chapter4.docx', status: 'Submitted' },
      { label: 'Technical Drawings', status: 'Missing' }
    ],
    activity: [
      { date: 'Feb 12, 2026', label: 'IP submitted' },
      { date: 'Feb 14, 2026', label: 'Review started' },
      { date: 'Feb 26, 2026', label: 'Approved by Research Head' },
      { date: 'Apr 15, 2026', label: 'Technology transfer initiated' }
    ]
  },
  {
    id: 'IP-SAMPLE-003',
    title: 'Agricultural Monitoring System',
    type: 'Patent',
    description: 'IoT-based agricultural monitoring device',
    projectId: 'CAP-ESM-2025-017',
    creators: ['Carlo Mendoza', 'Liza Ramos', 'Mark Villanueva'],
    ownership: 'University and Researchers',
    dateSubmitted: 'Jun 2, 2026',
    review: {
      status: 'Under Evaluation',
      reviewedBy: 'Research Head',
      date: null,
      remarks: 'Checking technical documentation.'
    },
    transfer: NO_TRANSFER,
    documents: [
      { label: 'IP Disclosure / Submission Form', status: 'Pending' },
      { label: 'Technical Documentation', projectDocument: 'Utilization-Report.pdf', status: 'Submitted' },
      { label: 'Deployment Evidence', projectDocument: 'Deployment-Photos.zip', status: 'Submitted' },
      { label: 'Final Manuscript', status: 'Missing' }
    ],
    activity: [
      { date: 'Jun 2, 2026', label: 'IP submitted' },
      { date: 'Jun 5, 2026', label: 'Review started' }
    ]
  },
  {
    id: 'IP-SAMPLE-004',
    title: 'Research Center Branding',
    type: 'Trademark',
    description: 'Original logo and visual identity',
    projectId: null,
    unlinkedProject: { title: 'Institutional Research Initiative', department: 'TCM' },
    creators: ['Paolo Aquino'],
    ownership: 'University',
    dateSubmitted: null,
    review: NOT_REVIEWED,
    transfer: NO_TRANSFER,
    documents: [
      { label: 'IP Disclosure / Submission Form', status: 'Missing' },
      { label: 'Logo Specimen', status: 'Missing' }
    ],
    activity: []
  },
  {
    id: 'IP-SAMPLE-005',
    title: 'Marine Pollution Detector',
    type: 'Patent',
    description: 'Water contaminant detection device',
    projectId: 'CAP-NAME-2024-011',
    creators: ['Elena Bautista', 'Rafael Cruz'],
    ownership: 'University',
    dateSubmitted: 'Aug 18, 2024',
    review: {
      status: 'Approved',
      reviewedBy: 'Research Head',
      date: 'Aug 28, 2024',
      remarks: 'IP documentation verified.'
    },
    transfer: {
      status: 'Transferred',
      potentialApplication: 'Coastal and harbor water-quality monitoring',
      transferDetail: 'Technology adopted by partner',
      agreement: 'Signed-MOA-OceanTech.pdf'
    },
    documents: [
      { label: 'IP Disclosure / Submission Form', status: 'Approved' },
      { label: 'Technical Documentation', projectDocument: 'Post-Adoption-Feedback.pdf', status: 'Approved' },
      { label: 'Signed MOA', projectDocument: 'Signed-MOA-OceanTech.pdf', status: 'Approved' }
    ],
    activity: [
      { date: 'Aug 18, 2024', label: 'IP submitted' },
      { date: 'Aug 20, 2024', label: 'Review started' },
      { date: 'Aug 28, 2024', label: 'Approved by Research Head' },
      { date: 'Sep 10, 2024', label: 'Technology transfer initiated' },
      { date: 'Dec 6, 2024', label: 'Agreement signed with partner' },
      { date: 'Jan 10, 2025', label: 'Technology transfer completed' }
    ]
  }
];

// Existing admin badge classes; no new colors.
export const IP_STATUS_BADGE: Record<IpStatus, string> = {
  'Pending Review': 'status-neutral',
  'Under Evaluation': 'status-review',
  Approved: 'status-approved',
  Rejected: 'status-critical',
  'For Technology Transfer': 'status-info',
  Transferred: 'status-approved'
};

export const IP_REVIEW_BADGE: Record<IpReviewStatus, string> = {
  'Pending Review': 'status-neutral',
  'Under Evaluation': 'status-review',
  Approved: 'status-approved',
  Rejected: 'status-critical'
};

export const IP_TRANSFER_BADGE: Record<IpTransferStatus, string> = {
  'Not Started': 'status-neutral',
  'For Technology Transfer': 'status-info',
  'In Progress': 'status-review',
  Transferred: 'status-approved'
};

export const IP_DOCUMENT_BADGE: Record<IpDocumentStatus, string> = {
  Approved: 'status-approved',
  Submitted: 'status-info',
  Pending: 'status-review',
  Missing: 'status-critical'
};
