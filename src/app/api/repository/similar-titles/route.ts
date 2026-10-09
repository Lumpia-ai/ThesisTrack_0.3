import { ProjectStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRepositoryPrisma } from '@/lib/repository-prisma';
import { getMockRepositoryProjects, isDatabaseConnectivityError } from '@/lib/repository/mock-data';
import { jaccardSimilarity, normalizeTitleWords } from '@/lib/title-similarity';
import { handleApiError, normalizeText } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// Live duplicate-title check for the student title form. Read-only: compares the
// title being typed against finished work only — published repository
// manuscripts and projects marked COMPLETED in ThesisTrack — never against other
// groups' in-progress proposals.

const VIEWER_ROLES = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

// Lower than the 0.34 used for the post-submit duplicate check: while typing,
// a title is often still short, and surfacing a "related" study early is useful.
const LIVE_MATCH_THRESHOLD = 0.25;
const MAX_RESULTS = 5;
const MIN_SIGNIFICANT_WORDS = 2;

type Candidate = {
  id: string;
  title: string;
  source: 'repository' | 'completed';
  department: string | null;
  schoolYear: string | null;
  authors: string[];
};

async function loadRepositoryCandidates(): Promise<Candidate[]> {
  try {
    const rows = await getRepositoryPrisma().repositoryProject.findMany({
      select: { id: true, title: true, department: true, schoolYear: true, authors: { select: { name: true } } },
      take: 2000
    });

    return rows.map((row) => ({
      id: `repo-${row.id}`,
      title: row.title,
      source: 'repository' as const,
      department: row.department ?? null,
      schoolYear: row.schoolYear ?? null,
      authors: row.authors.map((author) => author.name)
    }));
  } catch (error) {
    if (!isDatabaseConnectivityError(error)) {
      throw error;
    }

    // Same fallback the repository page uses when its database is unreachable.
    return getMockRepositoryProjects({}).map((project) => ({
      id: `repo-${project.id}`,
      title: project.title,
      source: 'repository' as const,
      department: project.department ?? null,
      schoolYear: project.schoolYear ?? null,
      authors: project.authors ?? []
    }));
  }
}

async function loadCompletedProjectCandidates(): Promise<Candidate[]> {
  const rows = await prisma.project.findMany({
    where: { status: ProjectStatus.COMPLETED },
    select: { id: true, title: true, group: { select: { department: true, students: true } } },
    take: 2000
  });

  return rows.map((row) => ({
    id: `project-${row.id}`,
    title: row.title,
    source: 'completed' as const,
    department: row.group?.department ?? null,
    schoolYear: null,
    authors: row.group?.students ?? []
  }));
}

async function handleGET(request: Request) {
  try {
    await requireAuthenticatedUser(request, VIEWER_ROLES);

    const title = normalizeText(new URL(request.url).searchParams.get('title'));
    const targetWords = normalizeTitleWords(title);

    if (targetWords.size < MIN_SIGNIFICANT_WORDS) {
      return Response.json({ success: true, matches: [] });
    }

    const [repository, completed] = await Promise.all([loadRepositoryCandidates(), loadCompletedProjectCandidates()]);

    // The same title can exist in both places once a completed project is published.
    const seenTitles = new Set<string>();
    const matches = [...repository, ...completed]
      .map((candidate) => ({
        ...candidate,
        score: Math.round(jaccardSimilarity(targetWords, normalizeTitleWords(candidate.title)) * 100)
      }))
      .filter((candidate) => candidate.score >= LIVE_MATCH_THRESHOLD * 100)
      .sort((a, b) => b.score - a.score)
      .filter((candidate) => {
        const key = candidate.title.trim().toLowerCase();
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      })
      .slice(0, MAX_RESULTS);

    return Response.json({ success: true, matches });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/repository/similar-titles', handleGET);
