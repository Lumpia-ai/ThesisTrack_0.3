import { RoleAssignmentStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadActor } from '@/lib/rbac/actor';
import { loadManagedAccount, toRolesSummary } from '@/lib/rbac/accounts';
import { grantRoleAssignment, syncAccountWithAssignments } from '@/lib/rbac/assignments';
import { ROLE_CATALOG, fromApiEnum } from '@/lib/rbac/catalog';
import { canGrantRole } from '@/lib/rbac/policy';
import { HttpError, handleApiError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const ROLE_MANAGER_ROLES: UserRole[] = [UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD];

/** GET /api/users/[id]/roles — the person's assignments and the roles the caller could grant them. */
async function handleGET(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, ROLE_MANAGER_ROLES);
    const actor = await loadActor(authUser);
    const { id } = await context.params;
    const account = await loadManagedAccount(actor, normalizeText(id));

    return successResponse(toRolesSummary(actor, account));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/users/[id]/roles  { role }
 * Grants one role. The department is never taken from the request: department roles are granted in the
 * person's own department, and only by that department's Program Head (institution roles: System Admin).
 */
async function handlePOST(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, ROLE_MANAGER_ROLES);
    const actor = await loadActor(authUser);
    const { id } = await context.params;
    const body = await parseJsonBody<{ role?: unknown }>(request);
    const role = fromApiEnum(UserRole, body.role);

    if (!role) {
      throw new HttpError('Choose a role to assign.', 400, { role: 'Choose a role to assign.' });
    }

    const account = await loadManagedAccount(actor, normalizeText(id));

    if (account.roleAssignments.some((assignment) => assignment.role === role && assignment.status === RoleAssignmentStatus.ACTIVE)) {
      throw new HttpError(`${account.name} already holds the ${ROLE_CATALOG[role].label} role.`, 409);
    }

    const decision = canGrantRole(
      actor,
      {
        userId: account.id,
        accountStatus: account.accountStatus,
        departmentId: account.departmentId,
        heldRoles: account.roleAssignments
          .filter((assignment) => assignment.status === RoleAssignmentStatus.ACTIVE)
          .map((assignment) => assignment.role)
      },
      role
    );

    if (!decision.allowed) {
      throw new HttpError(decision.reason, 403, { role: decision.reason });
    }

    const auditContext = { actorId: authUser.id, actorRole: authUser.role, request };

    await prisma.$transaction(async (tx) => {
      await grantRoleAssignment(tx, { userId: account.id, role, departmentId: account.departmentId }, auditContext);
      await syncAccountWithAssignments(tx, account.id, auditContext);
    });

    return successResponse({
      message: `${ROLE_CATALOG[role].label} role assigned to ${account.name}.`,
      ...toRolesSummary(actor, await loadManagedAccount(actor, account.id))
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/users/[id]/roles', handleGET);
export const POST = withApiLogging('POST', '/api/users/[id]/roles', handlePOST);
