import crypto from 'node:crypto';
import {
  AccountStatus,
  Prisma,
  UserRole,
  VerificationDocumentType
} from '@/generated/prisma/client';
import {
  ACCOUNT_STATUS_PATH,
  buildDisplayName,
  clearWorkspaceCookie,
  ensureAuthConfig,
  hashPassword,
  publicUserSelect,
  setAuthCookie,
  signAuthToken,
  toPublicUser,
  validatePassword
} from '@/lib/auth';
import {
  clearGoogleRegistrationCookie,
  getGoogleRegistrationContext
} from '@/lib/google-oauth';
import { prisma } from '@/lib/prisma';
import { recordAccountAudit } from '@/lib/rbac/audit';
import { ROLE_CATALOG, SELF_REGISTRATION_ROLES, TWO_SIDED_DOCUMENTS, fromApiEnum, toApiEnum } from '@/lib/rbac/catalog';
import { toDepartmentId } from '@/lib/rbac/departments';
import { validateRegistrationRequest } from '@/lib/rbac/policy';
import {
  IDENTITY_DOCUMENT_BUCKET,
  buildIdentityDocumentPath,
  checkIdentityDocument,
  deleteIdentityDocument,
  uploadIdentityDocument
} from '@/lib/storage/identity-documents';
import { createServiceClient } from '@/lib/supabase/service';
import {
  HttpError,
  handleApiError,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  successResponse
} from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const NOT_SELF_REGISTRABLE = new Set<UserRole>([UserRole.SYSTEM_ADMIN, UserRole.ADMIN]);

async function readRegistrationForm(request: Request) {
  try {
    return await request.formData();
  } catch {
    throw new HttpError('Registration must be submitted with your identity document.', 400, {
      document: 'Upload your identity document.'
    });
  }
}

/**
 * Self-registration. Creates an account that can't use the application yet: it starts at
 * PENDING_VERIFICATION with one pending application (requested role, department, identity document).
 * Nothing the browser sends decides the role, department or status the account actually gets; a reviewer
 * verifies the document and an authorized person assigns the role.
 */
