export type ProgramHeadDepartment = 'IT' | 'MET' | 'TCM' | 'ESM' | 'NAME';

export type ProgramHeadNavKey =
  | 'dashboard'
  | 'projects'
  | 'progress'
  | 'transfer'
  | 'evidence'
  | 'performance'
  | 'schedule'
  | 'reports'
  | 'notifications'
  | 'profile'
  | 'users';

export type ProgramHeadStatusTone =
  | 'approved'
  | 'pending'
  | 'warning'
  | 'danger'
  | 'completed'
  | 'deployed'
  | 'in-use'
  | 'muted';

export type ProgramHeadProject = {
  code: string;
  title: string;
  department: ProgramHeadDepartment;
  cluster: string;
  typeLabel: string;
  adviser: string;
  students: string[];
  status: 'Active' | 'Pending' | 'Completed' | 'On Hold';
  progress: number;
  currentStage: string;
  startLabel: string;
  lastUpdate: string;
  transferStatus: 'Ready for Transfer' | 'Pending' | 'Proposed' | 'Deployed' | 'In Use';
  partner: string;
  partnerLocation: string;
  beneficiaries: string;
  evidenceCount: number;
  category: 'AI/ML Projects' | 'IoT Systems' | 'Web Applications' | 'Mobile Apps';
  riskLevel: 'On Track' | 'At Risk' | 'Behind Schedule';
};

export type ProgramHeadAdviser = {
  name: string;
  department: ProgramHeadDepartment;
  projectsSupervised: number;
  completionRate: number;
  satisfaction: string;
  techTransferCount: number;
  overallScore: number;
  developmentNote?: string;
};

export type ProgramHeadNotification = {
  id: string;
  category: 'Title Approvals' | 'At-Risk Projects' | 'Faculty Follow-up' | 'Transfer Alerts' | 'General';
  icon: string;
  iconTone: ProgramHeadStatusTone;
  title: string;
  message: string;
  timeLabel: string;
  unread: boolean;
  actionLabel?: string;
};

