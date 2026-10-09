import { cache } from 'react';
import {
  ensureProjectMilestoneWorkflow,
  getNewTitleRecoveryStage,
  TOTAL_WORKFLOW_CHECKPOINTS,
  TOTAL_WORKFLOW_MILESTONES
} from '@/lib/milestone-checkpoint-tracking';

const now = '2026-04-06T00:00:00.000Z';

// Notification.type on the DB row is a mix of severity flags ('success' | 'warning' | 'info' | 'danger')
// and semantic categories, depending on which API route created it. Only the semantic ones are real
// filterable buckets in the UI — anything else (including plain severity) falls back to 'general' so it
// stays reachable through a filter chip instead of only showing up under "All".
const KNOWN_NOTIFICATION_FILTER_TYPES = new Set(['feedback', 'deadline', 'schedule', 'approval', 'transfer']);

export type StudentTitleReviewSummary = {
  latestAction: string;
  nextStep: string;
  lastReviewedBy: string;
  accessRole: string;
  accessNote: string;
};

export type StudentTitleWorkflowStep = {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'pending' | 'archived' | 'needs_revision' | 'rejected';
  date?: string;
  dateLabel?: string;
  note: string;
};

export type StudentTitleRevisionHistoryEntry = {
  id: string;
  status: string;
  date: string;
  dateLabel: string;
  note: string;
  reviewedBy: string;
};

export type StudentTitleReviewerFeedbackEntry = {
  id: string;
  author: string;
  role: string;
  status: string;
  date: string;
  dateLabel: string;
  note: string;
  route?: string;
  actionLabel?: string;
};

export type StudentTitleValidationMatch = {
  id: string;
  title: string;
  matchLabel: string;
};

export type StudentTitleValidation = {
  status: string;
  checkedAt: string;
  checkedAtLabel: string;
  note: string;
  matchedTitles: StudentTitleValidationMatch[];
};

export type StudentTitleAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  sizeLabel: string;
  uploadedAt: string;
  uploadedAtLabel: string;
  uploadedBy: string;
  status: string;
  downloadUrl?: string;
  previewUrl?: string;
  file?: File;
};

export type StudentTitleSubmissionRecord = {
  id: string;
  proposalNumber: number;
  proposalLabel: string;
  isCurrent?: boolean;
  user_id: string;
  project_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  proposedTitle: string;
  briefDescription: string;
  background: string;
  statementOfProblem: string;
  objectives: string[];
  category: string;
  keywords: string[];
  groupMembers: string[];
  adviser: string;
  registrationStatus: string;
  lastReviewedAt: string;
  statusNote: string;
  reviewSummary?: StudentTitleReviewSummary;
  workflow?: StudentTitleWorkflowStep[];
  revisionHistory: StudentTitleRevisionHistoryEntry[];
  reviewerFeedback?: StudentTitleReviewerFeedbackEntry[];
  validation?: StudentTitleValidation;
  attachments: StudentTitleAttachment[];
};

export type StudentTitleRegistration = {
  id: string;
  user_id: string;
  project_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  proposedTitle: string;
  briefDescription: string;
  background: string;
  statementOfProblem: string;
  objectives: string[];
  category: string;
  keywords: string[];
  groupMembers: string[];
  adviser: string;
  registrationStatus: string;
  lastReviewedAt: string;
  statusNote: string;
  reviewSummary?: StudentTitleReviewSummary;
  workflow?: StudentTitleWorkflowStep[];
  revisionHistory: StudentTitleRevisionHistoryEntry[];
  reviewerFeedback?: StudentTitleReviewerFeedbackEntry[];
  validation?: StudentTitleValidation;
  attachments: StudentTitleAttachment[];
  submissions?: StudentTitleSubmissionRecord[];
};

