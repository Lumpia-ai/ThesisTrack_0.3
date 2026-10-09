import {
  DefenseChairDecision,
  MilestoneCheckpointReviewStatus,
  MilestoneCheckpointStatus,
  Prisma,
  ProjectStatus,
  ReviewDecision,
  SubmissionStatus,
  UserRole
} from '@/generated/prisma/client';

import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import { deleteFile, uploadFile, generateUniqueFilePath } from '@/lib/storage/supabase-storage';
import {
  NEW_TITLE_SUBMISSION_CHECKPOINT_KEY,
  getNewTitleRecoveryStage,
  recordCheckpointSubmission,
  syncCheckpointReview,
  updateMilestoneRollup
} from '@/lib/milestone-checkpoint-tracking';
import { findSimilarTitles, type SimilarTitleMatch } from '@/lib/title-similarity';
import { withApiLogging } from '@/lib/api-logging';
import { checkTitleAgainstRepository, REPOSITORY_SIMILARITY_LIMIT } from '@/lib/repository-title-check';
import {
  MIN_BACKUP_TITLES,
  TITLE_LOCKED_MESSAGE,
  getTitleHistory,
  isGroupTitleLocked,
  normalizeTitleKey
} from '@/lib/title-lock';

export const runtime = 'nodejs';

const TITLE_ROLES = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

const DEFAULT_TITLE_LIMIT = 50;
const MAX_TITLE_LIMIT = 100;

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

const projectStatusToTitleStatus: Record<ProjectStatus, 'pending' | 'approved' | 'needs-revision' | 'rejected'> = {
  [ProjectStatus.DRAFT]: 'pending',
  [ProjectStatus.SUBMITTED]: 'pending',
  [ProjectStatus.UNDER_REVIEW]: 'pending',
  [ProjectStatus.APPROVED]: 'approved',
  [ProjectStatus.NEEDS_REVISION]: 'needs-revision',
  [ProjectStatus.DEFENSE_SCHEDULED]: 'approved',
  [ProjectStatus.COMPLETED]: 'approved',
  [ProjectStatus.ARCHIVED]: 'rejected'
};

const titleStatusToProjectStatus = {
  approved: ProjectStatus.APPROVED,
  needs_revision: ProjectStatus.NEEDS_REVISION,
  rejected: ProjectStatus.ARCHIVED,
  pending: ProjectStatus.SUBMITTED
} as const;

