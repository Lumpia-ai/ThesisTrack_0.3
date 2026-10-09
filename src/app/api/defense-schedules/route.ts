import {
  DefenseChairDecision,
  DefensePanelRole,
  DefenseStatus,
  EvaluationRecommendation,
  MilestoneStatus,
  Prisma,
  ProjectStatus,
  UserRole
} from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activeRoleHolders } from '@/lib/rbac/queries';
import {
  HttpError,
  handleApiError,
  normalizeText,
  parseJsonBody,
  successResponse
} from '@/lib/utils';
import { ensureProjectMilestoneWorkflow, recordCheckpointSchedule } from '@/lib/milestone-checkpoint-tracking';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const SCHEDULE_VIEWER_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.PROGRAM_HEAD,
  UserRole.RESEARCH_HEAD,
  UserRole.ADMIN,
  UserRole.SYSTEM_ADMIN
];

const SCHEDULE_MANAGER_ROLES: UserRole[] = [
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN
];

const SESSION_END_ROLES: UserRole[] = [
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN
];

const DEFAULT_DEFENSE_SCHEDULE_LIMIT = 50;
const DEFAULT_DEFENSE_PROJECT_LIMIT = 100;
const MAX_DEFENSE_LIMIT = 200;

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

const SCHEDULE_TYPES = [
  'Concept Presentation',
  'Proposal Defense',
  'Pre-Final Defense',
  'Final Defense'
] as const;
// Every official defense (not the Pre-Final practice run) requires its own
// signed "Application for Oral Defense" evidence, independently reviewed by
// the adviser, before that stage's defense can be scheduled.
const DEFENSE_APPLICATION_EVIDENCE_CHECKPOINT_BY_SCHEDULE_TYPE: Partial<Record<string, string>> = {
  'Concept Presentation': 'concept-defense-application',
  'Proposal Defense': 'proposal-defense-application',
  'Final Defense': 'final-defense-application'
};
const APPROVED_TITLE_PROJECT_STATUSES = new Set<ProjectStatus>([
  ProjectStatus.APPROVED,
  ProjectStatus.DEFENSE_SCHEDULED,
  ProjectStatus.COMPLETED
]);
const COMPLETED_MILESTONE_STATUSES = new Set<MilestoneStatus>([
  MilestoneStatus.APPROVED,
  MilestoneStatus.COMPLETED
]);

const defenseAssignmentInclude = {
  project: {
    include: {
      group: true,
      adviser: {
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          department: true
        }
      }
    }
  },
  secretary: {
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true
    }
  },
  evaluations: {
    include: {
      evaluator: {
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          department: true,
          role: true
        }
      }
    },
    orderBy: [
      { panelRole: 'asc' },
      { createdAt: 'asc' }
    ]
  }
} satisfies Prisma.DefenseScheduleInclude;

const scheduleGroupInclude = {
  groupMembers: {
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          displayName: true,
          email: true
        }
      }
    }
  },
  projects: {
    orderBy: { updatedAt: 'desc' },
    include: {
      adviser: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          displayName: true,
          department: true
        }
      },
      milestones: {
        orderBy: { sequence: 'asc' },
        select: {
          title: true,
          sequence: true,
          status: true,
          completedAt: true
        }
      },
      defenseSchedules: {
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true,
          status: true,
          title: true,
          scheduledAt: true,
          chairDecision: true,
          chairDecisionRemarks: true,
          previousProjectTitle: true
        }
      },
      submissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: {
          status: true,
          submittedAt: true,
          reviewedAt: true
        }
      }
    }
  }
} satisfies Prisma.GroupInclude;

type DefenseAssignmentRecord = Prisma.DefenseScheduleGetPayload<{
  include: typeof defenseAssignmentInclude;
}>;

type ScheduleGroupRecord = Prisma.GroupGetPayload<{
  include: typeof scheduleGroupInclude;
}>;

type ScheduleTitleProjectRecord = ScheduleGroupRecord['projects'][number];

