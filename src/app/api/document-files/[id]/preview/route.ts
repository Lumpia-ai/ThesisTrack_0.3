import { NextResponse } from 'next/server';
import { getMimeTypeForFile } from '@/lib/storage/file-preview';
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

function getInlineFileName(fileName: string) {
  return fileName.replace(/["\r\n]/g, '');
}

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
    const upstream = await fetch(signedUrl);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Unable to load document preview' }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        // Trust the extension over the stored type: files uploaded without a browser MIME type were
        // stored as octet-stream, which makes an inline <iframe> download them instead of showing them.
        'Content-Type': getMimeTypeForFile(file.fileName, file.fileType || upstream.headers.get('content-type')),
        'Content-Disposition': `inline; filename="${getInlineFileName(file.fileName)}"`,
        'Cache-Control': 'private, max-age=60',
        ...(upstream.headers.get('content-length')
          ? { 'Content-Length': upstream.headers.get('content-length')! }
          : {})
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/document-files/[id]/preview', handleGET);
