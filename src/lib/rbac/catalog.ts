import {
  AccountApplicationStatus,
  AccountStatus,
  UserRole,
  VerificationDocumentType
} from '@/generated/prisma/enums';

// What each role is, who is allowed to verify and assign it, and which identity documents an applicant for
// it may submit. Safe to import from client components (the generated enums are plain objects); the server
// enforces these rules in src/lib/rbac/policy.ts, the UI only uses them to build forms.

/** The authority that verifies applicants for a role and assigns it: the same person in both steps. */
export type RoleAuthority = typeof UserRole.SYSTEM_ADMIN | typeof UserRole.PROGRAM_HEAD;

type RoleInfo = {
  label: string;
  /** institution: no department (scope 'INSTITUTION'); department: limited to one Department.id. */
  scope: 'institution' | 'department';
  /** null: never requested or granted inside the app (System Admin comes only from scripts/create-user.mjs). */
  authority: RoleAuthority | null;
  documents: VerificationDocumentType[];
};

// Faculty and staff prove who they are with their school ID or a valid government-issued ID.
const STAFF_DOCUMENTS: VerificationDocumentType[] = [
  VerificationDocumentType.EMPLOYEE_ID,
  VerificationDocumentType.GOVERNMENT_ID
];

export const ROLE_CATALOG: Record<UserRole, RoleInfo> = {
  [UserRole.SYSTEM_ADMIN]: { label: 'System Administrator', scope: 'institution', authority: null, documents: [] },
  [UserRole.ADMIN]: { label: 'Legacy Admin', scope: 'institution', authority: null, documents: [] },
  [UserRole.PROGRAM_HEAD]: { label: 'Program Head', scope: 'department', authority: UserRole.SYSTEM_ADMIN, documents: STAFF_DOCUMENTS },
  [UserRole.RESEARCH_HEAD]: { label: 'Research Head', scope: 'institution', authority: UserRole.SYSTEM_ADMIN, documents: STAFF_DOCUMENTS },
  [UserRole.LIBRARY]: { label: 'Library Personnel', scope: 'institution', authority: UserRole.SYSTEM_ADMIN, documents: STAFF_DOCUMENTS },
  [UserRole.TECH_TRANSFER]: { label: 'Technology Transfer', scope: 'institution', authority: UserRole.SYSTEM_ADMIN, documents: STAFF_DOCUMENTS },
  [UserRole.STUDENT]: {
    label: 'Student',
    scope: 'department',
    authority: UserRole.PROGRAM_HEAD,
    documents: [VerificationDocumentType.STUDENT_ID, VerificationDocumentType.CERTIFICATE_OF_REGISTRATION]
  },
  [UserRole.ADVISER]: { label: 'Adviser', scope: 'department', authority: UserRole.PROGRAM_HEAD, documents: STAFF_DOCUMENTS },
  [UserRole.PANEL]: { label: 'Panel Member', scope: 'department', authority: UserRole.PROGRAM_HEAD, documents: STAFF_DOCUMENTS },
  [UserRole.FOCAL_PERSON]: { label: 'Research Focal Person', scope: 'department', authority: UserRole.PROGRAM_HEAD, documents: STAFF_DOCUMENTS },
  [UserRole.SECRETARY]: { label: 'Secretary', scope: 'department', authority: UserRole.PROGRAM_HEAD, documents: STAFF_DOCUMENTS },
  [UserRole.PARTNER]: {
    label: 'Industry Partner',
    scope: 'department',
    authority: UserRole.PROGRAM_HEAD,
    documents: [VerificationDocumentType.COMPANY_AUTHORIZATION, VerificationDocumentType.GOVERNMENT_ID]
  }
};

/**
 * Roles an applicant may request on the public registration form, in display order. Secretary, Research
 * Focal Person, Industry Partner and Technology Transfer are left out: those people are invited and given
 * their accounts, so they never self-register.
 */
export const SELF_REGISTRATION_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.PROGRAM_HEAD,
  UserRole.RESEARCH_HEAD,
  UserRole.LIBRARY
];

/** Roles granted per department that would see every department without one, so they need a department to be usable. */
export const DEPARTMENT_REQUIRED_ROLES: ReadonlySet<UserRole> = new Set([UserRole.PROGRAM_HEAD]);

export const INSTITUTION_SCOPE = 'INSTITUTION';
/** A department-scoped role whose department is unknown: it grants no department-wide access. */
export const NO_DEPARTMENT_SCOPE = 'NONE';

export const DOCUMENT_LABELS: Record<VerificationDocumentType, string> = {
  [VerificationDocumentType.STUDENT_ID]: 'Student ID',
  [VerificationDocumentType.CERTIFICATE_OF_REGISTRATION]: 'Certificate of Registration (COR)',
  [VerificationDocumentType.EMPLOYEE_ID]: 'School ID',
  [VerificationDocumentType.APPOINTMENT_OR_DESIGNATION]: 'Appointment or designation letter',
  [VerificationDocumentType.GOVERNMENT_ID]: 'Valid government-issued ID',
  [VerificationDocumentType.COMPANY_AUTHORIZATION]: 'Company authorization letter'
};

/** ID cards: applicants upload the front and the back. Other documents (COR, letters) are a single file. */
export const TWO_SIDED_DOCUMENTS: ReadonlySet<VerificationDocumentType> = new Set([
  VerificationDocumentType.STUDENT_ID,
  VerificationDocumentType.EMPLOYEE_ID,
  VerificationDocumentType.GOVERNMENT_ID
]);

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  [AccountStatus.PENDING_VERIFICATION]: 'Waiting for identity verification',
  [AccountStatus.PENDING_ROLE_ASSIGNMENT]: 'Verified, waiting for role assignment',
  [AccountStatus.ACTIVE]: 'Active',
  [AccountStatus.REJECTED]: 'Registration rejected'
};

export const APPLICATION_STATUS_LABELS: Record<AccountApplicationStatus, string> = {
  [AccountApplicationStatus.PENDING]: 'Pending review',
  [AccountApplicationStatus.VERIFIED]: 'Verified',
  [AccountApplicationStatus.REJECTED]: 'Rejected'
};

/** Identity documents: PDF or a photo/scan, at most 5 MB. */
export const IDENTITY_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const IDENTITY_DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const IDENTITY_DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

// API payloads use the lowercase form of enum values ('program_head'); the generated enums use the uppercase
// name ('PROGRAM_HEAD'). These convert safely in both directions and reject anything that isn't a known value.
export function toApiEnum(value: string) {
  return value.toLowerCase();
}

export function fromApiEnum<T extends Record<string, string>>(enumObject: T, value: unknown): T[keyof T] | null {
  const candidate = String(value ?? '').trim().toUpperCase();
  return (Object.values(enumObject) as string[]).includes(candidate) ? (candidate as T[keyof T]) : null;
}
