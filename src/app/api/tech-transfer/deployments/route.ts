import { IndustryProjectStatus, ProjectStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncDeploymentToRepository } from '@/lib/repository/sync-deployment';
import {
  errorResponse,
  handleApiError,
  HttpError,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  successResponse
} from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const TECH_TRANSFER_ROLES = [
  UserRole.TECH_TRANSFER,
  UserRole.RESEARCH_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

const DEPLOYMENT_ELIGIBLE_STATUSES: ProjectStatus[] = [
  ProjectStatus.APPROVED,
  ProjectStatus.DEFENSE_SCHEDULED,
  ProjectStatus.COMPLETED,
  ProjectStatus.ARCHIVED
];

const VALID_STATUSES = new Set(Object.values(IndustryProjectStatus));

function getPersonName(person?: { name?: string | null; firstName?: string | null; lastName?: string | null; displayName?: string | null } | null) {
  if (!person) return null;
  return person.displayName || person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || null;
}

async function handleGET(request: Request) {
  try {
    await requireAuthenticatedUser(request, TECH_TRANSFER_ROLES);

    const projects = await prisma.project.findMany({
      where: { status: { in: DEPLOYMENT_ELIGIBLE_STATUSES } },
      orderBy: { repositoryPublishedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        status: true,
        repositoryPublishedAt: true,
        department: { select: { name: true } },
        group: { select: { department: true } },
        industryProjects: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            moaUrl: true,
            deploymentDate: true,
            updatedAt: true,
            partner: { select: { id: true, name: true, email: true, contactPerson: true } }
          }
        }
      }
    });

    return successResponse({
      deployments: projects.map((project) => {
        const latest = project.industryProjects[0] || null;

        return {
          projectId: project.id,
          title: project.title,
          department: project.department?.name || project.group?.department || null,
          publishedToRepository: Boolean(project.repositoryPublishedAt),
          status: latest?.status || null,
          partnerName: latest?.partner.name || null,
          partnerEmail: latest?.partner.email || null,
          contactPerson: latest?.partner.contactPerson || null,
          moaUrl: latest?.moaUrl || null,
          deploymentDate: latest?.deploymentDate || null
        };
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    await requireAuthenticatedUser(request, TECH_TRANSFER_ROLES);
    const body = await request.json().catch(() => ({}));

    const projectId = normalizeText(body?.projectId);
    const partnerName = normalizeText(body?.partnerName);
    const partnerEmail = normalizeEmail(body?.partnerEmail);
    const contactPerson = normalizeText(body?.contactPerson);
    const status = normalizeText(body?.status);
    const moaUrl = normalizeText(body?.moaUrl);
    const deploymentDateRaw = normalizeText(body?.deploymentDate);

    const fieldErrors: Record<string, string> = {};
    if (!projectId) fieldErrors.projectId = 'A project is required.';
    if (!partnerName) fieldErrors.partnerName = 'Partner organization name is required.';
    if (!partnerEmail || !isValidEmail(partnerEmail)) fieldErrors.partnerEmail = 'A valid partner contact email is required.';
    if (!status || !VALID_STATUSES.has(status as IndustryProjectStatus)) {
      fieldErrors.status = 'Select a valid deployment status.';
    }

    if (Object.keys(fieldErrors).length) {
      return errorResponse('Please correct the highlighted fields.', 422, fieldErrors);
    }

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });

    if (!project) {
      throw new HttpError('Project was not found.', 404);
    }

    const deploymentDate = deploymentDateRaw ? new Date(deploymentDateRaw) : null;

    if (deploymentDate && Number.isNaN(deploymentDate.getTime())) {
      return errorResponse('Please correct the highlighted fields.', 422, { deploymentDate: 'Enter a valid date.' });
    }

    const partner = await prisma.industryPartner.upsert({
      where: { email: partnerEmail },
      update: { name: partnerName, contactPerson: contactPerson || undefined },
      create: { name: partnerName, email: partnerEmail, contactPerson: contactPerson || null }
    });

    const existing = await prisma.industryProject.findFirst({
      where: { projectId: project.id, partnerId: partner.id }
    });

    const industryProject = existing
      ? await prisma.industryProject.update({
          where: { id: existing.id },
          data: { status: status as IndustryProjectStatus, moaUrl: moaUrl || null, deploymentDate }
        })
      : await prisma.industryProject.create({
          data: {
            projectId: project.id,
            partnerId: partner.id,
            status: status as IndustryProjectStatus,
            moaUrl: moaUrl || null,
            deploymentDate
          }
        });

    const sync = await syncDeploymentToRepository({
      mainProjectId: project.id,
      partnerName,
      status: industryProject.status,
      moaUrl: industryProject.moaUrl,
      deploymentDate: industryProject.deploymentDate
    });

    return successResponse({
      industryProject: {
        id: industryProject.id,
        status: industryProject.status,
        moaUrl: industryProject.moaUrl,
        deploymentDate: industryProject.deploymentDate,
        partnerName: getPersonName({ name: partner.name }) || partner.name
      },
      repositorySync: sync
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/tech-transfer/deployments', handleGET);
export const POST = withApiLogging('POST', '/api/tech-transfer/deployments', handlePOST);
