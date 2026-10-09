'use client';

import { type ClipboardEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { AuthModalBrand } from './auth-modal-brand';
import {
  authUi,
  cx,
  getInputClass,
  getMessageClass,
  getPasswordInputClass
} from './auth-ui';

/*
 * The three password-reset steps as auth-modal views (forgot -> verify -> reset). Same API calls,
 * email hand-off (sessionStorage) and server-side reset session cookie as the old full pages.
 */

type ResetApiResponse = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

type ForgotPasswordErrors = Partial<Record<'email', string>>;
type VerifyResetCodeErrors = Partial<Record<'email' | 'code', string>>;
type ResetPasswordErrors = Partial<Record<'password' | 'confirmPassword', string>>;

const RESET_EMAIL_STORAGE_KEY = 'thesistrackPasswordResetEmail';
const RESET_NOTICE_STORAGE_KEY = 'thesistrackPasswordResetNotice';
const PASSWORD_RESET_MESSAGE = 'If an account exists for this email, a reset code has been sent.';
export const PASSWORD_RESET_SUCCESS_MESSAGE =
  'Password updated successfully. You can now sign in with your new password.';
const CODE_LENGTH = 6;
const CODE_TTL_SECONDS = 180;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function postResetRequest(url: string, payload: Record<string, unknown>): Promise<ResetApiResponse> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const result = (await response.json()) as ResetApiResponse;

    if (!response.ok || !result.success) {
      return {
        success: false,
        message: result.message || 'Unable to complete the request. Please try again.',
        fieldErrors: result.fieldErrors
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Unable to reach the server. Please try again.'
    };
  }
}

function getStoredResetEmail() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const storedEmail = window.sessionStorage.getItem(RESET_EMAIL_STORAGE_KEY);

    if (storedEmail) {
      return storedEmail;
    }

    const draft = JSON.parse(window.localStorage.getItem('capstoneStudentProfileDraft') || 'null');
    return typeof draft?.email === 'string' ? draft.email : '';
  } catch {
    return '';
  }
}

function storeResetEmail(email: string) {
  try {
    window.sessionStorage.setItem(RESET_EMAIL_STORAGE_KEY, email);
  } catch {
    // Ignore storage issues; the next step also lets the user re-enter the email.
  }
}

function maskEmail(value: string) {
  if (!value || !value.includes('@')) {
    return value;
  }

  const [local, domain] = value.split('@');
  return local.length <= 2 ? `${local[0]}***@${domain}` : `${local.slice(0, 2)}••••••@${domain}`;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function useReportSubmitting(isSubmitting: boolean, onSubmittingChange?: (value: boolean) => void) {
  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  // A step that unmounts mid-request must not leave the modal locked.
  useEffect(() => () => onSubmittingChange?.(false), [onSubmittingChange]);
}

type StepShellProps = {
  step: 1 | 2 | 3;
  titleId: string;
  title: string;
  description: ReactNode;
  onBackToLogin: () => void;
  disabled: boolean;
  children: ReactNode;
};

function ResetStepShell({ step, titleId, title, description, onBackToLogin, disabled, children }: StepShellProps) {
  return (
    <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
      <AuthModalBrand />
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-2 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[#003A8F]">
          Password reset · Step {step} of 3
        </span>
        <h2 className="m-0 font-serif text-[1.75rem] font-bold leading-tight text-[#102033]" id={titleId}>
          {title}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {children}

      <p className="mt-5 border-t border-slate-200 pt-4 text-center text-sm font-semibold leading-6 text-slate-700">
        Remember your password?{' '}
        <button
          type="button"
          className={cx(authUi.bookLink, 'border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-60')}
          onClick={onBackToLogin}
          disabled={disabled}
        >
          Back to log in
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </button>
      </p>
    </div>
  );
}

type StepProps = {
  onSubmittingChange?: (isSubmitting: boolean) => void;
  onBackToLogin: () => void;
};

export function ForgotPasswordForm({ onSubmittingChange, onBackToLogin, onCodeSent }: StepProps & { onCodeSent: () => void }) {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordErrors>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  useReportSubmitting(isSubmitting, onSubmittingChange);

  useEffect(() => {
    setEmail(getStoredResetEmail());
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await postResetRequest('/api/auth/forgot-password', { email: normalizedEmail });

    setIsSubmitting(false);

    if (!result.success) {
      setFieldErrors((result.fieldErrors as ForgotPasswordErrors | undefined) || {});
      setError(result.message || 'Unable to send a reset code.');
      return;
    }

    storeResetEmail(normalizedEmail);

    try {
      window.sessionStorage.setItem(RESET_NOTICE_STORAGE_KEY, result.message || PASSWORD_RESET_MESSAGE);
    } catch {
      // The verification step can continue without this notice.
    }

    onCodeSent();
  };

  return (
    <ResetStepShell
      step={1}
      titleId="forgot-modal-title"
      title="Forgot password"
      description="Enter your account email and we'll send you a 6-digit reset code."
      onBackToLogin={onBackToLogin}
      disabled={isSubmitting}
    >
      <form className="space-y-3.5" aria-busy={isSubmitting} onSubmit={handleSubmit} noValidate>
        <div className={authUi.formGroup}>
          <label className={authUi.label} htmlFor="forgot-modal-email">
            Email Address
          </label>
          <div className="relative">
            <i className="fas fa-envelope pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm text-[#003A8F]" aria-hidden="true" />
            <input
              id="forgot-modal-email"
              className={cx(getInputClass(Boolean(fieldErrors.email)), '!pl-11 text-sm', !fieldErrors.email && authUi.modalField)}
              type="email"
              placeholder="user@university.edu.ph"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
                setFieldErrors({});
              }}
              aria-describedby={fieldErrors.email ? 'forgot-modal-email-error' : undefined}
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
              disabled={isSubmitting}
              required
            />
          </div>
          {fieldErrors.email ? (
            <span className={authUi.fieldError} id="forgot-modal-email-error">
              {fieldErrors.email}
            </span>
          ) : null}
        </div>

        {error ? (
          <div className={getMessageClass('error')} role="alert" aria-live="polite">
            {error}
          </div>
        ) : null}

        <button type="submit" className={authUi.submitButton} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className={authUi.spinner} aria-hidden="true" />
              Sending code...
            </>
          ) : (
            'Send reset code'
          )}
        </button>
      </form>
    </ResetStepShell>
  );
}

