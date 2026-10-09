import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { publishProjectToRepository } from '@/lib/repository/publish-project';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { isInDepartmentScope } from '@/lib/department-scope';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const REPOSITORY_PUBLISH_ROLES = [
  // The department's Research Focal Person gives the final repository
  // approval. The Research Head oversees and reports but approves nothing.
  UserRole.FOCAL_PERSON,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, REPOSITORY_PUBLISH_ROLES);
    const body = await request.json().catch(() => ({}));
    const projectId = normalizeText(body?.projectId);

    if (!projectId) {
      return Response.json(
        {
          success: false,
          message: 'A projectId is required to publish a repository record.'
        },
        { status: 400 }
      );
    }

    if (user.role === UserRole.FOCAL_PERSON) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { departmentId: true, department: { select: { name: true } }, group: { select: { department: true, dept: true } } }
      });

      if (!project) {
        throw new HttpError('Project was not found.', 404);
      }

      if (!isInDepartmentScope(user.department, [
        project.departmentId,
        project.department?.name,
        project.group?.department,
        project.group?.dept
      ])) {
        throw new HttpError('You can only approve projects from your own department.', 403);
      }
    }

    // Integration point for the two-database architecture:
    // this API reads the active project from the main database and publishes
    // selected approved archive metadata into the repository database.
    const repositoryRecord = await publishProjectToRepository({
      projectId,
      approvedBy: user
    });

    return successResponse({
      repositoryRecord: {
        id: repositoryRecord.id,
        mainProjectId: repositoryRecord.mainProjectId,
        title: repositoryRecord.title,
        status: repositoryRecord.status,
        publishedAt: repositoryRecord.publishedAt,
        authorCount: repositoryRecord.authors.length,
        fileCount: repositoryRecord.files.length
      }
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/repository/publish', handlePOST);
