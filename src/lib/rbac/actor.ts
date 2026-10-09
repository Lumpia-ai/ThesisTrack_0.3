import { AccountStatus, RoleAssignmentStatus, UserRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { actorFrom, type Actor, type Workspace } from '@/lib/rbac/policy';

/**
 * Active departments with no usable Program Head (an active, unsuspended account holding an active Program
 * Head assignment for that department). Every Program Head covers these until one is assigned.
 */
export async function findDepartmentsWithoutProgramHead(): Promise<string[]> {
  const [departments, heads] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, select: { id: true } }),
    prisma.userRoleAssignment.findMany({
      where: {
        role: UserRole.PROGRAM_HEAD,
        status: RoleAssignmentStatus.ACTIVE,
        departmentId: { not: null },
        user: { accountStatus: AccountStatus.ACTIVE, isSuspended: false }
      },
      select: { departmentId: true }
    })
  ]);
  const covered = new Set(heads.map((head) => head.departmentId));

  return departments.map((department) => department.id).filter((id) => !covered.has(id));
}

/**
 * The policy actor for a signed-in reviewer. Program Heads also get the departments that have no Program Head
 * of their own, worked out on every request, so coverage ends as soon as a department gets its own head.
 */
export async function loadActor(user: { id: string; workspace: Workspace }): Promise<Actor> {
  const actor = actorFrom(user);

  if (actor.workspace.role !== UserRole.PROGRAM_HEAD || !actor.workspace.departmentId) {
    return actor;
  }

  const uncovered = await findDepartmentsWithoutProgramHead();

  return { ...actor, coveredDepartmentIds: uncovered.filter((id) => id !== actor.workspace.departmentId) };
}
