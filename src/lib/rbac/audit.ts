import type { Prisma, PrismaClient } from '@/generated/prisma/client';

type AuditDb = Pick<PrismaClient, 'auditLog'> | Prisma.TransactionClient;

export type AccountAuditAction =
  | 'application.submitted'
  | 'application.verified'
  | 'application.rejected'
  | 'application.document_viewed'
  | 'role.granted'
  | 'role.revoked'
  | 'role.rescoped'
  | 'account.status_changed'
  | 'user.created'
  | 'user.suspended'
  | 'user.restored';

/**
 * Records a verification decision, role change, status change or document view against the account it
 * concerns (entityType 'User', entityId = that user), so one query returns a person's full history.
 * Pass the transaction client when the change itself runs in a transaction, so both commit together.
 */
export async function recordAccountAudit(
  db: AuditDb,
  entry: {
    actorId: string | null;
    action: AccountAuditAction;
    userId: string;
    metadata?: Record<string, unknown>;
    request?: Request;
  }
) {
  const forwardedFor = entry.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: 'User',
      entityId: entry.userId,
      metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      ipAddress: forwardedFor || null,
      userAgent: entry.request?.headers.get('user-agent')?.slice(0, 500) || null
    }
  });
}
