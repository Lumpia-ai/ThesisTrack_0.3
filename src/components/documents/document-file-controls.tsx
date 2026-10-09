'use client';

import { type ChangeEvent, useRef } from 'react';
import {
  DOCUMENT_FILE_ACCEPT,
  type DocumentStorageBucket,
  validateFileSize,
  validateFileType
} from '@/lib/storage/upload-config';

export type DocumentFileSummary = {
  id: string;
  fileName: string;
  bucketName?: string | null;
  fileType: string;
  fileSize: number | null;
  uploadedBy?: string;
  uploadedByName?: string;
  projectId?: string | null;
  projectTitle?: string | null;
  groupCode?: string | null;
  groupTitle?: string | null;
  groupMembers?: Array<{
    userId?: string;
    name: string;
    role: string;
    isLeader: boolean;
  }>;
  milestone?: string | null;
  submissionId?: string | null;
  submissionStatus?: string | null;
  submissionVersion?: number | null;
  submittedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  latestReviewComment?: {
    id: string;
    body: string;
    decision: string;
    createdAt: string | Date;
    authorId?: string | null;
    authorName?: string | null;
  } | null;
  reviewComments?: Array<{
    id: string;
    body: string;
    decision: string;
    createdAt: string | Date;
    authorId?: string | null;
    authorName?: string | null;
  }>;
  documentCategory: string;
  // Stage the file was filed under and its display label, computed server-side
  // from its checkpoint (src/lib/stage-labels.ts).
  checkpointKey?: string | null;
  stage?: string | null;
  stageLabel?: string | null;
  label?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
};

function formatDocumentFileType(file: DocumentFileSummary) {
  const extension = file.fileName.split('.').pop()?.toUpperCase();

  if (extension) {
    return extension;
  }

  if (file.fileType.includes('pdf')) return 'PDF';
  if (file.fileType.includes('word')) return 'DOCX';
  if (file.fileType.includes('presentation')) return 'PPTX';
  if (file.fileType.includes('spreadsheet') || file.fileType.includes('excel')) return 'XLSX';

  return 'Document';
}

function formatDocumentFileSize(size: number | null) {
  if (!size) {
    return 'Size unavailable';
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocumentFileDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function DocumentFileUploadButton({
  bucketName,
  disabled,
  label = 'Upload Document',
  onFileSelected,
  onError
}: {
  bucketName: DocumentStorageBucket;
  disabled?: boolean;
  label?: string;
  onFileSelected: (file: File) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      return;
    }

    const typeError = validateFileType(file.name, file.type);
    const sizeError = validateFileSize(file.size, bucketName);

    if (typeError || sizeError) {
      onError(typeError || sizeError || 'Selected file is not valid.');
      event.target.value = '';
      return;
    }

    onFileSelected(file);
  };

  return (
    <>
      <button
        className="table-btn"
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <i className="fas fa-file-arrow-up" aria-hidden="true" /> {label}
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={DOCUMENT_FILE_ACCEPT}
        disabled={disabled}
        onChange={handleChange}
      />
    </>
  );
}

export function DocumentFileList({
  files,
  isLoading,
  error,
  emptyMessage = 'No documents uploaded yet.',
  onView,
  onDownload,
  onDelete
}: {
  files: DocumentFileSummary[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onView: (file: DocumentFileSummary) => void;
  onDownload: (file: DocumentFileSummary) => void;
  onDelete?: (file: DocumentFileSummary) => void;
}) {
  if (error) {
    return (
      <div className="project-files-state is-danger">
        <i className="fas fa-circle-exclamation" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="project-files-state">
        <span className="project-files-spinner" aria-hidden="true" />
        <span>Loading documents...</span>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="empty-state project-files-empty-state">
        <span className="empty-state-icon"><i className="fas fa-folder-open" aria-hidden="true" /></span>
        <strong>{emptyMessage}</strong>
      </div>
    );
  }

  return (
    <div className="project-files-repository-grid">
      {files.map((file) => (
        <article key={file.id} className="project-files-repository-item">
          <div className="project-files-repository-head">
            <span className="project-files-repository-lock">
              <i className="fas fa-file-shield" aria-hidden="true" />
            </span>
            <div className="project-files-repository-copy">
              <strong>{file.fileName}</strong>
              <p className="project-files-repository-subcopy">
                <span>{file.label || file.documentCategory}</span>
                <span>{formatDocumentFileType(file)}</span>
                <span>{formatDocumentFileSize(file.fileSize)}</span>
                <span>{formatDocumentFileDate(file.createdAt)}</span>
              </p>
            </div>
          </div>
          <div className="project-files-repository-actions">
            <button className="table-btn" type="button" onClick={() => onView(file)}>
              <i className="fas fa-eye" aria-hidden="true" /> View
            </button>
            <button className="table-btn" type="button" onClick={() => onDownload(file)}>
              <i className="fas fa-download" aria-hidden="true" /> Download
            </button>
            {onDelete ? (
              <button className="table-btn is-danger" type="button" onClick={() => onDelete(file)}>
                <i className="fas fa-trash-can" aria-hidden="true" /> Delete
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
