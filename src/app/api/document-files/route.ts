import { MilestoneStatus, ProjectStatus, SubmissionStatus, UserRole } from '@/generated/prisma/client';
import { getMimeTypeForFile } from '@/lib/storage/file-preview';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  handleApiError,
  normalizeText,
  successResponse
} from '@/lib/utils';
import {
  ACHIEVEMENT_DOCUMENT_CATEGORIES,
  CONCEPT_GATE_EXEMPT_DOCUMENT_CATEGORIES,
  DOCUMENT_STORAGE_BUCKETS,
  DOCUMENT_UPLOAD_ERROR_MESSAGES,
  EVIDENCE_FILE_TYPE_CATEGORIES,
  type DocumentStorageBucket
} from '@/lib/storage/upload-config';
import {
  assertCanUploadDocument,
  canAccessDocument,
  getBestProjectAccessRecord,
  getStudentUploadProjectAccessRecord
} from '@/lib/storage/document-authorization';
import {
  assertDocumentBucket,
  assertValidDocumentFile,
  deleteFile,
  generateUniqueFilePath,
  uploadFile
} from '@/lib/storage/supabase-storage';
import { toDocumentFilePayload } from '@/lib/storage/document-file-api';
import {
  recordCheckpointSubmission,
  resolveMilestoneCheckpointForSubmission
} from '@/lib/milestone-checkpoint-tracking';
import { withApiLogging } from '@/lib/api-logging';
import { getFileLabel } from '@/lib/stage-labels';

export const runtime = 'nodejs';

const DOCUMENT_VIEWER_ROLES = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

const DEFAULT_DOCUMENT_FILE_LIMIT = 50;
const MAX_DOCUMENT_FILE_LIMIT = 100;

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

function getBucketForCategory(value: string): DocumentStorageBucket {
  if (value === DOCUMENT_STORAGE_BUCKETS.EVALUATION_FILES) {
    return DOCUMENT_STORAGE_BUCKETS.EVALUATION_FILES;
  }

  if (value === DOCUMENT_STORAGE_BUCKETS.FINAL_REPOSITORY) {
    return DOCUMENT_STORAGE_BUCKETS.FINAL_REPOSITORY;
  }

  return DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS;
}

async function assertConceptApprovedForUpload(projectId: string, hasProjectApproval: boolean) {
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { sequence: 'asc' },
    select: {
      title: true,
      status: true,
      completedAt: true
    },
    take: 20
  });
  const conceptMilestone = milestones.find((milestone) => milestone.title.toLowerCase().includes('concept'))
    || milestones[0]
    || null;

  if (!conceptMilestone && hasProjectApproval) {
    return;
  }

  const completedStatuses: MilestoneStatus[] = [MilestoneStatus.APPROVED, MilestoneStatus.COMPLETED];

  if (conceptMilestone && (completedStatuses.includes(conceptMilestone.status) || conceptMilestone.completedAt)) {
    return;
  }

  throw new HttpError(`${conceptMilestone?.title || 'Concept'} must be completed and approved by the panels before project file uploads are available.`, 400, {
    milestone: 'Complete concept approval before uploading project files.'
  });
}

