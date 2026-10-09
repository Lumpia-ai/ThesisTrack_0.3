/**
 * One set of rules for "can this file be shown inside the page?".
 *
 * Browsers only render a few types inline (PDF, images, plain text). Pointing an <iframe>
 * at anything else — or at a file stored as application/octet-stream, which happens when
 * the browser sent no MIME type on upload — makes the browser download it instead. So:
 * Office files go through the Google viewer, inline types get an explicit content type,
 * and everything else shows a "no inline preview" state with a Download button.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  zip: 'application/zip'
};

const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);
const INLINE_EXTENSIONS = new Set(['pdf', 'txt', ...IMAGE_EXTENSIONS]);

export type FilePreviewKind = 'office' | 'image' | 'inline' | 'none';

export function getFileExtensionFromName(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export function getFilePreviewKind(fileName: string): FilePreviewKind {
  const extension = getFileExtensionFromName(fileName);
  if (OFFICE_EXTENSIONS.has(extension)) return 'office';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (INLINE_EXTENSIONS.has(extension)) return 'inline';
  return 'none';
}

/** Best MIME type for a stored file: trust the extension over a missing/generic stored type. */
export function getMimeTypeForFile(fileName: string, storedType?: string | null) {
  const fromExtension = MIME_BY_EXTENSION[getFileExtensionFromName(fileName)];
  if (fromExtension) return fromExtension;
  return storedType && storedType !== 'application/octet-stream' ? storedType : 'application/octet-stream';
}

export function getGoogleViewerUrl(fileUrl: string) {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

/**
 * Preview URL for a raw storage signed URL (whose served content type we don't control):
 * Office and PDF go through the Google viewer, images can be shown by an <img>, anything
 * else gets no inline preview.
 */
export function getSignedUrlPreview(fileName: string, signedUrl: string | null | undefined) {
  if (!signedUrl) return null;
  const kind = getFilePreviewKind(fileName);
  if (kind === 'office' || getFileExtensionFromName(fileName) === 'pdf') return getGoogleViewerUrl(signedUrl);
  if (kind === 'image') return signedUrl;
  return null;
}
