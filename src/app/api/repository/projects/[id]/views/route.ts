import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuthenticatedUser } from '@/lib/auth';
import { getRepositoryPrisma } from '@/lib/repository-prisma';
import {
  ENGAGEMENT_VIEWER_ROLES,
  GUEST_VIEWER_COOKIE,
  getRepositoryViewStats,
  recordRepositoryView
} from '@/lib/repository/project-engagement';
import { handleApiError, HttpError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie') || '';
  const prefix = `${name}=`;
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

// Called once by a repository record's detail page when it opens. Public:
// guests are counted as guests, signed-in visitors under their department.
async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const project = await getRepositoryPrisma().repositoryProject.findUnique({ where: { id }, select: { id: true } });

    if (!project) {
      throw new HttpError('This repository record was not found.', 404);
    }

    const user = await getAuthenticatedUser(request);
    const existingGuestKey = readCookie(request, GUEST_VIEWER_COOKIE);
    const guestKey = existingGuestKey || randomUUID();

    const result = await recordRepositoryView(
      id,
      user
        ? { type: 'user', userId: user.id, role: user.role, department: user.department ?? null }
        : { type: 'guest', guestKey }
    );

    const response = NextResponse.json({ success: true, counted: result.counted });
    if (!user && !existingGuestKey) {
      response.cookies.set(GUEST_VIEWER_COOKIE, guestKey, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365
      });
    }
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedUser(request, ENGAGEMENT_VIEWER_ROLES);
    const { id } = await context.params;
    const [stats] = await getRepositoryViewStats({ repositoryProjectId: id });

    if (!stats) {
      throw new HttpError('This repository record was not found.', 404);
    }

    return successResponse({ stats });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/repository/projects/[id]/views', handlePOST);
export const GET = withApiLogging('GET', '/api/repository/projects/[id]/views', handleGET);
