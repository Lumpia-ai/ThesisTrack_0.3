export type TechTransferDepartment = 'IT' | 'MET' | 'TCM' | 'ESM' | 'NAME';

export type TechTransferNavKey =
  | 'dashboard'
  | 'projects'
  | 'matching'
  | 'deployment'
  | 'documents'
  | 'impact'
  | 'reports'
  | 'notifications'
  | 'profile';

export type TechTransferStatusTone =
  | 'approved'
  | 'pending'
  | 'warning'
  | 'danger'
  | 'active'
  | 'completed'
  | 'deployed'
  | 'processing';

export type TransferRequestRecord = {
  id: number;
  project: string;
  department: TechTransferDepartment;
  partner: string;
  date: string;
  status: 'Pending MOA' | 'Under Review';
};

export type TransferProject = {
  id: string;
  title: string;
  department: TechTransferDepartment;
  category: string;
  readiness: string;
  partnerInterest: string;
  status: 'Ready' | 'Processing' | 'Matched' | 'Deployed';
  adviser: string;
  summary: string;
};

export type MatchRecord = {
  id: string;
  project: string;
  department: TechTransferDepartment;
  partner: string;
  score: number;
  focus: string;
  status: 'High Fit' | 'Needs Validation' | 'Proposal Sent';
};

export type DeploymentRecord = {
  id: string;
  project: string;
  department: TechTransferDepartment;
  partner: string;
  deploymentDate: string;
  phase: 'Planning' | 'Testing Phase' | 'Fully Operational';
  progress: number;
};

export type TimelineMilestone = {
  id: string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'current' | 'pending';
};

export type DocumentRecord = {
  id: string;
  title: string;
  type: 'MOA' | 'NDA' | 'License' | 'Endorsement' | 'Impact Report';
  project: string;
  partner: string;
  owner: string;
  status: 'Ready' | 'Processing' | 'For Signature';
  updatedAt: string;
};

export type ImpactRecord = {
  id: string;
  project: string;
  partner: string;
  metric: string;
  value: string;
  status: 'Active' | 'Validated' | 'Needs Update';
};

export type ExportRecord = {
  id: string;
  report: string;
  coverage: string;
  generated: string;
  status: 'Ready' | 'Processing';
  format: 'PDF' | 'CSV' | 'JSON';
};

export type ScheduledReport = {
  id: string;
  reportType: string;
  coverage: string;
  frequency: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly';
  nextRun: string;
  delivery: 'Dashboard Only' | 'Email' | 'Both';
};

export type TechTransferNotification = {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  unread: boolean;
  tone: TechTransferStatusTone;
  actionLabel?: string;
};