type SaveDefenseScheduleBody = {
  groupCode?: unknown;
  projectTitle?: unknown;
  scheduleType?: unknown;
  department?: unknown;
  adviserName?: unknown;
  students?: unknown;
  date?: unknown;
  time?: unknown;
  room?: unknown;
  chairId?: unknown;
  memberIds?: unknown;
  secretaryId?: unknown;
};

// Faculty who can be assigned to record a defense's minutes. They work from
// the panel portal's Live Defense page, so they need an adviser/panel account.
const SECRETARY_ROLES: UserRole[] = [UserRole.ADVISER, UserRole.PANEL, UserRole.SECRETARY];

// A defense counts as active (not yet over) while it's waiting to start or live.
const ACTIVE_DEFENSE_STATUSES: DefenseStatus[] = [DefenseStatus.SCHEDULED, DefenseStatus.IN_PROGRESS];

function normalizeName(value: unknown) {
  return normalizeText(value).replace(/\s+/g, ' ').toLowerCase();
}

function normalizeFacultyIdentity(value: unknown) {
  return normalizeName(value)
    .replace(/(^|\s)(dr|prof|professor|engr|engineer|mr|mrs|ms)\.?(?=\s|$)/g, ' ')
    .replace(/[^\p{L}\p{N}@.]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeScheduleType(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  return SCHEDULE_TYPES.find((type) => type.toLowerCase() === normalized) || '';
}

function getPersonName(person?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
} | null) {
  if (!person) return '';
  return person.displayName || person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || '';
}

function getApprovedTitleProject(group: ScheduleGroupRecord) {
  const preferredProject = group.projects.find((project) => (
    project.id === group.projectId && APPROVED_TITLE_PROJECT_STATUSES.has(project.status)
  ));

  return preferredProject || group.projects.find((project) => APPROVED_TITLE_PROJECT_STATUSES.has(project.status)) || null;
}

function inferScheduleStage(project: ScheduleTitleProjectRecord | null, group?: ScheduleGroupRecord) {
  const activeMilestone = project?.milestones.find((milestone) => (
    !COMPLETED_MILESTONE_STATUSES.has(milestone.status) && !milestone.completedAt
  ));
  const reference = normalizeName(
    activeMilestone?.title ||
    group?.currentMilestone ||
    group?.milestone ||
    project?.status
  );

  if (reference.includes('final') || reference.includes('completion') || project?.status === ProjectStatus.COMPLETED) {
    return 'Final Defense';
  }

  if (
    reference.includes('mock') ||
    reference.includes('pre-final') ||
    reference.includes('development') ||
    reference.includes('prototype') ||
    reference.includes('testing') ||
    reference.includes('chapter 3') ||
    reference.includes('data analysis')
  ) {
    return 'Pre-Final Defense';
  }

  if (
    reference.includes('proposal') ||
    reference.includes('chapter 1') ||
    reference.includes('chapter 2') ||
    reference.includes('chapters 1')
  ) {
    return 'Proposal Defense';
  }

  return 'Concept Presentation';
}

function getScheduleStatus(project: ScheduleTitleProjectRecord | null) {
  if (!project) {
    return 'Not Eligible';
  }

  if (project.defenseSchedules.some((schedule) => ACTIVE_DEFENSE_STATUSES.includes(schedule.status))) {
    return 'Scheduled';
  }

  if (
    project.status === ProjectStatus.NEEDS_REVISION ||
    project.milestones.some((milestone) => milestone.status === MilestoneStatus.NEEDS_REVISION)
  ) {
    return 'Revision Required';
  }

  if (project.defenseSchedules.length > 0) {
    return 'Ready for Reschedule';
  }

  return 'Ready First Schedule';
}

// "Ready for Reschedule" alone doesn't say WHY the last attempt didn't finish —
// this pulls the reason from the most recent past defense schedule's chair
// decision, so the Program Head can tell a plain redefense apart from a
// rejected-title recovery (defenseSchedules is already sorted newest-first).
function getRedefenseReason(project: ScheduleTitleProjectRecord | null) {
  if (!project) {
    return null;
  }

  const lastDecidedSchedule = project.defenseSchedules.find((schedule) => schedule.chairDecision);

  if (!lastDecidedSchedule) {
    return null;
  }

  // schedule.title is just the generic schedule TYPE (e.g. "Proposal Defense") —
  // already shown as its own badge on the card, so repeating it here added
  // nothing. The date of that specific session is the actually new information.
  const decidedOn = lastDecidedSchedule.scheduledAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  if (lastDecidedSchedule.chairDecision === DefenseChairDecision.NEW_TITLE) {
    return {
      label: 'Redefense (New Title)',
      detail: `The panel required a new title after the ${lastDecidedSchedule.title} on ${decidedOn}.${
        lastDecidedSchedule.chairDecisionRemarks ? ` ${lastDecidedSchedule.chairDecisionRemarks}` : ''
      }`,
      previousTitle: lastDecidedSchedule.previousProjectTitle || null
    };
  }

  if (lastDecidedSchedule.chairDecision === DefenseChairDecision.REDEFENSE) {
    return {
      label: 'Redefense Required',
      detail: `The panel required a redefense of the same title after the ${lastDecidedSchedule.title} on ${decidedOn}.${
        lastDecidedSchedule.chairDecisionRemarks ? ` ${lastDecidedSchedule.chairDecisionRemarks}` : ''
      }`
    };
  }

  return null;
}

function formatScheduleGroup(group: ScheduleGroupRecord) {
  const approvedProject = getApprovedTitleProject(group);
  const activeProject = approvedProject || group.projects[0] || null;
  const scheduleStage = inferScheduleStage(approvedProject, group);
  const students = group.groupMembers.length
    ? group.groupMembers.map((member) => getPersonName(member.user) || member.userId)
    : group.students || [];
  const department = group.department || group.dept || activeProject?.departmentId || activeProject?.adviser?.department || 'Unassigned';
  const titles = group.projects
    .filter((project) => APPROVED_TITLE_PROJECT_STATUSES.has(project.status))
    .map((project) => {
    const latestSubmission = project.submissions[0] || null;

    return {
      id: project.id,
      title: project.title,
      status: project.status,
      submittedAt: latestSubmission?.submittedAt?.toISOString() || project.createdAt.toISOString(),
      reviewedAt: latestSubmission?.reviewedAt?.toISOString() || null,
      isApproved: APPROVED_TITLE_PROJECT_STATUSES.has(project.status)
    };
  });

  return {
    id: group.id,
    groupId: group.id,
    projectId: approvedProject?.id || null,
    code: group.code,
    title: (group.title && group.title !== 'Pending Student Submission' && group.title !== 'Awaiting Adviser Approval') ? group.title : (group.projectTitle || approvedProject?.title || group.code),
    approvedTitle: approvedProject?.title || null,
    titles,
    isEligible: Boolean(approvedProject),
    ineligibilityReason: approvedProject ? null : 'No adviser-approved title yet.',
    department,
    batchSection: group.code || department,
    adviser: getPersonName(activeProject?.adviser) || 'Unassigned adviser',
    students,
    currentStage: approvedProject?.milestones.find((milestone) => (
      !COMPLETED_MILESTONE_STATUSES.has(milestone.status) && !milestone.completedAt
    ))?.title || group.currentMilestone || group.milestone || 'Concept',
    eligibleStage: scheduleStage,
    // Counts only past schedules FOR THIS STAGE (matched by title, e.g. "Proposal
    // Defense") — this used to count every schedule ever recorded for the project
    // regardless of stage, so a group on their 1st Proposal Defense attempt (after
    // an earlier, separate Concept Presentation) incorrectly showed "Attempt 2".
    attemptCount: Math.max(
      1,
      (approvedProject?.defenseSchedules.filter((schedule) => schedule.title === scheduleStage).length || 0) + 1
    ),
    scheduleStatus: getScheduleStatus(approvedProject),
    redefenseReason: getScheduleStatus(approvedProject) === 'Ready for Reschedule'
      ? getRedefenseReason(approvedProject)
      : null
  };
}

function getFacultyIdentityKeys(user: {
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
}) {
  return [
    normalizeFacultyIdentity(user.displayName),
    normalizeFacultyIdentity(user.name),
    normalizeFacultyIdentity(user.email)
  ].filter(Boolean);
}

function toScheduledAt(dateValue: string, timeValue: string) {
  const scheduledAt = new Date(`${dateValue}T${timeValue}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new HttpError('Choose a valid defense date and time.', 400, {
      date: 'Choose a valid date.',
      time: 'Choose a valid time.'
    });
  }

  return scheduledAt;
}

function formatAssignment(schedule: DefenseAssignmentRecord) {
  const panelists = schedule.evaluations
    .filter((evaluation) => evaluation.evaluator)
    .map((evaluation) => ({
      id: evaluation.evaluator?.id || '',
      email: evaluation.evaluator?.email || '',
      name: evaluation.evaluator?.displayName || evaluation.evaluator?.name || evaluation.evaluator?.email || 'Panelist',
      department: evaluation.evaluator?.department || '',
      role: evaluation.evaluator?.role,
      panelRole: evaluation.panelRole,
      recommendation: evaluation.recommendation,
      submittedAt: evaluation.submittedAt ? evaluation.submittedAt.toISOString() : null
    }));
  const chair = panelists.find((panelist) => panelist.panelRole === DefensePanelRole.CHAIR) || null;

  return {
    id: schedule.id,
    projectId: schedule.projectId,
    groupCode: schedule.project.group?.code || '',
    groupTitle: schedule.project.group?.title || '',
    projectTitle: schedule.project.title,
    scheduleType: schedule.title,
    department: schedule.project.group?.department || schedule.project.adviser?.department || '',
    students: schedule.project.group?.students || [],
    leader: schedule.project.group?.leader || schedule.project.group?.students?.[0] || '',
    adviserName: schedule.project.adviser?.displayName || schedule.project.adviser?.name || schedule.project.adviser?.email || '',
    scheduledAt: schedule.scheduledAt.toISOString(),
    date: schedule.scheduledAt.toISOString().slice(0, 10),
    time: schedule.scheduledAt.toTimeString().slice(0, 5),
    room: schedule.location || '',
    status: schedule.status,
    chairId: chair?.id || '',
    memberIds: panelists.filter((panelist) => panelist.panelRole === DefensePanelRole.MEMBER).map((panelist) => panelist.id),
    panelists,
    chairDecision: schedule.chairDecision,
    chairDecisionAt: schedule.chairDecisionAt ? schedule.chairDecisionAt.toISOString() : null,
    chairDecisionRemarks: schedule.chairDecisionRemarks,
    startedAt: schedule.startedAt ? schedule.startedAt.toISOString() : null,
    secretary: schedule.secretary
      ? {
          id: schedule.secretary.id,
          email: schedule.secretary.email,
          name: schedule.secretary.displayName || schedule.secretary.name || schedule.secretary.email
        }
      : null
  };
}

async function findAssignmentById(id: string) {
  return prisma.defenseSchedule.findUnique({
    where: { id },
    include: defenseAssignmentInclude
  });
}

async function handleGET(request: Request) {
  try {
    const authUser = await requireAuthenticatedUser(request, SCHEDULE_VIEWER_ROLES);
    const { searchParams } = new URL(request.url);
    const groupCode = normalizeText(searchParams.get('groupCode'));
    const scheduleLimit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_DEFENSE_SCHEDULE_LIMIT, MAX_DEFENSE_LIMIT);
    const projectLimit = parsePositiveInteger(searchParams.get('projectLimit'), DEFAULT_DEFENSE_PROJECT_LIMIT, MAX_DEFENSE_LIMIT);
    const page = parsePositiveInteger(searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER);

    const statusParam = searchParams.get('status');
    const requestedStatus = statusParam && statusParam.toUpperCase() in DefenseStatus
      ? (statusParam.toUpperCase() as keyof typeof DefenseStatus)
      : null;

    // Defaulting to just SCHEDULED used to make a defense vanish from this
    // queue the instant the last vote landed and it flipped to COMPLETED —
    // including one the panel didn't pass, right when the chair most needs to
    // see it to record Approve/Redefense/New Title. Keep surfacing a
    // completed-but-undecided one (no chairDecision yet, and the project
    // actually landed on NEEDS_REVISION, so a clean pass doesn't linger here
    // indefinitely) alongside the normal upcoming ones.
    const statusCondition: Prisma.DefenseScheduleWhereInput = requestedStatus
      ? { status: DefenseStatus[requestedStatus] }
      : {
          OR: [
            { status: { in: ACTIVE_DEFENSE_STATUSES } },
            {
              status: DefenseStatus.COMPLETED,
              chairDecision: null,
              project: { status: ProjectStatus.NEEDS_REVISION }
            }
          ]
        };

    const andConditions: Prisma.DefenseScheduleWhereInput[] = [statusCondition];

    if (groupCode) {
      const group = await prisma.group.findUnique({
        where: { code: groupCode },
        select: { id: true }
      });

      if (!group) {
        return successResponse({ assignment: null, assignments: [] });
      }

      andConditions.push({ project: { groupId: group.id } });
    }

    if (authUser.role === UserRole.ADVISER || authUser.role === UserRole.PANEL) {
      andConditions.push({
        OR: [
          { evaluations: { some: { evaluatorId: authUser.id } } },
          { secretaryId: authUser.id },
          { project: { adviserId: authUser.id } }
        ]
      });
    }

    const where: Prisma.DefenseScheduleWhereInput = { AND: andConditions };

    const schedules = await prisma.defenseSchedule.findMany({
      where,
      include: defenseAssignmentInclude,
      orderBy: {
        scheduledAt: 'asc'
      },
      skip: (page - 1) * scheduleLimit,
      take: scheduleLimit
    });

    const assignments = schedules.map(formatAssignment);
    const groupWhere: Prisma.GroupWhereInput = {};

    /* if ((authUser.role === UserRole.PROGRAM_HEAD || authUser.role === UserRole.RESEARCH_HEAD) && authUser.department) {
      const deptSearch = { equals: authUser.department, mode: 'insensitive' as Prisma.QueryMode };
      groupWhere.OR = [
        { department: deptSearch },
        { dept: deptSearch },
        { projects: { some: { departmentId: deptSearch } } }
      ];
    } */

    const scheduleGroups = await prisma.group.findMany({
      where: groupWhere,
      include: scheduleGroupInclude,
      orderBy: {
        updatedAt: 'desc'
      },
      take: projectLimit
    });

    return successResponse({
      assignment: assignments[0] || null,
      assignments,
      scheduleProjects: scheduleGroups.map(formatScheduleGroup)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const authUser = await requireAuthenticatedUser(request, SCHEDULE_MANAGER_ROLES);
    const body = await parseJsonBody<SaveDefenseScheduleBody>(request);

    const groupCode = normalizeText(body.groupCode);
    const scheduleType = normalizeScheduleType(body.scheduleType);
    const adviserName = normalizeText(body.adviserName);
    const date = normalizeText(body.date);
    const time = normalizeText(body.time);
    const room = normalizeText(body.room);
    const chairId = normalizeText(body.chairId);
    const memberIds = Array.isArray(body.memberIds)
      ? body.memberIds.map(normalizeText).filter(Boolean)
      : [];
    const secretaryId = normalizeText(body.secretaryId) || null;

    const fieldErrors: Record<string, string> = {};

    if (!groupCode) fieldErrors.group = 'Select a group to schedule.';
    if (!scheduleType) fieldErrors.scheduleType = 'Choose a valid presentation type.';
    if (!date) fieldErrors.date = 'Choose a defense date.';
    if (!time) fieldErrors.time = 'Choose a defense time.';
    if (!room) fieldErrors.room = 'Choose a venue.';
    if (!chairId) fieldErrors.chairId = 'Choose a panel chair.';

    const panelIds = [chairId, ...memberIds].filter(Boolean);
    const uniquePanelIds = Array.from(new Set(panelIds));

    if (uniquePanelIds.length !== panelIds.length) {
      fieldErrors.panel = 'Panel chair and members must be different faculty accounts.';
    }

    if (secretaryId && uniquePanelIds.includes(secretaryId)) {
      fieldErrors.secretaryId = 'The secretary records the minutes and cannot also be a scoring panelist.';
    }

    if (Object.keys(fieldErrors).length) {
      throw new HttpError('Please complete the defense schedule details.', 400, fieldErrors);
    }

    if (secretaryId) {
      const secretary = await prisma.user.findFirst({
        where: { id: secretaryId, isSuspended: false, ...activeRoleHolders(SECRETARY_ROLES) },
        select: { id: true }
      });

      if (!secretary) {
        throw new HttpError('The selected secretary is no longer available.', 400, {
          secretaryId: 'Choose an active faculty account to record the minutes.'
        });
      }
    }

    const scheduledAt = toScheduledAt(date, time);
    const panelUsers = await prisma.user.findMany({
      where: {
        id: { in: uniquePanelIds },
        isSuspended: false,
        ...activeRoleHolders([UserRole.ADVISER, UserRole.PANEL, UserRole.PROGRAM_HEAD])
      }
    });

    if (panelUsers.length !== uniquePanelIds.length) {
      throw new HttpError('One or more selected panelists are no longer available.', 400, {
        panel: 'Refresh and choose available faculty accounts.'
      });
    }

    const group = await prisma.group.findUnique({
      where: { code: groupCode },
      include: scheduleGroupInclude
    });

    if (!group) {
      throw new HttpError('Group was not found.', 404, {
        group: 'Choose an existing group from the schedule list.'
      });
    }

    const approvedProject = getApprovedTitleProject(group);

    if (!approvedProject) {
      throw new HttpError('This group is not eligible for defense scheduling because it has no approved title yet.', 400, {
        group: 'Approve one title proposal before scheduling a presentation.'
      });
    }

    // Hard gate: an official defense can't be scheduled until the adviser has
    // approved that stage's oral defense application evidence.
    const defenseApplicationCheckpointKey = DEFENSE_APPLICATION_EVIDENCE_CHECKPOINT_BY_SCHEDULE_TYPE[scheduleType];

    if (defenseApplicationCheckpointKey) {
      await ensureProjectMilestoneWorkflow(prisma, approvedProject.id);
      const evidenceCheckpoint = await prisma.milestoneCheckpoint.findUnique({
        where: { projectId_key: { projectId: approvedProject.id, key: defenseApplicationCheckpointKey } }
      });
      const evidenceApproved = evidenceCheckpoint
        && (evidenceCheckpoint.status === 'APPROVED' || evidenceCheckpoint.status === 'COMPLETED');

      if (!evidenceApproved) {
        throw new HttpError(`This group's oral defense application evidence must be reviewed and approved before ${scheduleType.toLowerCase()} can be scheduled.`, 400, {
          group: 'Approve the oral defense application evidence in Title & Evidence Approval first.'
        });
      }
    }

    const actualAdviserIsPanelist = approvedProject.adviserId
      ? uniquePanelIds.includes(approvedProject.adviserId)
      : false;
    const adviserKey = normalizeFacultyIdentity(adviserName);
    const adviserNameIsPanelist = adviserKey
      ? panelUsers.some((user) => getFacultyIdentityKeys(user).includes(adviserKey))
      : false;

    if (actualAdviserIsPanelist || adviserNameIsPanelist) {
      throw new HttpError('The academic adviser cannot be assigned as a scoring panelist.', 400, {
        panel: 'Choose faculty who are not the project adviser.'
      });
    }

    const project = await prisma.project.update({
      where: { id: approvedProject.id },
      data: {
        status: ProjectStatus.DEFENSE_SCHEDULED,
        groupId: group.id
      }
    });

    if (group.projectId !== project.id || group.projectTitle !== project.title) {
      await prisma.group.update({
        where: { id: group.id },
        data: {
          projectId: project.id,
          projectTitle: project.title
        }
      });
    }

    const existingSchedule = await prisma.defenseSchedule.findFirst({
      where: {
        projectId: project.id,
        title: scheduleType,
        status: { not: DefenseStatus.CANCELLED }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    const schedule = existingSchedule
      ? await prisma.defenseSchedule.update({
          where: { id: existingSchedule.id },
          data: {
            scheduledById: authUser.id,
            title: scheduleType,
            scheduledAt,
            location: room,
            status: DefenseStatus.SCHEDULED,
            notes: `${scheduleType} scheduled. Panel chair assigned to ${panelUsers.find((user) => user.id === chairId)?.name || 'selected faculty'}.`,
            secretaryId,
            // A new round starts un-started; earlier minutes stay on the row
            // as history, but the new sitting's must be confirmed again.
            startedAt: null,
            minutesConfirmedAt: null,
            // Reusing a completed schedule row for a second attempt (e.g. after
            // a Redefense decision) without this left the previous round's
            // chair decision sitting on the new one — making the new vote
            // round look already decided before anyone had voted.
            chairDecision: null,
            chairDecisionAt: null,
            chairDecisionRemarks: null
          }
        })
      : await prisma.defenseSchedule.create({
          data: {
            projectId: project.id,
            scheduledById: authUser.id,
            title: scheduleType,
            scheduledAt,
            location: room,
            status: DefenseStatus.SCHEDULED,
            notes: `${scheduleType} scheduled. Panel chair assigned to ${panelUsers.find((user) => user.id === chairId)?.name || 'selected faculty'}.`,
            secretaryId
          }
        });

    await prisma.evaluation.deleteMany({
      where: {
        defenseScheduleId: schedule.id,
        evaluatorId: {
          notIn: uniquePanelIds
        }
      }
    });

    await Promise.all(uniquePanelIds.map((evaluatorId) => (
      prisma.evaluation.upsert({
        where: {
          defenseScheduleId_evaluatorId: {
            defenseScheduleId: schedule.id,
            evaluatorId
          }
        },
        update: {
          projectId: project.id,
          panelRole: evaluatorId === chairId ? DefensePanelRole.CHAIR : DefensePanelRole.MEMBER,
          // Same reason as clearing chairDecision above — a panelist reused
          // from a prior round (very likely, it's often the same panel) would
          // otherwise keep their old vote, corrupting the new round's tally
          // before anyone re-votes.
          recommendation: EvaluationRecommendation.PENDING,
          submittedAt: null,
          remarks: null,
          rubricData: Prisma.JsonNull
        },
        create: {
          projectId: project.id,
          defenseScheduleId: schedule.id,
          evaluatorId,
          panelRole: evaluatorId === chairId ? DefensePanelRole.CHAIR : DefensePanelRole.MEMBER
        }
      })
    )));

    await recordCheckpointSchedule(prisma, {
      projectId: project.id,
      title: scheduleType,
      scheduledAt
    });

    const assignment = await findAssignmentById(schedule.id);

    if (!assignment) {
      throw new HttpError('Defense schedule was saved but could not be reloaded.', 500);
    }

    return successResponse({
      message: 'Defense schedule and panel chair assignment saved.',
      assignment: formatAssignment(assignment)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handleDELETE(request: Request) {
  try {
    const authUser = await requireAuthenticatedUser(request, SESSION_END_ROLES);

    const activeSchedules = await prisma.defenseSchedule.findMany({
      where: {
        status: { in: ACTIVE_DEFENSE_STATUSES },
        evaluations: {
          some: { evaluatorId: authUser.id }
        }
      },
      select: { id: true }
    });

    if (activeSchedules.length === 0) {
      return successResponse({ message: 'No active defense sessions found.', ended: 0 });
    }

    const scheduleIds = activeSchedules.map((s) => s.id);

    await prisma.defenseSchedule.updateMany({
      where: { id: { in: scheduleIds } },
      data: { status: DefenseStatus.COMPLETED }
    });

    return successResponse({
      message: `${scheduleIds.length} defense session(s) ended successfully.`,
      ended: scheduleIds.length
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/defense-schedules', handleGET);
export const POST = withApiLogging('POST', '/api/defense-schedules', handlePOST);
export const DELETE = withApiLogging('DELETE', '/api/defense-schedules', handleDELETE);
