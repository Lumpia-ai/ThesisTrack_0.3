import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getAuthorizedDocumentFile } from '@/lib/storage/document-authorization';
import { assertDocumentBucket, createSignedUrl } from '@/lib/storage/supabase-storage';
import { handleApiError, successResponse } from '@/lib/utils';
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

async function handlePOST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, DOCUMENT_VIEWER_ROLES);
    const { id } = await props.params;
    const file = await getAuthorizedDocumentFile(id, user);
    const bucketName = file.bucketName!;
    assertDocumentBucket(bucketName);
    const signedUrl = await createSignedUrl(bucketName, file.filePath!, 60 * 5);

    return successResponse({ signedUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/document-files/[id]/signed-url', handlePOST);
