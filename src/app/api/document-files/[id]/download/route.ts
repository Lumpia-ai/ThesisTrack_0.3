import { NextResponse } from 'next/server';
import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getAuthorizedDocumentFile } from '@/lib/storage/document-authorization';
import { assertDocumentBucket, createSignedUrl } from '@/lib/storage/supabase-storage';
import { HttpError, handleApiError } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const DOCUMENT_VIEWER_ROLES = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

async function handleGET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, DOCUMENT_VIEWER_ROLES);
    const { id } = await props.params;
    const file = await getAuthorizedDocumentFile(id, user);

    if (!file.filePath) {
      throw new HttpError('This file was removed from storage after a revision request and is no longer available.', 410);
    }

    const bucketName = file.bucketName!;
    assertDocumentBucket(bucketName);
    const signedUrl = await createSignedUrl(bucketName, file.filePath, 60);

    const urlObj = new URL(signedUrl);
    urlObj.searchParams.set('download', file.fileName);

    return NextResponse.redirect(urlObj.toString());
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/document-files/[id]/download', handleGET);
