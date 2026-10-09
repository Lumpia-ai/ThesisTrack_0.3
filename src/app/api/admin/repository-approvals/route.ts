import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';
import { isInDepartmentScope } from '@/lib/department-scope';

export const runtime = 'nodejs';

// The Research Focal Person approves (their department only); the Research
// Head views the same queue read-only for oversight.
const REPOSITORY_APPROVAL_ROLES = [UserRole.FOCAL_PERSON, UserRole.RESEARCH_HEAD, UserRole.SYSTEM_ADMIN, UserRole.ADMIN];

type ApprovalRow = {
  id: string;
  title: string;
  publishedAt: Date | null;
  updatedAt: Date;
  departmentId: string | null;
  departmentName: string | null;
  groupDepartment: string | null;
  groupDept: string | null;
  groupLeader: string | null;
  firstStudent: string | null;
  ownerDisplayName: string | null;
  ownerName: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  adviserDisplayName: string | null;
  adviserName: string | null;
  adviserFirstName: string | null;
  adviserLastName: string | null;
  relevantFileCount: number | bigint | string;
  relevantFileBytes: number | bigint | string;
  allFileCount: number | bigint | string;
  allFileBytes: number | bigint | string;
  submissionStatus: string | null;
  submissionAt: Date | null;
};

function getPersonName(displayName: string | null, name: string | null, firstName: string | null, lastName: string | null) {
  return displayName || name || [firstName, lastName].filter(Boolean).join(' ') || null;
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

// One round trip instead of seven. The previous Prisma query loaded each relation (department,
// group, owner, adviser, files, submissions) in its own sequential query, and every query to the
// hosted database costs a network round trip. This returns the same data:
// - eligible projects: approved, defense scheduled, completed, or archived;
// - file count/size from the final-manuscript files, or all project files when there are none;
// - the latest approved / needs-revision / under-review submission that has a final-manuscript
//   file, which gives the adviser review status and last activity date.
async function findApprovalRows() {
  return prisma.$queryRaw<ApprovalRow[]>`
    SELECT
      p.id,
      p.title,
      p."repositoryPublishedAt" AS "publishedAt",
      p."updatedAt",
      p."departmentId" AS "departmentId",
      d.name AS "departmentName",
      g.department AS "groupDepartment",
      g.dept AS "groupDept",
      g.leader AS "groupLeader",
      g.students[1] AS "firstStudent",
      o."displayName" AS "ownerDisplayName",
      o.name AS "ownerName",
      o."firstName" AS "ownerFirstName",
      o."lastName" AS "ownerLastName",
      a."displayName" AS "adviserDisplayName",
      a.name AS "adviserName",
      a."firstName" AS "adviserFirstName",
      a."lastName" AS "adviserLastName",
      f.relevant_count AS "relevantFileCount",
      f.relevant_bytes AS "relevantFileBytes",
      f.all_count AS "allFileCount",
      f.all_bytes AS "allFileBytes",
      s.status AS "submissionStatus",
      s."submittedAt" AS "submissionAt"
    FROM "Project" p
    LEFT JOIN "Department" d ON d.id = p."departmentId"
    LEFT JOIN "Group" g ON g.id = p."groupId"
    LEFT JOIN "User" o ON o.id = p."ownerId"
    LEFT JOIN "User" a ON a.id = p."adviserId"
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE x.is_final) AS relevant_count,
        coalesce(sum(x.file_size) FILTER (WHERE x.is_final), 0) AS relevant_bytes,
        count(*) AS all_count,
        coalesce(sum(x.file_size), 0) AS all_bytes
      FROM (
        SELECT
          uf.file_size,
          (uf.document_category || ' ' || uf.category) ILIKE ANY (ARRAY['%final%', '%manuscript%']) AS is_final
        FROM uploaded_files uf
        WHERE uf.project_id = p.id
      ) x
    ) f ON true
    LEFT JOIN LATERAL (
      SELECT sub.status::text AS status, sub."submittedAt"
      FROM "Submission" sub
      WHERE sub."projectId" = p.id
        AND sub.status IN ('approved', 'needs_revision', 'under_review')
        AND EXISTS (
          SELECT 1
          FROM uploaded_files uf2
          WHERE uf2.submission_id = sub.id
            AND (uf2.document_category ILIKE ANY (ARRAY['%final%', '%manuscript%'])
              OR uf2.category ILIKE ANY (ARRAY['%final%', '%manuscript%']))
        )
      ORDER BY sub."submittedAt" DESC
      LIMIT 1
    ) s ON true
    WHERE p.status IN ('approved', 'defense_scheduled', 'completed', 'archived')
    ORDER BY p."repositoryPublishedAt" DESC, p."updatedAt" DESC
    LIMIT 200
  `;
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, REPOSITORY_APPROVAL_ROLES);

    const allRows = await findApprovalRows();
    const rows = user.role === UserRole.FOCAL_PERSON
      ? allRows.filter((row) => isInDepartmentScope(user.department, [row.departmentId, row.departmentName, row.groupDepartment, row.groupDept]))
      : allRows;

    const records = rows.map((row) => {
      const relevantCount = Number(row.relevantFileCount);
      const fileCount = relevantCount > 0 ? relevantCount : Number(row.allFileCount);
      const totalBytes = Number(relevantCount > 0 ? row.relevantFileBytes : row.allFileBytes);

      return {
        projectId: row.id,
        projectTitle: row.title,
        department: row.departmentName || row.groupDepartment || null,
        submittedBy:
          getPersonName(row.ownerDisplayName, row.ownerName, row.ownerFirstName, row.ownerLastName) ||
          row.groupLeader ||
          row.firstStudent ||
          null,
        adviserName: getPersonName(row.adviserDisplayName, row.adviserName, row.adviserFirstName, row.adviserLastName),
        // Same values the client expects from the Prisma enum (e.g. 'NEEDS_REVISION').
        adviserReviewStatus: row.submissionStatus ? row.submissionStatus.toUpperCase() : null,
        lastActivityAt: row.submissionAt || row.updatedAt,
        fileCount,
        totalFileSize: formatFileSize(totalBytes),
        isPublished: Boolean(row.publishedAt),
        publishedAt: row.publishedAt
      };
    });

    return Response.json({ success: true, records, canApprove: user.role !== UserRole.RESEARCH_HEAD });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/admin/repository-approvals', handleGET);
