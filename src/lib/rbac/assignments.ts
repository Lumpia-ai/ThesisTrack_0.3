import {
  AccountStatus,
  RoleAssignmentStatus,
  type Prisma,
  type UserRole
} from '@/generated/prisma/client';
import { recordAccountAudit } from '@/lib/rbac/audit';
import { isInstitutionRole, scopeForRole } from '@/lib/rbac/policy';

// Database writes for role assignments. Callers check permission first (src/lib/rbac/policy.ts) and run
// these inside a transaction, so the assignment, the account status and the audit entry commit together.

type Tx = Prisma.TransactionClient;

type ActorContext = { actorId: string; actorRole: UserRole; request?: Request };

/**
 * Grants a role. The (user, role, scope) key is unique, so re-granting a revoked role reactivates that row
 * instead of adding a second one; the grant history stays in the audit log.
 */
export async function grantRoleAssignment(
  tx: Tx,
  { userId, role, departmentId }: { userId: string; role: UserRole; departmentId: string | null },
  context: ActorContext
) {
  const { scope, departmentId: scopedDepartmentId } = scopeForRole(role, departmentId);
  const now = new Date();
  const assignment = await tx.userRoleAssignment.upsert({
    where: { userId_role_scope: { userId, role, scope } },
    create: { userId, role, scope, departmentId: scopedDepartmentId, grantedById: context.actorId, grantedAt: now },
    update: {
      status: RoleAssignmentStatus.ACTIVE,
      grantedById: context.actorId,
      grantedAt: now,
      revokedById: null,
      revokedAt: null,
      revokeReason: null
    }
  });

  await recordAccountAudit(tx, {
    actorId: context.actorId,
    action: 'role.granted',
    userId,
    metadata: { assignmentId: assignment.id, role, scope, departmentId: scopedDepartmentId, actorRole: context.actorRole },
    request: context.request
  });

  return assignment;
}

export async function revokeRoleAssignment(
  tx: Tx,
  assignment: { id: string; userId: string; role: UserRole; scope: string; departmentId: string | null },
  reason: string,
  context: ActorContext
) {
  await tx.userRoleAssignment.update({
    where: { id: assignment.id },
    data: {
      status: RoleAssignmentStatus.REVOKED,
      revokedById: context.actorId,
      revokedAt: new Date(),
      revokeReason: reason
    }
  });

  await recordAccountAudit(tx, {
    actorId: context.actorId,
    action: 'role.revoked',
    userId: assignment.userId,
    metadata: {
      assignmentId: assignment.id,
      role: assignment.role,
      scope: assignment.scope,
      departmentId: assignment.departmentId,
      reason,
      actorRole: context.actorRole
    },
    request: context.request
  });
}

/** Moves a user's active department roles to their new department after their profile department changes. */
export async function rescopeDepartmentAssignments(
  tx: Tx,
  { userId, departmentId }: { userId: string; departmentId: string | null },
  context: ActorContext
) {
  const assignments = await tx.userRoleAssignment.findMany({
    where: { userId, status: RoleAssignmentStatus.ACTIVE }
  });

  for (const assignment of assignments) {
    if (isInstitutionRole(assignment.role)) {
      continue;
    }

    const target = scopeForRole(assignment.role, departmentId);

    if (target.scope === assignment.scope) {
      continue;
    }

    // A revoked row may already hold the new (user, role, scope) key: reactivate it and retire this one.
    const existing = await tx.userRoleAssignment.findUnique({
      where: { userId_role_scope: { userId, role: assignment.role, scope: target.scope } }
    });

    if (existing) {
      await tx.userRoleAssignment.update({
        where: { id: existing.id },
        data: {
          status: RoleAssignmentStatus.ACTIVE,
          grantedById: context.actorId,
          grantedAt: new Date(),
          revokedById: null,
          revokedAt: null,
          revokeReason: null
        }
      });
      await tx.userRoleAssignment.update({
        where: { id: assignment.id },
        data: {
          status: RoleAssignmentStatus.REVOKED,
          revokedById: context.actorId,
          revokedAt: new Date(),
          revokeReason: 'Department changed'
        }
      });
    } else {
      await tx.userRoleAssignment.update({
        where: { id: assignment.id },
        data: { scope: target.scope, departmentId: target.departmentId }
      });
    }

    await recordAccountAudit(tx, {
      actorId: context.actorId,
      action: 'role.rescoped',
      userId,
      metadata: {
        role: assignment.role,
        fromScope: assignment.scope,
        toScope: target.scope,
        actorRole: context.actorRole
      },
      request: context.request
    });
  }
}

/**
 * Keeps the account consistent with its roles after a grant or revoke: an account waiting for a role becomes
 * active once it has one, an active account left with none goes back to waiting, and the default role
 * (User.role) always points at a role the user still holds.
 */
export async function syncAccountWithAssignments(tx: Tx, userId: string, context: ActorContext) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, accountStatus: true }
  });
  const activeAssignments = await tx.userRoleAssignment.findMany({
    where: { userId, status: RoleAssignmentStatus.ACTIVE },
    orderBy: { grantedAt: 'asc' },
    select: { role: true }
  });
  const data: Prisma.UserUpdateInput = {};

  if (activeAssignments.length && user.accountStatus === AccountStatus.PENDING_ROLE_ASSIGNMENT) {
    data.accountStatus = AccountStatus.ACTIVE;
  } else if (!activeAssignments.length && user.accountStatus === AccountStatus.ACTIVE) {
    data.accountStatus = AccountStatus.PENDING_ROLE_ASSIGNMENT;
  }

  if (activeAssignments.length && !activeAssignments.some((assignment) => assignment.role === user.role)) {
    data.role = activeAssignments[0].role;
  }

  if (!Object.keys(data).length) {
    return;
  }

  await tx.user.update({ where: { id: userId }, data });

  if (data.accountStatus) {
    await recordAccountAudit(tx, {
      actorId: context.actorId,
      action: 'account.status_changed',
      userId,
      metadata: { from: user.accountStatus, to: data.accountStatus, actorRole: context.actorRole },
      request: context.request
    });
  }
}
