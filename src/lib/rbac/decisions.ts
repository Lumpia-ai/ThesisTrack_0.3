import {
  AccountApplicationStatus,
  AccountStatus,
  RoleAssignmentStatus
} from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAccountAudit } from '@/lib/rbac/audit';
import type { ApplicationRecord } from '@/lib/rbac/applications';
import type { Actor } from '@/lib/rbac/policy';
import { HttpError } from '@/lib/utils';

// Verify or reject a pending application. Permission is checked by the caller (loadReviewableApplication);
// this only records the decision. Verification confirms identity only: it never grants a role.

const ALREADY_DECIDED = 'This application has already been decided. Refresh to see the latest status.';

export async function decideApplication(
  actor: Actor,
  application: ApplicationRecord,
  decision: { verified: boolean; note: string | null },
  request: Request
) {
  const nextApplicationStatus = decision.verified ? AccountApplicationStatus.VERIFIED : AccountApplicationStatus.REJECTED;

  await prisma.$transaction(async (tx) => {
    // Only a still-pending application can be decided; a concurrent decision makes this match nothing.
    const updated = await tx.accountApplication.updateMany({
      where: { id: application.id, status: AccountApplicationStatus.PENDING },
      data: {
        status: nextApplicationStatus,
        pendingKey: null,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
        decisionNote: decision.note
      }
    });

    if (updated.count !== 1) {
      throw new HttpError(ALREADY_DECIDED, 409);
    }

    await recordAccountAudit(tx, {
      actorId: actor.userId,
      action: decision.verified ? 'application.verified' : 'application.rejected',
      userId: application.userId,
      metadata: {
        applicationId: application.id,
        requestedRole: application.requestedRole,
        requestedDepartmentId: application.requestedDepartmentId,
        note: decision.note,
        actorRole: actor.workspace.role
      },
      request
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: application.userId },
      select: { accountStatus: true }
    });
    const activeRoles = await tx.userRoleAssignment.count({
      where: { userId: application.userId, status: RoleAssignmentStatus.ACTIVE }
    });
    let nextAccountStatus: AccountStatus | null = null;

    if (decision.verified && user.accountStatus === AccountStatus.PENDING_VERIFICATION) {
      nextAccountStatus = AccountStatus.PENDING_ROLE_ASSIGNMENT;
    } else if (
      !decision.verified &&
      activeRoles === 0 &&
      (user.accountStatus === AccountStatus.PENDING_VERIFICATION || user.accountStatus === AccountStatus.PENDING_ROLE_ASSIGNMENT)
    ) {
      // An account that already holds a role keeps it; only a newcomer's account is rejected.
      nextAccountStatus = AccountStatus.REJECTED;
    }

    if (nextAccountStatus) {
      await tx.user.update({
        where: { id: application.userId },
        data: { accountStatus: nextAccountStatus }
      });
      await recordAccountAudit(tx, {
        actorId: actor.userId,
        action: 'account.status_changed',
        userId: application.userId,
        metadata: { from: user.accountStatus, to: nextAccountStatus, applicationId: application.id, actorRole: actor.workspace.role },
        request
      });
    }
  });
}
