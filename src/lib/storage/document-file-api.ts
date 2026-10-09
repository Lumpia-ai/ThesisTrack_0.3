import { type UploadedFile } from '@/generated/prisma/client';
import { getFileLabel, getStageForCheckpointKey, getStageLabel } from '@/lib/stage-labels';

type DocumentFilePayloadInput = UploadedFile & {
  checkpoint?: { key: string } | null;
  user?: {
    id: string;
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  };
  project?: {
    id: string;
    title: string;
    group?: {
      code: string;
      title: string;
      projectTitle: string;
      currentMilestone: string;
      leader?: string | null;
      students?: string[];
      groupMembers?: Array<{
        userId?: string | null;
        isActive?: boolean | null;
        role?: string | null;
        user?: {
          id: string;
          name: string;
          firstName?: string | null;
          lastName?: string | null;
          displayName?: string | null;
        } | null;
      }>;
    } | null;
  } | null;
  submission?: {
    id: string;
    status: string;
    version: number;
    submittedAt: Date;
    reviewedAt?: Date | null;
    rejectionReason?: string | null;
    comments?: Array<{
      id: string;
      body: string;
      decision: string;
      createdAt: Date;
      authorId?: string | null;
      author?: {
        id: string;
        name: string;
        firstName?: string | null;
        lastName?: string | null;
        displayName?: string | null;
      } | null;
    }>;
  } | null;
};

type DocumentFilePayloadOptions = {
  exposeReviewComments?: boolean;
};

type DocumentFileGroupMemberPayload = {
  userId?: string;
  name: string;
  role: string;
  isLeader: boolean;
};

function getUploaderName(file: DocumentFilePayloadInput) {
  if (!file.user) {
    return file.userId;
  }

  return file.user.displayName || file.user.name || [file.user.firstName, file.user.lastName].filter(Boolean).join(' ') || file.userId;
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

function getGroupMembers(file: DocumentFilePayloadInput) {
  const group = file.project?.group;

  if (!group) {
    return [];
  }

  const leaderName = String(group.leader || '').trim();
  const membersFromRelations = (group.groupMembers || [])
    .map((member): DocumentFileGroupMemberPayload | null => {
      if (member.isActive === false) {
        return null;
      }

      const userId = member.userId || member.user?.id || '';
      const name = getPersonName(member.user) || userId;

      if (!name) {
        return null;
      }

      const isLeader = String(member.role || '').toLowerCase() === 'leader'
        || (leaderName ? name.trim().toLowerCase() === leaderName.toLowerCase() : false);

      return {
        ...(userId ? { userId } : {}),
        name,
        role: isLeader ? 'Leader' : 'Member',
        isLeader
      };
    })
    .filter((member): member is DocumentFileGroupMemberPayload => Boolean(member));

  if (membersFromRelations.length) {
    return membersFromRelations.sort((left, right) => Number(right.isLeader) - Number(left.isLeader));
  }

  return (group.students || []).map((student) => {
    const isLeader = leaderName
      ? student.trim().toLowerCase() === leaderName.toLowerCase()
      : false;

    return {
      name: student,
      role: isLeader ? 'Leader' : 'Member',
      isLeader
    };
  }).sort((left, right) => Number(right.isLeader) - Number(left.isLeader));
}

function toReviewCommentPayload(comment: NonNullable<NonNullable<DocumentFilePayloadInput['submission']>['comments']>[number]) {
  return {
    id: comment.id,
    body: comment.body,
    decision: comment.decision,
    createdAt: comment.createdAt,
    authorId: comment.authorId ?? comment.author?.id ?? null,
    authorName: getPersonName(comment.author) || null
  };
}

export function toDocumentFilePayload(file: DocumentFilePayloadInput, options: DocumentFilePayloadOptions = {}) {
  const exposedComments = options.exposeReviewComments === false ? [] : file.submission?.comments ?? [];
  const latestComment = exposedComments[0] ?? null;

  return {
    id: file.id,
    fileName: file.fileName,
    filePath: file.filePath,
    bucketName: file.bucketName,
    fileType: file.fileType,
    fileSize: file.size,
    uploadedBy: file.userId,
    uploadedByName: getUploaderName(file),
    projectId: file.projectId,
    projectTitle: file.project?.title ?? file.project?.group?.projectTitle ?? null,
    groupCode: file.project?.group?.code ?? null,
    groupTitle: file.project?.group?.title ?? null,
    groupMembers: getGroupMembers(file),
    milestone: file.project?.group?.currentMilestone ?? null,
    // The stage this file was filed under (not the group's current stage) and
    // the label it carries everywhere — see src/lib/stage-labels.ts.
    checkpointKey: file.checkpoint?.key ?? null,
    stage: getStageForCheckpointKey(file.checkpoint?.key),
    stageLabel: file.checkpoint?.key ? getStageLabel(getStageForCheckpointKey(file.checkpoint.key)) : null,
    label: getFileLabel({ checkpointKey: file.checkpoint?.key, documentCategory: file.documentCategory, fileName: file.fileName }),
    submissionId: file.submissionId,
    submissionStatus: file.submission?.status ?? null,
    submissionVersion: file.submission?.version ?? null,
    submittedAt: file.submission?.submittedAt ?? null,
    reviewedAt: file.submission?.reviewedAt ?? null,
    rejectionReason: file.submission?.rejectionReason ?? null,
    latestReviewComment: latestComment ? toReviewCommentPayload(latestComment) : null,
    reviewComments: exposedComments.map(toReviewCommentPayload),
    documentCategory: file.documentCategory,
    visibility: file.visibility,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt
  };
}
