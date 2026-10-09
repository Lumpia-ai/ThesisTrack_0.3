import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getRepositoryPrisma } from '@/lib/repository-prisma';
import {
  COMMENT_AUTHOR_ROLES,
  ENGAGEMENT_VIEWER_ROLES,
  listRepositoryComments
} from '@/lib/repository/project-engagement';
import { handleApiError, HttpError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const MAX_COMMENT_LENGTH = 2000;

async function ensureProject(id: string) {
  const project = await getRepositoryPrisma().repositoryProject.findUnique({ where: { id }, select: { id: true } });
  if (!project) {
    throw new HttpError('This repository record was not found.', 404);
  }
}

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedUser(request, ENGAGEMENT_VIEWER_ROLES);
    const { id } = await context.params;
    await ensureProject(id);
    return successResponse({ comments: await listRepositoryComments(id) });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, COMMENT_AUTHOR_ROLES);
    const { id } = await context.params;
    const body = await parseJsonBody<{ body?: unknown }>(request);
    const text = normalizeText(body.body);

    if (!text) {
      throw new HttpError('Write a comment first.', 422, { body: 'A comment is required.' });
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      throw new HttpError(`Comments are limited to ${MAX_COMMENT_LENGTH} characters.`, 422, { body: 'Shorten the comment.' });
    }

    await ensureProject(id);
    await getRepositoryPrisma().repositoryProjectComment.create({
      data: {
        repositoryProjectId: id,
        authorId: user.id,
        authorName: user.displayName || user.name || user.email,
        authorRole: user.role,
        body: text
      }
    });

    return successResponse({ comments: await listRepositoryComments(id) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// Soft delete: the author can remove their own comment; admins can remove any.
async function handleDELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, COMMENT_AUTHOR_ROLES);
    const { id } = await context.params;
    const commentId = normalizeText(new URL(request.url).searchParams.get('commentId'));
    const repositoryDb = getRepositoryPrisma();
    const comment = commentId
      ? await repositoryDb.repositoryProjectComment.findFirst({ where: { id: commentId, repositoryProjectId: id, deletedAt: null } })
      : null;

    if (!comment) {
      throw new HttpError('Comment not found.', 404);
    }

    const isAdmin = user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.ADMIN;
    if (comment.authorId !== user.id && !isAdmin) {
      throw new HttpError('You can only remove your own comments.', 403);
    }

    await repositoryDb.repositoryProjectComment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
    return successResponse({ comments: await listRepositoryComments(id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/repository/projects/[id]/comments', handleGET);
export const POST = withApiLogging('POST', '/api/repository/projects/[id]/comments', handlePOST);
export const DELETE = withApiLogging('DELETE', '/api/repository/projects/[id]/comments', handleDELETE);