export type StudentDashboardData = {
  profile: {
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    fullName: string;
    studentId: string;
    groupRole: string;
    email: string;
    contactNumber?: string;
    address?: string;
    program?: string;
    department?: string;
    yearLevel?: string;
    section?: string;
    adviser?: string;
    accountSummary?: string;
    birthDate?: string;
    profileImage?: string;
    pendingGroupInviteId?: string;
    pendingGroupInviteMessage?: string;
  };
  group: {
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    groupName: string;
    groupCode: string;
    leaderName: string;
    memberCount: number;
    allowMemberSubmission?: boolean;
    members: Array<{
      id: string;
      user_id: string;
      project_id: string;
      status: string;
      created_at: string;
      updated_at: string;
      fullName: string;
      studentId: string;
      email: string;
      isLeader: boolean;
      isCurrent: boolean;
      profileImage?: string | null;
    }>;
  };
  project: {
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    title: string;
    description: string;
    projectCode: string;
    groupName: string;
    adviser: string;
    progressPercentage: number;
    currentMilestone: string;
    repositoryStatus: string;
    upcomingDeadline: string;
    program?: string;
    department?: string;
    academicYear?: string;
    technologyTransferStatus?: string;
    keywords?: string[];
    panelMembers?: string[];
    transferabilityNote?: string;
    abstract?: string;
    // Set only when the group's project is in the specific "resubmit a
    // replacement title" recovery state (see resetProjectForNewTitle /
    // title-submissions POST) — lets the Title Submission page explain why
    // the student is being asked to submit a title again.
    newTitleRequired?: { previousTitle: string; reason: string | null; stage: 'concept' | 'proposal' } | null;
  };
  dashboard?: {
    snapshotAt: string;
    workflow: Array<{
      id: string;
      key: string;
      title: string;
      summary: string;
      status: 'completed' | 'current' | 'pending' | 'delayed';
      dateLabel: string;
      route: string;
      actionLabel?: string;
    }>;
    quickLinks: Array<{
      id: string;
      label: string;
      href: string;
      icon: string;
    }>;
  };
  documents: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    category: string;
    fileName: string;
    fileType: string;
    sizeLabel: string;
    uploadDateLabel: string;
    uploadedBy: string;
    reviewStatus: string;
    isSuperseded: boolean;
  }>;
  feedback: Array<{
    id: string;
    user_id: string;
    project_id: string;
    submissionId?: string;
    submissionTitle?: string;
    submissionStatus?: string;
    status: string;
    created_at: string;
    updated_at: string;
    title: string;
    content: string;
    facultyName: string;
    mode: string;
    dateLabel: string;
    unread: boolean;
    isSuperseded: boolean;
  }>;
  milestones: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    title: string;
    dateLabel: string;
    summary: string;
    route: string;
    actionLabel?: string;
    dueDate?: string;
    assignedTo?: string;
    notes?: string;
    relatedPhase?: string;
    consultationDate?: string;
    revisionDate?: string;
    eventDate?: string;
    isCompleted?: boolean;
    priority?: 'high' | 'medium' | 'low';
  }>;
  milestoneCheckpoints: Array<{
    id: string;
    project_id: string;
    milestone_id: string;
    milestoneTitle: string;
    milestoneSequence: number;
    key: string;
    title: string;
    description?: string;
    sequence: number;
    required: boolean;
    status: string;
    adviserReviewStatus: string;
    panelReviewStatus: string;
    submittedAt?: string;
    reviewedAt?: string;
    completedAt?: string;
    studentStartDate?: string;
    studentTargetDate?: string;
    latestFeedback?: string;
    latestFeedbackBy?: string;
    latestFeedbackAt?: string;
    submissions: Array<{
      id: string;
      title: string;
      status: string;
      submittedAt: string;
      reviewedAt?: string;
      files: Array<{
        id: string;
        fileName: string;
        fileType: string;
        sizeLabel: string;
        uploadDateLabel: string;
        reviewStatus: string;
      }>;
      comments: Array<{
        id: string;
        body: string;
        decision: string;
        createdAt: string;
        authorName: string;
      }>;
    }>;
    files: Array<{
      id: string;
      fileName: string;
      fileType: string;
      sizeLabel: string;
      uploadDateLabel: string;
      reviewStatus: string;
    }>;
  }>;
  schedules: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    title: string;
    type: string;
    startDate: string;
    endDate?: string;
    startDateLabel: string;
    time: string;
    location: string;
    description: string;
    mode?: string;
    milestoneId?: string;
    priority?: 'high' | 'medium' | 'low';
    isCompleted?: boolean;
  }>;
  notifications: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    type: string;
    title: string;
    message: string;
    dateLabel: string;
    priority: string;
    read: boolean;
    route?: string;
    actionLabel?: string;
  }>;
  progressReports: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    title: string;
    date: string;
    dateLabel: string;
    progressDescription: string;
    accomplishments: string[];
    problemsEncountered: string;
    nextSteps: string;
    percentageCompleted: number;
    statusDisplay?: string;
    submittedByName: string;
    submissionId?: string | null;
    feedback: Array<{ id: string; body: string; authorName: string; createdAt: string }>;
  }>;
  titleRegistration: StudentTitleRegistration;
  technologyTransfer: {
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    transferabilityStatus: string;
    deploymentStatus: string;
    beneficiary: string;
    location: string;
    dateDeployed: string;
    extensionStatus: string;
    adoptionStatus: string;
    implementationNotes: string;
    impactSummary: string;
  };
  presentations: Array<{
    id: string;
    user_id: string;
    project_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    eventName: string;
    eventType: string;
    date: string;
    dateLabel: string;
    venue: string;
    description: string;
    achievement: string;
    scope: string;
    certificateFile: string;
    photoCount: number;
  }>;
};


