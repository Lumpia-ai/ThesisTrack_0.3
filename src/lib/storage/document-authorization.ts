import { ProjectStatus, UserRole, type Project, type UploadedFile } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/utils';
import { type DocumentStorageBucket } from '@/lib/storage/upload-config';

type AuthUser = {
  id: string;
  role: UserRole;
  department: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
};

type ProjectAccessRecord = Pick<Project, 'id' | 'status' | 'ownerId' | 'adviserId' | 'departmentId' | 'groupId'> & {
  group: {
    department: string;
    groupMembers: Array<{ userId: string; isActive: boolean }>;
  } | null;
  evaluations: Array<{ evaluatorId: string | null }>;
};

type UploadedFileAccessRecord = Pick<
  UploadedFile,
  'id' | 'userId' | 'projectId' | 'bucketName' | 'filePath' | 'documentCategory'
> & {
  project: ProjectAccessRecord | null;
};

function normalizeDepartment(value?: string | null) {
  return String(value || '').trim().toUpperCase();
}

function isAdminRole(user: AuthUser) {
  return user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.ADMIN;
}

function isProgramDepartmentMatch(user: AuthUser, project: ProjectAccessRecord | null) {
  const userDepartment = normalizeDepartment(user.department);

  if (!userDepartment || !project) {
    return false;
  }

  return normalizeDepartment(project.departmentId) === userDepartment
    || normalizeDepartment(project.group?.department) === userDepartment;
}

function isProjectParticipant(user: AuthUser, project: ProjectAccessRecord | null) {
  if (!project) {
    return false;
  }

  return project.ownerId === user.id
    || project.adviserId === user.id
    || project.group?.groupMembers.some((member) => member.isActive && member.userId === user.id)
    || project.evaluations.some((evaluation) => evaluation.evaluatorId === user.id);
}

const projectAccessSelect = {
  id: true,
  status: true,
  ownerId: true,
  adviserId: true,
  departmentId: true,
  groupId: true,
  group: {
    select: {
      department: true,
      groupMembers: {
        select: {
          userId: true,
          isActive: true
        }
      }
    }
  },
  evaluations: {
    select: {
      evaluatorId: true
    }
  }
} as const;

export async function getProjectAccessRecord(projectId?: string | null) {
  if (!projectId) {
    return null;
  }

  return prisma.project.findUnique({
    where: { id: projectId },
    select: projectAccessSelect
  });
}

export async function getFallbackProjectForUser(user: AuthUser) {
  if (user.role === UserRole.STUDENT) {
    return prisma.project.findFirst({
      where: {
        OR: [
          { ownerId: user.id },
          {
            group: {
              groupMembers: {
                some: {
                  userId: user.id,
                  isActive: true
                }
              }
            }
          }
        ]
      },
      select: projectAccessSelect,
      orderBy: { updatedAt: 'desc' }
    });
  }

  if (user.role === UserRole.ADVISER || user.role === UserRole.PANEL) {
    return prisma.project.findFirst({
      where: {
        OR: [
          { adviserId: user.id },
          {
            evaluations: {
              some: {
                evaluatorId: user.id
              }
            }
          }
        ]
      },
      select: projectAccessSelect,
      orderBy: { updatedAt: 'desc' }
    });
  }

  return null;
}

export async function getBestProjectAccessRecord(user: AuthUser, projectId?: string | null) {
  const project = await getProjectAccessRecord(projectId);

  if (project) {
    return project;
  }

  return getFallbackProjectForUser(user);
}

