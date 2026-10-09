'use client';

import { useState } from 'react';

import { getDepartmentTheme } from './department-theme';

export type GuestRepositoryProjectDetail = {
  id: string;
  title: string;
  abstract: string | null;
  adviser: string | null;
  program: string | null;
  department: string | null;
  schoolYear: string | null;
  keywords: string[];
  manuscriptUrl: string | null;
  status: string | null;
  publishedAt: string | null;
  authors: string[];
  files: Array<{ id: string; fileName: string; fileUrl: string; fileType: string | null; uploadedAt: string | null }>;
  problemStatement?: string | null;
  objectives?: string[] | null;
  scope?: string | null;
  deploymentStatus?: string | null;
  deploymentPartner?: string | null;
  deploymentDate?: string | null;
  moaUrl?: string | null;
};

type RequestFormState = {
  name: string;
  email: string;
  organization: string;
  message: string;
};

const INITIAL_FORM: RequestFormState = { name: '', email: '', organization: '', message: '' };

export function GuestRepositoryDetail({ project }: { project: GuestRepositoryProjectDetail }) {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [form, setForm] = useState<RequestFormState>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/repository/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryProjectId: project.id,
          name: form.name,
          email: form.email,
          organization: form.organization,
          message: form.message
        })
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        throw new Error(payload.message || 'Unable to submit your request right now.');
      }

      setIsSubmitted(true);
    } catch (error) {
      setSubmitError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeModal() {
    setIsRequestOpen(false);
    setIsSubmitted(false);
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setSubmitError(null);
  }

  const theme = getDepartmentTheme(project.department);

  const deploymentInfo = (() => {
    switch (project.deploymentStatus) {
      case 'DEPLOYED':
        return { label: 'Deployed', color: '#15803D', tint: '#F0FDF4', icon: 'fa-circle-check' };
      case 'PROPOSED':
        return { label: 'Adoption Proposed', color: '#B45309', tint: '#FFFBEB', icon: 'fa-handshake' };
      case 'TERMINATED':
        return { label: 'Deployment Ended', color: '#B91C1C', tint: '#FEF2F2', icon: 'fa-circle-xmark' };
      default:
        return { label: 'Not Yet Deployed', color: '#64748B', tint: '#F1F5F9', icon: 'fa-hourglass-half' };
    }
  })();
  const deploymentTheme = deploymentInfo;
  const deploymentLabel = deploymentInfo.label;
  const formattedDeploymentDate = project.deploymentDate
    ? new Date(project.deploymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: theme.color }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.4rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '1.2rem', flex: 1, minWidth: '260px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: theme.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color, fontSize: '1.6rem', flexShrink: 0 }}>
              <i className={`fas ${theme.icon}`} />
            </div>
            <div>
              <h1 style={{ margin: '0 0 0.6rem 0', fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', color: '#0F172A' }}>{project.title}</h1>
              <div style={{ color: '#64748B', fontSize: '0.95rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                {project.department ? (
                  <span style={{ background: theme.tint, color: theme.color, padding: '0.25rem 0.7rem', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 800 }}>{project.department}</span>
                ) : null}
                {project.program ? <span>{project.program}</span> : null}
                {project.schoolYear ? <><span style={{ color: '#CBD5E1' }}>&bull;</span> S.Y. {project.schoolYear}</> : null}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsRequestOpen(true)}
            style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '0.9rem 1.8rem', borderRadius: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 6px 15px rgba(0,58,143,0.2)', flexShrink: 0 }}
          >
            <i className="fas fa-handshake" /> Request Adoption / Transfer
          </button>
        </div>

        <div
          style={{
            marginTop: '1.8rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}
        >
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '1.1rem 1.3rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: theme.tint, color: theme.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-user-group" />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Researcher{project.authors.length === 1 ? '' : 's'}</span>
              {project.authors.length ? (
                project.authors.map((author) => (
                  <strong key={author} style={{ display: 'block', color: '#0F172A', fontSize: '0.95rem', lineHeight: 1.5 }}>{author}</strong>
                ))
              ) : (
                <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Not on record</span>
              )}
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '1.1rem 1.3rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEF9C3', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-chalkboard-user" />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Faculty Adviser</span>
              <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.95rem' }}>{project.adviser || 'Not on record'}</strong>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '1.1rem 1.3rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-box-archive" />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Repository Status</span>
              <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.95rem' }}>{project.status === 'ARCHIVED' ? 'Completed & Archived' : project.status || 'Archived'}</strong>
            </div>
          </div>

          <div style={{ background: deploymentTheme.tint, border: `1px solid ${deploymentTheme.color}33`, borderRadius: '1rem', padding: '1.1rem 1.3rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'white', color: deploymentTheme.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fas ${deploymentTheme.icon}`} />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Real-World Adoption</span>
              <strong style={{ display: 'block', color: deploymentTheme.color, fontSize: '0.95rem' }}>{deploymentLabel}</strong>
            </div>
          </div>
        </div>

        {project.abstract ? (
          <div style={{ marginTop: '1.8rem' }}>
            <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1.05rem', color: '#0F172A' }}>
              <i className="fas fa-align-left" style={{ color: '#94A3B8', marginRight: '0.5rem' }} />
              About this Research
            </h2>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.7 }}>{project.abstract}</p>
          </div>
        ) : null}

        {project.deploymentStatus ? (
          <div style={{ marginTop: '1.8rem', background: deploymentTheme.tint, border: `1px solid ${deploymentTheme.color}33`, borderRadius: '1rem', padding: '1.3rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.9rem' }}>
              <i className={`fas ${deploymentTheme.icon}`} style={{ color: deploymentTheme.color }} />
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0F172A' }}>Deployment &amp; Evidence</h2>
              <span style={{ marginLeft: 'auto', background: 'white', color: deploymentTheme.color, padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 800 }}>{deploymentLabel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Adopting Partner</span>
                <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.95rem' }}>{project.deploymentPartner || 'Not on record'}</strong>
              </div>
              {formattedDeploymentDate ? (
                <div>
                  <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Deployment Date</span>
                  <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.95rem' }}>{formattedDeploymentDate}</strong>
                </div>
              ) : null}
            </div>
            {project.moaUrl ? (
              <a
                href={project.moaUrl}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: deploymentTheme.color, border: `1px solid ${deploymentTheme.color}55`, padding: '0.55rem 1.1rem', borderRadius: '0.6rem', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
              >
                <i className="fas fa-file-contract" /> View Adoption Agreement (MOA)
                <i className="fas fa-arrow-up-right-from-square" style={{ fontSize: '0.75rem' }} />
              </a>
            ) : (
              <p style={{ margin: '1rem 0 0 0', color: '#64748B', fontSize: '0.85rem' }}>
                No public deployment document has been attached yet.
              </p>
            )}
          </div>
        ) : null}

        {project.problemStatement || (project.objectives && project.objectives.length) || project.scope ? (
          <div style={{ marginTop: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0F172A' }}>
              <i className="fas fa-list-check" style={{ color: '#94A3B8', marginRight: '0.5rem' }} />
              Key Highlights
            </h2>

            {project.problemStatement ? (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '1.2rem 1.4rem' }}>
                <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Problem Being Addressed</strong>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.65, fontSize: '0.95rem' }}>{project.problemStatement}</p>
              </div>
            ) : null}

            {project.objectives && project.objectives.length ? (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '1.2rem 1.4rem' }}>
                <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.9rem', marginBottom: '0.7rem' }}>Objectives</strong>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', lineHeight: 1.7, fontSize: '0.95rem' }}>
                  {project.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {project.scope ? (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '1.2rem 1.4rem' }}>
                <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Scope</strong>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.65, fontSize: '0.95rem' }}>{project.scope}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: '1.6rem' }}>
          {project.manuscriptUrl ? (
            <a
              href={project.manuscriptUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: theme.tint,
                border: `1px solid ${theme.color}33`,
                borderRadius: '1rem',
                padding: '1.1rem 1.4rem',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'white', color: theme.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  <i className="fas fa-file-pdf" />
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.98rem' }}>Read the Full Manuscript</strong>
                  <span style={{ color: '#64748B', fontSize: '0.85rem' }}>The complete study &mdash; objectives, methodology, results, and conclusion</span>
                </div>
              </div>
              <i className="fas fa-arrow-up-right-from-square" style={{ color: theme.color }} />
            </a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '1rem', padding: '1.1rem 1.4rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <i className="fas fa-circle-info" style={{ color: '#94A3B8', fontSize: '1.2rem' }} />
                <span style={{ color: '#64748B', fontSize: '0.9rem' }}>
                  The full manuscript hasn&apos;t been attached to this repository record yet. Submit an adoption
                  request and the technology transfer office can share it directly.
                </span>
              </div>
              <button
                onClick={() => setIsRequestOpen(true)}
                style={{ background: 'white', border: `1px solid ${theme.color}`, color: theme.color, padding: '0.55rem 1.1rem', borderRadius: '0.6rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Request Details
              </button>
            </div>
          )}
        </div>

        {project.keywords.length ? (
          <div style={{ marginTop: '1.6rem' }}>
            <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1.05rem', color: '#0F172A' }}>
              <i className="fas fa-tags" style={{ color: '#94A3B8', marginRight: '0.5rem' }} />
              Keywords
            </h2>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {project.keywords.map((keyword) => (
                <span key={keyword} style={{ background: '#F1F5F9', color: '#475569', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #E2E8F0' }}>{keyword}</span>
              ))}
            </div>
          </div>
        ) : null}

        {project.files.length ? (
          <div style={{ marginTop: '1.8rem' }}>
            <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1.05rem', color: '#0F172A' }}>
              <i className="fas fa-paperclip" style={{ color: '#94A3B8', marginRight: '0.5rem' }} />
              Repository Files
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {project.files.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.8rem 1rem', borderRadius: '0.6rem', textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <i className="fas fa-file-pdf" style={{ color: '#EF4444' }} />
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{file.fileName}</strong>
                  </div>
                  <i className="fas fa-arrow-up-right-from-square" style={{ color: '#64748B', fontSize: '0.85rem' }} />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {isRequestOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 200 }}
          onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}
        >
          <div style={{ background: 'white', borderRadius: '1.2rem', width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 30px 60px rgba(15,23,42,0.3)' }}>
            {isSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '28px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto' }}>
                  <i className="fas fa-check-circle" />
                </div>
                <h3 style={{ margin: 0, color: '#0F172A' }}>Request Submitted</h3>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
                  Your adoption request for <strong>{project.title}</strong> has been sent to the technology
                  transfer office for review. They will reach out to you by email.
                </p>
                <button onClick={closeModal} style={{ marginTop: '0.5rem', background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0', color: '#0F172A' }}>Request Adoption / Transfer</h3>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '0.9rem' }}>for &ldquo;{project.title}&rdquo;</p>
                  </div>
                  <button type="button" onClick={closeModal} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94A3B8', cursor: 'pointer' }}>
                    <i className="fas fa-xmark" />
                  </button>
                </div>

                {submitError ? (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '0.75rem 1rem', borderRadius: '0.6rem', fontSize: '0.9rem' }}>{submitError}</div>
                ) : null}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="guest-request-name" style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Full Name</label>
                  <input
                    id="guest-request-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    style={{ padding: '0.75rem 1rem', borderRadius: '0.6rem', border: `1px solid ${fieldErrors.name ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', color: '#0F172A' }}
                  />
                  {fieldErrors.name ? <span style={{ color: '#DC2626', fontSize: '0.8rem' }}>{fieldErrors.name}</span> : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="guest-request-email" style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Email Address</label>
                  <input
                    id="guest-request-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    style={{ padding: '0.75rem 1rem', borderRadius: '0.6rem', border: `1px solid ${fieldErrors.email ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', color: '#0F172A' }}
                  />
                  {fieldErrors.email ? <span style={{ color: '#DC2626', fontSize: '0.8rem' }}>{fieldErrors.email}</span> : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="guest-request-org" style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Organization (optional)</label>
                  <input
                    id="guest-request-org"
                    type="text"
                    value={form.organization}
                    onChange={(event) => setForm((current) => ({ ...current, organization: event.target.value }))}
                    style={{ padding: '0.75rem 1rem', borderRadius: '0.6rem', border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none', color: '#0F172A' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="guest-request-message" style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>What are you interested in?</label>
                  <textarea
                    id="guest-request-message"
                    rows={4}
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Tell us how you'd like to adopt, deploy, or transfer this research."
                    style={{ padding: '0.75rem 1rem', borderRadius: '0.6rem', border: `1px solid ${fieldErrors.message ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', color: '#0F172A', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  {fieldErrors.message ? <span style={{ color: '#DC2626', fontSize: '0.8rem' }}>{fieldErrors.message}</span> : null}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ background: 'linear-gradient(135deg, #003A8F, #1E40AF)', color: 'white', border: 'none', padding: '0.9rem', borderRadius: '0.8rem', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {isSubmitting ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-paper-plane" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