function getDefaultWorkspaceData(): StudentDashboardData {
  const now = new Date().toISOString();
  return {
    profile: {
      id: '', user_id: '', project_id: '', status: 'active', created_at: now, updated_at: now,
      fullName: '', studentId: '', groupRole: 'Not assigned', email: '', adviser: 'Not assigned'
    },
    group: {
      id: '', user_id: '', project_id: '', status: 'active', created_at: now, updated_at: now,
      groupName: 'Not assigned', groupCode: 'N/A', leaderName: 'Not assigned', memberCount: 0, members: []
    },
    project: {
      id: '', user_id: '', project_id: '', status: 'DRAFT', created_at: now, updated_at: now,
      title: 'No active project', description: '', projectCode: 'N/A', groupName: 'Not assigned', adviser: 'Not assigned',
      progressPercentage: 0, currentMilestone: 'Not assigned', repositoryStatus: 'N/A', upcomingDeadline: 'N/A'
    },
    titleRegistration: {
      id: '', user_id: '', project_id: '', status: 'active', created_at: now, updated_at: now,
      proposedTitle: '', briefDescription: '', background: '', statementOfProblem: '', objectives: [],
      category: '', keywords: [], groupMembers: [], adviser: '', registrationStatus: 'Pending',
      lastReviewedAt: '', statusNote: '', revisionHistory: [], attachments: [], submissions: []
    },
    dashboard: { snapshotAt: now, workflow: [], quickLinks: [] },
    documents: [],
    feedback: [],
    milestones: [],
    milestoneCheckpoints: [],
    schedules: [],
    notifications: [],
    progressReports: [],
    presentations: [],
    technologyTransfer: {
      id: '', user_id: '', project_id: '', status: '', created_at: now, updated_at: now,
      transferabilityStatus: '', deploymentStatus: '', beneficiary: '', location: '', dateDeployed: '', extensionStatus: '', adoptionStatus: '', implementationNotes: '', impactSummary: ''
    }
  };
}

function isNextDynamicServerUsageError(error: unknown) {
  return Boolean(
    error
      && typeof error === 'object'
      && 'digest' in error
      && (error as { digest?: unknown }).digest === 'DYNAMIC_SERVER_USAGE'
  );
}

