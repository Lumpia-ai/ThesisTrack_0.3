import { Prisma, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, successResponse } from '@/lib/utils';
import { DOCUMENT_STORAGE_BUCKETS, type DocumentStorageBucket } from '@/lib/storage/upload-config';
import { assertValidDocumentFile, deleteFile, generateUniqueFilePath, uploadFile } from '@/lib/storage/supabase-storage';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// A single, system-wide "current" template — not tied to any project — so it
// lives in SystemSetting rather than UploadedFile/Project. The blank form is
// expected to change every academic year; whoever uploads a new one simply
// replaces this row, and every student immediately sees the new version.
const TEMPLATE_SETTING_KEY = 'concept_defense_application_template';

const TEMPLATE_VIEWER_ROLES = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

// Only the Research Head manages this template — not System Admin/IT Admin,
// even though they can both reach the /research-head route tree.
const TEMPLATE_MANAGER_ROLES = [UserRole.RESEARCH_HEAD];

type TemplateSettingValue = {
  fileName: string;
  filePath: string;
  bucketName: DocumentStorageBucket;
  fileType: string;
  size: number;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
};

async function handleGET(request: Request) {
  try {
    await requireAuthenticatedUser(request, TEMPLATE_VIEWER_ROLES);

    const setting = await prisma.systemSetting.findUnique({
      where: { key: TEMPLATE_SETTING_KEY }
    });

    if (!setting) {
      return successResponse({ template: null });
    }

    const value = setting.value as unknown as TemplateSettingValue;

    return successResponse({
      template: {
        fileName: value.fileName,
        uploadedAt: value.uploadedAt,
        uploadedByName: value.uploadedByName
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, TEMPLATE_MANAGER_ROLES);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new HttpError('Please attach the blank application form to upload.', 400, {
        file: 'Please attach the blank application form to upload.'
      });
    }

    assertValidDocumentFile(file, DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS);

    const previousSetting = await prisma.systemSetting.findUnique({
      where: { key: TEMPLATE_SETTING_KEY }
    });
    const previousTemplate = previousSetting?.value as unknown as TemplateSettingValue | null | undefined;

    const filePath = generateUniqueFilePath({
      bucketName: DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS,
      projectId: 'system-templates',
      userId: user.id,
      fileName: file.name
    });

    await uploadFile({
      bucketName: DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS,
      filePath,
      file
    });

    const value: TemplateSettingValue = {
      fileName: file.name,
      filePath,
      bucketName: DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS,
      fileType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedById: user.id,
      uploadedByName: user.name || 'Research Head'
    };

    const setting = await prisma.systemSetting.upsert({
      where: { key: TEMPLATE_SETTING_KEY },
      update: {
        value: value as unknown as Prisma.InputJsonValue,
        description: 'Current blank Application for Oral Defense of Thesis (Concept) form.'
      },
      create: {
        key: TEMPLATE_SETTING_KEY,
        value: value as unknown as Prisma.InputJsonValue,
        scope: 'global',
        description: 'Current blank Application for Oral Defense of Thesis (Concept) form.'
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'concept_defense_application_template.updated',
        entityType: 'SystemSetting',
        entityId: setting.id,
        metadata: { fileName: value.fileName } as Prisma.InputJsonValue
      }
    });

    // Only the current template is ever served, so the replaced one is dead weight in storage.
    if (previousTemplate?.filePath && previousTemplate.bucketName && previousTemplate.filePath !== filePath) {
      await deleteFile(previousTemplate.bucketName, previousTemplate.filePath).catch((error) => {
        console.error(`Failed to remove previous template ${previousTemplate.filePath}:`, error);
      });
    }

    return successResponse(
      {
        template: {
          fileName: value.fileName,
          uploadedAt: value.uploadedAt,
          uploadedByName: value.uploadedByName
        }
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/concept-defense-application-template', handleGET);
export const POST = withApiLogging('POST', '/api/concept-defense-application-template', handlePOST);
