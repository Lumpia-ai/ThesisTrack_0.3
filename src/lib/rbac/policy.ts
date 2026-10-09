import {
  AccountStatus,
  RoleAssignmentStatus,
  UserRole
} from '@/generated/prisma/enums';
import {
  DEPARTMENT_REQUIRED_ROLES,
  INSTITUTION_SCOPE,
  NO_DEPARTMENT_SCOPE,
  ROLE_CATALOG
} from '@/lib/rbac/catalog';

// Every rule about who may verify applicants, grant or revoke roles, and which role a request runs as.
// Pure functions with no database or framework access, so the rules are tested directly
// (tests/rbac/policy.test.ts) and every API route applies exactly the same checks.

export type Decision = { allowed: true } | { allowed: false; reason: string };

const ALLOW: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

/** One role assignment as stored in UserRoleAssignment. */
export type AssignmentRecord = {
  id: string;
  role: UserRole;
  scope: string;
  departmentId: string | null;
  status: RoleAssignmentStatus;
};

/** The role a request runs as: exactly one assignment, never a combination. */
export type Workspace = {
  assignmentId: string;
  role: UserRole;
  scope: string;
  departmentId: string | null;
};

/** Who is acting: their user id and active workspace. */
export type Actor = {
  userId: string;
  workspace: Workspace;
  /**
   * Program Heads only: departments with no active Program Head of their own, which every Program Head covers
   * for registrations and department roles until one is assigned (see loadActor in src/lib/rbac/actor.ts).
   */
  coveredDepartmentIds?: string[];
};

/** The departments whose department roles this Program Head manages: their own plus any uncovered ones. */
function programHeadDepartments(actor: Actor) {
  return actor.workspace.departmentId ? [actor.workspace.departmentId, ...(actor.coveredDepartmentIds ?? [])] : [];
}

export function isInstitutionRole(role: UserRole) {
  return ROLE_CATALOG[role].scope === 'institution';
}

/** The scope an assignment of this role gets: 'INSTITUTION', the Department.id, or 'NONE' when unknown. */
export function scopeForRole(role: UserRole, departmentId: string | null) {
  if (isInstitutionRole(role)) {
    return { scope: INSTITUTION_SCOPE, departmentId: null };
  }

  return departmentId ? { scope: departmentId, departmentId } : { scope: NO_DEPARTMENT_SCOPE, departmentId: null };
}

/**
 * May this assignment be used as a workspace? It must be active, and a department-scoped one must match the
 * department on the user's profile: the existing department checks across the app compare against
 * User.department, so a mismatch would let the role act in a department it was never granted for.
 * A Program Head with no department is refused outright, because the existing checks treat a missing
 * department as "no filter" and would show every department.
 */
export function canUseAssignment(assignment: AssignmentRecord, userDepartmentId: string | null): Decision {
  if (assignment.status !== RoleAssignmentStatus.ACTIVE) {
    return deny('This role has been revoked.');
  }

  if (isInstitutionRole(assignment.role)) {
    return ALLOW;
  }

  if (!assignment.departmentId) {
    return DEPARTMENT_REQUIRED_ROLES.has(assignment.role)
      ? deny(`The ${ROLE_CATALOG[assignment.role].label} role has no department yet. Ask a System Administrator to set it.`)
      : ALLOW;
  }

  return assignment.departmentId === userDepartmentId
    ? ALLOW
    : deny(`The ${ROLE_CATALOG[assignment.role].label} role is for a different department than your profile.`);
}

/**
 * Picks the active workspace from the user's assignments: the one they chose (if still usable), else the one
 * matching their default role (User.role), else the first usable one. Revoked or unusable assignments are
 * never returned, whatever the client asks for.
 */
export function resolveWorkspace(
  assignments: AssignmentRecord[],
  options: { preferredAssignmentId?: string | null; defaultRole: UserRole; userDepartmentId: string | null }
): { active: Workspace | null; available: Workspace[] } {
  const available = assignments
    .filter((assignment) => canUseAssignment(assignment, options.userDepartmentId).allowed)
    .map((assignment) => ({
      assignmentId: assignment.id,
      role: assignment.role,
      scope: assignment.scope,
      departmentId: assignment.departmentId
    }));

  const active =
    available.find((workspace) => workspace.assignmentId === options.preferredAssignmentId) ??
    available.find((workspace) => workspace.role === options.defaultRole) ??
    available[0] ??
    null;

  return { active, available };
}

/** Does the actor's workspace hold the authority for this role, in this department? */
function hasAuthorityFor(actor: Actor, role: UserRole, departmentId: string | null): Decision {
  const authority = ROLE_CATALOG[role].authority;

  if (!authority) {
    return deny(`The ${ROLE_CATALOG[role].label} role can't be managed inside the application.`);
  }

  if (authority === UserRole.SYSTEM_ADMIN) {
    return actor.workspace.role === UserRole.SYSTEM_ADMIN
      ? ALLOW
      : deny(`Only a System Administrator manages the ${ROLE_CATALOG[role].label} role.`);
  }

  if (actor.workspace.role !== UserRole.PROGRAM_HEAD) {
    return deny(`Only a Program Head manages the ${ROLE_CATALOG[role].label} role.`);
  }

  if (!actor.workspace.departmentId) {
    return deny('Your Program Head role has no department, so it can\'t manage department roles.');
  }

  return departmentId && programHeadDepartments(actor).includes(departmentId)
    ? ALLOW
    : deny('You can only manage roles in your own department.');
}

