import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/layouts/public-layout";
import { departmentsData } from "@/lib/landing/departments-data";
import { mergeDepartmentBranding } from "@/lib/landing/managed-departments";
import { BRANDING_SETTING_KEY, DEFAULT_BRANDING, sanitizeBrandingSettings } from "@/lib/branding";
import { prisma } from "@/lib/prisma";
import { DepartmentClientContent } from "./department-client-content";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return departmentsData.map((dept) => ({
    id: dept.id,
  }));
}

async function getManagedDepartmentsData() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: BRANDING_SETTING_KEY
      }
    });
    const branding = sanitizeBrandingSettings(setting?.value);

    return mergeDepartmentBranding(departmentsData, branding.departments);
  } catch {
    return mergeDepartmentBranding(departmentsData, DEFAULT_BRANDING.departments);
  }
}

export default async function DepartmentPage(props: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const isBrandingPreview = searchParams.brandingPreview === '1';
  
  const requestedDepartmentId = params.id.toUpperCase();
  const managedDepartmentsData = await getManagedDepartmentsData();
  let department = managedDepartmentsData.find((d) => d.id.toUpperCase() === requestedDepartmentId);

  // If department isn't found but we are in live preview, provide a dummy initial department
  // The client component will immediately override this with the actual draft from memory.
  if (!department && isBrandingPreview && searchParams.previewIndex !== undefined) {
    department = {
      id: requestedDepartmentId,
      shortName: 'Preview',
      name: 'Preview Program',
      label: 'Preview',
      description: 'Preview Description',
      mission: '',
      vision: '',
      icon: 'fas fa-graduation-cap',
      color: '#003A8F',
      logo: '',
      active: true,
      keyAreas: [],
      facilities: [],
      programHighlights: [],
      stats: [],
      chartData: []
    } as any;
  }

  if (!department) {
    notFound();
  }

  return (
    <PublicLayout>
      <DepartmentClientContent 
        initialDepartment={department} 
        managedDepartmentsData={managedDepartmentsData}
        isBrandingPreview={isBrandingPreview}
      />
    </PublicLayout>
  );
}
