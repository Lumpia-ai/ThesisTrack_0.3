'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { SystemAdminShell } from '@/components/system-admin/system-admin-shell';
import { useBranding, publishBrandingPreview, publishBrandingUpdate } from '@/components/branding/branding-provider';
import { cloneBranding } from '@/lib/branding';

type BannerState = {
  tone: 'success' | 'warning' | 'info';
  title: string;
  body: string;
};

export function SystemAdminProgramsContent() {
  const { branding } = useBranding();
  const [draftBranding, setDraftBranding] = useState(() => cloneBranding(branding));
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);

  // Sync draft to preview iframe whenever it changes
  useEffect(() => {
    publishBrandingPreview(draftBranding);
  }, [draftBranding]);

  // Component relies on local draft state, no external sync needed

  const commitUpdate = (newDraft: typeof draftBranding) => {
    setDraftBranding(newDraft);
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const draft = cloneBranding(draftBranding);
    draft.programsContent.title = e.target.value;
    commitUpdate(draft);
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const draft = cloneBranding(draftBranding);
    draft.programsContent.description = e.target.value;
    commitUpdate(draft);
  };

  const handleHighlightChange = (index: number, field: 'value' | 'label', value: string) => {
    const draft = cloneBranding(draftBranding);
    draft.programsContent.highlights[index] = {
      ...draft.programsContent.highlights[index],
      [field]: value
    };
    commitUpdate(draft);
  };

  const toggleHighlight = (index: number) => {
    const draft = cloneBranding(draftBranding);
    draft.programsContent.highlights[index] = {
      ...draft.programsContent.highlights[index],
      visible: !draft.programsContent.highlights[index].visible
    };
    commitUpdate(draft);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setBanner(null);
    try {
      await publishBrandingUpdate(draftBranding);
      setBanner({ tone: 'success', title: 'Saved successfully', body: 'Programs content has been updated.' });
    } catch (err: any) {
      setBanner({ tone: 'error' as any, title: 'Failed to save', body: err.message || 'Unknown error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SystemAdminShell activeNav="branding" title="Programs Content" description="Manage the content for the About Departments section.">
      <div className="admin-page-stack branding-page">
        {banner && (
          <section className={`admin-result-banner is-${banner.tone}`}>
            <div>
              <strong>{banner.title}</strong>
              <p>{banner.body}</p>
            </div>
            <button className="btn btn-outline small" type="button" onClick={() => setBanner(null)}>
              Dismiss
            </button>
          </section>
        )}

        <div className="branding-page-layout" data-preview-expanded={false}>
          <div className="branding-main-column">
            <section className="admin-section-card">
              <div className="admin-section-head">
                <div>
                  <h3>Programs Content</h3>
                  <p>Manage the About Departments section text and highlights</p>
                </div>
              </div>
              
              <div className="admin-section-body">
                <section className="branding-editor-section">
                  <div className="form-group">
                    <label>Section Title</label>
                    <input
                      className="form-control"
                      type="text"
                      value={draftBranding.programsContent.title}
                      onChange={handleTitleChange}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Section Description</label>
                    <textarea
                      className="form-control"
                      value={draftBranding.programsContent.description}
                      onChange={handleDescriptionChange}
                      rows={4}
                    />
                  </div>
                </section>

                <section className="branding-editor-section mt-8">
                  <h3>Department Highlights</h3>
                  <p className="text-sm text-slate-500 mb-4">Edit the 3 statistics shown above the department list.</p>
                  
                  <div className="branding-features-list">
                    {draftBranding.programsContent.highlights.map((highlight, index) => (
                      <div key={highlight.id} className="branding-feature-card">
                        <div className="form-group">
                          <div className="flex justify-between items-center mb-2">
                            <label>Highlight {index + 1} Value</label>
                            <button
                              type="button"
                              className={`branding-feature-toggle ${highlight.visible ? 'active' : ''}`}
                              onClick={() => toggleHighlight(index)}
                            >
                              <i className={highlight.visible ? 'fas fa-eye' : 'fas fa-eye-slash'} />
                            </button>
                          </div>
                          <input
                            className="form-control"
                            type="text"
                            value={highlight.value}
                            onChange={(e) => handleHighlightChange(index, 'value', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginTop: '0.5rem' }}>
                          <label>Highlight {index + 1} Label</label>
                          <input
                            className="form-control"
                            type="text"
                            value={highlight.label}
                            onChange={(e) => handleHighlightChange(index, 'label', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>

            <section className="branding-command-bar">
              <div>
                <strong>Programs Actions</strong>
                <span>Ready to save when changes are reviewed</span>
              </div>
              <div className="branding-command-actions">
                <button
                  className="btn btn-primary"
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  <i className={isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-check'} />
                  {isSaving ? 'Saving...' : 'Save Content'}
                </button>
              </div>
            </section>
          </div>

          <aside className="branding-preview-column">
            <section className="admin-section-card branding-preview-card">
              <div className="admin-section-head">
                <div>
                  <h3>Live Page Preview</h3>
                  <p>Preview the changes to the About Departments section.</p>
                </div>
              </div>
              <div className="admin-section-body" style={{ height: '700px', display: 'flex' }}>
                <iframe
                  className="branding-preview-route-frame"
                  style={{ flex: 1, border: 'none', borderRadius: '0.5rem' }}
                  src="/about?brandingPreview=1#about-departments"
                  title="programs content preview"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </SystemAdminShell>
  );
}
