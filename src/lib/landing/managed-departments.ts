import { type BrandingDepartmentSettings } from '@/lib/branding';
import { type DepartmentData } from '@/lib/landing/departments-data';

function createManagedDepartmentFromBranding(department: BrandingDepartmentSettings): DepartmentData {
  const shortName = department.shortName ?? department.id;
  const name = department.name ?? `${shortName} Department`;

  return {
    id: department.id,
    name,
    description: department.description ?? `${name} is configured as an active department in ThesisTrack.`,
    mission: department.mission ?? `To support student research, capstone development, and academic project completion for ${name}.`,
    vision: department.vision ?? `A department recognized for relevant student research, innovation, and community impact.`,
    icon: department.icon ?? 'fas fa-building-columns',
    color: department.color ?? '#2563EB',
    secondaryColor: department.secondaryColor,
    logo: department.logo,
    keyAreas: [
      {
        title: `${shortName} Capstone Development`,
        description: `Student projects, proposals, and implementation work aligned with ${name}.`,
        icon: department.icon || 'fas fa-diagram-project'
      },
      {
        title: 'Research Documentation',
        description: 'Structured monitoring for manuscripts, evidence, approvals, and repository-ready outputs.',
        icon: 'fas fa-folder-open'
      },
      {
        title: 'Faculty Review',
        description: 'Adviser and panel coordination for reviews, feedback, and project stage decisions.',
        icon: 'fas fa-user-check'
      },
      {
        title: 'Technology Transfer Readiness',
        description: 'Support for project adoption, deployment evidence, and stakeholder handoff where applicable.',
        icon: 'fas fa-handshake-angle'
      }
    ],
    facilities: department.facilities?.length ? department.facilities : [
      `${shortName} consultation and advisement workspace`,
      `${shortName} research documentation resources`,
      `${shortName} project review and monitoring support`
    ],
    programHighlights: department.programHighlights?.length ? department.programHighlights : [
      `${shortName} is available in student registration and department routing`,
      'Department profile content is managed from System Admin branding',
      'Capstone progress, review, and repository workflows are supported'
    ],
    stats: department.stats?.length ? department.stats : [
      { label: 'Active Students', value: 'New' },
      { label: 'Faculty Members', value: 'New' },
      { label: 'Capstones Completed', value: '0' },
      { label: 'Program Status', value: 'Active' }
    ],
    chartData: department.chartData?.length ? department.chartData : [
      { year: '2023', completed: 0, ongoing: 0 },
      { year: '2024', completed: 0, ongoing: 0 },
      { year: '2025', completed: 0, ongoing: 0 },
      { year: '2026', completed: 0, ongoing: 0 }
    ]
  };
}

export function mergeDepartmentBranding(
  departments: DepartmentData[],
  brandingDepartments: BrandingDepartmentSettings[]
) {
  const brandingById = new Map(
    brandingDepartments.map((department) => [department.id.toUpperCase(), department])
  );
  const baseDepartmentIds = new Set(departments.map((department) => department.id.toUpperCase()));
  const managedDepartments = departments
    .map((department) => {
      const branding = brandingById.get(department.id.toUpperCase());

      if (!branding) {
        return department;
      }

      if (!branding.active) {
        return null;
      }

      return {
        ...department,
        name: branding.name ?? department.name,
        description: branding.description ?? department.description,
        mission: branding.mission ?? department.mission,
        vision: branding.vision ?? department.vision,
        icon: branding.icon ?? department.icon,
        color: branding.color ?? department.color,
        secondaryColor: branding.secondaryColor ?? department.secondaryColor,
        logo: branding.logo ?? department.logo,
        keyAreas: branding.keyAreas?.length ? branding.keyAreas : department.keyAreas,
        facilities: branding.facilities?.length ? branding.facilities : department.facilities,
        programHighlights: branding.programHighlights?.length ? branding.programHighlights : department.programHighlights,
        stats: branding.stats?.length ? branding.stats : department.stats,
        chartData: branding.chartData?.length ? branding.chartData : department.chartData
      };
    })
    .filter((department): department is DepartmentData => Boolean(department));

  const addedDepartments = brandingDepartments
    .filter((department) => department.active && !baseDepartmentIds.has(department.id.toUpperCase()))
    .map(createManagedDepartmentFromBranding);

  return [...managedDepartments, ...addedDepartments];
}
