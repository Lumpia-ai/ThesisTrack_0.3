import { Prisma, RoleAssignmentStatus, UserRole } from '@/generated/prisma/client';
import {
  buildDisplayName,
  hashPassword,
  parseUserRole,
  publicUserSelect,
  requireAuthenticatedUser,
  toPublicUser,
  validatePassword
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  grantRoleAssignment,
  rescopeDepartmentAssignments,
  revokeRoleAssignment,
  syncAccountWithAssignments
} from '@/lib/rbac/assignments';
import { ROLE_CATALOG } from '@/lib/rbac/catalog';
import { toDepartmentId } from '@/lib/rbac/departments';
import { canGrantRole, canRevokeAssignment } from '@/lib/rbac/policy';
import {
  HttpError,
  handleApiError,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  parseJsonBody,
  successResponse
} from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const MANAGED_USER_ROLES: UserRole[] = [
  UserRole.SYSTEM_ADMIN,
  UserRole.PROGRAM_HEAD,
  UserRole.RESEARCH_HEAD,
  UserRole.ADMIN
];

type UpdateUserBody = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  name?: unknown;
  role?: unknown;
  studentId?: unknown;
  department?: unknown;
  yearLevel?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

function validateManagedUserInput({
  email,
  firstName,
  lastName,
  password,
  confirmPassword,
  role,
  studentId,
  department,
  yearLevel
}: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  studentId: string;
  department: string;
  yearLevel: string;
}) {
  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = 'Please enter an email address.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!firstName) {
    fieldErrors.firstName = 'Please enter a first name.';
  }

  if (!lastName) {
    fieldErrors.lastName = 'Please enter a last name.';
  }

  if (!department) {
    fieldErrors.department = 'Please enter a department.';
  }

  if (role === UserRole.STUDENT) {
    if (!studentId) {
      fieldErrors.studentId = 'Please enter a student ID.';
    }

    if (!yearLevel) {
      fieldErrors.yearLevel = 'Please enter a year level.';
    }
  }

  if (password) {
    try {
      validatePassword(password);
    } catch (error) {
      if (error instanceof HttpError && error.fieldErrors) {
        Object.assign(fieldErrors, error.fieldErrors);
      }
    }
  }

  if ((password || confirmPassword) && password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length) {
    throw new HttpError('Please correct the highlighted fields and try again.', 400, fieldErrors);
  }
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function handlePATCH(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, MANAGED_USER_ROLES);

    const { id } = await context.params;
    const userId = normalizeText(id);

    if (!userId) {
      throw new HttpError('User ID is required.', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new HttpError('The selected user no longer exists.', 404);
    }

    const body = await parseJsonBody<UpdateUserBody>(request);
    const email = normalizeEmail(body.email);
    const firstName = normalizeText(body.firstName);
    const lastName = normalizeText(body.lastName);
    const role = parseUserRole(body.role, existingUser.role);
    const studentId = normalizeText(body.studentId);
    let department = normalizeText(body.department);
    const yearLevel = normalizeText(body.yearLevel);
    const password = normalizeText(body.password);
    const confirmPassword = normalizeText(body.confirmPassword ?? body.password);

    if (authUser.role === UserRole.PROGRAM_HEAD && authUser.department) {
      department = authUser.department;
    }

    validateManagedUserInput({
      email,
      firstName,
      lastName,
      password,
      confirmPassword,
      role,
      studentId,
      department,
      yearLevel
    });

    if (authUser.role === UserRole.PROGRAM_HEAD) {
      if (existingUser.role !== UserRole.ADVISER || role !== UserRole.ADVISER) {
        throw new HttpError('Program Heads can only manage Adviser accounts. Student accounts are view-only.', 403, {
          role: 'Must remain Adviser.'
        });
      }

      if (authUser.department) {
        if (existingUser.department !== authUser.department) {
          throw new HttpError('You do not have permission to modify users outside your department.', 403);
        }
        if (department !== authUser.department) {
          throw new HttpError(`You can only assign users to your assigned department (${authUser.department}).`, 403, {
            department: `Must be ${authUser.department}.`
          });
        }
      }
    }

    if ((authUser.role === UserRole.RESEARCH_HEAD || authUser.role === UserRole.ADMIN) && authUser.id !== userId) {
      throw new HttpError('Research Head can monitor users but cannot modify other accounts.', 403);
    }

    if ((authUser.role === UserRole.RESEARCH_HEAD || authUser.role === UserRole.ADMIN) && role !== existingUser.role) {
      throw new HttpError('Research Head cannot change role assignments.', 403, {
        role: 'Role assignment is managed by System Administrator.'
      });
    }

    if (authUser.role === UserRole.SYSTEM_ADMIN && role === UserRole.ADMIN) {
      throw new HttpError('Legacy Admin is no longer assigned. Use System Administrator or Research Head.', 403, {
        role: 'Choose System Administrator or Research Head.'
      });
    }

    if (email !== existingUser.email) {
      const emailOwner = await prisma.user.findUnique({
        where: { email }
      });

      if (emailOwner && emailOwner.id !== userId) {
        throw new HttpError('An account with this email already exists.', 409, {
          email: 'An account with this email already exists.'
        });
      }
    }

    if (role === UserRole.STUDENT && studentId) {
      const studentOwner = await prisma.user.findUnique({
        where: { studentId }
      });

      if (studentOwner && studentOwner.id !== userId) {
        throw new HttpError('A student account with this ID already exists.', 409, {
          studentId: 'A student account with this ID already exists.'
        });
      }
    }

    // A role change here is a role assignment change: the old role is revoked and the new one granted, under
    // the same rules as the role management API. System Administrator is never granted or removed in-app.
    const nextDepartment = department || null;
    const nextDepartmentId = toDepartmentId(nextDepartment);
    const roleChanged = role !== existingUser.role;
    const departmentChanged = nextDepartment !== existingUser.department;
    const actor = { userId: authUser.id, workspace: authUser.workspace };
    const auditContext = { actorId: authUser.id, actorRole: authUser.role, request };
    const replacedAssignments = roleChanged
      ? await prisma.userRoleAssignment.findMany({
          where: { userId, role: existingUser.role, status: RoleAssignmentStatus.ACTIVE }
        })
      : [];

    if (roleChanged) {
      if (role === UserRole.SYSTEM_ADMIN || existingUser.role === UserRole.SYSTEM_ADMIN) {
        throw new HttpError('System Administrator accounts are managed only through the secure setup script.', 403, {
          role: 'System Administrator can\'t be assigned or removed here.'
        });
      }

      for (const assignment of replacedAssignments) {
        const revokeDecision = canRevokeAssignment(actor, userId, assignment);

        if (!revokeDecision.allowed) {
          throw new HttpError(revokeDecision.reason, 403, { role: revokeDecision.reason });
        }
      }

      // The role being replaced is revoked in the same change, so it doesn't count as held.
      const keptRoles = await prisma.userRoleAssignment.findMany({
        where: { userId, status: RoleAssignmentStatus.ACTIVE, role: { not: existingUser.role } },
        select: { role: true }
      });
      const grantDecision = canGrantRole(
        actor,
        {
          userId,
          accountStatus: existingUser.accountStatus,
          departmentId: nextDepartmentId,
          heldRoles: keptRoles.map((assignment) => assignment.role)
        },
        role
      );

      if (!grantDecision.allowed) {
        throw new HttpError(grantDecision.reason, 403, { role: grantDecision.reason });
      }
    }

    const passwordHash = password ? await hashPassword(password) : null;
    const user = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email,
          name: buildDisplayName({
            name: normalizeText(body.name),
            firstName,
            lastName,
            email
          }),
          firstName: firstName || null,
          lastName: lastName || null,
          studentId: role === UserRole.STUDENT ? studentId || null : null,
          department: nextDepartment,
          yearLevel: role === UserRole.STUDENT ? yearLevel || null : null,
          role,
          ...(passwordHash ? { passwordHash } : {})
        }
      });

      if (roleChanged) {
        for (const assignment of replacedAssignments) {
          await revokeRoleAssignment(tx, assignment, `Replaced by ${ROLE_CATALOG[role].label}`, auditContext);
        }

        await grantRoleAssignment(tx, { userId, role, departmentId: nextDepartmentId }, auditContext);
      }

      if (departmentChanged) {
        await rescopeDepartmentAssignments(tx, { userId, departmentId: nextDepartmentId }, auditContext);
      }

      if (roleChanged) {
        await syncAccountWithAssignments(tx, userId, auditContext);
      }

      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: publicUserSelect });
    });

    return successResponse({
      message: password ? 'User account and temporary password updated.' : 'User account updated successfully.',
      user: toPublicUser(user)
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.map((value) => String(value))
        : [];
      const fieldErrors: Record<string, string> = {};

      if (target.includes('email')) {
        fieldErrors.email = 'An account with this email already exists.';
      }

      if (target.includes('studentId')) {
        fieldErrors.studentId = 'A student account with this ID already exists.';
      }

      return handleApiError(
        new HttpError(
          'Please correct the highlighted fields and try again.',
          409,
          Object.keys(fieldErrors).length ? fieldErrors : undefined
        )
      );
    }

    return handleApiError(error);
  }
}

export const PATCH = withApiLogging('PATCH', '/api/users/[id]', handlePATCH);
