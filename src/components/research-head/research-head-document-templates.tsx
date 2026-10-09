'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ResearchHeadShell } from '@/components/research-head/research-head-shell';
import { getStoredUser } from '@/lib/mock/auth';

type TemplateInfo = {
  fileName: string;
  uploadedAt: string;
  uploadedByName: string;
} | null;

function formatDateTimeLabel(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
}

export function ResearchHeadDocumentTemplates() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [template, setTemplate] = useState<TemplateInfo>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [isResearchHead, setIsResearchHead] = useState(false);

  useEffect(() => {
    setIsResearchHead(getStoredUser()?.role === 'research_head');
  }, []);

  const loadTemplate = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/concept-defense-application-template', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to load the current template.');
      }

      setTemplate(payload?.template ?? null);
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to load the current template.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, []);

  const handleBrowse = () => {
    if (isUploading) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/concept-defense-application-template', {
        method: 'POST',
        body: formData
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to upload the template.');
      }

      setTemplate(payload?.template ?? null);
      setNotice({ tone: 'success', message: 'The current Application for Oral Defense of Thesis (Concept) template has been updated. All students will see the new version.' });
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to upload the template.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ResearchHeadShell
      activeNav="document-templates"
      title="Document Templates"
      description="Manage the current blank forms students download and fill out before uploading signed evidence."
    >
      <div className="admin-page-stack rh-wide-page">
        <section className="admin-section-card">
          <div className="admin-section-head">
            <div>
              <h3>Application for Oral Defense of Thesis (Concept)</h3>
              <p>
                Students upload a photo of the signed, cleared copy of this form as part of the Concept stage.
                Since the official form is typically revised every academic year, replace it here whenever a new
                version is issued &mdash; every student immediately sees the updated file.
              </p>
            </div>
            <span className={`status-badge ${template ? 'status-active' : 'status-warning'}`}>
              {isLoading ? 'Loading...' : template ? 'Template on file' : 'No template uploaded'}
            </span>
          </div>

          <div className="admin-section-body">
            {!isResearchHead ? (
              <div className="admin-result-banner is-warning">
                <div>
                  <strong>This template is managed by the Research Head only.</strong>
                  <p>You can see the current file below, but only the Research Head account can replace it.</p>
                </div>
              </div>
            ) : null}

            {notice ? (
              <div className={`admin-result-banner ${notice.tone === 'success' ? 'is-success' : 'is-warning'}`} style={{ marginTop: !isResearchHead ? '0.75rem' : 0 }}>
                <div>
                  <p>{notice.message}</p>
                </div>
              </div>
            ) : null}

            <div className="admin-list-item" style={{ marginTop: notice || !isResearchHead ? '1rem' : 0 }}>
              <div>
                <strong>{template ? template.fileName : 'No file uploaded yet'}</strong>
                {template ? (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.75 }}>
                    Uploaded {formatDateTimeLabel(template.uploadedAt)} by {template.uploadedByName}
                  </p>
                ) : (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.75 }}>
                    Students will not see a download link on Project Overview until a template is uploaded here.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {template ? (
                  <a
                    className="btn btn-secondary"
                    href="/api/concept-defense-application-template/download"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fas fa-download" aria-hidden="true" /> Download Current
                  </a>
                ) : null}
                {isResearchHead ? (
                  <>
                    <button className="btn btn-primary" type="button" onClick={handleBrowse} disabled={isUploading}>
                      <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`} aria-hidden="true" />
                      {isUploading ? 'Uploading...' : template ? 'Replace Template' : 'Upload Template'}
                    </button>
                    <input
                      ref={fileInputRef}
                      hidden
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ResearchHeadShell>
  );
}
