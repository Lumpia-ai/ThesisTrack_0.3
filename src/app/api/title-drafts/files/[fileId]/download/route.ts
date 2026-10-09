import { NextResponse } from 'next/server';
import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError } from '@/lib/utils';
import { assertDocumentBucket, createSignedUrl } from '@/lib/storage/supabase-storage';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const ELEVATED_ROLES = new Set<UserRole>([
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
]);

async function handleGET(request: Request, context: { params: Promise<{ fileId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { fileId } = await context.params;

    const file = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        fileName: true,
        bucketName: true,
        filePath: true,
        titleDraft: {
          select: {
            group: {
              select: {
                userId: true,
                groupMembers: { where: { isActive: true }, select: { userId: true } }
              }
            }
          }
        }
      }
    });

    if (!file || !file.titleDraft || !file.bucketName || !file.filePath) {
      throw new HttpError('File was not found.', 404);
    }

    const isElevated = ELEVATED_ROLES.has(user.role);
    const isGroupMember = file.titleDraft.group.groupMembers.some((member) => member.userId === user.id);
    const isAssignedAdviser = file.titleDraft.group.userId === user.id;

    if (!isElevated && !isGroupMember && !isAssignedAdviser) {
      throw new HttpError('You do not have permission to access this file.', 403);
    }

    const bucketName = file.bucketName;
    assertDocumentBucket(bucketName);
    const signedUrl = await createSignedUrl(bucketName, file.filePath, 60);

    const urlObj = new URL(signedUrl);
    urlObj.searchParams.set('download', file.fileName);

    return NextResponse.redirect(urlObj.toString());
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/title-drafts/files/[fileId]/download', handleGET);
