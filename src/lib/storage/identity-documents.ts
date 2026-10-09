import crypto from 'node:crypto';
import {
  IDENTITY_DOCUMENT_EXTENSIONS,
  IDENTITY_DOCUMENT_MAX_BYTES
} from '@/lib/rbac/catalog';
import {
  encodeObjectPath,
  getSupabaseServiceHeaders,
  getSupabaseStorageBaseUrl,
  sanitizeFileName
} from '@/lib/storage/supabase-storage';
import { HttpError } from '@/lib/utils';

// Identity documents submitted with a registration. They live in their own PRIVATE bucket, kept out of
// DOCUMENT_STORAGE_BUCKETS on purpose: the general document routes accept a bucket name from the client,
// and this bucket must never be reachable through them. Reviewers only ever get a 60-second signed link.

export const IDENTITY_DOCUMENT_BUCKET = 'identity-documents';
export const IDENTITY_DOCUMENT_LINK_SECONDS = 60;

const MIME_BY_EXTENSION: Record<(typeof IDENTITY_DOCUMENT_EXTENSIONS)[number], string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png'
};

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

/** What the file's first bytes say it is, regardless of its name or declared type. */
function sniffMimeType(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}

export type CheckedIdentityDocument = {
  fileName: string;
  mimeType: string;
  size: number;
  bytes: Buffer;
};

/**
 * Accepts only a PDF, JPG or PNG of at most 5 MB whose name, declared type and actual contents all agree,
 * so a renamed executable or script can't be stored as an "ID". `field` names the form field the errors
 * belong to ("document", or "documentBack" for the back of an ID card).
 */
export async function checkIdentityDocument(
  file: unknown,
  field: 'document' | 'documentBack' = 'document'
): Promise<CheckedIdentityDocument> {
  if (!(file instanceof File) || file.size === 0) {
    const missing = field === 'documentBack' ? 'Upload the back of your ID.' : 'Upload your identity document.';
    throw new HttpError(missing, 400, { [field]: missing });
  }

  if (file.size > IDENTITY_DOCUMENT_MAX_BYTES) {
    throw new HttpError('The document must be 5 MB or smaller.', 413, { [field]: 'The document must be 5 MB or smaller.' });
  }

  const extension = getExtension(file.name) as keyof typeof MIME_BY_EXTENSION;
  const expectedMime = MIME_BY_EXTENSION[extension];
  const typeError = 'Upload a PDF, JPG or PNG file.';

  if (!expectedMime || (file.type && file.type !== expectedMime)) {
    throw new HttpError(typeError, 400, { [field]: typeError });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  if (sniffMimeType(bytes) !== expectedMime) {
    throw new HttpError('The file\'s contents don\'t match its type. Upload a real PDF, JPG or PNG.', 400, {
      [field]: 'The file\'s contents don\'t match its type.'
    });
  }

  return { fileName: sanitizeFileName(file.name), mimeType: expectedMime, size: file.size, bytes };
}

/** A path that reveals nothing about the applicant and can't collide. */
export function buildIdentityDocumentPath(fileName: string) {
  return `applications/${crypto.randomUUID()}/${Date.now()}-${fileName}`;
}

export async function uploadIdentityDocument(filePath: string, document: CheckedIdentityDocument) {
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/${IDENTITY_DOCUMENT_BUCKET}/${encodeObjectPath(filePath)}`,
    {
      method: 'POST',
      headers: getSupabaseServiceHeaders(document.mimeType),
      body: new Uint8Array(document.bytes)
    }
  );

  if (!response.ok) {
    console.error('Identity document upload failed', response.status, await response.text().catch(() => ''));
    throw new HttpError('Your document could not be stored. Please try again.', 502);
  }
}

export async function deleteIdentityDocument(filePath: string) {
  const response = await fetch(`${getSupabaseStorageBaseUrl()}/object/${IDENTITY_DOCUMENT_BUCKET}`, {
    method: 'DELETE',
    headers: getSupabaseServiceHeaders(),
    body: JSON.stringify({ prefixes: [filePath] })
  });

  if (!response.ok) {
    console.error('Identity document cleanup failed', response.status, await response.text().catch(() => ''));
  }
}

/** A link that works for 60 seconds. Callers must have checked the reviewer's permission first. */
export async function createIdentityDocumentLink(filePath: string) {
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/sign/${IDENTITY_DOCUMENT_BUCKET}/${encodeObjectPath(filePath)}`,
    {
      method: 'POST',
      headers: getSupabaseServiceHeaders(),
      body: JSON.stringify({ expiresIn: IDENTITY_DOCUMENT_LINK_SECONDS })
    }
  );

  if (!response.ok) {
    console.error('Identity document link failed', response.status, await response.text().catch(() => ''));
    throw new HttpError('The document is not available right now.', 502);
  }

  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signedPath = payload.signedURL || payload.signedUrl;

  if (!signedPath) {
    throw new HttpError('The document is not available right now.', 502);
  }

  return signedPath.startsWith('http')
    ? signedPath
    : `${getSupabaseStorageBaseUrl()}${signedPath.startsWith('/') ? '' : '/'}${signedPath}`;
}
