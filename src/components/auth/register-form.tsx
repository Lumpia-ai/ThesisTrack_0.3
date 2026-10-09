'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  getRoleRedirectPath,
  persistAuthenticatedUser,
  registerWithApi
} from '@/lib/client-auth';
import {
  authUi,
  cx,
  getInputClass,
  getMessageClass,
  getPasswordInputClass,
  getSelectClass,
  shouldOpenAuthModal
} from './auth-ui';
import { AuthModalBrand } from './auth-modal-brand';
import { useBranding } from '@/components/branding/branding-provider';
import { UserRole, VerificationDocumentType } from '@/generated/prisma/enums';
import {
  DOCUMENT_LABELS,
  IDENTITY_DOCUMENT_ACCEPT,
  IDENTITY_DOCUMENT_EXTENSIONS,
  IDENTITY_DOCUMENT_MAX_BYTES,
  ROLE_CATALOG,
  SELF_REGISTRATION_ROLES,
  TWO_SIDED_DOCUMENTS,
  fromApiEnum,
  toApiEnum
} from '@/lib/rbac/catalog';

const fallbackDepartmentOptions = [
  { value: '', label: 'Select Department' },
  { value: 'BSIT', label: 'BSIT - Information Technology' },
  { value: 'BSMET', label: 'BSMET - Manufacturing Eng. Tech.' },
  { value: 'BSTCM', label: 'BSTCM - Technology Communication Mgmt.' },
  { value: 'BSESM', label: 'BSESM - Energy Systems & Mgmt.' },
  { value: 'BSNAME', label: 'BSNAME - Naval Architecture & Marine Eng.' }
] as const;

const yearLevelOptions = [
  { value: '', label: 'Select Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' }
] as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const accountTypeOptions = SELF_REGISTRATION_ROLES.map((role) => ({
  value: toApiEnum(role),
  label: ROLE_CATALOG[role].label
}));

const ROLE_ICONS: Record<string, string> = {
  student: 'fa-user-graduate',
  adviser: 'fa-chalkboard-user',
  panel: 'fa-people-group',
  program_head: 'fa-user-tie',
  research_head: 'fa-flask',
  library: 'fa-book-open'
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  student: 'Submit your title and track your thesis',
  adviser: 'Guide groups and review their work',
  panel: 'Evaluate and rate defenses',
  program_head: 'Oversee your department’s projects',
  research_head: 'Lead research across the institution',
  library: 'Curate the research repository'
};

const DOCUMENT_ICONS: Record<string, string> = {
  student_id: 'fa-id-card',
  certificate_of_registration: 'fa-file-lines',
  employee_id: 'fa-id-badge',
  government_id: 'fa-passport',
  company_authorization: 'fa-file-signature',
  appointment_or_designation: 'fa-file-contract'
};

const labelClass = 'mb-1.5 block text-[13px] font-bold text-slate-700';

function getRoleInfo(value: string) {
  const role = fromApiEnum(UserRole, value);
  return role ? ROLE_CATALOG[role] : null;
}

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

const googleRegistrationMessage = 'No account yet for this Google sign-in. Finish signing up below.';

function splitDisplayName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ')
  };
}

