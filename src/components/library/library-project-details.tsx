'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getProjectById, getTechnologyLabel, LIBRARY_PROJECTS } from '@/components/library/library-data';
import {
  LibraryDepartmentBadge,
  LibraryModal,
  LibraryStatusBadge,
  LibraryTag
} from '@/components/library/library-primitives';
import { LibraryShell } from '@/components/library/library-shell';

type ResourceItem = {
  id: string;
  title: string;
  fileName: string;
  icon: string;
  actionLabel: string;
  accentColor: string;
};

function buildAcademicYear(year: number) {
  return `${year - 1}-${year}`;
}

function buildRelatedProjects(projectId: number, relatedStudyIds?: readonly number[]) {
  if (relatedStudyIds?.length) {
    return relatedStudyIds
      .map((id) => LIBRARY_PROJECTS.find((project) => project.id === id))
      .filter((project): project is (typeof LIBRARY_PROJECTS)[number] => Boolean(project));
  }

  return LIBRARY_PROJECTS.filter((project) => project.id !== projectId).slice(0, 2);
}

function buildResources(projectTitle: string): ResourceItem[] {
  return [
    {
      id: 'manuscript',
      title: 'Manuscript Preview',
      fileName: `${projectTitle.replaceAll(' ', '_')}_Full_Manuscript.pdf`,
      icon: 'fa-file-pdf',
      actionLabel: 'Download PDF',
      accentColor: 'var(--library-danger)'
    },
    {
      id: 'presentation',
      title: 'Defense Presentation',
      fileName: 'Final_Defense_Presentation.pptx',
      icon: 'fa-file-powerpoint',
      actionLabel: 'Download',
      accentColor: 'var(--library-warning)'
    },
    {
      id: 'certificate',
      title: 'Certificate of Completion',
      fileName: 'Best Research Paper Award Certificate',
      icon: 'fa-award',
      actionLabel: 'View Certificate',
      accentColor: 'var(--library-secondary)'
    }
  ];
}

