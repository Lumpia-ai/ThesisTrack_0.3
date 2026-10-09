export type PartnerDepartment = 'IT' | 'MET' | 'TCM' | 'ESM' | 'NAME';

export type PartnerNavKey =
  | 'dashboard'
  | 'project'
  | 'details'
  | 'request'
  | 'requests'
  | 'implementations'
  | 'feedback'
  | 'notifications';

export type PartnerStatusTone =
  | 'approved'
  | 'pending'
  | 'warning'
  | 'danger'
  | 'active'
  | 'completed'
  | 'deployed';

export type PartnerTechnology = {
  id: string;
  title: string;
  department: PartnerDepartment;
  icon: string;
  summary: string;
  readinessPercent: number;
  readinessLabel: string;
  trl: string;
  impactRating: number;
  developers: string;
  adviser: string;
  timeline: string;
  platform: string;
  stack: string;
  industries: string[];
  requirements: Array<{
    requirement: string;
    description: string;
    timeline: string;
  }>;
  abstract: string;
};

export type PartnerRequestRecord = {
  id: string;
  technologyId: string;
  projectTitle: string;
  department: PartnerDepartment;
  requestDate: string;
  status: 'Approved' | 'Under Review' | 'Pending' | 'Negotiation' | 'Completed';
  lastUpdate: string;
  implementationPlan: string;
  timeline: string;
  budgetRange: string;
  comments: string;
};

export type PartnerImplementation = {
  id: string;
  technologyId: string;
  title: string;
  department: PartnerDepartment;
  partner: string;
  currentPhase: 'Planning' | 'Setup' | 'Testing Phase' | 'Training' | 'Go-Live' | 'Fully Operational';
  progress: number;
  startDate: string;
  targetDate: string;
  status: 'Deployed' | 'Testing' | 'Planning';
  impactLabel: string;
  milestones: Array<{
    label: string;
    state: 'completed' | 'current' | 'pending';
  }>;
};

export type PartnerFeedbackEntry = {
  id: string;
  implementationId: string;
  title: string;
  category: 'Progress Report' | 'Issue Log' | 'Impact Feedback';
  submittedAt: string;
  summary: string;
  status: 'Submitted' | 'Needs Follow-up' | 'Resolved';
};

export type PartnerNotification = {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  unread: boolean;
  tone: PartnerStatusTone;
  actionLabel?: string;
};