function calculatePasswordStrength(password: string): number {
  let score = 0;
  if (!password) return 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const passwordStrengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const passwordStrengthColors = ['text-slate-500', 'text-red-600', 'text-amber-600', 'text-amber-600', 'text-emerald-600'];

type RegisterFieldErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'studentId'
    | 'email'
    | 'department'
    | 'yearLevel'
    | 'password'
    | 'confirmPassword'
    | 'requestedRole'
    | 'documentType'
    | 'document'
    | 'documentBack',
    string
  >
>;

type RegisterField = keyof RegisterFieldErrors;
type RegisterStep = 'account' | 'details' | 'verification' | 'security';

// The form is split into steps; each step owns these fields, so a validation or server error can
// send the user back to the step where it can be fixed.
const STEP_FIELDS: Record<RegisterStep, RegisterField[]> = {
  account: ['requestedRole'],
  details: ['firstName', 'lastName', 'studentId', 'email', 'department', 'yearLevel'],
  verification: ['documentType', 'document', 'documentBack'],
  security: ['password', 'confirmPassword']
};

const STEP_LABELS: Record<RegisterStep, string> = {
  account: 'Role',
  details: 'Details',
  verification: 'ID',
  security: 'Password'
};

function pickStepErrors(errors: RegisterFieldErrors, step: RegisterStep): RegisterFieldErrors {
  return Object.fromEntries(STEP_FIELDS[step].filter((field) => errors[field]).map((field) => [field, errors[field]]));
}

const backButtonClass =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 hover:text-[#003A8F] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12';

type RegisterFormProps = {
  /** Reports account-creation progress so the modal can refuse to close mid-request. */
  onSubmittingChange?: (isSubmitting: boolean) => void;
  /** Fires once the user has typed or selected anything, so the modal can confirm before discarding it. */
  onDirtyChange?: (isDirty: boolean) => void;
  /** "Sign in here" switches the modal to its login view instead of navigating. */
  onSwitchToLogin?: () => void;
};

export function RegisterForm({ onSubmittingChange, onDirtyChange, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const { branding } = useBranding();
  const registerBranding = branding.auth.register;
  // Prefixed ids so they never collide with the login view's fields (both views live in the same dialog).
  const fieldId = (name: string) => `register-modal-${name}`;
  const messageId = (id: string) => id.replace(/^register-/, 'register-modal-');
  const departmentOptions = [
    { value: '', label: 'Select Department' },
    ...branding.departments
      .filter((departmentItem) => departmentItem.active)
      .map((departmentItem) => ({
        value: departmentItem.label.split(' - ')[0]?.trim() || departmentItem.id,
        label: departmentItem.label || `${departmentItem.shortName} - ${departmentItem.name}`
      }))
  ];
  const availableDepartmentOptions = departmentOptions.length > 1 ? departmentOptions : fallbackDepartmentOptions;
  const [requestedRole, setRequestedRole] = useState('student');
  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentBackFile, setDocumentBackFile] = useState<File | null>(null);
  const [draggingField, setDraggingField] = useState<'document' | 'documentBack' | null>(null);
  // Local previews of the picked files (object URLs; nothing is uploaded until the form is submitted).
  const [previewUrls, setPreviewUrls] = useState<Partial<Record<'document' | 'documentBack', string>>>({});
  const [previewField, setPreviewField] = useState<'document' | 'documentBack' | null>(null);
  const fileInputRefs = useRef<Record<'document' | 'documentBack', HTMLInputElement | null>>({ document: null, documentBack: null });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRegistration, setIsGoogleRegistration] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const passwordStrength = calculatePasswordStrength(password);
  // Mirrors calculatePasswordStrength: only the minimum length is enforced, the rest raise the strength score.
  const passwordChecks = [
    { label: 'At least 6 characters', met: password.length >= 6, required: true },
    { label: '10+ characters', met: password.length >= 10, required: false },
    { label: 'An uppercase letter', met: /[A-Z]/.test(password), required: false },
    { label: 'A number or symbol', met: /[0-9]|[^A-Za-z0-9]/.test(password), required: false }
  ];
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const roleInfo = getRoleInfo(requestedRole);
  const isStudentRole = requestedRole === 'student';
  const needsDepartment = roleInfo?.scope === 'department';
  const documentOptions = (roleInfo?.documents ?? []).map((type) => ({ value: toApiEnum(type), label: DOCUMENT_LABELS[type] }));
  const selectedDocumentType = fromApiEnum(VerificationDocumentType, documentType);
  // ID cards are uploaded front and back; COR and letters are a single file.
  const needsBackSide = selectedDocumentType ? TWO_SIDED_DOCUMENTS.has(selectedDocumentType) : false;
  const reviewerLabel = roleInfo?.authority === UserRole.SYSTEM_ADMIN ? 'the System Administrator' : 'your Program Head';

  // Google registrations have no password, so they finish on the verification step.
  const steps: RegisterStep[] = isGoogleRegistration
    ? ['account', 'details', 'verification']
    : ['account', 'details', 'verification', 'security'];
  const [stepIndex, setStepIndex] = useState(0);
  const currentStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  // Bumped whenever focus should move into the current step (step change, or errors to fix on it).
  const [focusRequest, setFocusRequest] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const goToStep = (index: number) => {
    setStepIndex(index);
    setFocusRequest((current) => current + 1);
  };

  /** Moves to the first step holding one of these errors; returns false when none map to a step. */
  const goToFirstStepWithError = (errors: RegisterFieldErrors) => {
    const index = steps.findIndex((step) => Object.keys(pickStepErrors(errors, step)).length > 0);

    if (index === -1) {
      return false;
    }

    goToStep(index);
    return true;
  };

  useEffect(() => {
    if (!focusRequest) {
      return;
    }

    const form = formRef.current;
    const panel = form?.querySelector<HTMLElement>(`[data-register-step="${currentStep}"]`);

    if (!form || !panel) {
      return;
    }

    form.closest('[role="dialog"]')?.scrollTo({ top: 0 });
    const target =
      panel.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      panel.querySelector<HTMLElement>('input[type="radio"]:checked') ??
      panel.querySelector<HTMLElement>('input:not([disabled]):not([readonly]), select:not([disabled])');
    target?.focus();
  }, [focusRequest, currentStep]);

  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      const errs = validateRegisterFields();
      setFieldErrors((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(touched).forEach((k) => {
          const key = k as keyof RegisterFieldErrors;
          if (errs[key] !== prev[key]) {
            if (errs[key]) next[key] = errs[key];
            else delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, studentId, email, department, yearLevel, password, confirmPassword, requestedRole, documentType, documentFile, documentBackFile, touched]);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('capstoneStudentProfileDraft') || 'null');

      if (draft) {
        setFirstName(String(draft.firstName || ''));
        setLastName(String(draft.lastName || ''));
        setStudentId(String(draft.studentId || ''));
        setEmail(String(draft.email || ''));
        setDepartment(String(draft.department || ''));
        setYearLevel(String(draft.yearLevel || ''));
      }

      const params = new URLSearchParams(window.location.search);
      const provider = params.get('provider');

      // Google sign-up arrives as a redirect to /register?provider=google&..., which opens this view prefilled.
      if (provider === 'google') {
        const googleName = params.get('name') || '';
        const splitName = splitDisplayName(googleName);
        const googleFirstName = params.get('firstName') || splitName.firstName;
        const googleLastName = params.get('lastName') || splitName.lastName;
        const googleEmail = params.get('email') || '';

        setIsGoogleRegistration(true);
        setStatusMessage(googleRegistrationMessage);

        if (googleFirstName) {
          setFirstName(googleFirstName);
        }

        if (googleLastName) {
          setLastName(googleLastName);
        }

        if (googleEmail) {
          setEmail(googleEmail);
        }
      }
    } catch {
      // Ignore storage parsing issues.
    }
  }, []);

  useEffect(() => {
    router.prefetch('/login');
  }, [router]);

  useEffect(() => {
    const url = documentFile ? URL.createObjectURL(documentFile) : undefined;
    setPreviewUrls((current) => ({ ...current, document: url }));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentFile]);

  useEffect(() => {
    const url = documentBackFile ? URL.createObjectURL(documentBackFile) : undefined;
    setPreviewUrls((current) => ({ ...current, documentBack: url }));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentBackFile]);

  const clearFieldError = (field: keyof RegisterFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const validateRegisterFields = (): RegisterFieldErrors => {
    const nextErrors: RegisterFieldErrors = {};
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedStudentId = studentId.trim();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedFirstName) {
      nextErrors.firstName = 'Enter your first name.';
    } else if (normalizedFirstName.length < 2) {
      nextErrors.firstName = 'At least 2 characters.';
    }

    if (!normalizedLastName) {
      nextErrors.lastName = 'Enter your last name.';
    } else if (normalizedLastName.length < 2) {
      nextErrors.lastName = 'At least 2 characters.';
    }

    if (!roleInfo) {
      nextErrors.requestedRole = 'Choose an account type.';
    }

    if (isStudentRole && !normalizedStudentId) {
      nextErrors.studentId = 'Enter your student ID.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Enter your email.';
    } else if (!emailPattern.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email.';
    }

    if (needsDepartment && !department) {
      nextErrors.department = 'Choose your department.';
    }

    if (isStudentRole && !yearLevel) {
      nextErrors.yearLevel = 'Choose your year level.';
    }

    if (!documentType) {
      nextErrors.documentType = 'Choose an ID type.';
    }

    const fileProblem = (candidate: File | null, missing: string) =>
      !candidate
        ? missing
        : !(IDENTITY_DOCUMENT_EXTENSIONS as readonly string[]).includes(getFileExtension(candidate.name))
          ? 'Use a PDF, JPG or PNG.'
          : candidate.size > IDENTITY_DOCUMENT_MAX_BYTES
            ? 'Max 5 MB.'
            : null;
    const frontProblem = fileProblem(documentFile, needsBackSide ? 'Upload the front of your ID.' : 'Upload your document.');
    const backProblem = needsBackSide ? fileProblem(documentBackFile, 'Upload the back of your ID.') : null;

    if (frontProblem) {
      nextErrors.document = frontProblem;
    }

    if (backProblem) {
      nextErrors.documentBack = backProblem;
    }

    if (!isGoogleRegistration && !normalizedPassword) {
      nextErrors.password = 'Enter a password.';
    } else if (!isGoogleRegistration && normalizedPassword.length < 6) {
      nextErrors.password = 'At least 6 characters.';
    }

    if (!isGoogleRegistration && !normalizedConfirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.';
    } else if (!isGoogleRegistration && normalizedPassword !== normalizedConfirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const validationErrors = validateRegisterFields();

    // Enter or "Continue" on an earlier step only checks that step's fields before moving on.
    if (!isLastStep) {
      const stepErrors = pickStepErrors(validationErrors, currentStep);

      if (Object.keys(stepErrors).length) {
        setFieldErrors((current) => ({ ...current, ...stepErrors }));
        setTouched((current) => ({ ...current, ...Object.fromEntries(STEP_FIELDS[currentStep].map((field) => [field, true])) }));
        setFocusRequest((current) => current + 1);
        return;
      }

      goToStep(currentStepIndex + 1);
      return;
    }

    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      goToFirstStepWithError(validationErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedStudentId = studentId.trim();
    const trimmedEmail = email.trim();
    const trimmedDepartment = department.trim();
    const trimmedYearLevel = yearLevel.trim();

    const formData = new FormData();
    formData.set('name', `${trimmedFirstName} ${trimmedLastName}`.trim());
    formData.set('firstName', trimmedFirstName);
    formData.set('lastName', trimmedLastName);
    formData.set('email', trimmedEmail);
    formData.set('requestedRole', requestedRole);
    formData.set('department', needsDepartment ? trimmedDepartment : '');
    formData.set('studentId', isStudentRole ? trimmedStudentId : '');
    formData.set('yearLevel', isStudentRole ? trimmedYearLevel : '');
    formData.set('documentType', documentType);
    formData.set('password', password);
    formData.set('confirmPassword', confirmPassword);

    if (documentFile) {
      formData.set('document', documentFile);
    }

    if (needsBackSide && documentBackFile) {
      formData.set('documentBack', documentBackFile);
    }

    if (isGoogleRegistration) {
      formData.set('provider', 'google');
    }

    const result = await registerWithApi(formData);

    if (!result.success) {
      const serverErrors = (result.fieldErrors as RegisterFieldErrors | undefined) || {};
      setFieldErrors(serverErrors);
      setError(result.message || 'Unable to create your account.');
      setIsSubmitting(false);
      goToFirstStepWithError(serverErrors);
      return;
    }

    // New accounts wait for verification, so they go to their status page rather than a portal.
    if (result.redirectTo) {
      window.location.href = result.redirectTo;
      return;
    }

    persistAuthenticatedUser(result.user);
    window.location.href = getRoleRedirectPath(result.user.role);
  };

  // Set on the first real keystroke/selection (not on draft prefill), via the form's onInput.
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = useCallback(() => setIsDirty(true), []);

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const errorId = (name: RegisterField) => fieldId(`${name}-error`);
  const touch = (name: RegisterField) => () => setTouched((current) => ({ ...current, [name]: true }));
  const fieldClass = (name: RegisterField, base: (invalid: boolean) => string = getInputClass) =>
    cx(base(Boolean(fieldErrors[name])), 'text-sm', !fieldErrors[name] && authUi.modalField);
  const fieldMessage = (name: RegisterField, hint?: ReactNode) =>
    fieldErrors[name] ? (
      <span className={authUi.fieldError} id={errorId(name)}>
        {fieldErrors[name]}
      </span>
    ) : hint ? (
      <span className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">{hint}</span>
    ) : null;

  const textField = (
    name: RegisterField,
    label: string,
    value: string,
    setValue: (value: string) => void,
    options: { type?: string; placeholder?: string; autoComplete?: string; readOnly?: boolean; hint?: ReactNode } = {}
  ) => (
    <div className={authUi.formGroup}>
      <label className={labelClass} htmlFor={fieldId(name)}>
        {label}
      </label>
      <input
        id={fieldId(name)}
        className={fieldClass(name)}
        type={options.type ?? 'text'}
        placeholder={options.placeholder}
        autoComplete={options.autoComplete}
        value={value}
        readOnly={options.readOnly}
        onChange={(event) => {
          if (options.readOnly) return;
          setValue(event.target.value);
          setError('');
          // Touched fields are re-validated by the effect above; clearing here too made the message flicker off and back on.
          if (!touched[name]) clearFieldError(name);
        }}
        onBlur={touch(name)}
        aria-invalid={fieldErrors[name] ? 'true' : 'false'}
        aria-describedby={fieldErrors[name] ? errorId(name) : undefined}
        disabled={isSubmitting}
        required
      />
      {fieldMessage(name, options.hint)}
    </div>
  );

  const selectField = (
    name: RegisterField,
    label: string,
    value: string,
    setValue: (value: string) => void,
    options: ReadonlyArray<{ value: string; label: string }>
  ) => (
    <div className={authUi.formGroup}>
      <label className={labelClass} htmlFor={fieldId(name)}>
        {label}
      </label>
      <div className={authUi.selectWrap}>
        <select
          id={fieldId(name)}
          className={fieldClass(name, getSelectClass)}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
            // Touched fields are re-validated by the effect above; clearing here too made the message flicker off and back on.
            if (!touched[name]) clearFieldError(name);
          }}
          onBlur={touch(name)}
          aria-invalid={fieldErrors[name] ? 'true' : 'false'}
          aria-describedby={fieldErrors[name] ? errorId(name) : undefined}
          disabled={isSubmitting}
          required
        >
          {options.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <i className={`fas fa-chevron-down ${authUi.selectIcon}`} aria-hidden="true" />
      </div>
      {fieldMessage(name)}
    </div>
  );

  const passwordField = (
    name: 'password' | 'confirmPassword',
    label: string,
    value: string,
    setValue: (value: string) => void,
    visible: boolean,
    setVisible: (update: (current: boolean) => boolean) => void,
    placeholder: string,
    hint?: ReactNode
  ) => (
    <div className={authUi.formGroup}>
      <label className={labelClass} htmlFor={fieldId(name)}>
        {label}
      </label>
      <div className={authUi.passwordField}>
        <input
          id={fieldId(name)}
          className={fieldClass(name, getPasswordInputClass)}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="new-password"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
            // Touched fields are re-validated by the effect above; clearing here too made the message flicker off and back on.
            if (!touched[name]) clearFieldError(name);
          }}
          onBlur={touch(name)}
          aria-invalid={fieldErrors[name] ? 'true' : 'false'}
          aria-describedby={fieldErrors[name] ? errorId(name) : undefined}
          disabled={isSubmitting}
          required
        />
        <button
          type="button"
          className={cx(authUi.passwordToggle, 'right-2', authUi.modalToggle)}
          onClick={() => setVisible((current) => !current)}
          aria-controls={fieldId(name)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={isSubmitting}
        >
          <i className={`fa-regular ${visible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
        </button>
      </div>
      {fieldMessage(name, hint)}
    </div>
  );

  // Choice cards (account type, document type): real radio inputs, so arrow keys and screen readers work natively.
  const choiceCard = (selected: boolean, compact = false) =>
    cx(
      'relative flex cursor-pointer items-center rounded-xl border bg-white text-slate-700 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#003A8F]/25 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
      compact ? 'gap-2.5 px-3 py-2.5 text-left' : 'flex-col gap-2 px-2 py-3.5 text-center',
      selected
        ? 'border-[#003A8F] bg-[#EAF1FB] text-[#003A8F] shadow-[0_0_0_3px_rgba(0,58,143,0.1)]'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    );

  const formatFileSize = (candidate: File) =>
    candidate.size < 1024 * 1024
      ? `${Math.max(1, Math.round(candidate.size / 1024))} KB`
      : `${(candidate.size / (1024 * 1024)).toFixed(1)} MB`;
  const acceptFile = (field: 'document' | 'documentBack', candidate: File | null | undefined) => {
    (field === 'document' ? setDocumentFile : setDocumentBackFile)(candidate ?? null);
    // Show a file as soon as it's picked; when one is removed, fall back to the other side if it has a file.
    const otherField = field === 'document' ? 'documentBack' : 'document';
    const otherFile = field === 'document' ? documentBackFile : documentFile;
    setPreviewField((current) => (candidate ? field : current === field ? (otherFile ? otherField : null) : current));
    setError('');
    clearFieldError(field);
    setTouched((current) => ({ ...current, [field]: true }));
  };

  // The side being previewed, if its file is still picked (the back only counts for two-sided IDs).
  const activePreviewFile =
    previewField === 'document' ? documentFile : previewField === 'documentBack' && needsBackSide ? documentBackFile : null;
  const activePreviewUrl = previewField ? previewUrls[previewField] : undefined;

  const uploadBox = (field: 'document' | 'documentBack', label: string, compact: boolean) => {
    const selected = field === 'document' ? documentFile : documentBackFile;
    const labelId = fieldId(`${field}-label`);
    const hintId = fieldId(`${field}-hint`);

    return (
      <div className="min-w-0">
        <span className={labelClass} id={labelId}>
          {label}
        </span>
        <div className="relative">
          <label
            htmlFor={fieldId(field)}
            className={cx(
              'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-3.5 py-3.5 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#003A8F]/25',
              draggingField === field
                ? 'border-[#003A8F] bg-[#EAF1FB]'
                : fieldErrors[field]
                  ? 'border-red-300 bg-red-50/50'
                  : selected
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDraggingField(field);
            }}
            onDragLeave={() => setDraggingField(null)}
            onDrop={(event) => {
              event.preventDefault();
              setDraggingField(null);
              markDirty();
              acceptFile(field, event.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={(element) => {
                fileInputRefs.current[field] = element;
              }}
              id={fieldId(field)}
              className="sr-only"
              type="file"
              accept={IDENTITY_DOCUMENT_ACCEPT}
              onChange={(event) => acceptFile(field, event.target.files?.[0])}
              aria-labelledby={labelId}
              aria-describedby={fieldErrors[field] ? errorId(field) : hintId}
              aria-invalid={fieldErrors[field] ? 'true' : 'false'}
              disabled={isSubmitting}
            />
            {selected && previewUrls[field] && selected.type.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable asset
              <img src={previewUrls[field]} alt="" className="h-10 w-12 shrink-0 rounded-lg object-cover ring-1 ring-emerald-200" />
            ) : (
              <span
                className={cx(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg',
                  selected ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-[#003A8F] shadow-sm'
                )}
                aria-hidden="true"
              >
                <i className={`fas ${selected ? (selected.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image') : 'fa-cloud-arrow-up'}`} />
              </span>
            )}
            <span className={cx('min-w-0 flex-1', selected && 'pr-8')}>
              <strong className="block truncate text-sm text-slate-800">
                {selected ? selected.name : compact ? 'Choose a file' : 'Choose a file or drop it here'}
              </strong>
              <span className="block text-xs font-semibold text-slate-500" id={hintId}>
                {selected ? `${formatFileSize(selected)} · Change` : compact ? 'or drop it here' : 'PDF, JPG or PNG · up to 5 MB'}
              </span>
            </span>
          </label>
          {selected ? (
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-red-600"
                onClick={() => {
                  const input = fileInputRefs.current[field];
                  if (input) input.value = '';
                  acceptFile(field, null);
                }}
                aria-label={`Remove ${label.toLowerCase()} file`}
                disabled={isSubmitting}
              >
                <i className="fas fa-xmark" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
        {fieldMessage(field)}
      </div>
    );
  };

  const formFields = (
    <form ref={formRef} className="grid gap-4" aria-busy={isSubmitting} onSubmit={handleSubmit} onInput={markDirty} noValidate>
      <nav aria-label="Registration steps">
        <ol className="m-0 flex list-none items-center gap-1.5 p-0">
          {steps.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <li key={step} className={cx('flex items-center gap-1.5', index < steps.length - 1 && 'flex-1')}>
                <button
                  type="button"
                  className="group inline-flex shrink-0 items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20 disabled:cursor-default"
                  onClick={() => goToStep(index)}
                  // Only earlier steps can be revisited; later ones open through "Continue".
                  disabled={!isDone || isSubmitting}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${STEP_LABELS[step]}, step ${index + 1} of ${steps.length}${isDone ? ', completed' : ''}`}
                >
                  <span
                    className={cx(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-extrabold transition-colors',
                      isDone && 'border-[#003A8F] bg-[#003A8F] text-white group-hover:bg-[#002F75]',
                      isCurrent && 'border-[#003A8F] bg-white text-[#003A8F] ring-4 ring-[#003A8F]/10',
                      !isDone && !isCurrent && 'border-slate-300 bg-white text-slate-400'
                    )}
                    aria-hidden="true"
                  >
                    {isDone ? <i className="fas fa-check text-[0.7rem]" /> : index + 1}
                  </span>
                  <span
                    className={cx(
                      'hidden text-xs font-bold sm:inline',
                      isCurrent ? 'text-[#102033]' : isDone ? 'text-[#003A8F] group-hover:underline' : 'text-slate-400'
                    )}
                    aria-hidden="true"
                  >
                    {STEP_LABELS[step]}
                  </span>
                </button>
                {index < steps.length - 1 ? (
                  <span className={cx('h-0.5 flex-1 rounded-full transition-colors', isDone ? 'bg-[#003A8F]' : 'bg-slate-200')} aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="sr-only" aria-live="polite">
          Step {currentStepIndex + 1} of {steps.length}: {STEP_LABELS[currentStep]}
        </p>
      </nav>

      {/* Step 1 — account type */}
      <div className="grid gap-3 [&[hidden]]:hidden" data-register-step="account" hidden={currentStep !== 'account'}>
        <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={fieldErrors.requestedRole ? errorId('requestedRole') : fieldId('requestedRole-hint')}>
          <legend className={labelClass}>I&apos;m registering as</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {accountTypeOptions.map((option, index) => {
              const selected = requestedRole === option.value;

              return (
                <label key={option.value} className={choiceCard(selected, true)}>
                  <input
                    id={index === 0 ? fieldId('requestedRole') : undefined}
                    className="sr-only"
                    type="radio"
                    name="register-account-type"
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      setRequestedRole(option.value);
                      // Document types differ per account type, so a previous choice may no longer apply.
                      setDocumentType('');
                      setError('');
                      clearFieldError('requestedRole');
                      clearFieldError('documentType');
                    }}
                    disabled={isSubmitting}
                  />
                  <span
                    className={cx(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base transition-colors',
                      selected ? 'bg-[#003A8F] text-white shadow-[0_6px_14px_rgba(0,58,143,0.25)]' : 'bg-slate-100 text-slate-500'
                    )}
                    aria-hidden="true"
                  >
                    <i className={`fas ${ROLE_ICONS[option.value] ?? 'fa-user'}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-[13px] font-bold leading-tight', selected ? 'text-[#003A8F]' : 'text-slate-800')}>
                      {option.label}
                    </span>
                    {ROLE_DESCRIPTIONS[option.value] ? (
                      <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-slate-500">
                        {ROLE_DESCRIPTIONS[option.value]}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cx(
                      'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      selected ? 'border-[#003A8F] bg-[#003A8F]' : 'border-slate-300 bg-white'
                    )}
                    aria-hidden="true"
                  >
                    {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {fieldErrors.requestedRole ? (
          fieldMessage('requestedRole')
        ) : roleInfo ? (
          <div
            className="flex items-start gap-3 rounded-xl border border-[#003A8F]/10 bg-[#003A8F]/[0.04] px-3.5 py-3"
            id={fieldId('requestedRole-hint')}
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#003A8F] ring-1 ring-[#003A8F]/10" aria-hidden="true">
              <i className="fas fa-shield-halved text-xs" />
            </span>
            <p className="m-0 text-xs font-medium leading-5 text-slate-600">
              <strong className="font-bold text-slate-800">Reviewed by {reviewerLabel}.</strong>{' '}
              {documentOptions.length ? (
                <>You&apos;ll upload your {documentOptions.map((option) => option.label).join(' or ')} to verify your identity.</>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      {/* Step 2 — details */}
      <div className="grid gap-3.5 [&[hidden]]:hidden" data-register-step="details" hidden={currentStep !== 'details'}>
        <div className={authUi.formRow}>
          {textField('firstName', 'First name', firstName, setFirstName, { placeholder: 'Juan', autoComplete: 'given-name' })}
          {textField('lastName', 'Last name', lastName, setLastName, { placeholder: 'Dela Cruz', autoComplete: 'family-name' })}
        </div>
        {textField('email', 'Email', email, setEmail, {
          type: 'email',
          placeholder: isStudentRole ? 'student@university.edu.ph' : 'name@university.edu.ph',
          autoComplete: 'email',
          readOnly: isGoogleRegistration,
          hint: isGoogleRegistration ? (
            <>
              <i className="fab fa-google text-[#003A8F]" aria-hidden="true" /> Verified by Google
            </>
          ) : undefined
        })}
        {isStudentRole ? (
          <div className={authUi.formRow}>
            {textField('studentId', 'Student ID', studentId, setStudentId, { placeholder: '2026-XXXX' })}
            {selectField('yearLevel', 'Year level', yearLevel, setYearLevel, yearLevelOptions)}
          </div>
        ) : null}
        {needsDepartment ? selectField('department', 'Department', department, setDepartment, availableDepartmentOptions) : null}
      </div>

      {/* Step 3 — identity document */}
      <div className="grid gap-3.5 [&[hidden]]:hidden" data-register-step="verification" hidden={currentStep !== 'verification'}>
        <div className="flex items-start gap-3 rounded-xl border border-[#003A8F]/10 bg-[#003A8F]/[0.04] px-3.5 py-3">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#003A8F] ring-1 ring-[#003A8F]/10" aria-hidden="true">
            <i className="fas fa-user-shield text-xs" />
          </span>
          <p className="m-0 text-xs font-medium leading-5 text-slate-600">
            <strong className="font-bold text-slate-800">Verify your identity.</strong> Your ID is only seen by {reviewerLabel}, who
            checks it before your account is opened.
          </p>
        </div>
        <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={fieldErrors.documentType ? errorId('documentType') : undefined}>
          <legend className={labelClass}>ID type</legend>
          <div className={cx('grid gap-2', documentOptions.length > 1 && 'sm:grid-cols-2')}>
            {documentOptions.map((option, index) => {
              const selected = documentType === option.value;

              return (
                <label key={option.value} className={choiceCard(selected, true)}>
                  <input
                    id={index === 0 ? fieldId('documentType') : undefined}
                    className="sr-only"
                    type="radio"
                    name="register-document-type"
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      setDocumentType(option.value);
                      setError('');
                      clearFieldError('documentType');
                      clearFieldError('documentBack');
                    }}
                    aria-invalid={fieldErrors.documentType ? 'true' : 'false'}
                    disabled={isSubmitting}
                  />
                  <span
                    className={cx(
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm transition-colors',
                      selected ? 'bg-[#003A8F] text-white shadow-[0_6px_14px_rgba(0,58,143,0.25)]' : 'bg-slate-100 text-slate-500'
                    )}
                    aria-hidden="true"
                  >
                    <i className={`fas ${DOCUMENT_ICONS[option.value] ?? 'fa-id-card'}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-[13px] font-bold leading-tight', selected ? 'text-[#003A8F]' : 'text-slate-800')}>
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-slate-500">
                      {TWO_SIDED_DOCUMENTS.has(option.value.toUpperCase() as VerificationDocumentType) ? 'Front and back' : 'One page or photo'}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      selected ? 'border-[#003A8F] bg-[#003A8F]' : 'border-slate-300 bg-white'
                    )}
                    aria-hidden="true"
                  >
                    {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                </label>
              );
            })}
          </div>
          {fieldMessage('documentType')}
        </fieldset>

        {documentType ? (
          needsBackSide ? (
            <div className="grid gap-1.5">
              <div className="grid gap-3 sm:grid-cols-2">
                {uploadBox('document', 'Front', true)}
                {uploadBox('documentBack', 'Back', true)}
              </div>
              <p className="m-0 text-xs font-semibold text-slate-500">PDF, JPG or PNG · up to 5 MB each</p>
            </div>
          ) : (
            uploadBox('document', 'Upload', false)
          )
        ) : (
          <div
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center"
            aria-hidden="true"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg text-slate-300 shadow-sm">
              <i className="fas fa-cloud-arrow-up" />
            </span>
            <strong className="text-sm text-slate-500">Choose an ID type above to upload</strong>
            <span className="text-xs font-semibold text-slate-400">PDF, JPG or PNG · up to 5 MB</span>
          </div>
        )}

        {documentType ? (
          <ul className="m-0 grid list-none gap-x-4 gap-y-1 p-0 text-xs font-semibold text-slate-500 sm:grid-cols-3">
            {['All four corners visible', 'Text sharp and readable', 'No glare or cover'].map((tip) => (
              <li key={tip} className="flex items-center gap-1.5">
                <i className="fas fa-check text-[0.65rem] text-emerald-600" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        ) : null}

        {documentType && activePreviewFile && activePreviewUrl && previewField ? (
          <figure className="m-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" id={fieldId('document-preview')}>
            <figcaption className="flex items-center gap-2 border-b border-slate-200 bg-white px-2.5 py-2">
              {needsBackSide ? (
                <span className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Preview side">
                  {(['document', 'documentBack'] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      className={cx(
                        'rounded-md px-2.5 py-1 text-xs font-bold transition disabled:opacity-40',
                        previewField === side ? 'bg-white text-[#003A8F] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      )}
                      onClick={() => setPreviewField(side)}
                      aria-pressed={previewField === side}
                      disabled={!(side === 'document' ? documentFile : documentBackFile)}
                    >
                      {side === 'document' ? 'Front' : 'Back'}
                    </button>
                  ))}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate py-1 text-xs font-semibold text-slate-500">{activePreviewFile.name}</span>
            </figcaption>
            {activePreviewFile.type.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img
                src={activePreviewUrl}
                alt={`Preview of ${previewField === 'documentBack' ? 'the back of your ID' : needsBackSide ? 'the front of your ID' : 'your document'}`}
                className="block max-h-72 w-full object-contain p-2"
              />
            ) : (
              <iframe src={activePreviewUrl} title={`Preview of ${activePreviewFile.name}`} className="block h-80 w-full border-0 bg-white" />
            )}
          </figure>
        ) : null}

        {isGoogleRegistration ? (
          <p className="m-0 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <i className="fab fa-google text-[#003A8F]" aria-hidden="true" /> Linked to your Google account, so no password needed.
          </p>
        ) : null}
      </div>

      {/* Step 4 — password */}
      {!isGoogleRegistration ? (
        <div className="grid gap-3.5 [&[hidden]]:hidden" data-register-step="security" hidden={currentStep !== 'security'}>
          <div className="flex items-start gap-3 rounded-xl border border-[#003A8F]/10 bg-[#003A8F]/[0.04] px-3.5 py-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#003A8F] ring-1 ring-[#003A8F]/10" aria-hidden="true">
              <i className="fas fa-key text-xs" />
            </span>
            <p className="m-0 text-xs font-medium leading-5 text-slate-600">
              <strong className="font-bold text-slate-800">Last step — secure your account.</strong> You&apos;ll use this password
              with your email{isStudentRole ? ' or student ID' : ''} to sign in once your account is approved.
            </p>
          </div>
          {passwordField(
            'password',
            'Password',
            password,
            setPassword,
            showPassword,
            setShowPassword,
            'At least 6 characters',
            password ? (
              <span className="flex w-full items-center gap-2" aria-live="polite">
                <span className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={cx(
                        'h-full flex-1 rounded-full transition-colors',
                        passwordStrength >= level ? (passwordStrength < 2 ? 'bg-red-400' : passwordStrength < 3 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-slate-200'
                      )}
                    />
                  ))}
                </span>
                <span className={cx('text-xs font-bold', passwordStrengthColors[passwordStrength])}>{passwordStrengthLabels[passwordStrength]}</span>
              </span>
            ) : undefined
          )}
          <ul className="-mt-1 m-0 grid list-none grid-cols-2 gap-x-4 gap-y-1 p-0 text-xs font-semibold" aria-label="Password requirements">
            {passwordChecks.map((check) => (
              <li key={check.label} className={cx('flex items-center gap-1.5 transition-colors', check.met ? 'text-emerald-600' : 'text-slate-500')}>
                <i className={cx('fas text-[0.7rem]', check.met ? 'fa-circle-check' : 'fa-circle text-[0.4rem] text-slate-300')} aria-hidden="true" />
                {check.label}
                {check.required ? null : <span className="font-medium text-slate-400">(optional)</span>}
                <span className="sr-only">{check.met ? ', done' : ', not yet'}</span>
              </li>
            ))}
          </ul>
          {passwordField(
            'confirmPassword',
            'Confirm password',
            confirmPassword,
            setConfirmPassword,
            showConfirmPassword,
            setShowConfirmPassword,
            'Re-enter password',
            passwordsMatch ? (
              <span className="flex items-center gap-1.5 text-emerald-600" aria-live="polite">
                <i className="fas fa-circle-check" aria-hidden="true" /> Match
              </span>
            ) : passwordsMismatch ? (
              <span className="flex items-center gap-1.5 text-red-600" aria-live="polite">
                <i className="fas fa-circle-exclamation" aria-hidden="true" /> Doesn&apos;t match
              </span>
            ) : undefined
          )}
        </div>
      ) : null}

      {error ? (
        <div className={getMessageClass('error')} role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}

      <div className="grid gap-2.5">
        <div className="flex gap-2">
          {currentStepIndex > 0 ? (
            <button
              type="button"
              className={backButtonClass}
              onClick={() => {
                setError('');
                goToStep(currentStepIndex - 1);
              }}
              disabled={isSubmitting}
              aria-label="Back"
            >
              <i className="fas fa-arrow-left" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : null}

          <button type="submit" className={cx(authUi.submitButton, 'min-w-0 flex-1 text-sm')} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className={authUi.spinner} aria-hidden="true" />
                Creating account…
              </>
            ) : !isLastStep ? (
              <>
                Continue
                <i className="fas fa-arrow-right" aria-hidden="true" />
              </>
            ) : isGoogleRegistration ? (
              'Complete sign-up'
            ) : (
              registerBranding.submitLabel
            )}
          </button>
        </div>
        {isLastStep ? (
          <p className="m-0 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500">
            <i className="fas fa-lock" aria-hidden="true" />
            {registerBranding.academicNote}
          </p>
        ) : null}
      </div>
    </form>
  );

  return (
    <div className="px-5 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
      <AuthModalBrand />
      <div className="mb-5 flex flex-col items-center text-center">
        <h2 className="m-0 font-serif text-[1.75rem] font-bold leading-tight text-[#102033]" id={messageId('register-title')}>
          {registerBranding.title}
        </h2>
        {currentStep === 'account' && registerBranding.subtitle ? (
          <p className="m-0 mt-2 max-w-sm text-[13px] font-medium leading-5 text-slate-500">{registerBranding.subtitle}</p>
        ) : null}
      </div>

      {statusMessage ? (
        <div className={cx(getMessageClass('success'), 'mb-3')} role="status" aria-live="polite">
          {statusMessage}
        </div>
      ) : null}

      {formFields}

      <div className="mt-1 text-center">
        <p className="text-sm font-semibold leading-6 text-slate-700">
          {registerBranding.alternatePrompt}{' '}
          <Link
            href="/login"
            className={authUi.bookLink}
            onClick={(event) => {
              // Inside the modal, switch views instead of navigating; new-tab clicks still reach /login.
              if (onSwitchToLogin && shouldOpenAuthModal(event)) {
                event.preventDefault();
                onSwitchToLogin();
              }
            }}
          >
            <i className="fas fa-arrow-left" aria-hidden="true" />
            {registerBranding.alternateLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
