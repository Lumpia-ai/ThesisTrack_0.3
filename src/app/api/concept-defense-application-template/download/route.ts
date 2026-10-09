import { NextResponse } from 'next/server';
import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSignedUrl } from '@/lib/storage/supabase-storage';
import type { DocumentStorageBucket } from '@/lib/storage/upload-config';
import { HttpError, handleApiError } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

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

type TemplateSettingValue = {
  fileName: string;
  filePath: string;
  bucketName: DocumentStorageBucket;
};

async function handleGET(request: Request) {
  try {
    await requireAuthenticatedUser(request, TEMPLATE_VIEWER_ROLES);

    const setting = await prisma.systemSetting.findUnique({
      where: { key: TEMPLATE_SETTING_KEY }
    });

    if (!setting) {
      throw new HttpError('No blank application form has been uploaded yet.', 404);
    }

    const value = setting.value as unknown as TemplateSettingValue;
    const signedUrl = await createSignedUrl(value.bucketName, value.filePath, 60);

    const urlObj = new URL(signedUrl);
    urlObj.searchParams.set('download', value.fileName);

    return NextResponse.redirect(urlObj.toString());
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/concept-defense-application-template/download', handleGET);
