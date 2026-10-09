import { DefensePanelRole, DefenseStatus, Prisma, ProjectStatus, UserRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/utils';
import { applyDefensePassOutcome, recordDefenseVoteOutcome } from '@/lib/milestone-checkpoint-tracking';
import {
  aggregatePanelRatings,
  getRatingFormForScheduleType,
  type RatingForm,
  type RatingSheetResult,
  type RatingSheetScores
} from '@/lib/defense-rating-forms';
import { getCheckpointKeysForStage, getFileLabel, getStageForScheduleType, type ProjectStageKey } from '@/lib/stage-labels';

// Evaluation.rubricData for a panelist who rates with the stage's sheet. The
// legacy yes/no flow stores `{ vote }` instead — see hasRatingSheet().
export type StoredRatingSheet = {
  sheet: RatingSheetScores;
  result: RatingSheetResult;
  submitted: boolean;
  savedAt: string;
};

export function readStoredRatingSheet(rubricData: Prisma.JsonValue | null | undefined): StoredRatingSheet | null {
  if (!rubricData || typeof rubricData !== 'object' || Array.isArray(rubricData)) return null;
  const value = rubricData as Record<string, unknown>;
  if (!value.sheet || typeof value.sheet !== 'object') return null;
  return value as unknown as StoredRatingSheet;
}

// Files a panelist should pre-read for each defense. Proposal and Final sheets
// also rate the prototype/system output, so development uploads are included.
const PACKET_STAGES: Record<string, ProjectStageKey[]> = {
  concept: ['concept'],
  proposal: ['proposal', 'development'],
  'mock-defense': ['mock-defense', 'development'],
  'final-defense': ['final-defense', 'development']
};

// Checkpoints that hold administrative forms rather than work to be rated.
const NON_PACKET_CHECKPOINT_KEYS = new Set([
  'concept-defense-application',
  'proposal-defense-application',
  'final-defense-application'
]);

const liveDefenseInclude = {
  secretary: { select: { id: true, name: true, displayName: true, email: true } },
  project: {
    include: {
      adviser: { select: { id: true, name: true, displayName: true, email: true } },
      group: {
        include: {
          groupMembers: {
            where: { isActive: true },
            include: {
              user: { select: { id: true, name: true, firstName: true, lastName: true, displayName: true, email: true } }
            }
          }
        }
      }
    }
  },
  evaluations: {
    include: {
      evaluator: { select: { id: true, name: true, displayName: true, email: true, department: true } }
    },
    orderBy: [{ panelRole: 'asc' as const }, { createdAt: 'asc' as const }]
  }
} satisfies Prisma.DefenseScheduleInclude;

type LiveDefenseRecord = Prisma.DefenseScheduleGetPayload<{ include: typeof liveDefenseInclude }>;

export type LiveDefenseViewerRole = 'chair' | 'member' | 'secretary' | 'adviser' | 'observer';

const OBSERVER_ROLES: UserRole[] = [UserRole.PROGRAM_HEAD, UserRole.RESEARCH_HEAD, UserRole.SYSTEM_ADMIN, UserRole.ADMIN];

type AuthUser = { id: string; role: UserRole };

function personName(person?: { displayName?: string | null; name?: string | null; email?: string | null; firstName?: string | null; lastName?: string | null } | null) {
  if (!person) return '';
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return person.displayName?.trim() || person.name?.trim() || fullName || person.email || '';
}

export async function loadLiveDefense(scheduleId: string) {
  const schedule = await prisma.defenseSchedule.findUnique({
    where: { id: scheduleId },
    include: liveDefenseInclude
  });

  if (!schedule) {
    throw new HttpError('Defense schedule not found.', 404);
  }

  return schedule;
}

export function getViewerRole(schedule: LiveDefenseRecord, user: AuthUser): LiveDefenseViewerRole {
  const evaluation = schedule.evaluations.find((entry) => entry.evaluatorId === user.id);
  if (evaluation) return evaluation.panelRole === DefensePanelRole.CHAIR ? 'chair' : 'member';
  if (schedule.secretaryId === user.id) return 'secretary';
  if (schedule.project.adviserId === user.id) return 'adviser';
  if (OBSERVER_ROLES.includes(user.role)) return 'observer';
  throw new HttpError('You are not assigned to this defense.', 403);
}

// Students rated individually on the Oral Examination. Prefers real accounts
// (stable ids); falls back to the group's name list for legacy groups.
export function getDefenseStudents(schedule: LiveDefenseRecord) {
  const members = schedule.project.group?.groupMembers ?? [];
  if (members.length) {
    return members.map((member) => ({ id: member.user.id, name: personName(member.user) || 'Student' }));
  }
  return (schedule.project.group?.students ?? []).map((name) => ({ id: `name:${name}`, name }));
}

async function loadDefensePacket(projectId: string, scheduleType: string) {
  const stage = getStageForScheduleType(scheduleType);
  const stages = (stage && PACKET_STAGES[stage]) || [];
  const checkpointKeys = stages
    .flatMap((entry) => getCheckpointKeysForStage(entry))
    .filter((key) => !NON_PACKET_CHECKPOINT_KEYS.has(key));

  if (!checkpointKeys.length) return [];

  const files = await prisma.uploadedFile.findMany({
    where: {
      projectId,
      filePath: { not: null },
      checkpoint: { key: { in: checkpointKeys } }
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      documentCategory: true,
      createdAt: true,
      checkpoint: { select: { key: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 40
  });

  return files.map((file) => ({
    id: file.id,
    fileName: file.fileName,
    fileType: file.fileType,
    label: getFileLabel({ checkpointKey: file.checkpoint?.key, documentCategory: file.documentCategory, fileName: file.fileName }),
    uploadedAt: file.createdAt.toISOString(),
    previewUrl: `/api/document-files/${file.id}/preview`
  }));
}

export function getPanelAggregate(form: RatingForm, schedule: LiveDefenseRecord) {
  const submittedSheets = schedule.evaluations
    .map((evaluation) => readStoredRatingSheet(evaluation.rubricData))
    .filter((stored): stored is StoredRatingSheet => Boolean(stored?.submitted))
    .map((stored) => stored.result);

  return aggregatePanelRatings(form, submittedSheets);
}

// The full state the Live Defense page renders. What's revealed depends on who
// is looking: the chair sees every panelist's scores; a member only their own
// sheet plus who has submitted; the secretary/adviser/observers see progress
// but no scores until the defense is finalized.
export async function getLiveDefenseState(scheduleId: string, user: AuthUser) {
  const schedule = await loadLiveDefense(scheduleId);
  const viewerRole = getViewerRole(schedule, user);
  const form = getRatingFormForScheduleType(schedule.title);
  const students = getDefenseStudents(schedule);
  const isFinal = schedule.status === DefenseStatus.COMPLETED;
  const canSeeAllScores = viewerRole === 'chair' || isFinal;

  const panelists = schedule.evaluations
    .filter((evaluation) => evaluation.evaluator)
    .map((evaluation) => {
      const stored = readStoredRatingSheet(evaluation.rubricData);
      const isMe = evaluation.evaluatorId === user.id;
      const progress: 'not-started' | 'drafting' | 'submitted' = stored?.submitted || (!stored && evaluation.submittedAt)
        ? 'submitted'
        : stored ? 'drafting' : 'not-started';

      return {
        id: evaluation.evaluatorId!,
        name: personName(evaluation.evaluator),
        department: evaluation.evaluator?.department || '',
        role: evaluation.panelRole === DefensePanelRole.CHAIR ? 'chair' : 'member',
        isMe,
        progress,
        submittedAt: evaluation.submittedAt?.toISOString() ?? null,
        remarks: canSeeAllScores || isMe ? evaluation.remarks : null,
        sheet: canSeeAllScores || isMe ? stored?.sheet ?? null : null,
        result: canSeeAllScores || isMe ? stored?.result ?? null : null
      };
    });

  const aggregate = form && (canSeeAllScores || viewerRole === 'member') ? getPanelAggregate(form, schedule) : null;
  const canSeeMinutes = viewerRole !== 'observer' || isFinal;

  return {
    id: schedule.id,
    projectId: schedule.projectId,
    projectTitle: schedule.project.title,
    groupCode: schedule.project.group?.code || '',
    scheduleType: schedule.title,
    scheduledAt: schedule.scheduledAt.toISOString(),
    room: schedule.location || '',
    status: schedule.status,
    startedAt: schedule.startedAt?.toISOString() ?? null,
    chairDecision: schedule.chairDecision,
    adviserName: personName(schedule.project.adviser),
    viewer: { id: user.id, role: viewerRole },
    form,
    students,
    panelists,
    // Members see the panel average only after everyone has submitted, so it
    // can't anchor their own scoring.
    aggregate: viewerRole === 'member' && panelists.some((panelist) => panelist.progress !== 'submitted') ? null : aggregate,
    secretary: schedule.secretary ? { id: schedule.secretary.id, name: personName(schedule.secretary) } : null,
    minutes: canSeeMinutes ? schedule.minutes ?? '' : null,
    minutesUpdatedAt: schedule.minutesUpdatedAt?.toISOString() ?? null,
    minutesConfirmedAt: schedule.minutesConfirmedAt?.toISOString() ?? null,
    packet: await loadDefensePacket(schedule.projectId, schedule.title)
  };
}

export type LiveDefenseState = Awaited<ReturnType<typeof getLiveDefenseState>>;

// Closes a defense and applies its outcome. With rating sheets, the panel's
// averaged total against the form's passing mark decides; without them (stages
// with no form, or legacy yes/no votes) a single No sends it to the chair.
export async function finalizeDefenseSchedule({
  scheduleId,
  projectId,
  projectTitle,
  scheduleTitle,
  evaluations,
  notifyUserIds,
  groupId,
  ratingOutcome
}: {
  scheduleId: string;
  projectId: string;
  projectTitle: string;
  scheduleTitle: string;
  evaluations: Array<{ recommendation: string }>;
  notifyUserIds: string[];
  groupId: string | null;
  ratingOutcome?: { passed: boolean; total: number } | null;
}) {
  await prisma.defenseSchedule.update({
    where: { id: scheduleId },
    data: { status: DefenseStatus.COMPLETED }
  });

  let passed: boolean;

  if (ratingOutcome) {
    passed = ratingOutcome.passed;
  } else {
    const noVotes = evaluations.filter((ev) => ['REDEFENSE', 'FAILED'].includes(ev.recommendation)).length;
    // Unanimous Yes required to pass — a single No sends it to the panel
    // chair's decision (Approve override, Redefense, or New Title) instead.
    passed = noVotes === 0;
  }

  if (passed) {
    await applyDefensePassOutcome(prisma, {
      projectId,
      projectTitle,
      scheduleTitle,
      groupId,
      notifyUserIds
    });
    return { passed };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.NEEDS_REVISION }
  });

  await recordDefenseVoteOutcome(prisma, {
    projectId,
    scheduleTitle,
    outcome: 'redefense'
  });

  // Keep the group's lifecycle status badge in sync with the real defense
  // outcome — without this, Group.status silently keeps whatever value it
  // had before the vote (often still "Pending" or "Active"), so the group
  // list shows a rejected group as if nothing happened.
  if (groupId) {
    await prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'needs-revision',
        statusLabel: 'Needs Revision',
        statusClass: 'status-revise'
      }
    });
  }

  if (notifyUserIds.length) {
    const scoreNote = ratingOutcome ? ` The panel's average rating was ${ratingOutcome.total}.` : '';
    await prisma.notification.createMany({
      data: notifyUserIds.map((userId) => ({
        userId,
        title: `${scheduleTitle} Not Passed`,
        message: `"${projectTitle}" did not pass its ${scheduleTitle}.${scoreNote} Awaiting the panel chair's decision on next steps.`,
        type: 'warning',
        entityType: 'Project',
        entityId: projectId
      }))
    });
  }

  return { passed };
}