async function handlePOST(request: Request) {
  // Created along the way, removed again if a later step fails so no orphan login or file is left behind.
  let createdSupabaseUserId: string | null = null;
  const storedDocumentPaths: string[] = [];

  try {
    ensureAuthConfig();

    const form = await readRegistrationForm(request);
    const field = (name: string) => normalizeText(form.get(name));
    const isGoogleRegistration = field('provider').toLowerCase() === 'google';
    const googleRegistrationContext = isGoogleRegistration ? getGoogleRegistrationContext(request) : null;

    if (isGoogleRegistration && !googleRegistrationContext) {
      throw new HttpError('Google registration session has expired. Start again from Google sign in.', 401);
    }

    const requestedRole = fromApiEnum(UserRole, field('requestedRole') || field('role'));

    if (requestedRole && NOT_SELF_REGISTRABLE.has(requestedRole)) {
      throw new HttpError('System Administrator accounts can\'t be registered.', 403, {
        requestedRole: 'Choose a different account type.'
      });
    }

    const email = normalizeEmail(form.get('email'));
    const password = field('password');
    const confirmPassword = normalizeText(form.get('confirmPassword') ?? form.get('password'));
    const firstName = field('firstName') || googleRegistrationContext?.firstName || '';
    const lastName = field('lastName') || googleRegistrationContext?.lastName || '';
    const department = field('department');
    const requestedDepartmentId = toDepartmentId(department);
    const isStudent = requestedRole === UserRole.STUDENT;
    const studentId = isStudent ? field('studentId') : '';
    const yearLevel = isStudent ? field('yearLevel') : '';
    const documentType = fromApiEnum(VerificationDocumentType, field('documentType'));
    const fieldErrors: Record<string, string> = {};

    if (!requestedRole) {
      fieldErrors.requestedRole = 'Choose an account type.';
    } else if (!SELF_REGISTRATION_ROLES.includes(requestedRole)) {
      fieldErrors.requestedRole = `${ROLE_CATALOG[requestedRole].label} accounts are given by invitation, not registration.`;
    } else {
      Object.assign(
        fieldErrors,
        validateRegistrationRequest({
          requestedRole,
          requestedDepartmentId,
          documentType: documentType ?? ''
        })
      );
    }

    if (department && !requestedDepartmentId && requestedRole && ROLE_CATALOG[requestedRole].scope === 'department') {
      fieldErrors.department = 'Choose a department from the list.';
    }

    if (!email) {
      fieldErrors.email = 'Please enter your email address.';
    } else if (!isValidEmail(email)) {
      fieldErrors.email = 'Enter a valid email address.';
    } else if (googleRegistrationContext && email !== googleRegistrationContext.email) {
      fieldErrors.email = 'Use the email from your verified Google account.';
    }

    if (!firstName) {
      fieldErrors.firstName = 'Please enter your first name.';
    }

    if (!lastName) {
      fieldErrors.lastName = 'Please enter your last name.';
    }

    if (isStudent && !studentId) {
      fieldErrors.studentId = 'Please enter your student ID.';
    }

    if (isStudent && !yearLevel) {
      fieldErrors.yearLevel = 'Please select your year level.';
    }

    if (!isGoogleRegistration && !password) {
      fieldErrors.password = 'Please enter a password.';
    }

    if (!isGoogleRegistration && password) {
      try {
        validatePassword(password);
      } catch (error) {
        if (error instanceof HttpError) {
          Object.assign(fieldErrors, error.fieldErrors);
        }
      }
    }

    if (!isGoogleRegistration && password !== confirmPassword) {
      fieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(fieldErrors).length) {
      throw new HttpError('Please correct the highlighted fields and try again.', 400, fieldErrors);
    }

    // Narrowed by the checks above.
    const role = requestedRole as UserRole;
    const verifiedDocumentType = documentType as VerificationDocumentType;
    const document = await checkIdentityDocument(form.get('document'));
    // ID cards need the back as well; single-page documents ignore any extra file.
    const documentBack = TWO_SIDED_DOCUMENTS.has(verifiedDocumentType)
      ? await checkIdentityDocument(form.get('documentBack'), 'documentBack')
      : null;

    if (requestedDepartmentId) {
      const departmentRecord = await prisma.department.findFirst({
        where: { id: requestedDepartmentId, isActive: true },
        select: { id: true }
      });

      if (!departmentRecord) {
        throw new HttpError('That department is not accepting registrations.', 400, {
          department: 'Choose a department from the list.'
        });
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new HttpError(
        isGoogleRegistration
          ? 'This Google account is already registered. Use Continue with Google to sign in.'
          : 'An account with this email already exists.',
        409,
        {
          email: isGoogleRegistration
            ? 'Use Continue with Google to sign in.'
            : 'An account with this email already exists.'
        }
      );
    }

    if (googleRegistrationContext) {
      const existingGoogleUser = await prisma.user.findUnique({
        where: {
          googleSub: googleRegistrationContext.sub
        }
      });

      if (existingGoogleUser) {
        throw new HttpError('This Google account is already linked to a ThesisTrack account.', 409, {
          email: 'Use Continue with Google to sign in.'
        });
      }
    }

    if (studentId) {
      const existingStudent = await prisma.user.findUnique({
        where: { studentId }
      });

      if (existingStudent) {
        throw new HttpError('A student account with this ID already exists.', 409, {
          studentId: 'A student account with this ID already exists.'
        });
      }
    }

    const name = buildDisplayName({
      name: field('name'),
      firstName,
      lastName,
      email
    });
    let passwordHash: string;
    let supabaseId: string | null;

    if (isGoogleRegistration) {
      passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
      supabaseId = googleRegistrationContext?.sub || null;
    } else {
      const supabaseAdmin = createServiceClient();
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { firstName, lastName, name }
      });

      if (authError) {
        throw new HttpError(authError.message, 400);
      }

      supabaseId = authData.user?.id || null;
      createdSupabaseUserId = supabaseId;
      // We still keep the legacy hash logic so local auth doesn't completely break for older functions if they depend on it
      passwordHash = await hashPassword(password);
    }

    const documentPath = buildIdentityDocumentPath(document.fileName);
    await uploadIdentityDocument(documentPath, document);
    storedDocumentPaths.push(documentPath);
    const documentBackPath = documentBack ? buildIdentityDocumentPath(documentBack.fileName) : null;

    if (documentBack && documentBackPath) {
      await uploadIdentityDocument(documentBackPath, documentBack);
      storedDocumentPaths.push(documentBackPath);
    }

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          supabaseId,
          passwordHash,
          googleSub: googleRegistrationContext?.sub || null,
          name,
          firstName: firstName || null,
          lastName: lastName || null,
          studentId: studentId || null,
          department: department || null,
          yearLevel: yearLevel || null,
          // The role asked for, kept as the default for when it's granted. It gives no access by itself:
          // access needs an ACTIVE account and an active role assignment.
          role,
          accountStatus: AccountStatus.PENDING_VERIFICATION
        },
        select: publicUserSelect
      });
      const documentFile = await tx.uploadedFile.create({
        data: {
          fileName: document.fileName,
          filePath: documentPath,
          bucketName: IDENTITY_DOCUMENT_BUCKET,
          fileType: document.mimeType,
          size: document.size,
          documentCategory: 'identity-verification',
          category: 'identity-verification',
          visibility: 'private',
          userId: createdUser.id
        },
        select: { id: true }
      });
      const documentBackFile =
        documentBack && documentBackPath
          ? await tx.uploadedFile.create({
              data: {
                fileName: documentBack.fileName,
                filePath: documentBackPath,
                bucketName: IDENTITY_DOCUMENT_BUCKET,
                fileType: documentBack.mimeType,
                size: documentBack.size,
                documentCategory: 'identity-verification',
                category: 'identity-verification',
                visibility: 'private',
                userId: createdUser.id
              },
              select: { id: true }
            })
          : null;
      const application = await tx.accountApplication.create({
        data: {
          userId: createdUser.id,
          requestedRole: role,
          requestedDepartmentId: ROLE_CATALOG[role].scope === 'department' ? requestedDepartmentId : null,
          documentType: verifiedDocumentType,
          documentFileId: documentFile.id,
          documentBackFileId: documentBackFile?.id ?? null,
          // One pending application per user, enforced by the unique pendingKey.
          pendingKey: createdUser.id
        },
        select: { id: true }
      });

      await recordAccountAudit(tx, {
        actorId: createdUser.id,
        action: 'application.submitted',
        userId: createdUser.id,
        metadata: {
          applicationId: application.id,
          requestedRole: role,
          requestedDepartmentId,
          documentType: verifiedDocumentType,
          provider: isGoogleRegistration ? 'google' : 'password'
        },
        request
      });

      return createdUser;
    });

    createdSupabaseUserId = null;
    storedDocumentPaths.length = 0;

    // Signed in, but only to the status page until the account is verified and given a role.
    const response = successResponse(
      {
        user: toPublicUser(user),
        account: { status: toApiEnum(AccountStatus.PENDING_VERIFICATION), hasAccess: false },
        redirectTo: ACCOUNT_STATUS_PATH
      },
      201
    );
    setAuthCookie(response, signAuthToken(user));
    clearWorkspaceCookie(response);
    clearGoogleRegistrationCookie(response);

    return response;
  } catch (error) {
    for (const storedPath of storedDocumentPaths) {
      await deleteIdentityDocument(storedPath);
    }

    if (createdSupabaseUserId) {
      try {
        await createServiceClient().auth.admin.deleteUser(createdSupabaseUserId);
      } catch (cleanupError) {
        console.error('Failed to remove the Supabase login of a failed registration', cleanupError);
      }
    }

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

      if (target.includes('googleSub')) {
        fieldErrors.email = 'This Google account is already linked to a ThesisTrack account.';
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

export const POST = withApiLogging('POST', '/api/auth/register', handlePOST);