export type ReviewableApplication = {
  userId: string;
  requestedRole: UserRole;
  requestedDepartmentId: string | null;
};

/** May the actor see and decide this application (verify, reject, open its document)? */
export function canReviewApplication(actor: Actor, application: ReviewableApplication): Decision {
  if (actor.userId === application.userId) {
    return deny('You can\'t review your own application.');
  }

  return hasAuthorityFor(
    actor,
    application.requestedRole,
    isInstitutionRole(application.requestedRole) ? null : application.requestedDepartmentId
  );
}

export type GrantTarget = {
  userId: string;
  accountStatus: AccountStatus;
  /** Department.id mapped from the target's profile (User.department). */
  departmentId: string | null;
  /** Active roles the person keeps alongside the new one (excluding any being replaced in the same change). */
  heldRoles: UserRole[];
};

/** May the actor grant `role` to the target? Department roles are always granted in the target's own department. */
export function canGrantRole(actor: Actor, target: GrantTarget, role: UserRole): Decision {
  if (actor.userId === target.userId) {
    return deny('You can\'t grant roles to yourself.');
  }

  if (target.accountStatus !== AccountStatus.PENDING_ROLE_ASSIGNMENT && target.accountStatus !== AccountStatus.ACTIVE) {
    return deny('Verify this person\'s identity before assigning a role.');
  }

  // Student is an exclusive role: a student account holds no other role, and staff accounts can't also be students.
  const otherRoles = target.heldRoles.filter((held) => held !== role);

  if (role !== UserRole.STUDENT && otherRoles.includes(UserRole.STUDENT)) {
    return deny('Student accounts can only hold the Student role.');
  }

  if (role === UserRole.STUDENT && otherRoles.length) {
    return deny('A staff account can\'t also be a student. Remove their other roles first.');
  }

  if (!isInstitutionRole(role) && !target.departmentId) {
    return deny('This person has no recognised department, so a department role can\'t be assigned.');
  }

  return hasAuthorityFor(actor, role, isInstitutionRole(role) ? null : target.departmentId);
}

/** May the actor revoke this assignment from the target? */
export function canRevokeAssignment(actor: Actor, targetUserId: string, assignment: AssignmentRecord): Decision {
  if (actor.userId === targetUserId) {
    return deny('You can\'t change your own roles.');
  }

  if (assignment.status !== RoleAssignmentStatus.ACTIVE) {
    return deny('This role is already revoked.');
  }

  // Legacy Admin accounts predate role management; a System Administrator may retire them.
  if (assignment.role === UserRole.ADMIN) {
    return actor.workspace.role === UserRole.SYSTEM_ADMIN ? ALLOW : deny('Only a System Administrator can retire a legacy Admin role.');
  }

  return hasAuthorityFor(actor, assignment.role, assignment.departmentId);
}

/** The actor for a signed-in user: their id and active workspace. */
export function actorFrom(user: { id: string; workspace: Workspace }): Actor {
  return { userId: user.id, workspace: user.workspace };
}

/**
 * May the actor open this person's roles and history? A System Administrator sees everyone; a Program Head
 * sees people in their own department, or in a department they cover (by profile, or by the department they
 * applied to).
 */
export function canViewAccount(actor: Actor, target: { departmentIds: Array<string | null> }): Decision {
  if (actor.workspace.role === UserRole.SYSTEM_ADMIN) {
    return ALLOW;
  }

  if (
    actor.workspace.role === UserRole.PROGRAM_HEAD &&
    programHeadDepartments(actor).some((departmentId) => target.departmentIds.includes(departmentId))
  ) {
    return ALLOW;
  }

  return deny('You can only view accounts in your own department.');
}

/** The roles the actor could grant this person right now (for building the assignment form). */
export function grantableRoles(actor: Actor, target: GrantTarget, heldRoles: UserRole[]): UserRole[] {
  return (Object.keys(ROLE_CATALOG) as UserRole[]).filter(
    (role) => !heldRoles.includes(role) && canGrantRole(actor, target, role).allowed
  );
}

export type RegistrationRequest = {
  requestedRole: UserRole;
  requestedDepartmentId: string | null;
  documentType: string;
};

/** Is this a valid self-registration request? (The registrant's identity is checked separately.) */
export function validateRegistrationRequest(request: RegistrationRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  const info = ROLE_CATALOG[request.requestedRole];

  if (!info.authority) {
    errors.requestedRole = 'This account type can\'t be requested.';
    return errors;
  }

  if (info.scope === 'department' && !request.requestedDepartmentId) {
    errors.department = 'Please select your department.';
  }

  if (!(info.documents as string[]).includes(request.documentType)) {
    errors.documentType = 'Choose a document accepted for this account type.';
  }

  return errors;
}