function getUserNameCandidates(user: AuthUser) {
  return Array.from(new Set([
    user.displayName,
    [user.firstName, user.lastName].filter(Boolean).join(' '),
    user.name,
    user.email
  ]
    .map((value) => String(value || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)));
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function findStudentGroupForUpload(user: AuthUser) {
  const nameCandidates = getUserNameCandidates(user);
  const normalizedCandidates = new Set(nameCandidates.map(normalizeName));

  const groupByMembership = await prisma.group.findFirst({
    where: {
      groupMembers: {
        some: {
          userId: user.id,
          isActive: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (groupByMembership) {
    return groupByMembership;
  }

  for (const candidate of nameCandidates) {
    const exactGroup = await prisma.group.findFirst({
      where: {
        students: {
          has: candidate
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (exactGroup) {
      return exactGroup;
    }
  }

  const possibleGroups = await prisma.group.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 200
  });

  return possibleGroups.find((group) =>
    group.students.some((student) => normalizedCandidates.has(normalizeName(student)))
  ) || null;
}

export async function getStudentUploadProjectAccessRecord(user: AuthUser, projectId?: string | null) {
  const requestedProject = await getProjectAccessRecord(projectId);

  if (requestedProject) {
    if (!requestedProject.adviserId && requestedProject.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: requestedProject.groupId },
        select: { userId: true }
      });

      if (group?.userId) {
        return prisma.project.update({
          where: { id: requestedProject.id },
          data: { adviserId: group.userId },
          select: projectAccessSelect
        });
      }
    }

    return requestedProject;
  }

  const fallbackProject = await getFallbackProjectForUser(user);

  if (fallbackProject) {
    return fallbackProject;
  }

  if (user.role !== UserRole.STUDENT) {
    return null;
  }

  const group = await findStudentGroupForUpload(user);

  if (!group) {
    return null;
  }

  const existingGroupProject = await prisma.project.findFirst({
    where: {
      OR: [
        ...(group.projectId ? [{ id: group.projectId }] : []),
        { groupId: group.id }
      ]
    },
    select: projectAccessSelect
  });

  if (existingGroupProject) {
    const repairedProject = existingGroupProject.adviserId
      ? existingGroupProject
      : await prisma.project.update({
          where: { id: existingGroupProject.id },
          data: { adviserId: group.userId || null },
          select: projectAccessSelect
        });

    if (group.projectId !== repairedProject.id) {
      await prisma.group.update({
        where: { id: group.id },
        data: { projectId: repairedProject.id }
      });
    }

    return repairedProject;
  }

  const project = await prisma.project.create({
    data: {
      ...(group.projectId ? { id: group.projectId } : {}),
      title: group.projectTitle || group.title || 'Untitled Project',
      status: ProjectStatus.DRAFT,
      groupId: group.id,
      ownerId: user.id,
      adviserId: group.userId || null
    },
    select: projectAccessSelect
  });

  if (group.projectId !== project.id) {
    await prisma.group.update({
      where: { id: group.id },
      data: { projectId: project.id }
    });
  }

  return project;
}

export function assertCanUseProject(user: AuthUser, project: ProjectAccessRecord | null, message: string) {
  if (project && !isProjectParticipant(user, project) && !isAdminRole(user)) {
    throw new HttpError(message, 403);
  }
}

export function getProjectAccessId(project: ProjectAccessRecord | null) {
  return project?.id ?? null;
}

export async function assertCanUploadDocument({
  user,
  bucketName,
  projectId
}: {
  user: AuthUser;
  bucketName: DocumentStorageBucket;
  projectId?: string | null;
}) {
  if (isAdminRole(user)) {
    return;
  }

  const project = await getProjectAccessRecord(projectId);

  if (bucketName === 'thesis-documents') {
    if (user.role !== UserRole.STUDENT) {
      throw new HttpError('Only students can upload thesis/capstone documents in this area.', 403);
    }

    if (project && !isProjectParticipant(user, project)) {
      throw new HttpError('You can upload documents only for your own thesis/capstone project.', 403);
    }

    return;
  }

  if (bucketName === 'evaluation-files') {
    if (user.role !== UserRole.ADVISER && user.role !== UserRole.PANEL) {
      throw new HttpError('Only adviser or panel users can upload evaluation files.', 403);
    }

    if (project && !isProjectParticipant(user, project)) {
      throw new HttpError('You can upload evaluation files only for assigned projects.', 403);
    }

    return;
  }

  if (bucketName === 'final-repository') {
    if (user.role !== UserRole.RESEARCH_HEAD && !isAdminRole(user)) {
      throw new HttpError('Only research heads and system admins can upload final repository files.', 403);
    }

    return;
  }
}

export function canAccessDocument(user: AuthUser, file: UploadedFileAccessRecord) {
  if (isAdminRole(user)) {
    return true;
  }

  if (user.role === UserRole.STUDENT) {
    return file.userId === user.id || isProjectParticipant(user, file.project);
  }

  if (user.role === UserRole.ADVISER || user.role === UserRole.PANEL) {
    return isProjectParticipant(user, file.project);
  }

  if (user.role === UserRole.RESEARCH_HEAD) {
    return file.bucketName === 'final-repository'
      || file.bucketName === 'thesis-documents'
      || file.bucketName === 'evaluation-files';
  }

  if (user.role === UserRole.PROGRAM_HEAD) {
    // A program head can be directly assigned as a project's adviser (dual role,
    // switching into Adviser Workspace) — that direct assignment must grant access
    // even when their own department field doesn't happen to match this project's,
    // otherwise they're locked out of documents for a project they're literally
    // the adviser of.
    return isProjectParticipant(user, file.project) || isProgramDepartmentMatch(user, file.project);
  }

  return false;
}

export function canDeleteDocument(user: AuthUser, file: UploadedFileAccessRecord) {
  if (isAdminRole(user)) {
    return true;
  }

  if (user.role === UserRole.STUDENT) {
    return file.userId === user.id && file.bucketName === 'thesis-documents';
  }

  if (user.role === UserRole.ADVISER || user.role === UserRole.PANEL) {
    return file.userId === user.id && file.bucketName === 'evaluation-files';
  }

  if (user.role === UserRole.RESEARCH_HEAD) {
    return file.bucketName === 'final-repository';
  }

  return false;
}

export async function getAuthorizedDocumentFile(fileId: string, user: AuthUser) {
  const file = await prisma.uploadedFile.findUnique({
    where: { id: fileId },
    include: {
      project: {
        select: {
          id: true,
          status: true,
          ownerId: true,
          adviserId: true,
          departmentId: true,
          groupId: true,
          group: {
            select: {
              department: true,
              groupMembers: {
                select: {
                  userId: true,
                  isActive: true
                }
              }
            }
          },
          evaluations: {
            select: {
              evaluatorId: true
            }
          }
        }
      }
    }
  });

  if (!file || !file.bucketName || !file.filePath) {
    throw new HttpError('Document file was not found.', 404);
  }

  if (!canAccessDocument(user, file)) {
    throw new HttpError('You do not have permission to access this document.', 403);
  }

  return file;
}