export function VerifyResetCodeForm({
  onSubmittingChange,
  onBackToLogin,
  onVerified,
  onRequestNewCode
}: StepProps & { onVerified: () => void; onRequestNewCode: () => void }) {
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<VerifyResetCodeErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CODE_TTL_SECONDS);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const code = codeDigits.join('');
  useReportSubmitting(isSubmitting, onSubmittingChange);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = window.setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => window.clearInterval(timerId);
  }, [timeLeft]);

  useEffect(() => {
    setEmail(getStoredResetEmail());

    try {
      const notice = window.sessionStorage.getItem(RESET_NOTICE_STORAGE_KEY);

      if (notice) {
        setStatusMessage(notice);
        window.sessionStorage.removeItem(RESET_NOTICE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage issues.
    }
  }, []);

  const clearMessages = () => {
    setError('');
    setStatusMessage('');
    setFieldErrors((current) => ({ ...current, code: undefined }));
  };

  const updateCodeDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    setCodeDigits((current) => {
      const nextDigits = [...current];
      nextDigits[index] = digit;
      return nextDigits;
    });
    clearMessages();

    if (digit && index < CODE_LENGTH - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // Pasting the whole code (from the email) fills every box at once.
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);

    if (digits.length < 2) {
      return;
    }

    event.preventDefault();
    setCodeDigits(Array.from({ length: CODE_LENGTH }, (_, index) => digits[index] || ''));
    clearMessages();
    codeInputRefs.current[Math.min(digits.length, CODE_LENGTH) - 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors: VerifyResetCodeErrors = {};

    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!/^\d{6}$/.test(code)) {
      nextErrors.code = 'Enter the 6-digit reset code.';
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await postResetRequest('/api/auth/verify-reset-code', { email: normalizedEmail, code });

    setIsSubmitting(false);

    if (!result.success) {
      setFieldErrors((result.fieldErrors as VerifyResetCodeErrors | undefined) || {});
      setError(result.message || 'Unable to verify the reset code.');
      return;
    }

    storeResetEmail(normalizedEmail);
    onVerified();
  };

  return (
    <ResetStepShell
      step={2}
      titleId="verify-modal-title"
      title="Enter reset code"
      description={
        <>
          We sent a code to <strong className="font-extrabold text-[#003A8F]">{maskEmail(email) || 'your email address'}</strong>. Enter it below before it expires.
        </>
      }
      onBackToLogin={onBackToLogin}
      disabled={isSubmitting}
    >
      <form className="space-y-3.5" aria-busy={isSubmitting} onSubmit={handleSubmit} noValidate>
        {statusMessage ? (
          <div className={getMessageClass('success')} role="status" aria-live="polite">
            {statusMessage}
          </div>
        ) : null}

        <div className={authUi.formGroup}>
          <span className={authUi.label} id="verify-modal-code-label">
            Reset Code
          </span>
          <div
            className="grid grid-cols-6 gap-2 sm:gap-2.5"
            role="group"
            aria-labelledby="verify-modal-code-label"
            aria-describedby={fieldErrors.code ? 'verify-modal-code-error' : undefined}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, index) => {
              const hasValue = Boolean(codeDigits[index]);

              return (
                <input
                  key={index}
                  ref={(element) => {
                    codeInputRefs.current[index] = element;
                  }}
                  className={cx(
                    'h-12 min-w-0 rounded-xl border-2 text-center text-2xl font-black outline-none transition-all duration-200 ease-out focus:outline-none disabled:opacity-50 sm:h-14',
                    fieldErrors.code
                      ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500'
                      : hasValue
                        ? 'border-[#003A8F]/40 bg-white text-[#003A8F]'
                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-[#003A8F] focus:bg-white focus:ring-4 focus:ring-[#003A8F]/10'
                  )}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={codeDigits[index] || ''}
                  onChange={(event) => updateCodeDigit(index, event.target.value)}
                  onKeyDown={(event) => handleCodeKeyDown(index, event.key)}
                  onPaste={handlePaste}
                  aria-label={`Reset code digit ${index + 1}`}
                  aria-invalid={fieldErrors.code ? 'true' : 'false'}
                  disabled={isSubmitting}
                  required
                />
              );
            })}
          </div>
          {fieldErrors.code ? (
            <span className={authUi.fieldError} id="verify-modal-code-error">
              {fieldErrors.code}
            </span>
          ) : null}
          {fieldErrors.email ? (
            <span className={authUi.fieldError}>
              Request a new reset code before continuing.
            </span>
          ) : null}
          {timeLeft <= 0 ? (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-red-600" role="status">
              <i className="fas fa-circle-exclamation" aria-hidden="true" />
              Code has expired. Request a new one.
            </p>
          ) : null}
        </div>

        {error ? (
          <div className={getMessageClass('error')} role="alert" aria-live="polite">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="submit" className={authUi.submitButton} disabled={isSubmitting || timeLeft <= 0}>
            {isSubmitting ? (
              <>
                <span className={authUi.spinner} aria-hidden="true" />
                Verifying...
              </>
            ) : (
              'Verify code'
            )}
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:translate-y-0 disabled:hover:shadow-none sm:h-12"
            onClick={onRequestNewCode}
            disabled={isSubmitting || timeLeft > 0}
          >
            {timeLeft > 0 ? `Resend code in ${formatTime(timeLeft)}` : 'Send new code'}
          </button>
        </div>
      </form>
    </ResetStepShell>
  );
}

export function ResetPasswordForm({ onSubmittingChange, onBackToLogin, onComplete }: StepProps & { onComplete: (message: string) => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  useReportSubmitting(isSubmitting, onSubmittingChange);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const nextErrors: ResetPasswordErrors = {};

    if (!password) {
      nextErrors.password = 'Please enter a new password.';
    } else if (password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await postResetRequest('/api/auth/reset-password', { password, confirmPassword });

    setIsSubmitting(false);

    if (!result.success) {
      setFieldErrors((result.fieldErrors as ResetPasswordErrors | undefined) || {});
      setError(result.message || 'Unable to reset your password.');
      return;
    }

    try {
      window.sessionStorage.removeItem(RESET_EMAIL_STORAGE_KEY);
    } catch {
      // Ignore storage issues.
    }

    onComplete(PASSWORD_RESET_SUCCESS_MESSAGE);
  };

  const passwordField = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    visible: boolean,
    setVisible: (update: (current: boolean) => boolean) => void,
    errorKey: keyof ResetPasswordErrors,
    placeholder: string,
    help?: string
  ) => (
    <div className={authUi.formGroup}>
      <label className={authUi.label} htmlFor={id}>
        {label}
      </label>
      <div className={authUi.passwordField}>
        <i className="fas fa-lock pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm text-[#003A8F]" aria-hidden="true" />
        <input
          id={id}
          className={cx(getPasswordInputClass(Boolean(fieldErrors[errorKey])), '!pl-11 text-sm', !fieldErrors[errorKey] && authUi.modalField)}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="new-password"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
            setFieldErrors((current) => ({ ...current, [errorKey]: undefined }));
          }}
          aria-describedby={fieldErrors[errorKey] ? `${id}-error` : help ? `${id}-help` : undefined}
          aria-invalid={fieldErrors[errorKey] ? 'true' : 'false'}
          disabled={isSubmitting}
          required
        />
        <button
          type="button"
          className={cx(authUi.passwordToggle, 'right-2', authUi.modalToggle)}
          onClick={() => setVisible((current) => !current)}
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={isSubmitting}
        >
          <i className={`fa-regular ${visible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
        </button>
      </div>
      {fieldErrors[errorKey] ? (
        <span className={authUi.fieldError} id={`${id}-error`}>
          {fieldErrors[errorKey]}
        </span>
      ) : help ? (
        <span className={authUi.helperText} id={`${id}-help`}>
          {help}
        </span>
      ) : null}
    </div>
  );

  return (
    <ResetStepShell
      step={3}
      titleId="reset-modal-title"
      title="Choose a new password"
      description="Set a new password for your ThesisTrack account."
      onBackToLogin={onBackToLogin}
      disabled={isSubmitting}
    >
      <form className="space-y-3.5" aria-busy={isSubmitting} onSubmit={handleSubmit} noValidate>
        {passwordField('reset-modal-password', 'New Password', password, setPassword, showPassword, setShowPassword, 'password', 'Enter a new password', 'Use at least 8 characters.')}
        {passwordField('reset-modal-confirm-password', 'Confirm Password', confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword, 'confirmPassword', 'Confirm your new password')}

        {error ? (
          <div className={getMessageClass('error')} role="alert" aria-live="polite">
            {error}
          </div>
        ) : null}

        <button type="submit" className={authUi.submitButton} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className={authUi.spinner} aria-hidden="true" />
              Updating password...
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </ResetStepShell>
  );
}
