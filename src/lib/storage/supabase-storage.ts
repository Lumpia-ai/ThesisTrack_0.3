import crypto from 'node:crypto';
import { getRequiredEnv, HttpError } from '@/lib/utils';
import { getMimeTypeForFile } from '@/lib/storage/file-preview';
import {
  DOCUMENT_UPLOAD_ERROR_MESSAGES,
  type DocumentStorageBucket,
  isDocumentStorageBucket,
  validateFileSize,
  validateFileType
} from '@/lib/storage/upload-config';

type UploadFileInput = {
  bucketName: DocumentStorageBucket;
  filePath: string;
  file: File;
  allowImages?: boolean;
};

type SignedUrlResponse = {
  signedURL?: string;
  signedUrl?: string;
};

export function getSupabaseStorageBaseUrl() {
  return `${getRequiredEnv('SUPABASE_URL').replace(/\/$/, '')}/storage/v1`;
}

export function getSupabaseServiceHeaders(contentType = 'application/json') {
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...(contentType ? { 'Content-Type': contentType } : {})
  };
}

export function encodeObjectPath(filePath: string) {
  return filePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[^\w.\-() ]+/g, '')
    .trim()
    .replace(/\s+/g, '-');

  return cleaned || `document-${crypto.randomUUID()}`;
}

export function assertDocumentBucket(value: string): asserts value is DocumentStorageBucket {
  if (!isDocumentStorageBucket(value)) {
    throw new HttpError(DOCUMENT_UPLOAD_ERROR_MESSAGES.invalidBucket, 400, {
      bucketName: DOCUMENT_UPLOAD_ERROR_MESSAGES.invalidBucket
    });
  }
}

export function assertValidDocumentFile(file: File, bucketName: DocumentStorageBucket, allowImages = false) {
  const typeError = validateFileType(file.name, file.type, allowImages);

  if (typeError) {
    throw new HttpError(typeError, 400, { file: typeError });
  }

  const sizeError = validateFileSize(file.size, bucketName);

  if (sizeError) {
    throw new HttpError(sizeError, 413, { file: sizeError });
  }
}

export function generateUniqueFilePath({
  bucketName,
  projectId,
  userId,
  fileName
}: {
  bucketName: DocumentStorageBucket;
  projectId: string;
  userId?: string;
  fileName: string;
}) {
  const safeProjectId = encodeURIComponent(projectId || 'unassigned');
  const safeUserId = userId ? encodeURIComponent(userId) : '';
  const timestamp = Date.now();
  const safeFileName = sanitizeFileName(fileName);

  if (bucketName === 'final-repository') {
    return `${bucketName}/${safeProjectId}/${timestamp}-${safeFileName}`;
  }

  return `${bucketName}/${safeProjectId}/${safeUserId || 'system'}/${timestamp}-${safeFileName}`;
}

export async function uploadFile({ bucketName, filePath, file, allowImages = false }: UploadFileInput) {
  assertDocumentBucket(bucketName);
  // This used to always re-validate with allowImages defaulted to false, silently
  // overriding a caller's own (correct) category-based decision — e.g. document-files/
  // route.ts already checks the file against the right category above, but every upload
  // still passed back through here and got rejected a second time under the wrong rule.
  assertValidDocumentFile(file, bucketName, allowImages);

  const buffer = Buffer.from(await file.arrayBuffer());
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/${bucketName}/${encodeObjectPath(filePath)}`,
    {
      method: 'POST',
      headers: getSupabaseServiceHeaders(file.type || getMimeTypeForFile(file.name)),
      body: buffer
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new HttpError(`Supabase upload failed: ${message || response.statusText}`, 502);
  }

  return response.json().catch(() => ({}));
}

export async function deleteFile(bucketName: DocumentStorageBucket, filePath: string) {
  assertDocumentBucket(bucketName);

  const response = await fetch(`${getSupabaseStorageBaseUrl()}/object/${bucketName}`, {
    method: 'DELETE',
    headers: getSupabaseServiceHeaders(),
    body: JSON.stringify({ prefixes: [filePath] })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new HttpError(`Supabase delete failed: ${message || response.statusText}`, 502);
  }

  return response.json().catch(() => ({}));
}

export async function createSignedUrl(
  bucketName: DocumentStorageBucket,
  filePath: string,
  expiresIn = 60 * 5
) {
  assertDocumentBucket(bucketName);

  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/sign/${bucketName}/${encodeObjectPath(filePath)}`,
    {
      method: 'POST',
      headers: getSupabaseServiceHeaders(),
      body: JSON.stringify({ expiresIn })
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new HttpError(`Unable to create signed URL: ${message || response.statusText}`, 502);
  }

  const payload = (await response.json()) as SignedUrlResponse;
  const signedPath = payload.signedURL || payload.signedUrl;

  if (!signedPath) {
    throw new HttpError('Supabase did not return a signed URL.', 502);
  }

  return signedPath.startsWith('http')
    ? signedPath
    : `${getSupabaseStorageBaseUrl()}${signedPath.startsWith('/') ? '' : '/'}${signedPath}`;
}

export async function downloadFile(bucketName: DocumentStorageBucket, filePath: string) {
  const signedUrl = await createSignedUrl(bucketName, filePath, 60);
  const response = await fetch(signedUrl);

  if (!response.ok) {
    throw new HttpError('Unable to download the private file from storage.', 502);
  }

  return response;
}
