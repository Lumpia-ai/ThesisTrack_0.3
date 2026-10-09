import { UserRole } from '@/generated/prisma/client';
import { getRepositoryPrisma } from '@/lib/repository-prisma';
import { normalizeDepartmentScope } from '@/lib/department-scope';

// Repeat loads of the same record by the same viewer within this window count once.
const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000;

export const GUEST_VIEWER_COOKIE = 'tt_repo_viewer';

// Who can see view statistics and comments (staff only — never guests/students).
export const ENGAGEMENT_VIEWER_ROLES: UserRole[] = [
  UserRole.LIBRARY,
  UserRole.RESEARCH_HEAD,
  UserRole.FOCAL_PERSON,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

// Comments are the librarian's (their suggestion); admins can moderate.
export const COMMENT_AUTHOR_ROLES: UserRole[] = [UserRole.LIBRARY, UserRole.SYSTEM_ADMIN, UserRole.ADMIN];

export const GUEST_LABEL = 'Guests';
export const NO_DEPARTMENT_LABEL = 'No department';

type Viewer =
  | { type: 'user'; userId: string; role: string; department: string | null }
  | { type: 'guest'; guestKey: string };

export async function recordRepositoryView(repositoryProjectId: string, viewer: Viewer) {
  const repositoryDb = getRepositoryPrisma();
  const viewerKey = viewer.type === 'user' ? `user:${viewer.userId}` : `guest:${viewer.guestKey}`;

  const recent = await repositoryDb.repositoryProjectView.findFirst({
    where: {
      repositoryProjectId,
      viewerKey,
      viewedAt: { gte: new Date(Date.now() - VIEW_DEDUP_WINDOW_MS) }
    },
    select: { id: true }
  });

  if (recent) {
    return { counted: false };
  }

  await repositoryDb.repositoryProjectView.create({
    data: {
      repositoryProjectId,
      viewerKey,
      viewerType: viewer.type,
      viewerRole: viewer.type === 'user' ? viewer.role : null,
      // Stored normalized ("IT", not "IT Department") so the breakdown groups cleanly.
      viewerDepartment: viewer.type === 'user' ? normalizeDepartmentScope(viewer.department) || null : null
    }
  });

  return { counted: true };
}

export type DepartmentViewCount = { department: string; views: number };

export type RepositoryViewStats = {
  repositoryProjectId: string;
  title: string;
  department: string | null;
  program: string | null;
  schoolYear: string | null;
  publishedAt: string | null;
  totalViews: number;
  guestViews: number;
  memberViews: number;
  byDepartment: DepartmentViewCount[];
  commentCount: number;
};

// View totals per repository record, split into guests and signed-in users by
// department. One grouped query for all records instead of one per record.
export async function getRepositoryViewStats(options: { repositoryProjectId?: string } = {}): Promise<RepositoryViewStats[]> {
  const repositoryDb = getRepositoryPrisma();
  const projectWhere = options.repositoryProjectId ? { id: options.repositoryProjectId } : {};

  const [projects, grouped, commentCounts] = await Promise.all([
    repositoryDb.repositoryProject.findMany({
      where: projectWhere,
      select: { id: true, title: true, department: true, program: true, schoolYear: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 500
    }),
    repositoryDb.repositoryProjectView.groupBy({
      by: ['repositoryProjectId', 'viewerType', 'viewerDepartment'],
      where: options.repositoryProjectId ? { repositoryProjectId: options.repositoryProjectId } : {},
      _count: { _all: true }
    }),
    repositoryDb.repositoryProjectComment.groupBy({
      by: ['repositoryProjectId'],
      where: {
        deletedAt: null,
        ...(options.repositoryProjectId ? { repositoryProjectId: options.repositoryProjectId } : {})
      },
      _count: { _all: true }
    })
  ]);

  const commentsByProject = new Map(commentCounts.map((row) => [row.repositoryProjectId, row._count._all]));

  return projects.map((project) => {
    const rows = grouped.filter((row) => row.repositoryProjectId === project.id);
    const guestViews = rows.filter((row) => row.viewerType === 'guest').reduce((sum, row) => sum + row._count._all, 0);
    const departmentTotals = new Map<string, number>();

    for (const row of rows) {
      if (row.viewerType === 'guest') continue;
      const department = row.viewerDepartment || NO_DEPARTMENT_LABEL;
      departmentTotals.set(department, (departmentTotals.get(department) ?? 0) + row._count._all);
    }

    const byDepartment = [...departmentTotals.entries()]
      .map(([department, views]) => ({ department, views }))
      .sort((left, right) => right.views - left.views);
    const memberViews = byDepartment.reduce((sum, entry) => sum + entry.views, 0);

    return {
      repositoryProjectId: project.id,
      title: project.title,
      department: project.department,
      program: project.program,
      schoolYear: project.schoolYear,
      publishedAt: project.publishedAt ? project.publishedAt.toISOString() : null,
      totalViews: guestViews + memberViews,
      guestViews,
      memberViews,
      byDepartment,
      commentCount: commentsByProject.get(project.id) ?? 0
    };
  });
}

export async function listRepositoryComments(repositoryProjectId: string) {
  const repositoryDb = getRepositoryPrisma();
  const comments = await repositoryDb.repositoryProjectComment.findMany({
    where: { repositoryProjectId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  return comments.map((comment) => ({
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    body: comment.body,
    createdAt: comment.createdAt.toISOString()
  }));
}
