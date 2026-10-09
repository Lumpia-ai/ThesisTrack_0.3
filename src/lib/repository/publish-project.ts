import {
  ProjectStatus,
  SubmissionStatus,
  type User
} from '@/generated/prisma/client';
import { Prisma as RepositoryPrisma } from '@/generated/repository-prisma/client';
import { prisma } from '@/lib/prisma';
import { getRepositoryPrisma } from '@/lib/repository-prisma';
import { HttpError } from '@/lib/utils';

type PublishProjectInput = {
  projectId: string;
  approvedBy: Pick<User, 'id' | 'name' | 'firstName' | 'lastName' | 'displayName' | 'role'>;
};

const PUBLISHABLE_PROJECT_STATUSES: ProjectStatus[] = [
  ProjectStatus.APPROVED,
  ProjectStatus.DEFENSE_SCHEDULED,
  ProjectStatus.COMPLETED,
  ProjectStatus.ARCHIVED
];

function getPersonName(person?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
} | null) {
  if (!person) {
    return '';
  }

  return person.displayName
    || person.name
    || [person.firstName, person.lastName].filter(Boolean).join(' ');
}

function isDuplicateRepositoryRecordError(error: unknown) {
  return error instanceof RepositoryPrisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function getRepositoryDb() {
  try {
    return getRepositoryPrisma();
  } catch (error) {
    throw new HttpError(
      error instanceof Error ? error.message : 'Repository database is not configured.',
      500
    );
  }
}

function getAuthorRecords(project: Awaited<ReturnType<typeof getPublishableProject>>) {
  if (!project) {
    return [];
  }

  const members = project.group?.groupMembers || [];

  if (members.length) {
    return members.map((member) => ({
      name: getPersonName(member.user) || member.userId,
      email: member.user?.email || null,
      studentId: member.user?.studentId || null
    }));
  }

  if (project.group?.students?.length) {
    return project.group.students.map((student) => ({
      name: student
    }));
  }

  const ownerName = getPersonName(project.owner);

  return ownerName
    ? [{
        name: ownerName,
        email: project.owner?.email || null,
        studentId: project.owner?.studentId || null
      }]
    : [];
}

function getFileUrl(file: NonNullable<Awaited<ReturnType<typeof getPublishableProject>>>['files'][number]) {
  return file.secureUrl
    || file.filePath
    || file.publicId
    || file.fileName;
}

function getApprovedFileRecords(project: Awaited<ReturnType<typeof getPublishableProject>>) {
  if (!project) {
    return [];
  }

  return project.files
    .filter((file) => {
      const category = `${file.documentCategory} ${file.category}`.toLowerCase();

      return file.bucketName === 'final-repository'
        || file.submission?.status === SubmissionStatus.APPROVED
        || category.includes('final')
        || category.includes('manuscript')
        || file.visibility === 'public';
    })
    .map((file) => ({
      fileName: file.fileName,
      fileUrl: getFileUrl(file),
      fileType: file.fileType || null,
      uploadedAt: file.createdAt
    }));
}

function getManuscriptUrl(files: ReturnType<typeof getApprovedFileRecords>) {
  const manuscriptFile = files.find((file) => {
    const name = file.fileName.toLowerCase();
    return name.includes('manuscript') || name.includes('final') || name.endsWith('.pdf');
  });

  return manuscriptFile?.fileUrl || files[0]?.fileUrl || null;
}

async function getPublishableProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      department: true,
      academicYear: true,
      owner: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          displayName: true,
          email: true,
          studentId: true
        }
      },
      adviser: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          displayName: true
        }
      },
      group: {
        include: {
          groupMembers: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  email: true,
                  studentId: true
                }
              }
            },
            orderBy: [
              { role: 'asc' },
              { createdAt: 'asc' }
            ]
          }
        }
      },
      files: {
        include: {
          submission: {
            select: {
              status: true,
              reviewedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      submissions: {
        where: { status: SubmissionStatus.APPROVED },
        orderBy: { reviewedAt: 'desc' },
        take: 1
      }
    }
  });
}

export async function publishProjectToRepository({ projectId, approvedBy }: PublishProjectInput) {
  const project = await getPublishableProject(projectId);

  if (!project) {
    throw new HttpError('Project was not found.', 404);
  }

  if (!PUBLISHABLE_PROJECT_STATUSES.includes(project.status)) {
    throw new HttpError('Only approved or completed projects can be published to the repository.', 400, {
      projectId: 'Complete the project approval workflow before repository publication.'
    });
  }

  const repositoryDb = getRepositoryDb();
  const existingRecord = await repositoryDb.repositoryProject.findUnique({
    where: { mainProjectId: project.id },
    select: {
      id: true,
      title: true,
      publishedAt: true
    }
  });

  if (existingRecord) {
    if (!project.repositoryPublishedAt) {
      await prisma.project.update({
        where: { id: project.id },
        data: { repositoryPublishedAt: existingRecord.publishedAt || new Date() }
      });
    }

    throw new HttpError('This project is already published in the repository database.', 409, {
      projectId: `Repository record: ${existingRecord.id}`
    });
  }

  const approvedAt = new Date();
  const authors = getAuthorRecords(project);
  const approvedFiles = getApprovedFileRecords(project);
  const approvedByName = getPersonName(approvedBy);

  try {
    // The main and repository databases remain physically separate. This backend
    // service is the integration boundary that copies approved archive metadata
    // from the active system database into the repository database.
    const repositoryRecord = await repositoryDb.repositoryProject.create({
      data: {
        mainProjectId: project.id,
        title: project.title,
        abstract: project.abstract,
        adviser: getPersonName(project.adviser) || approvedByName || null,
        department: project.department?.name || project.group?.department || project.departmentId,
        program: project.group?.dept,
        schoolYear: project.academicYear?.label,
        keywords: project.keywords,
        manuscriptUrl: getManuscriptUrl(approvedFiles),
        status: 'ARCHIVED',
        publishedAt: approvedAt,
        createdAt: approvedAt,
        ...(authors.length ? { authors: { create: authors } } : {}),
        ...(approvedFiles.length ? { files: { create: approvedFiles } } : {}),
        technologyTransfer: {
          create: {
            transferStatus: project.transferReadyAt ? 'READY' : 'PENDING',
            remarks: project.transferReadyAt
              ? `Marked ready for technology transfer by ${approvedByName || 'the Research Focal Person'}.`
              : `Repository record archived by ${approvedByName || 'Research Head'}.`,
            dateRecorded: approvedAt
          }
        }
      },
      include: {
        authors: true,
        files: true,
        technologyTransfer: true
      }
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { repositoryPublishedAt: repositoryRecord.publishedAt }
    });

    return repositoryRecord;
  } catch (error) {
    if (isDuplicateRepositoryRecordError(error)) {
      throw new HttpError('This project is already published in the repository database.', 409, {
        projectId: 'A repository record already exists for this project.'
      });
    }

    throw error;
  }
}