function getUserNameCandidates(user: { name?: string | null; firstName?: string | null; lastName?: string | null; displayName?: string | null; email?: string | null }) {
  return Array.from(new Set([
    user.displayName,
    [user.firstName, user.lastName].filter(Boolean).join(' '),
    user.name,
    user.email
  ]
    .map((value) => String(value || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)));
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getPersonName(person?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
} | null) {
  if (!person) {
    return '';
  }

  return person.displayName || person.name || [person.firstName, person.lastName].filter(Boolean).join(' ');
}

async function findStudentGroup(user: Awaited<ReturnType<typeof requireAuthenticatedUser>>) {
  const groupByMembership = await prisma.group.findFirst({
    where: {
      groupMembers: {
        some: {
          userId: user.id,
          isActive: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (groupByMembership) {
    return groupByMembership;
  }

  const candidates = getUserNameCandidates(user);

  for (const candidate of candidates) {
    const group = await prisma.group.findFirst({
      where: {
        students: {
          has: candidate
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (group) {
      return group;
    }
  }

  const normalizedCandidates = new Set(candidates.map(normalizeName));
  const possibleGroups = await prisma.group.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 200
  });

  return possibleGroups.find((group) =>
    group.students.some((student) => normalizedCandidates.has(normalizeName(student)))
  ) || null;
}

function toTitlePayload(project: any) {
  const latestSubmission = project.submissions?.[0] ?? null;
  const latestComment = latestSubmission?.comments?.[0] ?? null;
  const groupMembers = project.group?.groupMembers?.length
    ? project.group.groupMembers.map((member: any) => {
        const name = getPersonName(member.user);
        const isLeader = member.role === 'LEADER' || name === project.group?.leader;

        return {
          name,
          role: isLeader ? 'Leader' : 'Member',
          isLeader
        };
      })
    : (project.group?.students || []).map((name: string) => ({
        name,
        role: name === project.group?.leader ? 'Leader' : 'Member',
        isLeader: name === project.group?.leader
      }));

  return {
    id: project.id,
    groupId: project.group?.code || project.groupId || 'Assigned Group',
    groupTitle: project.group?.title || null,
    title: project.title,
    description: project.abstract || '',
    department: project.departmentId || project.group?.department || 'IT',
    status: latestSubmission ? (projectStatusToTitleStatus[project.status as ProjectStatus] || 'pending') : 'draft',
    projectStatus: project.status,
    submittedAt: latestSubmission?.submittedAt || project.createdAt,
    updatedAt: project.updatedAt,
    reviewedAt: latestSubmission?.reviewedAt || null,
    keywords: project.keywords || [],
    similarityScore: 0 as number,
    similarTitles: [] as SimilarTitleMatch[],
    membersCount: groupMembers.length,
    memberPreview: groupMembers.map((member: any) => member.name).filter(Boolean),
    groupMembers,
    rejectionReason: latestSubmission?.rejectionReason || null,
    adviserAction: latestSubmission?.rejectionReason || latestComment?.body || 'Pending adviser review for originality, scope fit, and academic clarity.',
    latestReviewComment: latestComment
      ? {
          id: latestComment.id,
          body: latestComment.body,
          decision: latestComment.decision,
          createdAt: latestComment.createdAt,
          authorName: getPersonName(latestComment.author) || null
        }
      : null,
    academicYear: project.academicYear?.label || 'Current Academic Year',
    submissionId: latestSubmission?.id || null,
    // Union both sources rather than "latest submission's files, else project's" —
    // the oral defense application evidence now lives on its own Submission
    // (separate from the title/concept-paper one), so it wouldn't show up here
    // if the title's latest submission were treated as the only source.
    uploadedFiles: (() => {
      const filesById = new Map<string, any>();
      (project.files || []).forEach((file: any) => filesById.set(file.id, file));
      (latestSubmission?.files || []).forEach((file: any) => filesById.set(file.id, file));

      return Array.from(filesById.values()).map((file: any) => ({
        id: file.id,
        name: file.fileName,
        url: `/api/document-files/${file.id}/download`,
        previewUrl: `/api/document-files/${file.id}/preview`,
        fileType: file.fileType,
        size: file.size,
        documentCategory: file.documentCategory || null,
        // Per-file upload time + uploader, so the student sees when each
        // version actually arrived (not just the proposal's submit date).
        uploadedAt: file.createdAt ?? null,
        uploadedByName: file.user?.displayName || file.user?.name || null
      }));
    })(),
    evidenceReview: findEvidenceReview(project.milestoneCheckpoints, 'concept-defense-application'),
    proposalEvidenceReview: findEvidenceReview(project.milestoneCheckpoints, 'proposal-defense-application'),
    finalEvidenceReview: findEvidenceReview(project.milestoneCheckpoints, 'final-defense-application')
  };
}

function findEvidenceReview(checkpoints: any[] | undefined, key: string) {
  const checkpoint = checkpoints?.find((item) => item.key === key);

  if (!checkpoint) {
    return null;
  }

  // Fetched newest-first (see projectInclude above) — put back in chronological
  // order so a multi-photo batch displays page-1-first, and the "latest note"
  // fallback below can just take the last entry.
  const submissionsChronological = [...(checkpoint.submissions || [])].reverse();

  // Each uploaded file is its own Submission row, so a single multi-photo batch
  // (e.g. 3 pages of the same form) is several Submissions, not one. Group
  // everything submitted since the checkpoint's last reviewedAt into "the current
  // round" — that shows a whole batch together, while an earlier, already-decided
  // round (from before the last approve/revise decision) doesn't pile up
  // alongside a later resubmission. If nothing's been submitted since that last
  // decision, fall back to just the single most recent submission, so an
  // already-approved stage still has something to show.
  const reviewedAtMs = checkpoint.reviewedAt ? new Date(checkpoint.reviewedAt).getTime() : null;
  const currentRound = reviewedAtMs
    ? submissionsChronological.filter((submission) => new Date(submission.submittedAt).getTime() > reviewedAtMs)
    : submissionsChronological;
  const relevantSubmissions = currentRound.length ? currentRound : submissionsChronological.slice(-1);

  return {
    status: checkpoint.status,
    feedback: checkpoint.latestFeedback || null,
    feedbackBy: checkpoint.latestFeedbackBy || null,
    uploaderNote: relevantSubmissions[relevantSubmissions.length - 1]?.description || null,
    files: relevantSubmissions.flatMap((submission) =>
      (submission.files || []).map((file: any) => ({
        id: file.id,
        name: file.fileName,
        url: `/api/document-files/${file.id}/download`,
        previewUrl: `/api/document-files/${file.id}/preview`,
        fileType: file.fileType,
        size: file.size,
        documentCategory: file.documentCategory || null,
        // Two stages' evidence photos can share the exact same original filename
        // (e.g. the same "Team Leader.png" re-uploaded for Concept, then again for
        // Proposal) even though they're unrelated uploads — the timestamp is what
        // actually tells them apart in the review drawer.
        uploadedAt: submission.submittedAt || null
      }))
    )
  };
}

const projectInclude = {
  academicYear: {
    select: {
      label: true
    }
  },
  group: {
    select: {
      id: true,
      code: true,
      title: true,
      projectTitle: true,
      department: true,
      leader: true,
      students: true,
      groupMembers: {
        where: { isActive: true },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              displayName: true
            }
          }
        }
      }
    }
  },
  files: {
    where: {
      documentCategory: {
        in: [
          'Title Proposal',
          'Proposal',
          'concept-defense-application',
          'proposal-defense-application',
          'final-defense-application'
        ]
      }
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      size: true,
      createdAt: true,
      user: { select: { name: true, displayName: true } },
      documentCategory: true
    }
  },
  submissions: {
    orderBy: { submittedAt: 'desc' },
    take: 1,
    select: {
      id: true,
      submittedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      files: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          size: true,
          createdAt: true,
          user: { select: { name: true, displayName: true } },
          documentCategory: true
        }
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          body: true,
          decision: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              displayName: true
            }
          }
        }
      }
    }
  },
  milestoneCheckpoints: {
    where: {
      key: { in: ['concept-defense-application', 'proposal-defense-application', 'final-defense-application'] }
    },
    select: {
      key: true,
      status: true,
      latestFeedback: true,
      latestFeedbackBy: true,
      reviewedAt: true,
      // Each uploaded file gets its own Submission row (see document-files/route.ts),
      // so a single multi-photo batch (e.g. 3 pages of the same form) can be several
      // Submissions, not one. findEvidenceReview groups these by "everything
      // submitted since the checkpoint's last reviewedAt" into one review round, so
      // a whole batch shows together but an old, already-decided round doesn't pile
      // up alongside a later resubmission. Capped at the 20 most recent to bound
      // worst case (a real evidence cycle never approaches that many) — fetched
      // newest-first so `take` keeps the recent ones, reversed back to
      // chronological order in findEvidenceReview below.
      submissions: {
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          submittedAt: true,
          description: true,
          files: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              size: true,
              documentCategory: true
            }
          }
        }
      }
    }
  }
} satisfies Prisma.ProjectInclude;

