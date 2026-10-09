export const DOCUMENT_STORAGE_BUCKETS = {
  THESIS_DOCUMENTS: 'thesis-documents',
  EVALUATION_FILES: 'evaluation-files',
  FINAL_REPOSITORY: 'final-repository'
} as const;

export type DocumentStorageBucket =
  (typeof DOCUMENT_STORAGE_BUCKETS)[keyof typeof DOCUMENT_STORAGE_BUCKETS];

export const DOCUMENT_STORAGE_BUCKET_LIST = Object.values(DOCUMENT_STORAGE_BUCKETS);

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx'
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

export const DOCUMENT_BUCKET_MAX_FILE_SIZE_BYTES: Record<DocumentStorageBucket, number> = {
  [DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS]: 50 * 1024 * 1024,
  [DOCUMENT_STORAGE_BUCKETS.EVALUATION_FILES]: 40 * 1024 * 1024,
  [DOCUMENT_STORAGE_BUCKETS.FINAL_REPOSITORY]: 50 * 1024 * 1024
};

// Image evidence (e.g. a photo of a signed compliance/clearance form) is a
// separate, narrower allowlist from ALLOWED_DOCUMENT_EXTENSIONS above — kept
// distinct so document categories stay document-only and this stays image-only,
// rather than broadening the whole thesis-documents bucket to accept images.
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'] as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png'
] as const;

// Shared, single source of truth for which document-category keys get special
// upload treatment — used by both the /api/document-files route and the
// student-facing upload forms, so client-side validation/accept attributes
// and server-side enforcement never drift apart.
//
// - ACHIEVEMENT: awards/recognitions and activity evidence aren't part of the
//   sequential thesis workflow (no milestone checkpoint), so they skip
//   checkpoint linking entirely rather than being mislabeled as some other
//   stage's submission.
// - CONCEPT_GATE_EXEMPT: achievement categories plus the oral defense
//   application evidence, which is uploaded mid-Concept-stage — all three
//   skip the "Concept must be approved first" gate that everything else on
//   Document Submissions is still subject to.
// - EVIDENCE: evidence/activity/award categories aren't part of the sequential
//   thesis document set, so they also accept photos (JPG/PNG) on top of the
//   document allowlist — a photo or scan of the proof. Videos and other types
//   stay blocked so a few large files can't eat the free-plan storage quota.
//   Strict document-only checking stays reserved for real thesis documents
//   (manuscript, chapters, proposal, system files, etc.).
export const ACHIEVEMENT_DOCUMENT_CATEGORIES = new Set(['award-recognition', 'activity-evidence']);

export const CONCEPT_GATE_EXEMPT_DOCUMENT_CATEGORIES = new Set([
  'award-recognition',
  'activity-evidence',
  'concept-defense-application'
]);

export const EVIDENCE_FILE_TYPE_CATEGORIES = new Set([
  'award-recognition',
  'activity-evidence',
  'concept-defense-application',
  'proposal-defense-application',
  'final-defense-application'
]);

export const DOCUMENT_UPLOAD_ERROR_MESSAGES = {
  invalidFileType: 'Invalid file type: Only PDF, DOC, DOCX, PPT, PPTX, XLS, and XLSX files are allowed.',
  invalidFileTypeWithImages: 'Invalid file type: Only PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, and PNG files are allowed.',
  emptyFile: 'The selected file is empty.',
  missingFile: 'Please attach a document file to upload.',
  invalidBucket: 'Selected document storage bucket is not supported.',
  maxFileSize: {
    [DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS]: 'File size must not exceed 50MB.',
    [DOCUMENT_STORAGE_BUCKETS.EVALUATION_FILES]: 'File size must not exceed 40MB.',
    [DOCUMENT_STORAGE_BUCKETS.FINAL_REPOSITORY]: 'File size must not exceed 50MB.'
  }
} as const;

export const DOCUMENT_FILE_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(',');

export const DOCUMENT_AND_IMAGE_FILE_ACCEPT = [...ALLOWED_DOCUMENT_EXTENSIONS, ...ALLOWED_IMAGE_EXTENSIONS]
  .map((extension) => `.${extension}`)
  .join(',');

export function isDocumentStorageBucket(value: string): value is DocumentStorageBucket {
  return DOCUMENT_STORAGE_BUCKET_LIST.includes(value as DocumentStorageBucket);
}

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.trim().toLowerCase() || '';
}

// allowImages widens the document allowlist with JPG/PNG — used for the
// evidence/activity/award categories (see EVIDENCE_FILE_TYPE_CATEGORIES above).
export function validateFileType(fileName: string, mimeType?: string, allowImages = false) {
  const extension = getFileExtension(fileName);
  const allowedExtensions: readonly string[] = allowImages
    ? [...ALLOWED_DOCUMENT_EXTENSIONS, ...ALLOWED_IMAGE_EXTENSIONS]
    : ALLOWED_DOCUMENT_EXTENSIONS;
  const allowedMimeTypes: readonly string[] = allowImages
    ? [...ALLOWED_DOCUMENT_MIME_TYPES, ...ALLOWED_IMAGE_MIME_TYPES]
    : ALLOWED_DOCUMENT_MIME_TYPES;
  const hasAllowedExtension = allowedExtensions.includes(extension);
  const hasAllowedMimeType = Boolean(mimeType) && allowedMimeTypes.includes(mimeType as string);

  if (!hasAllowedExtension || (mimeType && !hasAllowedMimeType)) {
    return allowImages
      ? DOCUMENT_UPLOAD_ERROR_MESSAGES.invalidFileTypeWithImages
      : DOCUMENT_UPLOAD_ERROR_MESSAGES.invalidFileType;
  }

  return null;
}

export function validateFileSize(size: number, bucketName: DocumentStorageBucket) {
  if (size <= 0) {
    return DOCUMENT_UPLOAD_ERROR_MESSAGES.emptyFile;
  }

  if (size > DOCUMENT_BUCKET_MAX_FILE_SIZE_BYTES[bucketName]) {
    return DOCUMENT_UPLOAD_ERROR_MESSAGES.maxFileSize[bucketName];
  }

  return null;
}
