import { notFound } from 'next/navigation';
import Link from 'next/link';

import { LandingFooter } from '@/components/public/landing-footer';
import { PublicLayout } from '@/components/layouts/public-layout';
import { GuestNavigation } from '@/components/guest/guest-navigation';
import { GuestRepositoryDetail, type GuestRepositoryProjectDetail } from '@/components/guest/guest-repository-detail';
import { RepositoryViewTracker } from '@/components/guest/repository-view-tracker';
import { getMockRepositoryProjectById, isDatabaseConnectivityError } from '@/lib/repository/mock-data';
import { getRepositoryPrisma } from '@/lib/repository-prisma';

import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';

async function getProject(id: string): Promise<GuestRepositoryProjectDetail | null> {
  try {
    const repositoryDb = getRepositoryPrisma();

    const project = await repositoryDb.repositoryProject.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        abstract: true,
        adviser: true,
        program: true,
        department: true,
        schoolYear: true,
        keywords: true,
        manuscriptUrl: true,
        status: true,
        publishedAt: true,
        authors: { select: { name: true }, orderBy: { createdAt: 'asc' } },
        files: {
          select: { id: true, fileName: true, fileUrl: true, fileType: true, uploadedAt: true },
          orderBy: { uploadedAt: 'asc' }
        },
        technologyTransfer: {
          where: { source: 'SYSTEM' },
          orderBy: { dateRecorded: 'desc' },
          take: 1,
          select: { transferStatus: true, partnerName: true, moaUrl: true, deploymentDate: true }
        }
      }
    });

    if (!project) {
      return null;
    }

    const deployment = project.technologyTransfer[0] || null;

    return {
      ...project,
      publishedAt: project.publishedAt ? project.publishedAt.toISOString() : null,
      authors: project.authors.map((author) => author.name),
      files: project.files.map((file) => ({
        ...file,
        uploadedAt: file.uploadedAt ? file.uploadedAt.toISOString() : null
      })),
      deploymentStatus: deployment?.transferStatus || null,
      deploymentPartner: deployment?.partnerName || null,
      deploymentDate: deployment?.deploymentDate ? deployment.deploymentDate.toISOString() : null,
      moaUrl: deployment?.moaUrl || null
    };
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      console.warn('[repository] REPOSITORY_DATABASE_URL is unreachable; serving mock repository data.');
      return getMockRepositoryProjectById(id);
    }

    throw error;
  }
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const project = await getProject(id);

  return { title: project ? `${project.title} | ThesisTrack Repository` : 'Repository Record | ThesisTrack' };
}

export default async function RepositoryProjectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <PublicLayout>
      <div className={styles.landingPage}>
        <GuestNavigation />

        <main className={styles.main}>
          <section
            style={{
              background: 'linear-gradient(135deg, #06183f 0%, #0a2a6e 45%, #003A8F 100%)',
              padding: '2.75rem 0 4.5rem',
              color: 'white'
            }}
          >
            <div className={styles.container}>
              <Link
                href="/repository"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700, textDecoration: 'none', marginBottom: '1.25rem', fontSize: '0.9rem' }}
              >
                <i className="fas fa-arrow-left" /> Back to Repository
              </Link>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(246, 190, 0, 0.14)',
                  border: '1px solid rgba(246, 190, 0, 0.4)',
                  color: '#F6BE00',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '2rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                <i className="fas fa-door-open" aria-hidden="true" /> Repository Record
              </span>
            </div>
          </section>

          <section style={{ padding: '0 0 4rem' }}>
            <div className={styles.container} style={{ marginTop: '-3rem', position: 'relative', zIndex: 2 }}>
              <GuestRepositoryDetail project={project} />
              <RepositoryViewTracker repositoryProjectId={project.id} />
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>
    </PublicLayout>
  );
}
