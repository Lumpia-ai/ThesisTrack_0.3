import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { ReviewDecision, UserRole } from '@/generated/prisma/client';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const REVIEW_COMMENT_MANAGER_ROLES = [
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

function canManageComment(user: { id: string; role: UserRole }, authorId?: string | null) {
  return authorId === user.id
    || user.role === UserRole.SYSTEM_ADMIN
    || user.role === UserRole.ADMIN;
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, REVIEW_COMMENT_MANAGER_ROLES);
    const body = await request.json();
    const submissionId = normalizeText(body?.submissionId);
    const commentBody = normalizeText(body?.body);
    const decision: ReviewDecision = Object.values(ReviewDecision).includes(body?.decision) ? body.decision : ReviewDecision.COMMENT;

    if (!submissionId) {
      throw new HttpError('Missing submissionId', 400);
    }

    if (!commentBody) {
      throw new HttpError('Comment cannot be empty.', 400);
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, title: true, submittedById: true, project: { select: { title: true } } }
    });

    if (!submission) {
      throw new HttpError('Submission not found', 404);
    }

    const comment = await prisma.reviewComment.create({
      data: {
        submissionId,
        authorId: user.id,
        body: commentBody,
        decision
      }
    });

    if (submission.submittedById) {
      await prisma.notification.create({
        data: {
          userId: submission.submittedById,
          title: 'Adviser Feedback Received',
          message: `${user.name || 'Your adviser'} left feedback on "${submission.title}".`,
          type: 'feedback',
          entityType: 'review_comment',
          entityId: comment.id
        }
      });
    }

    return successResponse({ comment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT, ...REVIEW_COMMENT_MANAGER_ROLES]);
    const body = await request.json();
    const { commentId, isResolved } = body;
    const nextBody = typeof body?.body === 'string' ? normalizeText(body.body) : undefined;

    if (!commentId) {
      return Response.json({ success: false, message: 'Missing commentId' }, { status: 400 });
    }

    const updateData: any = {};
    if (isResolved !== undefined) {
      updateData.isResolved = isResolved;
      if (isResolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = user.id;
      }
    }

    const existingComment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
      include: {
        submission: {
          include: { project: true }
        }
      }
    });

    if (!existingComment) {
      return Response.json({ success: false, message: 'Comment not found' }, { status: 404 });
    }

    if (nextBody !== undefined) {
      if (!nextBody) {
        return Response.json({ success: false, message: 'Comment cannot be empty.' }, { status: 400 });
      }

      if (!canManageComment(user, existingComment.authorId)) {
        return Response.json({ success: false, message: 'You can only edit comments you created.' }, { status: 403 });
      }

      updateData.body = nextBody;
    }

    if (!Object.keys(updateData).length) {
      return Response.json({ success: false, message: 'No comment changes were provided.' }, { status: 400 });
    }

    const updatedComment = await prisma.reviewComment.update({
      where: { id: commentId },
      data: updateData
    });

    // Notify the author (Adviser/Panel) if someone else (Student) resolved it
    if (isResolved && existingComment.authorId && existingComment.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: existingComment.authorId,
          title: 'Feedback Resolved',
          message: `${user.name || 'A student'} marked your feedback on "${existingComment.submission.title}" as resolved.`,
          type: 'success',
          entityType: 'review_comment',
          entityId: commentId
        }
      });
    }

    return successResponse({ comment: updatedComment });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handleDELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, REVIEW_COMMENT_MANAGER_ROLES);
    const body = await request.json().catch(() => ({}));
    const commentId = normalizeText(body?.commentId);

    if (!commentId) {
      return Response.json({ success: false, message: 'Missing commentId' }, { status: 400 });
    }

    const existingComment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true
      }
    });

    if (!existingComment) {
      return Response.json({ success: false, message: 'Comment not found' }, { status: 404 });
    }

    if (!canManageComment(user, existingComment.authorId)) {
      return Response.json({ success: false, message: 'You can only delete comments you created.' }, { status: 403 });
    }

    await prisma.reviewComment.delete({
      where: { id: commentId }
    });

    return successResponse({ commentId });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/review-comments', handlePOST);
export const PATCH = withApiLogging('PATCH', '/api/review-comments', handlePATCH);
export const DELETE = withApiLogging('DELETE', '/api/review-comments', handleDELETE);