export const getStudentDashboardData = cache(async function getStudentDashboardData() {
  const data = getDefaultWorkspaceData();

  try {
    const { getServerAuthenticatedUser } = await import('@/lib/auth');
    const dbUser = await getServerAuthenticatedUser();

    if (dbUser) {
      const userName = dbUser.name || data.profile.fullName;

      data.profile = {
        ...data.profile,
        user_id: dbUser.id,
        fullName: userName,
        email: dbUser.email || data.profile.email,
        studentId: dbUser.studentId || data.profile.studentId,
        department: dbUser.department || data.profile.department,
        yearLevel: dbUser.yearLevel || data.profile.yearLevel,
        contactNumber: dbUser.contactNumber || data.profile.contactNumber,
        address: dbUser.address || data.profile.address,
        birthDate: dbUser.birthDate || data.profile.birthDate,
        profileImage: dbUser.profileImage || data.profile.profileImage,
        section: dbUser.section || data.profile.section,
        accountSummary: dbUser.accountSummary || data.profile.accountSummary,
      };

      try {
        const { prisma } = await import('@/lib/prisma');
        const { AdviserScheduleItemStatus, SubmissionStatus } = await import('@/generated/prisma/client');
        const notificationRowsPromise = prisma.notification.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            userId: true,
            title: true,
            message: true,
            type: true,
            status: true,
            readAt: true,
            createdAt: true
          }
        }).catch((error) => {
          console.error('Failed to fetch student notifications:', error);
          return [];
        });
        const studentGroupSelect = {
          id: true,
          userId: true,
          projectId: true,
          createdAt: true,
          updatedAt: true,
          code: true,
          title: true,
          projectTitle: true,
          dept: true,
          department: true,
          students: true,
          leader: true,
          allowMemberSubmission: true
        } as const;
        const groupByMembership = await prisma.group.findFirst({
          where: {
            groupMembers: {
              some: {
                userId: dbUser.id,
                isActive: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          select: studentGroupSelect
        });
        const groups = groupByMembership
          ? [groupByMembership]
          : await prisma.group.findMany({
              where: { students: { has: userName } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: studentGroupSelect
            });

        const notificationRows = await notificationRowsPromise;
        data.notifications = notificationRows.map((notification) => ({
          id: notification.id,
          user_id: notification.userId,
          project_id: data.profile.project_id,
          status: String(notification.status),
          created_at: notification.createdAt.toISOString(),
          updated_at: (notification.readAt || notification.createdAt).toISOString(),
          type: KNOWN_NOTIFICATION_FILTER_TYPES.has(notification.type) ? notification.type : 'general',
          title: notification.title,
          message: notification.message,
          dateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(notification.createdAt),
          priority: notification.type === 'warning' || notification.type === 'danger' ? 'high' : 'normal',
          read: notification.status === 'READ',
          route: '/students/notifications',
          actionLabel: 'Open center'
        }));

        const pendingInvite = data.notifications.find(n => 
          (n.title === 'Group Assignment Updated' || n.title === 'New Group Assignment') && !n.read
        );

        if (pendingInvite) {
          data.profile.pendingGroupInviteId = pendingInvite.id;
          data.profile.pendingGroupInviteMessage = pendingInvite.message;
        }

        if (groups.length > 0) {
          const group = groups[0];
          
          const normalize = (s: string | null | undefined) => (s || '').replace(/\s+/g, '').toLowerCase();
          const isActuallyLeader = normalize(group.leader) === normalize(userName);
          
          data.profile.groupRole = isActuallyLeader ? 'Group Leader' : 'Member';
          
          if (data.group) {
            data.group.id = group.id;
            data.group.allowMemberSubmission = group.allowMemberSubmission ?? false;
            data.group.groupName = group.title || data.group.groupName;
            data.group.groupCode = group.code || data.group.groupCode;
            data.group.leaderName = group.leader || data.group.leaderName;
          }

          const projectSummarySelect = {
            id: true,
            title: true,
            abstract: true,
            status: true,
            updatedAt: true,
            repositoryPublishedAt: true,
            academicYear: { select: { label: true } }
          } as const;

          const { DefenseChairDecision } = await import('@/generated/prisma/client');

          const [
            groupMembers,
            approvedTitleProject,
            adviserUser,
            activeProjectResult,
            latestNewTitleSchedule
          ] = await Promise.all([
            // 1. Group Members
            prisma.groupMember.findMany({
              where: { groupId: group.id, isActive: true },
              select: {
                id: true, userId: true, role: true, createdAt: true, updatedAt: true,
                user: { select: { id: true, name: true, displayName: true, studentId: true, email: true, profileImage: true } }
              },
              take: 50
            }).catch(err => {
              console.error('Failed to fetch group members:', err);
              return [];
            }),
            // 2. Approved Title Project
            prisma.project.findFirst({
              where: { groupId: group.id, status: 'APPROVED', submissions: { some: {} } },
              orderBy: { updatedAt: 'desc' },
              select: projectSummarySelect
            }),
            // 3. Adviser User
            group.userId
              ? prisma.user.findUnique({
                  where: { id: group.userId },
                  select: { id: true, name: true }
                }).catch((error) => {
                  console.error('Failed to fetch adviser name:', error);
                  return null;
                })
              : Promise.resolve(null),
            // 4. Fallback Active Project
            prisma.project.findFirst({
              where: { groupId: group.id },
              orderBy: { updatedAt: 'desc' },
              select: projectSummarySelect
            }),
            // 5. Most recent "New Title Required" chair decision, if this group
            // is currently in that specific resubmit-a-title recovery state
            // (see resetProjectForNewTitle / title-submissions POST).
            group.projectId
              ? prisma.defenseSchedule.findFirst({
                  where: { projectId: group.projectId, chairDecision: DefenseChairDecision.NEW_TITLE },
                  orderBy: { chairDecisionAt: 'desc' },
                  select: { previousProjectTitle: true, chairDecisionRemarks: true, title: true }
                }).catch(() => null)
              : Promise.resolve(null)
          ]);

          try {
            if (groupMembers.length > 0 && data.group) {
              data.group.members = groupMembers.map(gm => ({
                id: gm.id,
                user_id: gm.userId,
                project_id: group.projectId || '',
                status: 'active',
                created_at: gm.createdAt.toISOString(),
                updated_at: gm.updatedAt.toISOString(),
                fullName: gm.user.displayName || gm.user.name || '',
                studentId: gm.user.studentId || '',
                email: gm.user.email || '',
                isLeader: gm.role === 'LEADER',
                isCurrent: gm.user.name === userName,
                profileImage: gm.user.profileImage || null,
              }));
              data.group.memberCount = groupMembers.length;
            } else if (group.students && group.students.length > 0 && data.group) {
              const studentUsers = await prisma.user.findMany({
                where: { name: { in: group.students } },
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  studentId: true,
                  email: true,
                  profileImage: true
                }
              });

              const studentMap = new Map(studentUsers.map(u => [u.name, u]));

              data.group.members = group.students.map((studentName: string, index: number) => {
                const user = studentMap.get(studentName);
                return {
                  id: user?.id || `fallback-${index}`,
                  user_id: user?.id || `fallback-${index}`,
                  project_id: group.projectId || '',
                  status: 'active',
                  created_at: group.createdAt.toISOString(),
                  updated_at: group.updatedAt.toISOString(),
                  fullName: user?.displayName || user?.name || studentName,
                  studentId: user?.studentId || '',
                  email: user?.email || '',
                  isLeader: studentName === group.leader,
                  isCurrent: studentName === userName || (user?.name === userName),
                  profileImage: user?.profileImage || null,
                };
              });
              data.group.memberCount = group.students.length;
            }
          } catch (memberErr) {
            console.error('Failed to fetch fallback group members:', memberErr);
          }

          const adviserName = adviserUser?.name || 'Not assigned';
          const activeProject = approvedTitleProject || activeProjectResult;

          data.project = {
            ...data.project,
            // Was never set here, so it stayed stuck on the 'DRAFT' placeholder
            // from the default state forever — the dashboard's hero card (which
            // reads this field, not titleRegistration.registrationStatus below)
            // kept showing "pending approval" even once the title, and every
            // Concept checkpoint, had long since been approved.
            status: activeProject?.status || data.project.status,
            projectCode: group.code || data.project.projectCode,
            title: approvedTitleProject?.title || group.projectTitle || data.project.title,
            description: approvedTitleProject?.abstract || data.project.description,
            groupName: group.title || data.project.groupName,
            adviser: adviserName !== 'Not assigned' ? adviserName : (data.profile.adviser || data.project.adviser),
            program: group.dept || data.project.program,
            department: group.department || data.project.department,
            academicYear: approvedTitleProject?.academicYear?.label || activeProjectResult?.academicYear?.label || data.project.academicYear,
            repositoryStatus: approvedTitleProject?.repositoryPublishedAt || activeProjectResult?.repositoryPublishedAt
              ? 'Published'
              : (approvedTitleProject || activeProjectResult) ? 'Not yet published' : data.project.repositoryStatus,
            newTitleRequired: activeProject?.status === 'NEEDS_REVISION' && latestNewTitleSchedule?.previousProjectTitle
              ? {
                  previousTitle: latestNewTitleSchedule.previousProjectTitle,
                  reason: latestNewTitleSchedule.chairDecisionRemarks,
                  stage: getNewTitleRecoveryStage(latestNewTitleSchedule.title) ?? 'proposal'
                }
              : null,
          };

          data.titleRegistration.proposedTitle = activeProject?.title || approvedTitleProject?.title || data.titleRegistration.proposedTitle;

          if (!activeProject) {
            data.titleRegistration.registrationStatus = 'Draft';
          } else if (activeProject.status === 'APPROVED' || activeProject.status === 'DEFENSE_SCHEDULED') {
            data.titleRegistration.registrationStatus = 'Approved';
          } else if (activeProject.status === 'NEEDS_REVISION') {
            data.titleRegistration.registrationStatus = 'Needs Revision';
          } else if (activeProject.status === 'ARCHIVED') {
            data.titleRegistration.registrationStatus = 'Rejected';
          } else if (activeProject.status === 'UNDER_REVIEW') {
            data.titleRegistration.registrationStatus = 'Under Review';
          } else if (activeProject.status === 'SUBMITTED') {
            data.titleRegistration.registrationStatus = 'Submitted';
          } else {
            data.titleRegistration.registrationStatus = 'Draft';
          }
          
          data.titleRegistration.adviser = data.project.adviser;

          if (activeProject) {
            // 1. Start fetching independent data immediately (does not depend on workflow repair)
            const adviserScheduleDelegate = 'adviserScheduleItem' in prisma ? prisma.adviserScheduleItem : null;
            
            const filesPromise = prisma.uploadedFile.findMany({
              where: { projectId: activeProject.id },
              select: {
                id: true, userId: true, visibility: true, createdAt: true, updatedAt: true,
                documentCategory: true, category: true, fileName: true, fileType: true, size: true,
                user: { select: { name: true } }, submission: { select: { status: true, reviewedAt: true } }
              },
              orderBy: { createdAt: 'desc' },
              take: 50
            });

            const schedulesPromise = prisma.defenseSchedule.findMany({
              where: { projectId: activeProject.id },
              orderBy: { scheduledAt: 'asc' },
              take: 20,
              select: {
                id: true, status: true, createdAt: true, updatedAt: true,
                title: true, scheduledAt: true, location: true, notes: true
              }
            });

            const adviserSchedulePromise = adviserScheduleDelegate
              ? adviserScheduleDelegate.findMany({
                  where: { projectId: activeProject.id, status: { not: AdviserScheduleItemStatus.CANCELLED } },
                  orderBy: { scheduledAt: 'asc' },
                  take: 20,
                  select: {
                    id: true, status: true, createdAt: true, updatedAt: true, title: true,
                    type: true, scheduledAt: true, endsAt: true, location: true, notes: true
                  }
                })
              : Promise.resolve([]);

            const submissionsPromise = prisma.submission.findMany({
              where: {
                projectId: activeProject.id,
                status: { in: [SubmissionStatus.NEEDS_REVISION, SubmissionStatus.APPROVED] }
              },
              orderBy: { reviewedAt: 'desc' },
              take: 20,
              select: {
                id: true, title: true, status: true, checkpointId: true, submittedAt: true, reviewedAt: true,
                comments: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                  select: { id: true, body: true, createdAt: true, updatedAt: true, author: { select: { name: true, role: true } } }
                }
              }
            });

            // Lightweight, any-status probe used only to detect whether a checkpoint
            // already has a newer submission than one we're about to show feedback
            // for — a rejected round's own feedback thread otherwise keeps reading
            // as "Needs Action"/"Unread" forever, even after the student resubmitted
            // and that later round has already been decided (or is simply pending).
            const checkpointSubmissionTimesPromise = prisma.submission.findMany({
              where: { projectId: activeProject.id, checkpointId: { not: null } },
              select: { checkpointId: true, submittedAt: true }
            });

            const titleSubmissionEventsPromise = prisma.submission.findMany({
              where: {
                title: 'Title Proposal Submission',
                project: { groupId: group.id }
              },
              orderBy: { submittedAt: 'desc' },
              take: 20,
              select: {
                id: true, submittedAt: true, status: true,
                submittedBy: { select: { name: true } },
                project: { select: { title: true } }
              }
            });

            // 2. Fetch milestones & checkpoints, only running ensureProjectMilestoneWorkflow if data is missing
            const fetchMilestonesAndCheckpoints = () => Promise.all([
              prisma.milestone.findMany({
                where: { projectId: activeProject.id },
                orderBy: { sequence: 'asc' },
                take: 20,
                select: {
                  id: true, status: true, createdAt: true, updatedAt: true,
                  title: true, dueAt: true, description: true
                }
              }),
              prisma.milestoneCheckpoint.findMany({
                where: { projectId: activeProject.id },
                include: {
                  milestone: { select: { id: true, title: true, sequence: true } },
                  submissions: {
                    orderBy: { submittedAt: 'desc' },
                    take: 5,
                    include: {
                      files: { take: 3, include: { submission: { select: { status: true } } }, orderBy: { createdAt: 'desc' } },
                      comments: { orderBy: { createdAt: 'desc' }, take: 3, include: { author: { select: { name: true, role: true } } } }
                    }
                  },
                  files: {
                    take: 5,
                    include: { submission: { select: { status: true } } },
                    orderBy: { createdAt: 'desc' }
                  }
                },
                take: 50
              })
            ]);

            const milestoneWorkflowPromise = fetchMilestonesAndCheckpoints().then(async ([milestones, checkpointRows]) => {
              // Compared against the live workflow definition (not a hardcoded count), and
              // as an exact mismatch rather than "fewer than", so that both adding a
              // checkpoint (e.g. the concept-stage compliance evidence checkpoint) and
              // removing one (e.g. folding 'concept-paper' into 'concept-title') are picked
              // up for existing projects on their next dashboard load, instead of silently
              // staying stuck at whatever count existed when they were seeded.
              if (milestones.length !== TOTAL_WORKFLOW_MILESTONES || checkpointRows.length !== TOTAL_WORKFLOW_CHECKPOINTS) {
                await ensureProjectMilestoneWorkflow(prisma, activeProject.id);
                const nextData = await fetchMilestonesAndCheckpoints();
                return [nextData[0], nextData[1]] as const;
              }
              return [milestones, checkpointRows] as const;
            });

            const formatDate = (date: Date) =>
              new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
            const getReviewStatusLabel = (status?: string | null) => {
              if (status === SubmissionStatus.APPROVED) return 'Approved';
              if (status === SubmissionStatus.NEEDS_REVISION) return 'Needs Revision';
              if (status === SubmissionStatus.UNDER_REVIEW) return 'In Review';
              return 'Pending Review';
            };
            const toFileSummary = (file: {
              id: string;
              fileName: string;
              fileType: string;
              size: number | null;
              createdAt: Date;
              submission?: { status?: string | null } | null;
            }) => ({
              id: file.id,
              fileName: file.fileName,
              fileType: file.fileType,
              sizeLabel: file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown',
              uploadDateLabel: formatDate(file.createdAt),
              reviewStatus: getReviewStatusLabel(file.submission?.status)
            });

            // 3. Await all streams
            const [
              files,
              schedules,
              adviserScheduleItems,
              submissions,
              checkpointSubmissionTimes,
              titleSubmissionEvents,
              [milestones, checkpointRows]
            ] = await Promise.all([
              filesPromise,
              schedulesPromise,
              adviserSchedulePromise,
              submissionsPromise,
              checkpointSubmissionTimesPromise,
              titleSubmissionEventsPromise,
              milestoneWorkflowPromise
            ]);

            data.titleRegistration.revisionHistory = titleSubmissionEvents.map((event) => ({
              id: event.id,
              status: 'Submitted',
              date: event.submittedAt.toISOString(),
              dateLabel: formatDate(event.submittedAt),
              note: `"${event.project.title}" was submitted for adviser title review.`,
              reviewedBy: event.submittedBy?.name || data.profile.fullName
            }));

            // A rejected/needs-revision file whose category already has a newer
            // upload isn't a live ask anymore — the student already resubmitted
            // and that later round has its own (possibly since-approved) verdict.
            // Without this, "Priority Actions" and the revision counter keep
            // flagging an already-resolved round forever.
            const isSupersededFile = (file: (typeof files)[number]) => {
              if (file.submission?.status !== SubmissionStatus.NEEDS_REVISION || !file.submission.reviewedAt) {
                return false;
              }

              const category = file.documentCategory || file.category;
              const decisionTime = file.submission.reviewedAt.getTime();

              return files.some(
                (other) =>
                  other.id !== file.id &&
                  (other.documentCategory || other.category) === category &&
                  other.createdAt.getTime() > decisionTime
              );
            };

            data.documents = files.map(f => ({
              id: f.id,
              user_id: f.userId,
              project_id: activeProject.id,
              status: f.visibility,
              created_at: f.createdAt.toISOString(),
              updated_at: f.updatedAt.toISOString(),
              category: f.documentCategory || f.category,
              fileName: f.fileName,
              fileType: f.fileType,
              sizeLabel: f.size ? `${Math.round(f.size / 1024)} KB` : 'Unknown',
              uploadDateLabel: formatDate(f.createdAt),
              uploadedBy: f.user?.name || 'Unknown',
              reviewStatus: getReviewStatusLabel(f.submission?.status),
              isSuperseded: isSupersededFile(f)
            }));

            const isMilestoneOverdue = (m: (typeof milestones)[number]) =>
              Boolean(m.dueAt) && m.dueAt!.getTime() < Date.now() && m.status !== 'COMPLETED';

            data.milestones = milestones.map(m => ({
              id: m.id,
              user_id: dbUser.id,
              project_id: activeProject.id,
              status: isMilestoneOverdue(m) ? 'OVERDUE' : m.status,
              created_at: m.createdAt.toISOString(),
              updated_at: m.updatedAt.toISOString(),
              title: m.title,
              dateLabel: m.dueAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(m.dueAt) : 'No date',
              summary: m.description || '',
              route: '/students/milestones'
            }));

            // Lazily raise a one-time "deadline" alert for the student and adviser the first
            // time a milestone is found overdue, mirroring the ensureProjectMilestoneWorkflow
            // lazy-write-on-read pattern above rather than requiring a separate cron job.
            const overdueMilestones = milestones.filter(isMilestoneOverdue);
            if (overdueMilestones.length > 0) {
              const overdueIds = overdueMilestones.map(m => m.id);
              const existingAlerts = await prisma.notification.findMany({
                where: { entityType: 'milestone_overdue', entityId: { in: overdueIds } },
                select: { entityId: true, userId: true }
              });
              const alerted = new Set(existingAlerts.map(n => `${n.userId}:${n.entityId}`));
              const recipients = [dbUser.id, adviserUser?.id].filter((id): id is string => Boolean(id));

              const notificationsToCreate = overdueMilestones.flatMap((m) =>
                recipients
                  .filter((userId) => !alerted.has(`${userId}:${m.id}`))
                  .map((userId) => ({
                    userId,
                    title: 'Milestone Overdue',
                    message: `"${m.title}" for "${activeProject.title}" was due ${formatDate(m.dueAt!)} and has not been completed.`,
                    type: 'deadline',
                    entityType: 'milestone_overdue',
                    entityId: m.id
                  }))
              );

              if (notificationsToCreate.length > 0) {
                await prisma.notification.createMany({ data: notificationsToCreate }).catch((err) => {
                  console.error('Failed to create overdue milestone notifications:', err);
                });
              }
            }

            data.milestoneCheckpoints = checkpointRows
              .sort((left, right) =>
                left.milestone.sequence - right.milestone.sequence ||
                left.sequence - right.sequence
              )
              .map((checkpoint) => ({
                id: checkpoint.id,
                project_id: checkpoint.projectId,
                milestone_id: checkpoint.milestoneId,
                milestoneTitle: checkpoint.milestone.title,
                milestoneSequence: checkpoint.milestone.sequence,
                key: checkpoint.key,
                title: checkpoint.title,
                description: checkpoint.description || undefined,
                sequence: checkpoint.sequence,
                required: checkpoint.required,
                status: checkpoint.status,
                adviserReviewStatus: checkpoint.adviserReviewStatus,
                panelReviewStatus: checkpoint.panelReviewStatus,
                submittedAt: checkpoint.submittedAt?.toISOString(),
                reviewedAt: checkpoint.reviewedAt?.toISOString(),
                completedAt: checkpoint.completedAt?.toISOString(),
                latestFeedback: checkpoint.latestFeedback || undefined,
                latestFeedbackBy: checkpoint.latestFeedbackBy || undefined,
                latestFeedbackAt: checkpoint.latestFeedbackAt?.toISOString(),
                studentStartDate: checkpoint.studentStartDate?.toISOString(),
                studentTargetDate: checkpoint.studentTargetDate?.toISOString(),
                submissions: checkpoint.submissions.map((submission) => ({
                  id: submission.id,
                  title: submission.title,
                  status: submission.status,
                  submittedAt: submission.submittedAt.toISOString(),
                  reviewedAt: submission.reviewedAt?.toISOString(),
                  files: submission.files.map(toFileSummary),
                  comments: submission.comments.map((comment) => ({
                    id: comment.id,
                    body: comment.body,
                    decision: comment.decision,
                    createdAt: comment.createdAt.toISOString(),
                    authorName: comment.author?.name || 'Faculty'
                  }))
                })),
                files: checkpoint.files.map(toFileSummary)
              }));

            const scheduleTypeLabel = (type: string) => {
              switch (type) {
                case 'CONSULTATION':
                  return 'Consultation';
                case 'DEADLINE':
                  return 'Deadline';
                case 'MEETING':
                  return 'Meeting';
                case 'REMINDER':
                  return 'Reminder';
                case 'EVENT':
                  return 'Event';
                case 'REVIEW':
                  return 'Meeting';
                default:
                  return 'Event';
              }
            };

            data.schedules = [
              ...schedules.map(s => ({
              id: s.id,
              user_id: dbUser.id,
              project_id: activeProject.id,
              status: s.status,
              created_at: s.createdAt.toISOString(),
              updated_at: s.updatedAt.toISOString(),
              title: s.title,
              type: 'Defense',
              startDate: s.scheduledAt.toISOString(),
              startDateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(s.scheduledAt),
              time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(s.scheduledAt),
              location: s.location || 'TBA',
              description: s.notes || ''
              })),
              ...adviserScheduleItems.map(s => ({
                id: s.id,
                user_id: dbUser.id,
                project_id: activeProject.id,
                status: s.status,
                created_at: s.createdAt.toISOString(),
                updated_at: s.updatedAt.toISOString(),
                title: s.title,
                type: scheduleTypeLabel(s.type),
                startDate: s.scheduledAt.toISOString(),
                endDate: s.endsAt?.toISOString(),
                startDateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(s.scheduledAt),
                time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(s.scheduledAt),
                location: s.location || 'TBA',
                description: s.notes || '',
                mode: s.location?.toLowerCase().includes('http') ? 'Online' : 'Onsite',
                priority: s.type === 'DEADLINE' ? 'high' as const : 'medium' as const,
                isCompleted: s.status === AdviserScheduleItemStatus.COMPLETED
              }))
            ].sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime());

            const isSupersededSubmission = (sub: (typeof submissions)[number]) => {
              if (sub.status !== SubmissionStatus.NEEDS_REVISION || !sub.checkpointId || !sub.reviewedAt) {
                return false;
              }

              const decisionTime = sub.reviewedAt.getTime();
              return checkpointSubmissionTimes.some(
                (other) => other.checkpointId === sub.checkpointId && other.submittedAt.getTime() > decisionTime
              );
            };

            const allFeedback: any[] = [];
            submissions.forEach(sub => {
              const superseded = isSupersededSubmission(sub);

              sub.comments.forEach(c => {
                allFeedback.push({
                  id: c.id,
                  user_id: dbUser.id,
                  project_id: activeProject.id,
                  submissionId: sub.id,
                  submissionTitle: sub.title,
                  submissionStatus: sub.status,
                  status: sub.status === SubmissionStatus.APPROVED ? 'Approved' : 'Needs Revision',
                  created_at: c.createdAt.toISOString(),
                  updated_at: c.updatedAt.toISOString(),
                  title: `Feedback on ${sub.title}`,
                  content: c.body,
                  facultyName: c.author?.name || 'Faculty',
                  mode: c.author?.role === 'ADVISER' ? 'Adviser' : 'Panel',
                  dateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(c.createdAt),
                  unread: sub.status === SubmissionStatus.NEEDS_REVISION && !superseded,
                  isSuperseded: superseded
                });
              });
            });
            data.feedback = allFeedback.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const progressReportRows = await prisma.progressReport.findMany({
              where: { projectId: activeProject.id },
              orderBy: { createdAt: 'desc' },
              take: 30,
              select: {
                id: true, submittedById: true, submissionId: true, progressNote: true, accomplishments: true,
                problemsEncountered: true, nextSteps: true, percentageCompleted: true,
                createdAt: true, updatedAt: true, submittedBy: { select: { name: true } }
              }
            });

            const progressReportSubmissionIds = progressReportRows.map((r) => r.submissionId).filter((id): id is string => Boolean(id));
            const progressReportComments = progressReportSubmissionIds.length
              ? await prisma.reviewComment.findMany({
                  where: { submissionId: { in: progressReportSubmissionIds } },
                  orderBy: { createdAt: 'asc' },
                  select: { id: true, body: true, createdAt: true, submissionId: true, author: { select: { name: true } } }
                })
              : [];
            const progressReportFeedbackBySubmission = new Map<string, Array<{ id: string; body: string; authorName: string; createdAt: string }>>();
            progressReportComments.forEach((comment) => {
              const list = progressReportFeedbackBySubmission.get(comment.submissionId) || [];
              list.push({ id: comment.id, body: comment.body, authorName: comment.author?.name || 'Adviser', createdAt: comment.createdAt.toISOString() });
              progressReportFeedbackBySubmission.set(comment.submissionId, list);
            });

            data.progressReports = progressReportRows.map((report) => ({
              id: report.id,
              user_id: report.submittedById || dbUser.id,
              project_id: activeProject.id,
              submissionId: report.submissionId,
              status: 'submitted',
              created_at: report.createdAt.toISOString(),
              updated_at: report.updatedAt.toISOString(),
              title: `Progress Report — ${formatDate(report.createdAt)}`,
              date: report.createdAt.toISOString(),
              dateLabel: formatDate(report.createdAt),
              progressDescription: report.progressNote,
              accomplishments: report.accomplishments,
              problemsEncountered: report.problemsEncountered || '',
              nextSteps: report.nextSteps || '',
              percentageCompleted: report.percentageCompleted,
              feedback: report.submissionId ? progressReportFeedbackBySubmission.get(report.submissionId) || [] : [],
              submittedByName: report.submittedBy?.name || data.profile.fullName
            }));
          }
        }
      } catch (err) {
        console.error('Failed to overlay db user profile:', err);
      }
    }
  } catch (err) {
    if (isNextDynamicServerUsageError(err)) {
      throw err;
    }

    console.error('Failed to get authenticated user:', err);
  }

  return { data };
});