export function LibraryProjectDetails() {
  const searchParams = useSearchParams();
  const projectId = Number(searchParams.get('id') ?? '1');
  const project = getProjectById(Number.isNaN(projectId) ? 1 : projectId);
  const [saved, setSaved] = useState(false);
  const [activeResource, setActiveResource] = useState<ResourceItem | null>(null);

  const relatedProjects = buildRelatedProjects(project.id, project.relatedStudyIds);
  const resources = buildResources(project.detailTitle ?? project.title);

  return (
    <LibraryShell
      activeNav="browse"
      title="Project Details"
      description={project.title}
    >
      <section className="library-detail-hero">
        <div className="library-detail-hero-head">
          <div>
            <h2>{project.detailTitle ?? project.title}</h2>
            <div className="library-detail-meta-row">
              <LibraryDepartmentBadge>{project.department} Department</LibraryDepartmentBadge>
              <LibraryStatusBadge>{project.statusLabel ?? `Published | Completed ${project.year}`}</LibraryStatusBadge>
            </div>
          </div>
          <button
            className="library-btn is-outline"
            type="button"
            onClick={() => setSaved((value) => !value)}
          >
            <i className="fas fa-bookmark" aria-hidden="true" />
            {saved ? 'Saved to Favorites' : 'Save to Favorites'}
          </button>
        </div>
      </section>

      <div className="library-card-grid">
        <section className="library-section-card">
          <div className="library-section-head">
            <h3>Authors</h3>
          </div>
          <div className="library-section-body">
            <div className="library-detail-list">
              {project.authors.map((author, index) => (
                <p key={author}>
                  <strong>{author}</strong>
                  {index === 0
                    ? ' - Project Leader'
                    : index === 1
                      ? ' - Lead Developer'
                      : ' - Researcher'}
                </p>
              ))}
              <p>
                <strong>Adviser:</strong> {project.adviser}
              </p>
            </div>
          </div>
        </section>

        <section className="library-section-card">
          <div className="library-section-head">
            <h3>Project Information</h3>
          </div>
          <div className="library-section-body">
            <div className="library-detail-list">
              <p>
                <strong>Academic Year:</strong> {buildAcademicYear(project.year)}
              </p>
              <p>
                <strong>Project Type:</strong> {project.type}
              </p>
              <p>
                <strong>Status:</strong> Completed & Published
              </p>
              <p>
                <strong>Defense Date:</strong> March 30, {project.year}
              </p>
              <p>
                <strong>Rating:</strong> {project.id === 1 ? '92% (Excellent)' : '89% (Very Good)'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="library-section-card">
        <div className="library-section-head">
          <h3>Abstract</h3>
        </div>
        <div className="library-section-body">
          <p>{project.abstract}</p>
        </div>
      </section>

      <div className="library-card-grid">
        <section className="library-section-card">
          <div className="library-section-head">
            <h3>Keywords</h3>
          </div>
          <div className="library-section-body">
            <div className="library-inline-tags">
              {project.keywords.map((keyword) => (
                <LibraryTag key={keyword}>{keyword}</LibraryTag>
              ))}
            </div>
          </div>
        </section>

        <section className="library-section-card">
          <div className="library-section-head">
            <h3>{getTechnologyLabel(project)}</h3>
          </div>
          <div className="library-section-body">
            <p>{project.technologies?.join(', ') ?? 'Not listed for this study.'}</p>
          </div>
        </section>
      </div>

      <div className="library-card-grid">
        <section className="library-section-card">
          <div className="library-section-head">
            <h3>Achievements</h3>
          </div>
          <div className="library-section-body">
            <div className="library-detail-list">
              {(project.achievements ?? ['Published in the institutional repository']).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="library-section-card">
          <div className="library-section-head">
            <h3>Technology Transfer</h3>
          </div>
          <div className="library-section-body">
            {project.transfer ? (
              <div className="library-detail-list">
                <p>
                  <strong>Partner:</strong> {project.transfer.partner}
                </p>
                <p>
                  <strong>Status:</strong> {project.transfer.status}
                </p>
                <p>
                  <strong>Impact:</strong> {project.transfer.impact}
                </p>
              </div>
            ) : (
              <p className="library-note">No transfer deployment details recorded for this study yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="library-section-card">
        <div className="library-section-head">
          <h3>Available Documents</h3>
        </div>
        <div className="library-section-body">
          <div className="library-card-actions">
            {resources.map((resource) => (
              <button
                className={resource.id === 'manuscript' ? 'library-btn is-primary' : 'library-btn is-outline'}
                key={resource.id}
                type="button"
                onClick={() => setActiveResource(resource)}
              >
                <i className={`fas ${resource.icon}`} aria-hidden="true" />
                {resource.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="library-section-card">
        <div className="library-section-head">
          <h3>Related Studies</h3>
        </div>
        <div className="library-section-body">
          <div className="library-feature-grid">
            {relatedProjects.map((relatedProject) => (
              <article className="library-feature-card is-left" key={relatedProject.id}>
                <h4>{relatedProject.title}</h4>
                <LibraryDepartmentBadge>{relatedProject.department}</LibraryDepartmentBadge>
                <p>{relatedProject.abstract}</p>
                <div className="library-card-actions">
                  <Link
                    className="library-btn is-outline is-small"
                    href={`/library/project-details?id=${relatedProject.id}`}
                  >
                    View Study
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LibraryModal
        maxWidth={800}
        open={activeResource !== null}
        title={activeResource?.title ?? 'Document Preview'}
        onClose={() => setActiveResource(null)}
      >
        {activeResource ? (
          <div className="library-document-preview">
            <i
              className={`fas ${activeResource.icon}`}
              aria-hidden="true"
              style={{ color: activeResource.accentColor, fontSize: '4rem' }}
            />
            <strong>{activeResource.fileName}</strong>
            <button className="library-btn is-primary" type="button">
              {activeResource.actionLabel}
            </button>
          </div>
        ) : null}
      </LibraryModal>
    </LibraryShell>
  );
}