export const TECH_TRANSFER_NAV_ITEMS = [
  { key: 'dashboard', href: '/tech-transfer/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
  { key: 'projects', href: '/tech-transfer/projects', label: 'Transferable Projects', icon: 'fa-rocket' },
  { key: 'matching', href: '/tech-transfer/matching', label: 'Partner Matching', icon: 'fa-handshake' },
  { key: 'deployment', href: '/tech-transfer/deployment', label: 'Deployment Tracking', icon: 'fa-chart-line' },
  { key: 'documents', href: '/tech-transfer/documents', label: 'MOA / Documents', icon: 'fa-file-contract' },
  { key: 'impact', href: '/tech-transfer/impact', label: 'Impact Monitoring', icon: 'fa-chart-simple' },
  { key: 'reports', href: '/tech-transfer/reports', label: 'Reports', icon: 'fa-chart-bar' },
  { key: 'notifications', href: '/tech-transfer/notifications', label: 'Notifications', icon: 'fa-bell' },
  { key: 'profile', href: '/tech-transfer/profile', label: 'Profile', icon: 'fa-user' }
] as const satisfies ReadonlyArray<{
  key: TechTransferNavKey;
  href: string;
  label: string;
  icon: string;
}>;

export const TECH_TRANSFER_REQUESTS: readonly TransferRequestRecord[] = [
  { id: 101, project: 'AI Inventory System', department: 'IT', partner: 'TechCorp Inc.', date: 'Feb 1, 2024', status: 'Pending MOA' },
  { id: 102, project: 'Solar Water Heater', department: 'MET', partner: 'GreenEnergy PH', date: 'Jan 28, 2024', status: 'Under Review' },
  { id: 103, project: 'Smart Traffic Node', department: 'ESM', partner: 'MetroDev Corp', date: 'Feb 5, 2024', status: 'Pending MOA' },
  { id: 104, project: 'Marine Drone Monitor', department: 'NAME', partner: 'Ocean Protect Initiative', date: 'Jan 30, 2024', status: 'Under Review' },
  { id: 105, project: 'E-Learning Analytics', department: 'IT', partner: 'EduTech Solutions', date: 'Feb 7, 2024', status: 'Pending MOA' }
] as const;

export const TECH_TRANSFER_PROJECTS: readonly TransferProject[] = [
  {
    id: 'tt-001',
    title: 'AI Inventory System',
    department: 'IT',
    category: 'Enterprise Automation',
    readiness: 'TRL 8',
    partnerInterest: '3 active leads',
    status: 'Ready',
    adviser: 'Dr. Ricardo Cruz',
    summary: 'Inventory forecasting and stock automation for warehouses and retail networks.'
  },
  {
    id: 'tt-002',
    title: 'Smart Solar Water Heater',
    department: 'MET',
    category: 'Energy Systems',
    readiness: 'TRL 7',
    partnerInterest: '2 campus facility prospects',
    status: 'Processing',
    adviser: 'Prof. Maria Ramos',
    summary: 'Solar performance optimization with monitoring controls for institutional facilities.'
  },
  {
    id: 'tt-003',
    title: 'Herbal Medicine Knowledge Hub',
    department: 'TCM',
    category: 'Knowledge Management',
    readiness: 'TRL 6',
    partnerInterest: '1 research center lead',
    status: 'Matched',
    adviser: 'Dr. Anna Reyes',
    summary: 'Repository and taxonomy engine for medicinal plant documentation and community access.'
  },
  {
    id: 'tt-004',
    title: 'Sustainable Agriculture IoT',
    department: 'ESM',
    category: 'Agri-Tech',
    readiness: 'TRL 8',
    partnerInterest: '2 cooperative pilots',
    status: 'Deployed',
    adviser: 'Prof. Jose Lopez',
    summary: 'Field automation platform for irrigation, soil data, and advisory alerts.'
  },
  {
    id: 'tt-005',
    title: 'Marine Pollution Detection Drone',
    department: 'NAME',
    category: 'Maritime Monitoring',
    readiness: 'TRL 7',
    partnerInterest: 'LGU and NGO interest',
    status: 'Matched',
    adviser: 'Dr. Elena Aquino',
    summary: 'Drone-based coastal surveillance and pollution evidence capture workflow.'
  }
] as const;

export const TECH_TRANSFER_MATCHES: readonly MatchRecord[] = [
  { id: 'match-1', project: 'AI Inventory System', department: 'IT', partner: 'TechCorp Inc.', score: 92, focus: 'Warehouse digitization', status: 'Proposal Sent' },
  { id: 'match-2', project: 'Smart Solar Water Heater', department: 'MET', partner: 'GreenEnergy PH', score: 88, focus: 'Renewable energy pilot', status: 'High Fit' },
  { id: 'match-3', project: 'Sustainable Agriculture IoT', department: 'ESM', partner: 'Lumbia Farmers Cooperative', score: 85, focus: 'Community farm deployment', status: 'Proposal Sent' },
  { id: 'match-4', project: 'Marine Pollution Detection Drone', department: 'NAME', partner: 'Ocean Protect Initiative', score: 81, focus: 'Coastal environmental monitoring', status: 'Needs Validation' }
] as const;

export const TECH_TRANSFER_DEPLOYMENTS: readonly DeploymentRecord[] = [
  { id: 'deploy-1', project: 'AI Inventory System', department: 'IT', partner: 'TechCorp Inc.', deploymentDate: 'Feb 15, 2024', phase: 'Testing Phase', progress: 65 },
  { id: 'deploy-2', project: 'Sustainable Agriculture IoT', department: 'ESM', partner: 'Lumbia Farmers Cooperative', deploymentDate: 'Jan 20, 2024', phase: 'Fully Operational', progress: 100 },
  { id: 'deploy-3', project: 'Smart Solar Water Heater', department: 'MET', partner: 'GreenEnergy PH', deploymentDate: 'Mar 2, 2024', phase: 'Planning', progress: 35 }
] as const;

export const TECH_TRANSFER_TIMELINE: readonly TimelineMilestone[] = [
  { id: 'milestone-1', title: 'MOA Signing', description: 'Institution and partner agreement signoff', date: '2026-04-14', status: 'completed' },
  { id: 'milestone-2', title: 'Technical Setup', description: 'Environment preparation and equipment coordination', date: '2026-04-20', status: 'current' },
  { id: 'milestone-3', title: 'Pilot Validation', description: 'Operational test and partner readiness review', date: '2026-05-04', status: 'pending' },
  { id: 'milestone-4', title: 'Impact Review', description: 'Closeout evidence and pilot evaluation summary', date: '2026-05-18', status: 'pending' }
] as const;

export const TECH_TRANSFER_DOCUMENTS: readonly DocumentRecord[] = [
  { id: 'doc-1', title: 'TechCorp MOA Draft', type: 'MOA', project: 'AI Inventory System', partner: 'TechCorp Inc.', owner: 'Legal Office', status: 'For Signature', updatedAt: 'Apr 8, 2026' },
  { id: 'doc-2', title: 'GreenEnergy Deployment License', type: 'License', project: 'Smart Solar Water Heater', partner: 'GreenEnergy PH', owner: 'TTO Office', status: 'Processing', updatedAt: 'Apr 5, 2026' },
  { id: 'doc-3', title: 'Lumbia Endorsement Packet', type: 'Endorsement', project: 'Sustainable Agriculture IoT', partner: 'Lumbia Farmers Cooperative', owner: 'Department Chair', status: 'Ready', updatedAt: 'Apr 3, 2026' },
  { id: 'doc-4', title: 'Coastal Monitoring NDA', type: 'NDA', project: 'Marine Pollution Detection Drone', partner: 'Ocean Protect Initiative', owner: 'TTO Office', status: 'Ready', updatedAt: 'Apr 1, 2026' }
] as const;

export const TECH_TRANSFER_IMPACTS: readonly ImpactRecord[] = [
  { id: 'impact-1', project: 'AI Inventory System', partner: 'TechCorp Inc.', metric: 'Manual stock reconciliation time', value: '30% reduction', status: 'Validated' },
  { id: 'impact-2', project: 'Sustainable Agriculture IoT', partner: 'Lumbia Farmers Cooperative', metric: 'Water usage', value: '18% reduction', status: 'Active' },
  { id: 'impact-3', project: 'Marine Pollution Detection Drone', partner: 'Ocean Protect Initiative', metric: 'Evidence capture coverage', value: '2x faster reporting', status: 'Validated' },
  { id: 'impact-4', project: 'Smart Solar Water Heater', partner: 'GreenEnergy PH', metric: 'Pilot efficiency baseline', value: 'Awaiting month-end data', status: 'Needs Update' }
] as const;

export const TECH_TRANSFER_EXPORTS: readonly ExportRecord[] = [
  { id: 'exp-1', report: 'Commercialization Summary', coverage: 'March 2026', generated: 'Apr 8, 2026', status: 'Ready', format: 'PDF' },
  { id: 'exp-2', report: 'Deployment Tracker', coverage: 'Q1 2026', generated: 'Apr 6, 2026', status: 'Ready', format: 'CSV' },
  { id: 'exp-3', report: 'Impact Review', coverage: 'March 2026', generated: 'Apr 5, 2026', status: 'Processing', format: 'PDF' }
] as const;

export const TECH_TRANSFER_SCHEDULED_REPORTS: readonly ScheduledReport[] = [
  { id: 'sched-1', reportType: 'Commercialization Summary', coverage: 'All departments', frequency: 'Monthly', nextRun: 'Apr 30, 2026', delivery: 'Both' },
  { id: 'sched-2', reportType: 'Deployment Tracker', coverage: 'Active deployments', frequency: 'Bi-weekly', nextRun: 'Apr 21, 2026', delivery: 'Dashboard Only' },
  { id: 'sched-3', reportType: 'Impact Review', coverage: 'Validated pilots', frequency: 'Quarterly', nextRun: 'Jun 30, 2026', delivery: 'Email' }
] as const;

export const TECH_TRANSFER_NOTIFICATIONS: readonly TechTransferNotification[] = [
  { id: 'tto-notif-1', title: '3 requests waiting for MOA processing', message: 'Finalize MOA drafts and routing for the latest approved requests.', timeLabel: '35 minutes ago', unread: true, tone: 'warning', actionLabel: 'Open Dashboard' },
  { id: 'tto-notif-2', title: 'Impact record needs update', message: 'Solar Water Heater pilot metrics were flagged for missing validation data.', timeLabel: '4 hours ago', unread: true, tone: 'pending', actionLabel: 'Open Impact' },
  { id: 'tto-notif-3', title: 'Deployment milestone completed', message: 'Lumbia Farmers Cooperative marked the Sustainable Agriculture pilot as fully operational.', timeLabel: '1 day ago', unread: false, tone: 'deployed' },
  { id: 'tto-notif-4', title: 'Report bundle ready', message: 'The March commercialization summary package is available for export.', timeLabel: '2 days ago', unread: false, tone: 'approved' }
] as const;

export const TECH_TRANSFER_PROFILE = {
  officeName: 'Technology Transfer Office',
  coordinator: 'Mark Rivera',
  role: 'Technology Transfer Coordinator',
  email: 'mark.rivera@university.edu.ph',
  phone: '+63 917 555 4812',
  office: 'Research Innovation Center, 2nd Floor',
  scope: 'Commercialization, partner matching, MOA processing, deployment monitoring',
  managedPartners: 15,
  activeMoas: 8,
  successfulDeployments: 23
} as const;

export const TECH_TRANSFER_MONTHLY_ADOPTION = [
  { month: 'Sep', deployments: 3, moas: 3 },
  { month: 'Oct', deployments: 5, moas: 4 },
  { month: 'Nov', deployments: 7, moas: 5 },
  { month: 'Dec', deployments: 10, moas: 6 },
  { month: 'Jan', deployments: 12, moas: 7 },
  { month: 'Feb', deployments: 15, moas: 8 }
] as const;

export function getTechTransferStatusTone(status: string): TechTransferStatusTone {
  switch (status) {
    case 'Ready':
    case 'Proposal Sent':
    case 'Validated':
      return 'approved';
    case 'Pending MOA':
    case 'Needs Update':
      return 'pending';
    case 'Under Review':
    case 'High Fit':
    case 'Testing Phase':
      return 'warning';
    case 'Needs Validation':
      return 'danger';
    case 'Processing':
    case 'Matched':
      return 'processing';
    case 'Fully Operational':
      return 'completed';
    case 'Deployed':
      return 'deployed';
    case 'Active':
    case 'Planning':
    default:
      return 'active';
  }
}
