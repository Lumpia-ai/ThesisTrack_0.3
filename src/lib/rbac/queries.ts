import {
  AccountStatus,
  RoleAssignmentStatus,
  type Prisma,
  type UserRole
} from '@/generated/prisma/client';

/**
 * Users who may be picked for a role-based job (adviser, panelist, group member, secretary): active accounts
 * holding one of these roles as an active assignment. Pending and rejected applicants never qualify, and
 * someone who is, say, Program Head and Adviser appears in adviser lists because of the Adviser assignment.
 */
export function activeRoleHolders(roles: UserRole[]): Prisma.UserWhereInput {
  return {
    accountStatus: AccountStatus.ACTIVE,
    roleAssignments: {
      some: {
        role: { in: roles },
        status: RoleAssignmentStatus.ACTIVE
      }
    }
  };
}