// Shared by GET (list view) and POST (immediately after a new submission) so a
// student sees the duplicate-title warning right away, not only after the page
// reloads. Mutates the already-built title payloads in place.
async function enrichWithSimilarity(
  titlePayloads: ReturnType<typeof toTitlePayload>[],
  projectsToCheck: Array<{ id: string; title: string }>
) {
  if (projectsToCheck.length === 0) {
    return;
  }

  const candidatePool = await prisma.project.findMany({
    where: {
      status: { notIn: [ProjectStatus.DRAFT, ProjectStatus.ARCHIVED] },
      title: { not: '' }
    },
    select: { id: true, title: true, group: { select: { code: true } } },
    take: 500
  });

  const candidates = candidatePool.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    groupCode: candidate.group?.code ?? null
  }));

  const payloadsById = new Map(titlePayloads.map((payload) => [payload.id, payload]));

  for (const project of projectsToCheck) {
    const payload = payloadsById.get(project.id);
    if (!payload) continue;

    const matches = findSimilarTitles(project.title, project.id, candidates);
    payload.similarityScore = matches[0]?.score ?? 0;
    payload.similarTitles = matches;
  }
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, TITLE_ROLES);
    const { searchParams } = new URL(request.url);
    const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_TITLE_LIMIT, MAX_TITLE_LIMIT);
    const page = parsePositiveInteger(searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER);

    let where: any = {};
    let studentGroupId: string | null = null;

    if (user.role === UserRole.STUDENT) {
      const group = await findStudentGroup(user);
      studentGroupId = group?.id ?? null;
      where = group
        ? {
            groupId: group.id
          }
        : {
            ownerId: user.id
          };
    } else if (user.role === UserRole.ADVISER || user.role === UserRole.PANEL) {
      where = {
        adviserId: user.id
      };
    } else if (user.role === UserRole.PROGRAM_HEAD && user.department) {
      where = {
        OR: [
          { departmentId: user.department },
          { group: { department: user.department } }
        ]
      };
    }

    const projects = await prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const titles = projects.map(toTitlePayload);

    // Only titles still awaiting a decision are worth duplicate-checking — an
    // approved or archived one doesn't need a fresh similarity read every time
    // someone loads this list.
    const projectsNeedingSimilarityCheck = projects.filter(
      (project) => project.status === ProjectStatus.SUBMITTED || project.status === ProjectStatus.UNDER_REVIEW
    );
    await enrichWithSimilarity(titles, projectsNeedingSimilarityCheck);

    const filteredTitles = user.role === UserRole.STUDENT
      ? titles
      : titles.filter(t => t.status !== 'draft');

    if (user.role === UserRole.STUDENT) {
      // The page renders its read-only view from these, not from local state,
      // so a refresh / another device / re-login can't show an editable form.
      const titleLocked = studentGroupId ? await isGroupTitleLocked(studentGroupId) : false;
      const titleHistory = studentGroupId && titleLocked ? await getTitleHistory(studentGroupId) : [];

      return successResponse({ titles: filteredTitles, titleLocked, titleHistory });
    }

    return successResponse({ titles: filteredTitles });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const contentType = request.headers.get('content-type') || '';
    
    let title = '';
    let description = '';
    let keywords: string[] = [];
    let uploadedFiles: File[] = [];
    // Set when the student applied an adviser-approved backup draft (see
    // /api/title-drafts) and submitted it unmodified — checked below against
    // the draft's actual saved content before it's trusted for anything.
    let backupDraftId = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = normalizeText(formData.get('title') as string);
      description = normalizeText(formData.get('description') as string);
      backupDraftId = normalizeText(formData.get('backupDraftId') as string);

      const keywordsData = formData.get('keywords');
      if (keywordsData) {
        try {
          keywords = JSON.parse(keywordsData as string);
        } catch {
          keywords = [];
        }
      }

      for (const [key, value] of formData.entries()) {
        if (key === 'files' && typeof value === 'object' && value !== null && 'size' in value && 'name' in value) {
          uploadedFiles.push(value as File);
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      title = normalizeText(body?.title);
      description = normalizeText(body?.description);
      backupDraftId = normalizeText(body?.backupDraftId);
      keywords = Array.isArray(body?.keywords)
        ? body.keywords.map((keyword: unknown) => normalizeText(keyword)).filter(Boolean)
        : [];
    }

    if (!title) {
      return Response.json(
        {
          success: false,
          message: 'Enter a proposed project title before submitting.'
        },
        { status: 400 }
      );
    }

    const group = await findStudentGroup(user);

    if (!group) {
      return Response.json(
        {
          success: false,
          message: 'No assigned group was found for this student account.'
        },
        { status: 400 }
      );
    }

    // Permanent lock: a group submits its title proposal exactly once. After
    // that the student is read-only (including replacement titles after a
    // Needs Revision / Rejected / New Title decision) — the assigned adviser
    // changes the title instead via /api/title-submissions/[id]/title.
    if (await isGroupTitleLocked(group.id)) {
      return Response.json({ success: false, message: TITLE_LOCKED_MESSAGE }, { status: 403 });
    }

    // A submission is 1 primary title + at least MIN_BACKUP_TITLES saved backup
    // titles, all distinct from each other and from the primary.
    const backupTitles = await prisma.titleDraft.findMany({
      where: { groupId: group.id },
      select: { title: true }
    });
    const backupKeys = backupTitles.map((draft) => normalizeTitleKey(draft.title)).filter(Boolean);

    if (backupKeys.length < MIN_BACKUP_TITLES) {
      return Response.json(
        { success: false, message: `Save at least ${MIN_BACKUP_TITLES} backup titles before submitting your title proposal.` },
        { status: 400 }
      );
    }

    const allTitleKeys = [normalizeTitleKey(title), ...backupKeys];
    if (new Set(allTitleKeys).size !== allTitleKeys.length) {
      return Response.json(
        { success: false, message: 'Your primary title and backup titles must all be different from each other.' },
        { status: 400 }
      );
    }

    // Final 20% repository similarity check (same calculation the form shows
    // live; mock Repository data only). Every title must be at or below the limit.
    const tooSimilar = [
      { label: 'Primary title', title },
      ...backupTitles.map((draft, index) => ({ label: `Backup title ${index + 1}`, title: draft.title }))
    ]
      .map((item) => ({ ...item, highest: checkTitleAgainstRepository(item.title).highest }))
      .filter((item) => item.highest > REPOSITORY_SIMILARITY_LIMIT);

    if (tooSimilar.length) {
      return Response.json(
        {
          success: false,
          message: `${tooSimilar.map((item) => `${item.label} (${item.highest}%)`).join(', ')} ${
            tooSimilar.length === 1 ? 'is' : 'are'
          } more than ${REPOSITORY_SIMILARITY_LIMIT}% similar to an existing study in the repository. Revise ${
            tooSimilar.length === 1 ? 'it' : 'them'
          } before submitting.`,
          tooSimilar
        },
        { status: 400 }
      );
    }

    // Removed the requirement for an assigned adviser so students can submit a proposal to the pending queue

    // A Concept Presentation or Proposal (or later) defense panel can decide a group
    // needs an entirely new title while any earlier, already-approved stage stays
    // approved (chair-decision/route.ts + resetProjectForNewTitle) — in that
    // specific recovery state the group's own project is left NEEDS_REVISION with a
    // NEW_TITLE chair decision on record. Detect it and update that same project in
    // place instead of creating a fresh one, so earlier-stage checkpoints and
    // evidence aren't orphaned by a title change that was never their fault.
    const pendingNewTitleProject = group.projectId
      ? await prisma.project.findFirst({
          where: {
            id: group.projectId,
            status: ProjectStatus.NEEDS_REVISION,
            defenseSchedules: {
              some: { chairDecision: DefenseChairDecision.NEW_TITLE }
            }
          },
          select: {
            id: true,
            title: true,
            defenseSchedules: {
              where: { chairDecision: DefenseChairDecision.NEW_TITLE },
              orderBy: { chairDecisionAt: 'desc' },
              take: 1,
              select: { title: true }
            }
          }
        })
      : null;

    // Which checkpoint the replacement title (and any files attached to it)
    // should link to depends on which stage's panel actually required the new
    // title — see NEW_TITLE_SUBMISSION_CHECKPOINT_KEY. Falls back to Proposal
    // when the triggering schedule's stage can't be determined, matching this
    // code's original, pre-Concept-aware behavior.
    const newTitleStage = pendingNewTitleProject
      ? getNewTitleRecoveryStage(pendingNewTitleProject.defenseSchedules[0]?.title ?? '') ?? 'proposal'
      : null;
    const newTitleCheckpointKey = newTitleStage ? NEW_TITLE_SUBMISSION_CHECKPOINT_KEY[newTitleStage] : null;

    // If a replacement title was already submitted and is still awaiting the
    // adviser's decision (status SUBMITTED/UNDER_REVIEW, not NEEDS_REVISION
    // anymore), block a second one instead of silently spinning up a brand-new,
    // disconnected Project with none of this group's Concept-stage history —
    // that's exactly what used to happen here, and worse, approving the wrong
    // one would reassign Group.projectId away from the real project entirely.
    if (group.projectId && !pendingNewTitleProject) {
      const pendingReplacementProject = await prisma.project.findFirst({
        where: {
          id: group.projectId,
          status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.UNDER_REVIEW] },
          defenseSchedules: {
            some: { chairDecision: DefenseChairDecision.NEW_TITLE }
          }
        },
        select: { id: true }
      });

      if (pendingReplacementProject) {
        return Response.json(
          {
            success: false,
            message: 'Your replacement title is already awaiting your adviser’s review. Wait for a decision before submitting another.'
          },
          { status: 409 }
        );
      }
    }

    // The whole point of a "New Title" decision is that the title has to actually
    // change — block resubmitting the exact same one (trim/case-insensitive so
    // whitespace or capitalization tweaks don't count as "different"). Whether a
    // reworded-but-still-the-same-idea title is different ENOUGH is a judgment
    // call for the adviser reviewing it, not something a text match can safely
    // decide — this only catches the "didn't actually change it" case.
    if (pendingNewTitleProject && normalizeText(title).toLowerCase() === normalizeText(pendingNewTitleProject.title).toLowerCase()) {
      return Response.json(
        {
          success: false,
          message: 'This is the same title the panel required you to change. Submit a genuinely different title.'
        },
        { status: 400 }
      );
    }

    // A backup draft the adviser already approved skips a second review cycle
    // ONLY when the content actually submitted still matches exactly what was
    // approved — the client remembers which draft was last applied, but this
    // check is what's actually trusted, so silently editing the title/keywords
    // after applying a backup (or applying a different, unapproved one) just
    // falls back to the normal pending-review path with no error shown.
    const sortedKeywordsMatch = (a: string[], b: string[]) =>
      a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

    const approvedBackupDraft = pendingNewTitleProject && backupDraftId
      ? await prisma.titleDraft.findFirst({
          where: { id: backupDraftId, groupId: group.id, reviewStatus: MilestoneCheckpointReviewStatus.APPROVED },
          select: {
            title: true,
            description: true,
            keywords: true,
            reviewedBy: { select: { name: true, displayName: true } },
            files: { select: { id: true } }
          }
        })
      : null;

    const isPreApprovedSubmission = Boolean(
      approvedBackupDraft &&
      normalizeText(approvedBackupDraft.title).toLowerCase() === normalizeText(title).toLowerCase() &&
      normalizeText(approvedBackupDraft.description || '') === normalizeText(description) &&
      sortedKeywordsMatch(approvedBackupDraft.keywords, keywords)
    );
    const preApprovedByName = approvedBackupDraft?.reviewedBy
      ? (approvedBackupDraft.reviewedBy.displayName || approvedBackupDraft.reviewedBy.name || 'Your adviser')
      : 'Your adviser';

    const { project, submissionId } = await prisma.$transaction(async (tx) => {
      if (pendingNewTitleProject) {
        const updatedProject = await tx.project.update({
          where: { id: pendingNewTitleProject.id },
          data: {
            title,
            abstract: description || 'Replacement title proposal submitted for adviser validation.',
            keywords,
            status: isPreApprovedSubmission ? ProjectStatus.APPROVED : ProjectStatus.SUBMITTED
          }
        });

        const submission = await tx.submission.create({
          data: {
            projectId: updatedProject.id,
            submittedById: user.id,
            title: 'Replacement Title Submission',
            description: description || `Proposed replacement title: ${title}`,
            status: isPreApprovedSubmission ? SubmissionStatus.APPROVED : SubmissionStatus.SUBMITTED,
            reviewedAt: isPreApprovedSubmission ? new Date() : null,
            version: 1
          }
        });

        await recordCheckpointSubmission(tx, {
          projectId: updatedProject.id,
          checkpointKey: newTitleCheckpointKey!,
          submissionId: submission.id
        });

        if (isPreApprovedSubmission) {
          // The checkpoint itself still needs to flip to approved/completed —
          // recordCheckpointSubmission above only links the submission to it and
          // leaves it pending, same as any normal submission would.
          await syncCheckpointReview(tx, {
            submissionId: submission.id,
            nextStatus: SubmissionStatus.APPROVED,
            reviewNotes: `Pre-approved backup title, applied automatically by ${getPersonName(user) || 'the student'}.`,
            reviewerName: preApprovedByName,
            reviewerRole: UserRole.ADVISER
          });

          // Mirrors the group-sync step PATCH /api/title-submissions runs on a
          // normal adviser approval — Group.status/milestone are separate stored
          // columns from Project.status, so without this the group's own status
          // badge and milestone label would stay stuck on the pre-rejection state
          // even though the replacement title is already fully approved.
          await tx.group.update({
            where: { id: group.id },
            data: {
              projectId: updatedProject.id,
              projectTitle: updatedProject.title,
              title: updatedProject.title,
              status: 'active',
              statusLabel: 'Active',
              statusClass: 'status-active',
              milestone: newTitleStage === 'concept' ? 'Concept Proposal' : 'Proposal',
              currentMilestone: newTitleStage === 'concept' ? 'Concept Proposal' : 'Proposal'
            }
          });
        }

        if (group.userId) {
          await tx.notification.create({
            data: {
              userId: group.userId,
              title: isPreApprovedSubmission ? 'Replacement Title Auto-Approved' : 'Replacement Title Submitted',
              message: isPreApprovedSubmission
                ? `${getPersonName(user) || 'A student'} applied a replacement title "${title}" that you had already pre-approved as a backup — it's been approved automatically, no review needed.`
                : `${getPersonName(user) || 'A student'} submitted a replacement title "${title}" for adviser review.`,
              type: isPreApprovedSubmission ? 'success' : 'feedback',
              entityType: 'project',
              entityId: updatedProject.id
            }
          });
        }

        const fullProject = await tx.project.findUniqueOrThrow({
          where: { id: updatedProject.id },
          include: projectInclude
        });

        return { project: fullProject, submissionId: submission.id };
      }

      const deptName = group.department || group.dept || null;
      let resolvedDeptId: string | null = null;
      if (deptName) {
        const dept = await tx.department.findFirst({
          where: {
            OR: [
              { id: deptName },
              { name: { equals: deptName, mode: 'insensitive' } }
            ]
          },
          select: { id: true }
        });
        resolvedDeptId = dept?.id ?? null;
      }

      const createdProject = await tx.project.create({
        data: {
          title,
          abstract: description || 'Title proposal submitted for adviser validation.',
          keywords,
          status: ProjectStatus.SUBMITTED,
          groupId: group.id,
          ownerId: user.id,
          adviserId: group.userId,
          departmentId: resolvedDeptId
        }
      });

      const submission = await tx.submission.create({
        data: {
          projectId: createdProject.id,
          submittedById: user.id,
          title: 'Title Proposal Submission',
          description: description || `Proposed project title: ${title}`,
          status: SubmissionStatus.SUBMITTED,
          version: 1
        }
      });

      await recordCheckpointSubmission(tx, {
        projectId: createdProject.id,
        checkpointKey: 'concept-title',
        submissionId: submission.id
      });

      if (group.userId) {
        await tx.notification.create({
          data: {
            userId: group.userId,
            title: 'New Title Proposal Submitted',
            message: `${getPersonName(user) || 'A student'} submitted "${title}" for adviser title review.`,
            type: 'feedback',
            entityType: 'project',
            entityId: createdProject.id
          }
        });
      }

      const fullProject = await tx.project.findUniqueOrThrow({
        where: { id: createdProject.id },
        include: projectInclude
      });

      return { project: fullProject, submissionId: submission.id };
    }, {
      maxWait: 15000,
      timeout: 60000
    });

    // Files attached to the title form link to the same checkpoint the title
    // submission itself just used above — a Proposal-stage replacement title's
    // evidence must NOT fall back to 'concept-title' (that would silently reopen
    // an already-completed Concept checkpoint, which is exactly what happened
    // before this fix: attaching a file to a replacement-title submission
    // flipped Concept back to "submitted" even though nothing about Concept had
    // changed). A Concept-stage replacement title legitimately DOES use
    // 'concept-title' — that's the same checkpoint a first-time submission uses,
    // since the rejected stage there was Concept itself.
    const fileCheckpointKey = newTitleCheckpointKey ?? 'concept-title';

    // A pre-approved backup that already has its own attached files doesn't
    // need the student to re-upload anything — the exact same files just move
    // over to become this submission's real files (re-parented from the now-
    // fulfilled backup draft), instead of forcing a redundant re-upload of
    // something already sitting in storage.
    if (isPreApprovedSubmission && approvedBackupDraft && approvedBackupDraft.files.length) {
      for (const file of approvedBackupDraft.files) {
        try {
          const movedFile = await prisma.uploadedFile.update({
            where: { id: file.id },
            data: {
              projectId: project.id,
              submissionId,
              documentCategory: 'Title Proposal',
              category: 'Title Proposal',
              titleDraftId: null
            }
          });

          await recordCheckpointSubmission(prisma, {
            projectId: project.id,
            checkpointKey: fileCheckpointKey,
            documentCategory: 'Title Proposal',
            fileName: movedFile.fileName,
            fileId: movedFile.id
          });
        } catch (fileMoveError) {
          console.warn(`Unable to move backup file ${file.id} to the new submission:`, fileMoveError);
        }
      }
    }

    // Handle file uploads OUTSIDE the transaction so slow Supabase calls don't cause timeouts
    for (const file of uploadedFiles) {
      const bucketName = DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS;
      const filePath = generateUniqueFilePath({
        bucketName,
        projectId: project.id,
        userId: user.id,
        fileName: file.name
      });

      try {
        await uploadFile({ bucketName, filePath, file });
      } catch (uploadError) {
        // No object in storage means no row either — a row here would show the
        // adviser a file that can never be opened.
        console.warn(`Supabase file upload skipped for ${file.name}:`, uploadError);
        continue;
      }

      let recordCreated = false;

      try {
        const uploadedFile = await prisma.uploadedFile.create({
          data: {
            fileName: file.name,
            filePath,
            bucketName,
            fileType: file.type || 'application/octet-stream',
            documentCategory: 'Title Proposal',
            category: 'Title Proposal',
            visibility: 'private',
            size: file.size,
            userId: user.id,
            projectId: project.id,
            submissionId: submissionId
          }
        });
        recordCreated = true;

        await recordCheckpointSubmission(prisma, {
          projectId: project.id,
          checkpointKey: fileCheckpointKey,
          documentCategory: 'Title Proposal',
          fileName: file.name,
          fileId: uploadedFile.id
        });
      } catch (fileDbError) {
        console.warn(`File database record skipped for ${file.name}:`, fileDbError);

        if (!recordCreated) {
          await deleteFile(bucketName, filePath).catch((cleanupError) => {
            console.error(`Failed to remove orphaned upload ${filePath}:`, cleanupError);
          });
        }
      }
    }

    // Check for duplicates immediately so the student sees the warning right on
    // the submission response, instead of only finding out after reloading the
    // page (which is when GET's version of this same check would otherwise run).
    const titlePayload = toTitlePayload(project);
    await enrichWithSimilarity([titlePayload], [{ id: project.id, title: project.title }]);

    return successResponse({ title: titlePayload }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [
      UserRole.ADVISER,
      UserRole.PANEL,
      UserRole.RESEARCH_HEAD,
      UserRole.PROGRAM_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.ADMIN
    ]);
    const body = await request.json().catch(() => ({}));
    const id = normalizeText(body?.id);
    const decision = normalizeText(body?.decision).toLowerCase();
    const remarks = normalizeText(body?.remarks);
    const nextStatus = titleStatusToProjectStatus[decision as keyof typeof titleStatusToProjectStatus];

    if (!id || !nextStatus) {
      return Response.json(
        {
          success: false,
          message: 'Use a valid title id and decision: approved, needs_revision, rejected, or pending.'
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        group: true,
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      return Response.json(
        {
          success: false,
          message: 'Title submission was not found.'
        },
        { status: 404 }
      );
    }

    const isAssignedAdviser = project.adviserId === user.id;
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.RESEARCH_HEAD || user.role === UserRole.PROGRAM_HEAD;

    if (!isAssignedAdviser && !isAdmin) {
      return Response.json(
        {
          success: false,
          message: 'You can update only title submissions assigned to you.'
        },
        { status: 403 }
      );
    }

    // The oral defense application evidence is no longer required before title
    // approval — the adviser now approves the idea first, and the evidence is
    // uploaded and independently reviewed afterward (see
    // /api/concept-defense-application's PATCH handler), with its own hard
    // block further down the workflow at presentation scheduling instead.

    const submissionStatus = nextStatus === ProjectStatus.APPROVED
      ? SubmissionStatus.APPROVED
      : nextStatus === ProjectStatus.NEEDS_REVISION
        ? SubmissionStatus.NEEDS_REVISION
        : nextStatus === ProjectStatus.ARCHIVED
          ? SubmissionStatus.REJECTED
          : SubmissionStatus.SUBMITTED;
    const reviewDecision = nextStatus === ProjectStatus.APPROVED
      ? ReviewDecision.APPROVE
      : nextStatus === ProjectStatus.NEEDS_REVISION
        ? ReviewDecision.REQUEST_CHANGES
        : nextStatus === ProjectStatus.ARCHIVED
          ? ReviewDecision.REJECT
          : ReviewDecision.COMMENT;

    const updatedProject = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: project.id },
        data: { status: nextStatus }
      });

      const submission = project.submissions[0]
        ? await tx.submission.update({
            where: { id: project.submissions[0].id },
            data: {
              status: submissionStatus,
              reviewedAt: new Date(),
              rejectionReason: submissionStatus === SubmissionStatus.REJECTED ? remarks : undefined
            }
          })
        : await tx.submission.create({
            data: {
              projectId: project.id,
              submittedById: project.ownerId,
              title: 'Title Proposal Submission',
              description: project.abstract,
              status: submissionStatus,
              reviewedAt: new Date(),
              rejectionReason: submissionStatus === SubmissionStatus.REJECTED ? remarks : undefined
            }
          });

      if (remarks) {
        await tx.reviewComment.create({
          data: {
            submissionId: submission.id,
            authorId: user.id,
            body: remarks,
            decision: reviewDecision
          }
        });
      }

      // Every title decision used to be about the 'concept-title' checkpoint, so this
      // unconditionally (re)linked the submission there — but a replacement title
      // submitted after a Proposal-stage "New Title" decision is deliberately linked
      // to 'proposal-adviser-review' instead (see the POST handler above). Only
      // (re)link to concept-title when the submission doesn't already have its own
      // checkpoint association, so that deliberate link never gets silently clobbered.
      if (!project.submissions[0]?.checkpointId) {
        await recordCheckpointSubmission(tx, {
          projectId: project.id,
          checkpointKey: 'concept-title',
          submissionId: submission.id
        });
      }

      const updatedTitleCheckpoint = await syncCheckpointReview(tx, {
        submissionId: submission.id,
        nextStatus: submissionStatus,
        reviewNotes: remarks,
        reviewerName: getPersonName(user) || user.name,
        reviewerRole: user.role
      });

      // Reopening a title that was already approved (adviser now wants a new
      // one, e.g. after a Proposal-stage rejection) — syncCheckpointReview
      // above only touches the 'concept-title' checkpoint, so without this
      // the roadmap keeps showing "Adviser idea approval: Completed" even
      // though the title itself just got sent back for revision.
      if (project.status === ProjectStatus.APPROVED && nextStatus !== ProjectStatus.APPROVED) {
        await tx.milestoneCheckpoint.updateMany({
          where: { projectId: project.id, key: 'concept-adviser-approval' },
          data: {
            status: MilestoneCheckpointStatus.PENDING,
            adviserReviewStatus: MilestoneCheckpointReviewStatus.PENDING,
            submittedAt: null,
            reviewedAt: null,
            completedAt: null,
            latestFeedback: remarks || null,
            latestFeedbackBy: remarks ? (getPersonName(user) || user.name) : null,
            latestFeedbackAt: remarks ? new Date() : null
          }
        });

        if (updatedTitleCheckpoint?.milestoneId) {
          await updateMilestoneRollup(tx, updatedTitleCheckpoint.milestoneId);
        }
      }

      if (nextStatus === ProjectStatus.APPROVED && project.groupId) {
        // Group.status/statusLabel/statusClass are separate stored columns from
        // Project.status — this endpoint used to only sync the title fields, so an
        // approved title left the group's own status badge stuck on "Pending"
        // indefinitely. Set it the same way the adviser-groups quick-approve action
        // already does, so both approval paths agree.
        await tx.group.update({
          where: { id: project.groupId },
          data: {
            projectId: project.id,
            projectTitle: project.title,
            title: project.title,
            status: 'active',
            statusLabel: 'Active',
            statusClass: 'status-active',
            milestone: 'Concept Proposal',
            currentMilestone: 'Concept Proposal'
          }
        });

        const otherProjects = await tx.project.findMany({
          where: {
            groupId: project.groupId,
            id: { not: project.id },
            status: { notIn: [ProjectStatus.ARCHIVED, ProjectStatus.APPROVED] }
          },
          select: { id: true }
        });

        if (otherProjects.length > 0) {
          const otherProjectIds = otherProjects.map((p) => p.id);
          
          await tx.project.updateMany({
            where: { id: { in: otherProjectIds } },
            data: { status: ProjectStatus.ARCHIVED }
          });
          
          await tx.submission.updateMany({
            where: {
              projectId: { in: otherProjectIds },
              status: { notIn: [SubmissionStatus.APPROVED, SubmissionStatus.REJECTED, SubmissionStatus.ARCHIVED] }
            },
            data: { status: SubmissionStatus.REJECTED, reviewedAt: new Date() }
          });
        }
      }

      if (project.ownerId) {
        await tx.notification.create({
          data: {
            userId: project.ownerId,
            title: 'Title Review Updated',
            message: `"${project.title}" was ${projectStatusToTitleStatus[nextStatus]} by your adviser.${remarks ? ' Review notes are available.' : ''}`,
            type: nextStatus === ProjectStatus.APPROVED ? 'success' : nextStatus === ProjectStatus.NEEDS_REVISION ? 'warning' : 'info',
            entityType: 'project',
            entityId: project.id
          }
        });
      }

      return tx.project.findUniqueOrThrow({
        where: { id: updated.id },
        include: projectInclude
      });
    }, {
      maxWait: 15000,
      timeout: 60000
    });

    return successResponse({ title: toTitlePayload(updatedProject) });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/title-submissions', handleGET);
export const POST = withApiLogging('POST', '/api/title-submissions', handlePOST);
export const PATCH = withApiLogging('PATCH', '/api/title-submissions', handlePATCH);
