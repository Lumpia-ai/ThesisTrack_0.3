// Role-grant rules (src/lib/rbac/policy.ts).
// Run with: node --import ./tests/support/register.mjs --test tests/rbac-policy.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserRole, AccountStatus } from '../src/generated/prisma/enums.ts';
import { canGrantRole, canReviewApplication, canViewAccount, grantableRoles } from '../src/lib/rbac/policy.ts';

const programHead = {
  userId: 'ph-1',
  workspace: { assignmentId: 'a-ph', role: UserRole.PROGRAM_HEAD, scope: 'IT', departmentId: 'IT' }
};
const person = (heldRoles, overrides = {}) => ({
  userId: 'u-1',
  accountStatus: AccountStatus.ACTIVE,
  departmentId: 'IT',
  heldRoles,
  ...overrides
});

test('a student cannot be given any other role', () => {
  for (const role of [UserRole.ADVISER, UserRole.PANEL, UserRole.SECRETARY, UserRole.FOCAL_PERSON]) {
    const decision = canGrantRole(programHead, person([UserRole.STUDENT]), role);
    assert.equal(decision.allowed, false, role);
    assert.match(decision.reason, /only hold the Student role/);
  }
  assert.deepEqual(grantableRoles(programHead, person([UserRole.STUDENT]), [UserRole.STUDENT]), []);
});

test('a staff account cannot also become a student', () => {
  const decision = canGrantRole(programHead, person([UserRole.ADVISER]), UserRole.STUDENT);
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /can't also be a student/);
});

test('staff can still hold several staff roles', () => {
  assert.equal(canGrantRole(programHead, person([UserRole.ADVISER]), UserRole.PANEL).allowed, true);
  assert.ok(grantableRoles(programHead, person([UserRole.ADVISER]), [UserRole.ADVISER]).includes(UserRole.PANEL));
});

test('a verified applicant with no role yet can be made a student or staff', () => {
  const applicant = person([], { accountStatus: AccountStatus.PENDING_ROLE_ASSIGNMENT });
  assert.equal(canGrantRole(programHead, applicant, UserRole.STUDENT).allowed, true);
  assert.equal(canGrantRole(programHead, applicant, UserRole.ADVISER).allowed, true);
});

test('switching a student to adviser works when the Student role is replaced in the same change', () => {
  // The edit-account flow revokes the old role, so it is not counted as held.
  assert.equal(canGrantRole(programHead, person([]), UserRole.ADVISER).allowed, true);
});

test('existing rules still apply', () => {
  assert.equal(canGrantRole(programHead, person([], { userId: 'ph-1' }), UserRole.ADVISER).allowed, false, 'no self-grants');
  assert.equal(canGrantRole(programHead, person([], { departmentId: 'MET' }), UserRole.ADVISER).allowed, false, 'own department only');
  assert.equal(canGrantRole(programHead, person([]), UserRole.RESEARCH_HEAD).allowed, false, 'institution roles need a System Admin');
});

// ---------------------------------------------------------------------------------------------
// Departments without a Program Head are covered by the Program Heads that exist
// ---------------------------------------------------------------------------------------------
const metApplicant = { userId: 'u-met', requestedRole: UserRole.STUDENT, requestedDepartmentId: 'MET' };
const coveringHead = { ...programHead, coveredDepartmentIds: ['MET', 'TCM'] };

test('a Program Head reviews and assigns roles for a department that has no Program Head', () => {
  assert.equal(canReviewApplication(coveringHead, metApplicant).allowed, true);
  assert.equal(canGrantRole(coveringHead, person([], { departmentId: 'MET' }), UserRole.STUDENT).allowed, true);
  assert.equal(canViewAccount(coveringHead, { departmentIds: ['MET'] }).allowed, true);
});

test('without coverage (that department has its own head) another department stays off-limits', () => {
  assert.equal(canReviewApplication(programHead, metApplicant).allowed, false);
  assert.equal(canGrantRole(programHead, person([], { departmentId: 'MET' }), UserRole.STUDENT).allowed, false);
  assert.equal(canReviewApplication(coveringHead, { ...metApplicant, requestedDepartmentId: 'ESM' }).allowed, false, 'only covered departments');
});

test('coverage never extends to institution roles', () => {
  assert.equal(canReviewApplication(coveringHead, { userId: 'u-rh', requestedRole: UserRole.RESEARCH_HEAD, requestedDepartmentId: null }).allowed, false);
});
