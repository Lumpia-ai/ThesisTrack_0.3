import { requireAuthenticatedUser } from '@/lib/auth';
import { ENGAGEMENT_VIEWER_ROLES, getRepositoryViewStats } from '@/lib/repository/project-engagement';
import { handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// View statistics for every repository record (Library: Views & Comments).
async function handleGET(request: Request) {
  try {
    await requireAuthenticatedUser(request, ENGAGEMENT_VIEWER_ROLES);
    const stats = await getRepositoryViewStats();
    return successResponse({ stats });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/repository/view-stats', handleGET);
