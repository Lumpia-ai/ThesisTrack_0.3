import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activeRoleHolders } from '@/lib/rbac/queries';
import { handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const DEFAULT_ADVISER_LIMIT = 100;
const MAX_ADVISER_LIMIT = 200;

function parsePositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

/**
 * GET /api/advisers
 * Returns the faculty accounts that can sit on a defense panel.
 * Accessible by authenticated adviser, panel, Research Head, and System Admin users.
 */
async function handleGET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parsePositiveInteger(url.searchParams.get('limit'), DEFAULT_ADVISER_LIMIT, MAX_ADVISER_LIMIT);

    await requireAuthenticatedUser(request, [
      UserRole.STUDENT,
      UserRole.ADVISER,
      UserRole.PANEL,
      UserRole.PROGRAM_HEAD,
      UserRole.RESEARCH_HEAD,
      UserRole.ADMIN,
      UserRole.SYSTEM_ADMIN
    ]);

    const panelists = await prisma.user.findMany({
      where: activeRoleHolders([UserRole.ADVISER, UserRole.PANEL, UserRole.PROGRAM_HEAD]),
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        role: true,
        displayName: true,
      },
      orderBy: [
        { role: 'desc' },
        { name: 'asc' },
      ],
      take: limit
    });

    return successResponse({ advisers: panelists, panelists });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/advisers', handleGET);
