// Permanent student title lock. Once a group submits its title proposal, the
// primary title and its backup titles are read-only for every student in the
// group for the rest of the project. Only the group's assigned adviser can
// change them (see /api/title-submissions/[id]/title and the "edit" action on
// /api/title-drafts/adviser). Each adviser change is written to AuditLog so the
// previous wording is never lost.

import { ProjectStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/utils';

type Db = Pick<typeof prisma, 'project' | 'auditLog'>;

export const MIN_BACKUP_TITLES = 2;

export const TITLE_LOCKED_MESSAGE =
  "You've already submitted your title proposal. Your submitted titles are locked and can no longer be edited. If a correction or title change is needed, please contact your adviser.";

export const TITLE_AUDIT_ENTITY = 'group_title';

export const TITLE_AUDIT_ACTIONS = {
  primaryEdited: 'TITLE_EDITED_BY_ADVISER',
  backupPromoted: 'TITLE_REPLACED_WITH_BACKUP_BY_ADVISER',
  backupEdited: 'BACKUP_TITLE_EDITED_BY_ADVISER'
} as const;

// Any non-draft project for the group means the title proposal was submitted.
// Archived (rejected / withdrawn) projects still count: the lock never lifts.
export async function isGroupTitleLocked(groupId: string, db: Db = prisma) {
  const submittedCount = await db.project.count({
    where: { groupId, status: { not: ProjectStatus.DRAFT } }
  });

  return submittedCount > 0;
}

export async function assertStudentCanEditTitles(groupId: string, db: Db = prisma) {
  if (await isGroupTitleLocked(groupId, db)) {
    throw new HttpError(TITLE_LOCKED_MESSAGE, 403);
  }
}

export function normalizeTitleKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export type TitleHistoryEntry = {
  id: string;
  action: string;
  previousTitle: string;
  updatedTitle: string;
  target: 'primary' | 'backup';
  remarks: string | null;
  changedBy: string;
  changedAt: string;
};

export async function recordTitleChange(
  db: Db,
  entry: {
    groupId: string;
    actorId: string;
    action: string;
    target: 'primary' | 'backup';
    previousTitle: string;
    updatedTitle: string;
    remarks?: string | null;
    projectId?: string | null;
    backupDraftId?: string | null;
  }
) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: TITLE_AUDIT_ENTITY,
      entityId: entry.groupId,
      metadata: {
        target: entry.target,
        previousTitle: entry.previousTitle,
        updatedTitle: entry.updatedTitle,
        remarks: entry.remarks || null,
        projectId: entry.projectId || null,
        backupDraftId: entry.backupDraftId || null
      }
    }
  });
}

export async function getTitleHistory(groupId: string, db: Db = prisma): Promise<TitleHistoryEntry[]> {
  const rows = await db.auditLog.findMany({
    where: { entityType: TITLE_AUDIT_ENTITY, entityId: groupId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: { select: { name: true, displayName: true } } }
  });

  return rows.map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;

    return {
      id: row.id,
      action: row.action,
      previousTitle: String(meta.previousTitle ?? ''),
      updatedTitle: String(meta.updatedTitle ?? ''),
      target: meta.target === 'backup' ? 'backup' : 'primary',
      remarks: meta.remarks ? String(meta.remarks) : null,
      changedBy: row.actor?.displayName || row.actor?.name || 'Adviser',
      changedAt: row.createdAt.toISOString()
    };
  });
}