async function createUploadNotifications({
  bucketName,
  documentCategory,
  checkpointKey,
  fileName,
  fileId,
  uploaderId,
  project
}: {
  bucketName: DocumentStorageBucket;
  documentCategory: string;
  checkpointKey: string | null;
  fileName: string;
  fileId: string;
  uploaderId: string;
  project: Awaited<ReturnType<typeof getBestProjectAccessRecord>>;
}) {
  const recipientIds = new Set<string>([uploaderId]);

  // Award/Recognition and Activity Evidence are a read-only achievement log —
  // no adviser review step exists for them, so don't page the adviser/panel
  // as if a submission were waiting on them.
  if (bucketName === DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS && project && !ACHIEVEMENT_DOCUMENT_CATEGORIES.has(documentCategory)) {
    if (project.adviserId && project.adviserId !== uploaderId) {
      recipientIds.add(project.adviserId);
    }

    project.evaluations.forEach((evaluation) => {
      if (evaluation.evaluatorId && evaluation.evaluatorId !== uploaderId) {
        recipientIds.add(evaluation.evaluatorId);
      }
    });
  }

  // Same automatic, stage-aware label the file carries everywhere else
  // ("Concept Paper", "Proposal · Chapter 2", ...).
  const label = checkpointKey ? getFileLabel({ checkpointKey, documentCategory, fileName }) : null;

  const notifications = Array.from(recipientIds).map((recipientId) => {
    const isUploader = recipientId === uploaderId;
    const isThesisDocument = bucketName === DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS;

    return {
      userId: recipientId,
      title: label
        ? `${label} Submitted`
        : isUploader
          ? 'Document Uploaded'
          : 'New Student Document Uploaded',
      message: isUploader
        ? `${fileName} was uploaded successfully${label ? ` as ${label}` : ''} to private document storage.`
        : `A student uploaded ${fileName}${label ? ` (${label})` : ''} for adviser review.`,
      type: isUploader ? 'success' : isThesisDocument ? 'feedback' : 'info',
      entityType: 'uploaded_file',
      entityId: fileId
    };
  });

  if (!notifications.length) {
    return;
  }

  try {
    await prisma.notification.createMany({
      data: notifications
    });
  } catch (error) {
    console.error('[DOCUMENT UPLOAD] Failed to create upload notifications:', error);
  }
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, DOCUMENT_VIEWER_ROLES);
    const url = new URL(request.url);
    const bucketName = normalizeText(url.searchParams.get('bucketName'));
    const projectId = normalizeText(url.searchParams.get('projectId'));
    const limit = parsePositiveInteger(url.searchParams.get('limit'), DEFAULT_DOCUMENT_FILE_LIMIT, MAX_DOCUMENT_FILE_LIMIT);
    const page = parsePositiveInteger(url.searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER);

    if (bucketName) {
      assertDocumentBucket(bucketName);
    }

    // An Adviser and a Panel member need different scoping here, even though
    // both can hold an Evaluation row on the same project: being asked to sit
    // on one defense panel for a group you don't advise shouldn't pull that
    // group's entire document history into your own "documents from groups I
    // advise" queue (Document Submissions, Other Pending Documents) — that
    // panel duty belongs to the Evaluations/defense-voting flow instead. A
    // Panel account, by contrast, has no advisee projects of its own at all —
    // the evaluator condition is its only legitimate grant, so it stays.
    const adviserPanelProjectWhere = user.role === UserRole.ADVISER
      ? {
          OR: [
            { adviserId: user.id },
            { group: { groupMembers: { some: { userId: user.id, isActive: true } } } }
          ]
        }
      : user.role === UserRole.PANEL
        ? {
            OR: [
              { adviserId: user.id },
              { group: { groupMembers: { some: { userId: user.id, isActive: true } } } },
              { evaluations: { some: { evaluatorId: user.id } } }
            ]
          }
        : null;

    const where = {
      ...(bucketName ? { bucketName } : { bucketName: { not: null } }),
      ...(projectId ? { projectId } : {}),
      // Backup title attachments (see /api/title-drafts) share this same
      // thesis-documents bucket and (for a student) the same uploader — so
      // without this they'd otherwise leak into the generic document listing
      // here (a student's own Document Tracker, or an adviser/oversight
      // role's submissions queue) even though they were never submitted
      // anywhere. They stay reachable only through the dedicated
      // /api/title-drafts* endpoints.
      titleDraftId: null,
      // Same for post-defense compliance uploads — reviewed by the defense
      // panel through /api/compliance, not the adviser's submissions queue.
      complianceSubmission: { is: null },
      ...(user.role === UserRole.STUDENT ? { userId: user.id } : {}),
      ...(adviserPanelProjectWhere ? { project: adviserPanelProjectWhere } : {}),
      ...(user.role === UserRole.PROGRAM_HEAD && user.department
        ? {
            OR: [
              { project: { departmentId: user.department } },
              { project: { group: { department: user.department } } }
            ]
          }
        : {})
    };

    const files = await prisma.uploadedFile.findMany({
      where,
      include: {
        checkpoint: { select: { key: true } },
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        submission: {
          select: {
            id: true,
            status: true,
            version: true,
            submittedAt: true,
            reviewedAt: true,
            comments: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                id: true,
                body: true,
                decision: true,
                createdAt: true,
                authorId: true,
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
        project: {
          select: {
            id: true,
            status: true,
            title: true,
            ownerId: true,
            adviserId: true,
            departmentId: true,
            groupId: true,
            group: {
              select: {
                code: true,
                title: true,
                projectTitle: true,
                currentMilestone: true,
                leader: true,
                students: true,
                department: true,
                groupMembers: {
                  where: { isActive: true },
                  select: {
                    userId: true,
                    isActive: true,
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
            evaluations: {
              select: {
                evaluatorId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return successResponse({
      files: files
        .filter((file) => canAccessDocument(user, file))
        .map((file) => toDocumentFilePayload(file, {
          exposeReviewComments: user.role !== UserRole.STUDENT
            || file.submission?.status === SubmissionStatus.NEEDS_REVISION
            || file.submission?.status === SubmissionStatus.APPROVED
        }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, DOCUMENT_VIEWER_ROLES);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new HttpError(DOCUMENT_UPLOAD_ERROR_MESSAGES.missingFile, 400, {
        file: DOCUMENT_UPLOAD_ERROR_MESSAGES.missingFile
      });
    }

    const documentCategory = normalizeText(formData.get('documentCategory')) || 'Uncategorized';
    const bucketNameValue = normalizeText(formData.get('bucketName')) || getBucketForCategory(documentCategory);
    const fileTypeMode = EVIDENCE_FILE_TYPE_CATEGORIES.has(documentCategory);
    assertDocumentBucket(bucketNameValue);
    assertValidDocumentFile(file, bucketNameValue, fileTypeMode);

    const projectId = normalizeText(formData.get('projectId'));
    const checkpointKey = normalizeText(formData.get('checkpointKey'));
    const uploaderNote = normalizeText(formData.get('notes'));
    const project = bucketNameValue === DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS && user.role === UserRole.STUDENT
      ? await getStudentUploadProjectAccessRecord(user, projectId)
      : await getBestProjectAccessRecord(user, projectId);

    if (bucketNameValue === DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS && user.role === UserRole.STUDENT) {
      if (!project) {
        throw new HttpError('No assigned thesis project was found for your account.', 400, {
          projectId: 'Ask your adviser to assign your group to a project before uploading documents.'
        });
      }

      if (!project.adviserId) {
        throw new HttpError('Your thesis project does not have an assigned adviser yet.', 400, {
          adviserId: 'Ask your program adviser to assign an adviser before uploading documents.'
        });
      }

      if (!CONCEPT_GATE_EXEMPT_DOCUMENT_CATEGORIES.has(documentCategory)) {
        const approvedStatuses: ProjectStatus[] = [ProjectStatus.APPROVED, ProjectStatus.DEFENSE_SCHEDULED, ProjectStatus.COMPLETED];
        await assertConceptApprovedForUpload(project.id, approvedStatuses.includes(project.status));
      }
    }

    await assertCanUploadDocument({
      user,
      bucketName: bucketNameValue,
      projectId: project?.id ?? projectId
    });

    const filePath = generateUniqueFilePath({
      bucketName: bucketNameValue,
      projectId: project?.id ?? projectId ?? 'unassigned',
      userId: user.id,
      fileName: file.name
    });

    await uploadFile({
      bucketName: bucketNameValue,
      filePath,
      file,
      allowImages: fileTypeMode
    });

    const shouldLinkCheckpoint = bucketNameValue === DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS
      && Boolean(project?.id)
      && !ACHIEVEMENT_DOCUMENT_CATEGORIES.has(documentCategory);

    // The object is already in storage by now, so if anything below rejects the
    // upload (e.g. the duplicate-pending 409) the object has to be removed again —
    // otherwise it sits in the bucket with no row pointing at it, using quota forever.
    const uploadedFile = await prisma.$transaction(async (tx) => {
      const checkpoint = shouldLinkCheckpoint && project?.id
        ? await resolveMilestoneCheckpointForSubmission(tx, {
            projectId: project.id,
            checkpointKey,
            documentCategory,
            fileName: file.name
          })
        : null;

      // Backstops the client-side check: reject re-uploading the exact same
      // file while an earlier submission of it is still awaiting a decision,
      // so a slow network retry or a bypass of the client guard can't quietly
      // create a second identical row stuck showing "Sent to Adviser" forever.
      if (checkpoint) {
        const duplicatePending = await tx.submission.findFirst({
          where: {
            checkpointId: checkpoint.id,
            status: SubmissionStatus.SUBMITTED,
            title: file.name
          },
          select: { id: true }
        });

        if (duplicatePending) {
          throw new HttpError(`${file.name} is already awaiting your adviser's review — wait for a decision before submitting it again.`, 409);
        }
      }

      const submission = bucketNameValue === DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS
        && project?.id
        && !ACHIEVEMENT_DOCUMENT_CATEGORIES.has(documentCategory)
        ? await tx.submission.create({
            data: {
              projectId: project.id,
              milestoneId: checkpoint?.milestoneId,
              checkpointId: checkpoint?.id,
              submittedById: user.id,
              title: file.name,
              description: uploaderNote || null,
              status: SubmissionStatus.SUBMITTED,
              version: 1
            }
          })
        : null;

      const savedFile = await tx.uploadedFile.create({
        data: {
          fileName: file.name,
          filePath,
          bucketName: bucketNameValue,
          fileType: file.type || getMimeTypeForFile(file.name),
          documentCategory,
          category: documentCategory,
          visibility: 'private',
          size: file.size,
          userId: user.id,
          projectId: project?.id ?? null,
          submissionId: submission?.id ?? null,
          checkpointId: checkpoint?.id ?? null
        },
        include: {
          submission: {
            select: {
              id: true,
              status: true,
              version: true,
              submittedAt: true,
              reviewedAt: true,
              comments: {
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: {
                  id: true,
                  body: true,
                  decision: true,
                  createdAt: true,
                  authorId: true,
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
          }
        }
      });

      if (shouldLinkCheckpoint && project?.id && submission) {
        await recordCheckpointSubmission(tx, {
          projectId: project.id,
          checkpointKey: checkpoint?.key ?? checkpointKey,
          documentCategory,
          fileName: file.name,
          submissionId: submission.id,
          fileId: savedFile.id,
          resolvedCheckpoint: checkpoint
        });
      }

      return savedFile;
    }, { timeout: 15000 }).catch(async (error) => {
      await deleteFile(bucketNameValue, filePath).catch((cleanupError) => {
        console.error(`Failed to remove orphaned upload ${filePath}:`, cleanupError);
      });
      throw error;
    });

    const uploadedCheckpointKey = uploadedFile.checkpointId
      ? (await prisma.milestoneCheckpoint.findUnique({
          where: { id: uploadedFile.checkpointId },
          select: { key: true }
        }))?.key ?? null
      : null;

    await createUploadNotifications({
      bucketName: bucketNameValue,
      documentCategory,
      checkpointKey: uploadedCheckpointKey,
      fileName: file.name,
      fileId: uploadedFile.id,
      uploaderId: user.id,
      project
    });

    return successResponse(
      {
        file: toDocumentFilePayload({
          ...uploadedFile,
          checkpoint: uploadedCheckpointKey ? { key: uploadedCheckpointKey } : null
        })
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/document-files', handleGET);
export const POST = withApiLogging('POST', '/api/document-files', handlePOST);