export const PARTNER_NAV_ITEMS = [
  { key: 'dashboard', href: '/partner/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
  { key: 'project', href: '/partner/project', label: 'Browse Projects', icon: 'fa-search' },
  { key: 'requests', href: '/partner/requests', label: 'My Requests', icon: 'fa-list' },
  { key: 'implementations', href: '/partner/implementations', label: 'Active Implementations', icon: 'fa-microchip' },
  { key: 'feedback', href: '/partner/feedback', label: 'Feedback & Reports', icon: 'fa-comment' }
] as const satisfies ReadonlyArray<{
  key: PartnerNavKey;
  href: string;
  label: string;
  icon: string;
}>;

export const PARTNER_DEPARTMENTS = ['IT', 'MET', 'TCM', 'ESM', 'NAME'] as const;

export const PARTNER_TECHNOLOGIES: readonly PartnerTechnology[] = [
  {
    id: 'ai-inventory',
    title: 'AI-Powered Inventory Management System',
    department: 'IT',
    icon: 'fa-robot',
    summary:
      'Machine learning-based inventory forecasting with real-time analytics for logistics, retail, and warehouse operations.',
    readinessPercent: 95,
    readinessLabel: 'High',
    trl: 'TRL 8 - Ready for Deployment',
    impactRating: 5,
    developers: 'Developers pending',
    adviser: 'Dr. Ricardo Cruz',
    timeline: 'August 2023 - January 2024',
    platform: 'Web-based, Mobile Responsive',
    stack: 'Python, Django, React, PostgreSQL, REST APIs',
    industries: ['Retail & E-commerce', 'Manufacturing', 'Warehouse & Logistics', 'Healthcare'],
    abstract:
      'The system combines predictive demand modelling, automated reordering, and live stock visibility. Pilot tests showed a 40% reduction in stockouts and a 25% decrease in excess inventory costs.',
    requirements: [
      {
        requirement: 'Hardware Requirements',
        description: 'Standard cloud instance or 4GB RAM on-premise server',
        timeline: '1-2 weeks'
      },
      {
        requirement: 'Integration',
        description: 'REST API connection to ERP, POS, and warehouse tools',
        timeline: '2-3 weeks'
      },
      {
        requirement: 'Training',
        description: 'Onboarding and workflow training for operations staff',
        timeline: '1 week'
      },
      {
        requirement: 'Support',
        description: 'Developer team coordination during initial rollout',
        timeline: 'Ongoing'
      }
    ]
  },
  {
    id: 'solar-monitor',
    title: 'Smart Solar Energy Monitor',
    department: 'MET',
    icon: 'fa-solar-panel',
    summary:
      'IoT-based solar panel performance monitoring with anomaly detection, maintenance alerts, and mobile reporting.',
    readinessPercent: 88,
    readinessLabel: 'Qualified Prototype',
    trl: 'TRL 7 - Prototype Demonstration',
    impactRating: 4,
    developers: 'Developers pending',
    adviser: 'Prof. Maria Ramos',
    timeline: 'September 2023 - February 2024',
    platform: 'Embedded IoT Sensors + Web Dashboard',
    stack: 'ESP32, MQTT, Node.js, React, PostgreSQL',
    industries: ['Facilities Management', 'Renewable Energy', 'Educational Campuses'],
    abstract:
      'The solution tracks solar array efficiency in real time and flags unusual power drop patterns for preventive maintenance planning.',
    requirements: [
      {
        requirement: 'Sensor Calibration',
        description: 'Installation of current and voltage sensors per panel array',
        timeline: '1 week'
      },
      {
        requirement: 'Connectivity',
        description: 'Stable Wi-Fi or local gateway for IoT transmission',
        timeline: '3-5 days'
      },
      {
        requirement: 'Dashboard Setup',
        description: 'Monitoring dashboard provisioning for facility staff',
        timeline: '1 week'
      }
    ]
  },
  {
    id: 'agri-iot',
    title: 'Sustainable Agriculture IoT System',
    department: 'ESM',
    icon: 'fa-leaf',
    summary:
      'Soil, irrigation, and crop condition monitoring that supports automated farming interventions for community-scale deployments.',
    readinessPercent: 92,
    readinessLabel: 'Deployment Candidate',
    trl: 'TRL 8 - Field Tested',
    impactRating: 4,
    developers: 'Developers pending',
    adviser: 'Prof. Jose Lopez',
    timeline: 'August 2023 - February 2024',
    platform: 'IoT Control Layer + Analytics Dashboard',
    stack: 'Sensor Network, Python, React, SMS Gateway',
    industries: ['Agriculture', 'Community Extension', 'Agri-tech'],
    abstract:
      'The platform uses sensor-fed automation to reduce water waste and improve decision-making for small farm operations.',
    requirements: [
      {
        requirement: 'Sensor Network',
        description: 'Deployment of field sensors and irrigation controllers',
        timeline: '2 weeks'
      },
      {
        requirement: 'Training',
        description: 'Farmer orientation and field calibration workshop',
        timeline: '1 week'
      }
    ]
  },
  {
    id: 'marine-drone',
    title: 'Marine Pollution Detection Drone',
    department: 'NAME',
    icon: 'fa-water',
    summary:
      'Autonomous drone system for monitoring coastal waste and pollution using multispectral imagery and automated alerts.',
    readinessPercent: 86,
    readinessLabel: 'Pilot Ready',
    trl: 'TRL 7 - Operational Pilot',
    impactRating: 5,
    developers: 'Developers pending',
    adviser: 'Dr. Elena Aquino',
    timeline: 'January 2023 - January 2024',
    platform: 'Autonomous UAV + Web Monitoring Console',
    stack: 'Computer Vision, GIS Mapping, Python, React',
    industries: ['Coastal Monitoring', 'Maritime Safety', 'LGU Environment Offices'],
    abstract:
      'The drone platform supports pollution mapping, recurring monitoring routes, and evidence capture for coastal management initiatives.',
    requirements: [
      {
        requirement: 'Operational Training',
        description: 'Pilot and monitoring staff training for drone missions',
        timeline: '1 week'
      },
      {
        requirement: 'Regulatory Clearance',
        description: 'Flight approvals and local coordination for recurring missions',
        timeline: '2-4 weeks'
      }
    ]
  }
] as const;

export const PARTNER_REQUESTS: readonly PartnerRequestRecord[] = [
  {
    id: 'REQ-001',
    technologyId: 'ai-inventory',
    projectTitle: 'AI-Powered Inventory Management System',
    department: 'IT',
    requestDate: 'Feb 5, 2024',
    status: 'Approved',
    lastUpdate: 'Feb 10, 2024',
    implementationPlan: 'Pilot testing in the main warehouse for 3 months followed by branch rollout.',
    timeline: 'March 1, 2024 - June 1, 2024',
    budgetRange: '$10,000 - $25,000',
    comments: 'Request approved. MOA preparation is underway for operational rollout.'
  },
  {
    id: 'REQ-002',
    technologyId: 'solar-monitor',
    projectTitle: 'Smart Solar Energy Monitor',
    department: 'MET',
    requestDate: 'Feb 1, 2024',
    status: 'Under Review',
    lastUpdate: 'Feb 8, 2024',
    implementationPlan: 'Deploy monitoring units across rooftop solar panels for predictive maintenance.',
    timeline: 'March 15, 2024 - July 30, 2024',
    budgetRange: '$5,000 - $10,000',
    comments: 'Technical review is ongoing for the site sensor layout and dashboard scope.'
  },
  {
    id: 'REQ-003',
    technologyId: 'marine-drone',
    projectTitle: 'Marine Pollution Detection Drone',
    department: 'NAME',
    requestDate: 'Jan 25, 2024',
    status: 'Pending',
    lastUpdate: 'Jan 28, 2024',
    implementationPlan: 'Use drone patrol runs to support monthly coastal monitoring and evidence capture.',
    timeline: 'April 1, 2024 - August 15, 2024',
    budgetRange: '$25,000 - $50,000',
    comments: 'Initial endorsement received. Awaiting operational and regulatory review.'
  },
  {
    id: 'REQ-004',
    technologyId: 'agri-iot',
    projectTitle: 'Sustainable Agriculture IoT System',
    department: 'ESM',
    requestDate: 'Jan 20, 2024',
    status: 'Negotiation',
    lastUpdate: 'Feb 12, 2024',
    implementationPlan: 'Install irrigation automation nodes across a pilot farm area.',
    timeline: 'March 10, 2024 - July 20, 2024',
    budgetRange: '$10,000 - $25,000',
    comments: 'Budget alignment and field deployment responsibility are still being finalized.'
  },
  {
    id: 'REQ-005',
    technologyId: 'ai-inventory',
    projectTitle: 'AI-Powered Inventory Management System',
    department: 'IT',
    requestDate: 'Jan 15, 2024',
    status: 'Completed',
    lastUpdate: 'Feb 1, 2024',
    implementationPlan: 'Full adoption package completed and transferred to operations.',
    timeline: 'January 15, 2024 - February 1, 2024',
    budgetRange: '$10,000 - $25,000',
    comments: 'Implementation handover completed and the initial report was received.'
  }
] as const;

export const PARTNER_IMPLEMENTATIONS: readonly PartnerImplementation[] = [
  {
    id: 'impl-001',
    technologyId: 'ai-inventory',
    title: 'AI Inventory Management System',
    department: 'IT',
    partner: 'TechCorp Inc.',
    currentPhase: 'Testing Phase',
    progress: 65,
    startDate: 'Feb 15, 2024',
    targetDate: 'May 15, 2024',
    status: 'Testing',
    impactLabel: 'High operational value',
    milestones: [
      { label: 'Setup', state: 'completed' },
      { label: 'Testing', state: 'current' },
      { label: 'Training', state: 'pending' },
      { label: 'Go-Live', state: 'pending' }
    ]
  },
  {
    id: 'impl-002',
    technologyId: 'agri-iot',
    title: 'Sustainable Agriculture IoT System',
    department: 'ESM',
    partner: 'Lumbia Farms Cooperative',
    currentPhase: 'Planning',
    progress: 30,
    startDate: 'Mar 10, 2024',
    targetDate: 'Jul 20, 2024',
    status: 'Planning',
    impactLabel: 'Community pilot preparation',
    milestones: [
      { label: 'Site Survey', state: 'completed' },
      { label: 'Sensor Mapping', state: 'current' },
      { label: 'Deployment', state: 'pending' },
      { label: 'Evaluation', state: 'pending' }
    ]
  },
  {
    id: 'impl-003',
    technologyId: 'marine-drone',
    title: 'Marine Pollution Detection Drone',
    department: 'NAME',
    partner: 'Coastal Watch Alliance',
    currentPhase: 'Fully Operational',
    progress: 100,
    startDate: 'Dec 12, 2023',
    targetDate: 'Feb 1, 2024',
    status: 'Deployed',
    impactLabel: 'Operational monitoring in place',
    milestones: [
      { label: 'Calibration', state: 'completed' },
      { label: 'Pilot Run', state: 'completed' },
      { label: 'Training', state: 'completed' },
      { label: 'Operations', state: 'current' }
    ]
  }
] as const;

export const PARTNER_FEEDBACK: readonly PartnerFeedbackEntry[] = [
  {
    id: 'feed-001',
    implementationId: 'impl-001',
    title: 'Warehouse Pilot Weekly Report',
    category: 'Progress Report',
    submittedAt: 'Feb 20, 2024',
    summary: 'Test users confirmed stronger replenishment visibility and fewer manual stock count adjustments.',
    status: 'Submitted'
  },
  {
    id: 'feed-002',
    implementationId: 'impl-001',
    title: 'API Sync Issue Log',
    category: 'Issue Log',
    submittedAt: 'Feb 23, 2024',
    summary: 'Two ERP sync fields need mapping review before broader rollout.',
    status: 'Needs Follow-up'
  },
  {
    id: 'feed-003',
    implementationId: 'impl-003',
    title: 'Coastal Monitoring Impact Review',
    category: 'Impact Feedback',
    submittedAt: 'Feb 5, 2024',
    summary: 'Monitoring team reported faster evidence capture and stronger incident documentation coverage.',
    status: 'Resolved'
  }
] as const;

export const PARTNER_NOTIFICATIONS: readonly PartnerNotification[] = [
  {
    id: 'notif-001',
    title: 'MOA Draft Ready for Review',
    message: 'The MOA draft for the AI Inventory Management System is ready for your legal review.',
    timeLabel: '45 minutes ago',
    unread: true,
    tone: 'approved',
    actionLabel: 'Open Request'
  },
  {
    id: 'notif-002',
    title: 'Technical Review Update',
    message: 'The Smart Solar Energy Monitor request is still under evaluation by the deployment panel.',
    timeLabel: '3 hours ago',
    unread: true,
    tone: 'warning',
    actionLabel: 'View Status'
  },
  {
    id: 'notif-003',
    title: 'Implementation Feedback Needed',
    message: 'Please submit the next progress note for the warehouse pilot before Friday.',
    timeLabel: '1 day ago',
    unread: true,
    tone: 'pending',
    actionLabel: 'Open Feedback'
  },
  {
    id: 'notif-004',
    title: 'Marine Drone Pilot Closed',
    message: 'The marine monitoring pilot has been marked operational and archived in your implementation records.',
    timeLabel: '2 days ago',
    unread: false,
    tone: 'completed'
  }
] as const;

export function getPartnerTechnology(technologyId?: string | null) {
  if (!technologyId) {
    return PARTNER_TECHNOLOGIES[0];
  }

  return PARTNER_TECHNOLOGIES.find((item) => item.id === technologyId) ?? PARTNER_TECHNOLOGIES[0];
}

export function getPartnerTechnologyByTitle(title: string) {
  return PARTNER_TECHNOLOGIES.find((item) => item.title === title) ?? PARTNER_TECHNOLOGIES[0];
}

export function getPartnerRequest(requestId?: string | null) {
  if (!requestId) {
    return PARTNER_REQUESTS[0];
  }

  return PARTNER_REQUESTS.find((item) => item.id === requestId) ?? PARTNER_REQUESTS[0];
}

export function getPartnerStatusTone(status: string): PartnerStatusTone {
  switch (status) {
    case 'Approved':
    case 'Submitted':
      return 'approved';
    case 'Pending':
      return 'pending';
    case 'Under Review':
    case 'Negotiation':
    case 'Testing':
      return 'warning';
    case 'Needs Follow-up':
      return 'danger';
    case 'Resolved':
    case 'Completed':
      return 'completed';
    case 'Deployed':
      return 'deployed';
    case 'Planning':
      return 'active';
    default:
      return 'active';
  }
}

export function getImpactStars(value: number) {
  return '★'.repeat(value) + '☆'.repeat(Math.max(0, 5 - value));
}