export const PROGRAM_HEAD_NAV_GROUPS = [
  {
    heading: 'Core Workspace',
    items: [
      { key: 'dashboard', href: '/program-head/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
      { key: 'projects', href: '/program-head/projects', label: 'Project Overview', icon: 'fa-chart-pie' },
      { key: 'progress', href: '/program-head/progress', label: 'Progress Monitoring', icon: 'fa-chart-line' },
    ]
  },
  {
    heading: 'Management & Evaluation',
    items: [
      { key: 'performance', href: '/program-head/performance', label: 'Adviser Performance', icon: 'fa-chalkboard-teacher' },
      { key: 'schedule', href: '/program-head/schedule', label: 'Defense Schedule', icon: 'fa-calendar-days' },
      { key: 'users', href: '/program-head/users', label: 'User Management', icon: 'fa-users-gear' },
    ]
  },
  {
    heading: 'Accreditation & Analytics',
    items: [
      { key: 'transfer', href: '/program-head/transfer', label: 'Technology Transfer', icon: 'fa-exchange-alt' },
      { key: 'evidence', href: '/program-head/evidence', label: 'Evidence / Accreditation', icon: 'fa-award' },
      { key: 'reports', href: '/program-head/reports', label: 'Reports & Analytics', icon: 'fa-chart-bar' },
    ]
  }
] as const satisfies ReadonlyArray<{
  heading: string;
  items: ReadonlyArray<{
    key: ProgramHeadNavKey;
    href: string;
    label: string;
    icon: string;
  }>;
}>;

export const PROGRAM_HEAD_DEPARTMENTS = [
  { code: 'IT', label: 'Information Technology' },
  { code: 'MET', label: 'Manufacturing Engineering Technology' },
  { code: 'TCM', label: 'Technology Communication Management' },
  { code: 'ESM', label: 'Energy Systems and Management' },
  { code: 'NAME', label: 'Naval Architecture and Marine Engineering' }
] as const;

export const PROGRAM_HEAD_PROJECTS: readonly ProgramHeadProject[] = [
  {
    code: 'CAP-IT-001',
    title: 'AI-Powered Learning Management System',
    department: 'IT',
    cluster: 'Digital Innovation',
    typeLabel: 'Web-Based System',
    adviser: 'Dr. Ricardo Cruz',
    students: [],
    status: 'Active',
    progress: 75,
    currentStage: 'Chapter 3',
    startLabel: 'Aug 2023',
    lastUpdate: 'Feb 10, 2024',
    transferStatus: 'Ready for Transfer',
    partner: 'CDO Learning Resource Center',
    partnerLocation: 'College of Computing Laboratory',
    beneficiaries: 'Students, faculty, and advising coordinators',
    evidenceCount: 6,
    category: 'AI/ML Projects',
    riskLevel: 'On Track'
  },
  {
    code: 'CAP-IT-002',
    title: 'Blockchain-Based Grade Management',
    department: 'IT',
    cluster: 'Digital Innovation',
    typeLabel: 'Web-Based System',
    adviser: 'Dr. Ricardo Cruz',
    students: [],
    status: 'Active',
    progress: 60,
    currentStage: 'Chapter 2',
    startLabel: 'Sep 2023',
    lastUpdate: 'Feb 8, 2024',
    transferStatus: 'Pending',
    partner: 'University Registrar',
    partnerLocation: 'Main Administration Building',
    beneficiaries: 'Registrar personnel and student services teams',
    evidenceCount: 4,
    category: 'Web Applications',
    riskLevel: 'On Track'
  },
  {
    code: 'CAP-IT-003',
    title: 'IoT Campus Monitoring System',
    department: 'IT',
    cluster: 'Smart Campus Systems',
    typeLabel: 'IoT System',
    adviser: 'Dr. Anna Reyes',
    students: [],
    status: 'Pending',
    progress: 30,
    currentStage: 'Chapter 1',
    startLabel: 'Oct 2023',
    lastUpdate: 'Feb 1, 2024',
    transferStatus: 'Pending',
    partner: 'Campus Facilities Office',
    partnerLocation: 'Administration Annex',
    beneficiaries: 'Security and facilities monitoring teams',
    evidenceCount: 3,
    category: 'IoT Systems',
    riskLevel: 'Behind Schedule'
  },
  {
    code: 'CAP-IT-004',
    title: 'Student Analytics Dashboard',
    department: 'IT',
    cluster: 'Learning Analytics',
    typeLabel: 'Web-Based System',
    adviser: 'Dr. Elena Santos',
    students: [],
    status: 'Completed',
    progress: 100,
    currentStage: 'Final Defense',
    startLabel: 'Jan 2023',
    lastUpdate: 'Jan 25, 2024',
    transferStatus: 'Deployed',
    partner: 'Guidance and Testing Office',
    partnerLocation: 'Student Services Center',
    beneficiaries: 'Guidance counselors and student retention coordinators',
    evidenceCount: 5,
    category: 'Web Applications',
    riskLevel: 'On Track'
  },
  {
    code: 'CAP-IT-005',
    title: 'Cybersecurity Threat Detection Tool',
    department: 'IT',
    cluster: 'Digital Innovation',
    typeLabel: 'AI Security Platform',
    adviser: 'Prof. Jose Lopez',
    students: [],
    status: 'Active',
    progress: 50,
    currentStage: 'Data Analysis',
    startLabel: 'Nov 2023',
    lastUpdate: 'Feb 6, 2024',
    transferStatus: 'Pending',
    partner: 'Campus ICT Office',
    partnerLocation: 'Network Operations Room',
    beneficiaries: 'ICT administrators and laboratory technicians',
    evidenceCount: 3,
    category: 'AI/ML Projects',
    riskLevel: 'At Risk'
  },
  {
    code: 'CAP-MET-021',
    title: 'Smart Solar Energy Monitoring System',
    department: 'MET',
    cluster: 'Energy Systems',
    typeLabel: 'IoT System',
    adviser: 'Prof. Maria Ramos',
    students: [],
    status: 'Active',
    progress: 45,
    currentStage: 'Chapter 2',
    startLabel: 'Sep 2023',
    lastUpdate: 'Feb 5, 2024',
    transferStatus: 'Proposed',
    partner: 'GreenEnergy PH',
    partnerLocation: 'MET Demo Roof Deck',
    beneficiaries: 'Campus facilities office and SME maintenance team',
    evidenceCount: 4,
    category: 'IoT Systems',
    riskLevel: 'At Risk'
  },
  {
    code: 'CAP-TCM-008',
    title: 'Herbal Medicine Database System',
    department: 'TCM',
    cluster: 'Knowledge Management',
    typeLabel: 'Web-Based Repository',
    adviser: 'Dr. Anna Reyes',
    students: [],
    status: 'Pending',
    progress: 30,
    currentStage: 'Chapter 1',
    startLabel: 'Oct 2023',
    lastUpdate: 'Feb 1, 2024',
    transferStatus: 'Pending',
    partner: 'Department Research Center',
    partnerLocation: 'TCM Laboratory',
    beneficiaries: 'Faculty researchers and community extension teams',
    evidenceCount: 3,
    category: 'Web Applications',
    riskLevel: 'Behind Schedule'
  },
  {
    code: 'CAP-ESM-017',
    title: 'Sustainable Agriculture IoT System',
    department: 'ESM',
    cluster: 'Sustainable Communities',
    typeLabel: 'IoT System',
    adviser: 'Prof. Jose Lopez',
    students: [],
    status: 'Completed',
    progress: 90,
    currentStage: 'Final Defense',
    startLabel: 'Aug 2023',
    lastUpdate: 'Feb 12, 2024',
    transferStatus: 'Deployed',
    partner: 'Lumbia Farmers Cooperative',
    partnerLocation: 'Lumbia Community Farm',
    beneficiaries: 'Farmer cooperative members',
    evidenceCount: 7,
    category: 'IoT Systems',
    riskLevel: 'On Track'
  },
  {
    code: 'CAP-NAME-011',
    title: 'Marine Pollution Detection Drone',
    department: 'NAME',
    cluster: 'Maritime Innovation',
    typeLabel: 'AI-Assisted Drone',
    adviser: 'Dr. Elena Aquino',
    students: [],
    status: 'Completed',
    progress: 100,
    currentStage: 'Deployment Review',
    startLabel: 'Jan 2023',
    lastUpdate: 'Jan 18, 2024',
    transferStatus: 'In Use',
    partner: 'OceanTech Inc.',
    partnerLocation: 'Macajalar Bay Monitoring Zone',
    beneficiaries: 'Coastal monitoring office and fisherfolk communities',
    evidenceCount: 9,
    category: 'AI/ML Projects',
    riskLevel: 'On Track'
  }
] as const;

export const PROGRAM_HEAD_ADVISERS: readonly ProgramHeadAdviser[] = [
  {
    name: 'Dr. Ricardo Cruz',
    department: 'IT',
    projectsSupervised: 12,
    completionRate: 92,
    satisfaction: '4.8/5',
    techTransferCount: 5,
    overallScore: 92
  },
  // More IT advisers with deliberately varied profiles, so the performance page has
  // real contrasts: top scorer, overloaded, balanced, transfer-heavy, struggling, new.
  {
    name: 'Dr. Elena Santos',
    department: 'IT',
    projectsSupervised: 7,
    completionRate: 96,
    satisfaction: '4.9/5',
    techTransferCount: 4,
    overallScore: 95
  },
  {
    name: 'Dr. Paolo Navarro',
    department: 'IT',
    projectsSupervised: 11,
    completionRate: 90,
    satisfaction: '4.7/5',
    techTransferCount: 3,
    overallScore: 89,
    developmentNote: 'Carrying more groups than recommended; consider reassigning one incoming group.'
  },
  {
    name: 'Prof. Liza Mendoza',
    department: 'IT',
    projectsSupervised: 9,
    completionRate: 88,
    satisfaction: '4.6/5',
    techTransferCount: 3,
    overallScore: 87
  },
  {
    name: 'Prof. Grace Dela Cruz',
    department: 'IT',
    projectsSupervised: 8,
    completionRate: 83,
    satisfaction: '4.2/5',
    techTransferCount: 7,
    overallScore: 84
  },
  {
    name: 'Engr. Mark Villanueva',
    department: 'IT',
    projectsSupervised: 14,
    completionRate: 74,
    satisfaction: '3.9/5',
    techTransferCount: 2,
    overallScore: 77,
    developmentNote: 'Advisee load is well above the cap and completion is slipping; rebalance groups.'
  },
  {
    name: 'Dr. Carlo Bautista',
    department: 'IT',
    projectsSupervised: 4,
    completionRate: 72,
    satisfaction: '4.4/5',
    techTransferCount: 1,
    overallScore: 75,
    developmentNote: 'Newly assigned; pair with a senior adviser for defense preparation.'
  },
  {
    name: 'Prof. Maria Ramos',
    department: 'MET',
    projectsSupervised: 8,
    completionRate: 85,
    satisfaction: '4.5/5',
    techTransferCount: 3,
    overallScore: 86
  },
  {
    name: 'Dr. Anna Reyes',
    department: 'TCM',
    projectsSupervised: 6,
    completionRate: 88,
    satisfaction: '4.6/5',
    techTransferCount: 2,
    overallScore: 87
  },
  {
    name: 'Prof. Jose Lopez',
    department: 'ESM',
    projectsSupervised: 9,
    completionRate: 82,
    satisfaction: '4.3/5',
    techTransferCount: 4,
    overallScore: 81,
    developmentNote: 'Improve student feedback response time and project stage follow-through.'
  },
  {
    name: 'Dr. Elena Aquino',
    department: 'NAME',
    projectsSupervised: 7,
    completionRate: 86,
    satisfaction: '4.4/5',
    techTransferCount: 3,
    overallScore: 85
  }
] as const;

export const PROGRAM_HEAD_NOTIFICATIONS: readonly ProgramHeadNotification[] = [
  {
    id: 'notif-1',
    category: 'Title Approvals',
    icon: 'fa-file-signature',
    iconTone: 'danger',
    title: 'Title Approval Waiting: IT-2026-04',
    message: 'A new capstone title is waiting for your decision before April 1, 2026.',
    timeLabel: '45 minutes ago',
    unread: true,
    actionLabel: 'Review'
  },
  {
    id: 'notif-2',
    category: 'At-Risk Projects',
    icon: 'fa-chart-line',
    iconTone: 'warning',
    title: 'Adviser Follow-up Needed for 2 At-Risk Groups',
    message: 'Two IT groups fell behind their current project stage and need adviser intervention this week.',
    timeLabel: '3 hours ago',
    unread: true,
    actionLabel: 'Open Progress'
  },
  {
    id: 'notif-3',
    category: 'Transfer Alerts',
    icon: 'fa-handshake',
    iconTone: 'approved',
    title: 'Transfer Endorsement Requested by TTO',
    message: 'TTO needs the department endorsement packet for the AI Inventory System pilot rollout.',
    timeLabel: '1 day ago',
    unread: true,
    actionLabel: 'Endorse'
  },
  {
    id: 'notif-4',
    category: 'General',
    icon: 'fa-calendar',
    iconTone: 'muted',
    title: 'Faculty Meeting Reminder',
    message: 'Department consultation review is scheduled for April 4, 2026 at 2:00 PM.',
    timeLabel: '2 days ago',
    unread: false
  }
] as const;

export const PROGRAM_HEAD_PROFILE = {
  displayName: 'Dr. Anna Dimagiba',
  fullName: 'Dr. Anna Marie Dimagiba',
  employeeId: 'FAC-PH-001',
  email: 'anna.dimagiba@university.edu.ph',
  contact: '+63 917 888 1234',
  office: 'IT Building, Room 301',
  consultationHours: 'Mon-Thu 9-11 AM, 2-4 PM',
  role: 'Department Chair, IT Department',
  rank: 'Professor VI | Research Coordinator',
  degree: 'PhD in Computer Science, University of the Philippines',
  masters: 'Master of Information Technology, UP Diliman',
  specialization: 'Data Science, AI in Education',
  yearsInService: '15 years',
  chairSince: '2020'
} as const;

export function getDepartmentLabel(department: ProgramHeadDepartment) {
  return PROGRAM_HEAD_DEPARTMENTS.find((item) => item.code === department)?.label ?? department;
}

export function getStatusTone(status: string): ProgramHeadStatusTone {
  switch (status) {
    case 'Active':
    case 'On Track':
    case 'Approved':
    case 'Verified':
      return 'approved';
    case 'Pending':
      return 'pending';
    case 'At Risk':
    case 'In Progress':
    case 'Proposed':
      return 'warning';
    case 'Behind Schedule':
    case 'Rejected':
      return 'danger';
    case 'Completed':
      return 'completed';
    case 'Deployed':
      return 'deployed';
    case 'In Use':
      return 'in-use';
    default:
      return 'muted';
  }
}

export const PROGRAM_HEAD_STATUS_COLORS: Record<ProgramHeadProject['status'], string> = {
  Active: '#003a8f',
  Pending: '#f59e0b',
  Completed: '#16a34a',
  'On Hold': '#ef4444'
};

export const PROGRAM_HEAD_RISK_COLORS: Record<ProgramHeadProject['riskLevel'], string> = {
  'On Track': '#16a34a',
  'At Risk': '#f59e0b',
  'Behind Schedule': '#ef4444'
};

const STATUS_ORDER: ProgramHeadProject['status'][] = ['Active', 'Pending', 'Completed', 'On Hold'];
const RISK_ORDER: ProgramHeadProject['riskLevel'][] = ['On Track', 'At Risk', 'Behind Schedule'];

const STAGE_TRACKING_DEFINITIONS = [
  { name: 'Proposal', threshold: 20, color: '#16a34a', description: 'Topic and scope cleared' },
  { name: 'Ch 1-2', threshold: 40, color: '#003a8f', description: 'Context and literature baseline' },
  { name: 'Chapter 3', threshold: 60, color: '#2563eb', description: 'Methodology and build plan' },
  { name: 'Analysis', threshold: 75, color: '#f59e0b', description: 'Testing, results, and validation' },
  { name: 'Defense', threshold: 90, color: '#7c3aed', description: 'Final defense and transfer packaging' }
] as const;

const MILESTONE_TRACKING_DEFINITIONS = [
  { label: 'Proposals Approved', threshold: 20 },
  { label: 'Chapter 1 Completed', threshold: 35 },
  { label: 'Chapter 2 Completed', threshold: 50 },
  { label: 'Chapter 3 Completed', threshold: 65 },
  { label: 'Defenses Completed', threshold: 90 }
] as const;

function getPercent(done: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((done / total) * 100);
}

function getRiskWeight(riskLevel: ProgramHeadProject['riskLevel']) {
  if (riskLevel === 'Behind Schedule') {
    return 3;
  }

  if (riskLevel === 'At Risk') {
    return 2;
  }

  return 1;
}

export function getProgramHeadRecommendedAction(project: ProgramHeadProject) {
  if (project.riskLevel === 'Behind Schedule') {
    return 'Escalate adviser review and reset project stage plan';
  }

  if (project.riskLevel === 'At Risk') {
    return 'Schedule adviser checkpoint and validate blockers';
  }

  if (project.transferStatus === 'Ready for Transfer') {
    return 'Prepare endorsement packet for technology transfer';
  }

  if (project.progress >= 75) {
    return 'Confirm defense readiness and evidence completeness';
  }

  return 'Monitor weekly progress and evidence uploads';
}

export function getProgramHeadDueLabel(project: ProgramHeadProject) {
  if (project.riskLevel === 'Behind Schedule') {
    return 'Within 48 hours';
  }

  if (project.riskLevel === 'At Risk') {
    return 'This week';
  }

  if (project.transferStatus === 'Ready for Transfer') {
    return 'Before endorsement';
  }

  return 'Next checkpoint';
}

export function getProgramHeadPriority(project: ProgramHeadProject) {
  if (project.riskLevel === 'Behind Schedule') {
    return 'Critical';
  }

  if (project.riskLevel === 'At Risk') {
    return 'High';
  }

  if (project.transferStatus === 'Ready for Transfer' || project.progress >= 75) {
    return 'Ready';
  }

  return 'Monitor';
}

export function getProgramHeadAnalytics(projects: readonly ProgramHeadProject[] = PROGRAM_HEAD_PROJECTS) {
  const totalProjects = projects.length;
  const activeProjects = projects.filter((project) => project.status === 'Active').length;
  const completedProjects = projects.filter((project) => project.status === 'Completed').length;
  const pendingProjects = projects.filter((project) => project.status === 'Pending').length;
  const onHoldProjects = projects.filter((project) => project.status === 'On Hold').length;
  const onTrackProjects = projects.filter((project) => project.riskLevel === 'On Track').length;
  const atRiskProjects = projects.filter((project) => project.riskLevel === 'At Risk').length;
  const behindScheduleProjects = projects.filter((project) => project.riskLevel === 'Behind Schedule').length;
  const riskExposureCount = atRiskProjects + behindScheduleProjects;
  const progressTotal = projects.reduce((sum, project) => sum + project.progress, 0);
  const evidenceTotal = projects.reduce((sum, project) => sum + project.evidenceCount, 0);
  const evidenceTarget = totalProjects * 6;
  const uniqueStudents = new Set<string>();

  projects.forEach((project) => {
    project.students.forEach((student) => uniqueStudents.add(student));
  });

  const averageProgress = getPercent(progressTotal, totalProjects * 100);
  const completionRate = getPercent(completedProjects, totalProjects);
  const riskExposureRate = getPercent(riskExposureCount, totalProjects);
  const evidenceReadiness = getPercent(Math.min(evidenceTotal, evidenceTarget), evidenceTarget);
  const transferReadyCount = projects.filter((project) => project.transferStatus === 'Ready for Transfer').length;
  const transferImplementedCount = projects.filter((project) => (
    project.transferStatus === 'Deployed' || project.transferStatus === 'In Use'
  )).length;
  const transferPipelineCount = projects.filter((project) => (
    project.transferStatus === 'Ready for Transfer' ||
    project.transferStatus === 'Proposed' ||
    project.transferStatus === 'Deployed' ||
    project.transferStatus === 'In Use'
  )).length;
  const transferMaturityRate = getPercent(transferReadyCount + transferImplementedCount, totalProjects);
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round((averageProgress * 0.55) + (completionRate * 0.25) + ((100 - riskExposureRate) * 0.2)))
  );

  const statusDistribution = STATUS_ORDER.map((status) => {
    const value = projects.filter((project) => project.status === status).length;
    return {
      name: status,
      value,
      pct: getPercent(value, totalProjects),
      color: PROGRAM_HEAD_STATUS_COLORS[status]
    };
  });

  const riskDistribution = RISK_ORDER.map((riskLevel) => {
    const value = projects.filter((project) => project.riskLevel === riskLevel).length;
    return {
      name: riskLevel,
      value,
      pct: getPercent(value, totalProjects),
      color: PROGRAM_HEAD_RISK_COLORS[riskLevel]
    };
  });

  const stageTracking = STAGE_TRACKING_DEFINITIONS.map((stage) => {
    const done = projects.filter((project) => project.status === 'Completed' || project.progress >= stage.threshold).length;
    return {
      ...stage,
      done,
      total: totalProjects,
      pct: getPercent(done, totalProjects)
    };
  });

  const milestoneTracking = MILESTONE_TRACKING_DEFINITIONS.map((milestone) => {
    const done = projects.filter((project) => project.status === 'Completed' || project.progress >= milestone.threshold).length;
    return {
      ...milestone,
      done,
      total: totalProjects,
      pct: getPercent(done, totalProjects)
    };
  });

  const adviserMap = new Map<string, {
    adviser: string;
    projects: number;
    active: number;
    completed: number;
    atRisk: number;
    behind: number;
    transferReady: number;
    evidenceCount: number;
    progressTotal: number;
  }>();

  projects.forEach((project) => {
    const current = adviserMap.get(project.adviser) ?? {
      adviser: project.adviser,
      projects: 0,
      active: 0,
      completed: 0,
      atRisk: 0,
      behind: 0,
      transferReady: 0,
      evidenceCount: 0,
      progressTotal: 0
    };

    current.projects += 1;
    current.progressTotal += project.progress;
    current.evidenceCount += project.evidenceCount;

    if (project.status === 'Active') {
      current.active += 1;
    }

    if (project.status === 'Completed') {
      current.completed += 1;
    }

    if (project.riskLevel === 'At Risk') {
      current.atRisk += 1;
    }

    if (project.riskLevel === 'Behind Schedule') {
      current.behind += 1;
    }

    if (project.transferStatus === 'Ready for Transfer' || project.transferStatus === 'Deployed' || project.transferStatus === 'In Use') {
      current.transferReady += 1;
    }

    adviserMap.set(project.adviser, current);
  });

  const adviserWorkload = Array.from(adviserMap.values())
    .map((item) => {
      const riskLoad = item.atRisk + item.behind;
      return {
        adviser: item.adviser,
        projects: item.projects,
        active: item.active,
        completed: item.completed,
        riskLoad,
        behind: item.behind,
        transferReady: item.transferReady,
        avgProgress: getPercent(item.progressTotal, item.projects * 100),
        evidenceAverage: item.projects ? Math.round(item.evidenceCount / item.projects) : 0,
        status: riskLoad >= 2 ? 'Needs support' : item.projects >= 3 ? 'High load' : 'Balanced'
      };
    })
    .sort((a, b) => b.riskLoad - a.riskLoad || b.projects - a.projects || a.adviser.localeCompare(b.adviser));

  const interventionQueue = projects
    .filter((project) => project.riskLevel !== 'On Track' || project.progress < 55 || project.transferStatus === 'Ready for Transfer')
    .sort((a, b) => getRiskWeight(b.riskLevel) - getRiskWeight(a.riskLevel) || a.progress - b.progress)
    .map((project) => ({
      project,
      priority: getProgramHeadPriority(project),
      dueLabel: getProgramHeadDueLabel(project),
      action: getProgramHeadRecommendedAction(project)
    }));

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    pendingProjects,
    onHoldProjects,
    onTrackProjects,
    atRiskProjects,
    behindScheduleProjects,
    riskExposureCount,
    averageProgress,
    completionRate,
    riskExposureRate,
    evidenceTotal,
    evidenceReadiness,
    transferReadyCount,
    transferImplementedCount,
    transferPipelineCount,
    transferMaturityRate,
    healthScore,
    studentCount: uniqueStudents.size,
    statusDistribution,
    riskDistribution,
    stageTracking,
    milestoneTracking,
    adviserWorkload,
    interventionQueue
  };
}
