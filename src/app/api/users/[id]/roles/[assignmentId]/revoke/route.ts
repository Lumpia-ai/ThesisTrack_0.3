import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadActor } from '@/lib/rbac/actor';
import { loadManagedAccount, toRolesSummary } from '@/lib/rbac/accounts';
import { revokeRoleAssignment, syncAccountWithAssignments } from '@/lib/rbac/assignments';
import { ROLE_CATALOG } from '@/lib/rbac/catalog';
import { canRevokeAssignment } from '@/lib/rbac/policy';
import { HttpError, handleApiError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; assignmentId: string }> };

const MIN_REASON_LENGTH = 5;

/**
 * POST /api/users/[id]/roles/[assignmentId]/revoke  { reason }
 * Revokes one role. The row is kept (status revoked, with who, when and why), so it can never be used as
 * a workspace again but the history stays intact.
 */
async function handlePOST(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, [UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD]);
    const actor = await loadActor(authUser);
    const { id, assignmentId } = await context.params;
    const body = await parseJsonBody<{ reason?: unknown }>(request);
    const reason = normalizeText(body.reason).slice(0, 500);

    if (reason.length < MIN_REASON_LENGTH) {
      throw new HttpError('Give a reason for removing this role.', 400, { reason: 'Give a short reason.' });
    }

    const account = await loadManagedAccount(actor, normalizeText(id));
    const assignment = account.roleAssignments.find((candidate) => candidate.id === normalizeText(assignmentId));

    if (!assignment) {
      throw new HttpError('That role assignment does not belong to this account.', 404);
    }

    const decision = canRevokeAssignment(actor, account.id, assignment);

    if (!decision.allowed) {
      throw new HttpError(decision.reason, 403);
    }

    const auditContext = { actorId: authUser.id, actorRole: authUser.role, request };

    await prisma.$transaction(async (tx) => {
      await revokeRoleAssignment(tx, assignment, reason, auditContext);
      await syncAccountWithAssignments(tx, account.id, auditContext);
    });

    return successResponse({
      message: `${ROLE_CATALOG[assignment.role].label} role removed from ${account.name}.`,
      ...toRolesSummary(actor, await loadManagedAccount(actor, account.id))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/users/[id]/roles/[assignmentId]/revoke', handlePOST);
