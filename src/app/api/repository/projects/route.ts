import { getMockRepositoryProjects, isDatabaseConnectivityError } from '@/lib/repository/mock-data';
import { getRepositoryPrisma } from '@/lib/repository-prisma';
import { handleApiError, normalizeText } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const PAGE_SIZE = 12;
const MOCK_SCHOOL_YEARS = ['2025-2026', '2023-2024', '2022-2023'];
const MOCK_DEPARTMENTS = ['IT', 'MET', 'TCM', 'ESM', 'NAME'];

function paginateMockProjects(search: string | undefined, department: string | undefined, schoolYear: string | undefined, page: number) {
  const matched = getMockRepositoryProjects({ search, department, schoolYear });
  const start = (page - 1) * PAGE_SIZE;

  return {
    success: true,
    projects: matched.slice(start, start + PAGE_SIZE).map((project) => ({
      id: project.id,
      title: project.title,
      abstract: project.abstract,
      adviser: project.adviser,
      program: project.program,
      department: project.department,
      schoolYear: project.schoolYear,
      keywords: project.keywords,
      publishedAt: project.publishedAt,
      authors: project.authors
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: matched.length,
      totalPages: Math.max(1, Math.ceil(matched.length / PAGE_SIZE))
    },
    filters: {
      schoolYears: MOCK_SCHOOL_YEARS,
      departments: MOCK_DEPARTMENTS
    }
  };
}

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = normalizeText(searchParams.get('search'));
  const department = normalizeText(searchParams.get('department'));
  const schoolYear = normalizeText(searchParams.get('schoolYear'));
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

  try {
    const repositoryDb = getRepositoryPrisma();

    const where = {
      ...(department && department !== 'all' ? { department } : {}),
      ...(schoolYear && schoolYear !== 'all' ? { schoolYear } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { abstract: { contains: search, mode: 'insensitive' as const } },
              { keywords: { has: search } },
              { authors: { some: { name: { contains: search, mode: 'insensitive' as const } } } }
            ]
          }
        : {})
    };

    const [projects, total, schoolYears, departments] = await Promise.all([
      repositoryDb.repositoryProject.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          abstract: true,
          adviser: true,
          program: true,
          department: true,
          schoolYear: true,
          keywords: true,
          publishedAt: true,
          authors: { select: { name: true } }
        }
      }),
      repositoryDb.repositoryProject.count({ where }),
      repositoryDb.repositoryProject.findMany({
        distinct: ['schoolYear'],
        where: { schoolYear: { not: null } },
        select: { schoolYear: true },
        orderBy: { schoolYear: 'desc' }
      }),
      repositoryDb.repositoryProject.findMany({
        distinct: ['department'],
        where: { department: { not: null } },
        select: { department: true },
        orderBy: { department: 'asc' }
      })
    ]);

    return Response.json({
      success: true,
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        abstract: project.abstract,
        adviser: project.adviser,
        program: project.program,
        department: project.department,
        schoolYear: project.schoolYear,
        keywords: project.keywords,
        publishedAt: project.publishedAt,
        authors: project.authors.map((author) => author.name)
      })),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
      },
      filters: {
        schoolYears: schoolYears.map((item) => item.schoolYear).filter(Boolean),
        departments: departments.map((item) => item.department).filter(Boolean)
      }
    });
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      console.warn('[repository] REPOSITORY_DATABASE_URL is unreachable; serving mock repository data.');
      return Response.json(paginateMockProjects(search, department, schoolYear, page));
    }

    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/repository/projects', handleGET);
