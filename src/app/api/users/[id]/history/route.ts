import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadActor } from '@/lib/rbac/actor';
import { loadManagedAccount } from '@/lib/rbac/accounts';
import { ROLE_CATALOG } from '@/lib/rbac/catalog';
import { handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const HISTORY_LIMIT = 100;

const ACTION_LABELS: Record<string, string> = {
  'application.submitted': 'Registration submitted',
  'application.verified': 'Identity verified',
  'application.rejected': 'Registration rejected',
  'application.document_viewed': 'Identity document viewed',
  'role.granted': 'Role assigned',
  'role.revoked': 'Role removed',
  'role.rescoped': 'Role moved to another department',
  'account.status_changed': 'Account status changed',
  'user.created': 'Account created',
  'user.suspended': 'Account suspended',
  'user.restored': 'Account restored'
};

// Roles are recorded as enum names by the app ('ADVISER') and as database values by the setup script ('adviser').
function roleLabel(value: unknown) {
  const key = typeof value === 'string' ? value.toUpperCase() : '';
  return key in ROLE_CATALOG ? ROLE_CATALOG[key as UserRole].label : null;
}

/**
 * GET /api/users/[id]/history — verification decisions, document views, role changes, status changes and
 * suspensions for one account, newest first. IP addresses and browser details are not included.
 */
async function handleGET(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, [UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD]);
    const { id } = await context.params;
    const account = await loadManagedAccount(await loadActor(authUser), normalizeText(id));
    const entries = await prisma.auditLog.findMany({
      where: { entityType: 'User', entityId: account.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, name: true } }
      }
    });

    return successResponse({
      history: entries.map((entry) => {
        const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

        return {
          id: entry.id,
          action: entry.action,
          label: ACTION_LABELS[entry.action] ?? entry.action,
          actor: entry.actor ?? (metadata.source ? { id: null, name: String(metadata.source) } : null),
          role: roleLabel(metadata.role) ?? roleLabel(metadata.requestedRole),
          note: typeof metadata.note === 'string' ? metadata.note : typeof metadata.reason === 'string' ? metadata.reason : null,
          from: typeof metadata.from === 'string' ? metadata.from.toLowerCase() : null,
          to: typeof metadata.to === 'string' ? metadata.to.toLowerCase() : null,
          createdAt: entry.createdAt
        };
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/users/[id]/history', handleGET);
