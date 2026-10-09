'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoginForm } from './login-form';
import { ForgotPasswordForm, ResetPasswordForm, VerifyResetCodeForm } from './password-reset-forms';
import { RegisterForm } from './register-form';

export { getAuthViewForHref, shouldOpenAuthModal } from './auth-ui';

export type AuthView = 'login' | 'register' | 'forgot' | 'verify' | 'reset';

const TITLE_IDS: Record<AuthView, string> = {
  login: 'login-modal-title',
  register: 'register-modal-title',
  forgot: 'forgot-modal-title',
  verify: 'verify-modal-title',
  reset: 'reset-modal-title'
};

const CLOSE_LABELS: Record<AuthView, string> = {
  login: 'Close sign in dialog',
  register: 'Close registration dialog',
  forgot: 'Close password reset dialog',
  verify: 'Close password reset dialog',
  reset: 'Close password reset dialog'
};

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement) {
  // Skip controls inside the hidden view (display: none has no client rects).
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.getClientRects().length > 0
  );
}

type AuthModalProps = {
  /** Which view is showing; null means the modal is closed. */
  view: AuthView | null;
  onViewChange: (view: AuthView) => void;
  onClose: () => void;
};

export function AuthModal({ view, onViewChange, onClose }: AuthModalProps) {
  const open = view !== null;
  const [isVisible, setIsVisible] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  // Shown above the login form after a password reset completes inside the modal.
  const [loginNotice, setLoginNotice] = useState<{ text: string; id: number } | undefined>(undefined);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  // The register form mounts the first time it's shown and then stays mounted (hidden) while the
  // modal is open, so switching to login and back keeps whatever the user typed.
  const [registerMounted, setRegisterMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const registerDirtyRef = useRef(false);
  const isConfirmingRef = useRef(false);
  const focusBeforePromptRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isSubmitting = loginSubmitting || registerSubmitting || resetSubmitting;
  isSubmittingRef.current = isSubmitting;
  isConfirmingRef.current = isConfirmingDiscard;

  if (view === 'register' && !registerMounted) {
    setRegisterMounted(true);
  }

  const handleRegisterDirtyChange = useCallback((dirty: boolean) => {
    registerDirtyRef.current = dirty;
  }, []);

  const requestClose = useCallback(() => {
    // Never close mid-request: the request is in flight and a redirect follows on success.
    if (isSubmittingRef.current) {
      return;
    }

    if (registerDirtyRef.current) {
      focusBeforePromptRef.current = document.activeElement as HTMLElement | null;
      setIsConfirmingDiscard(true);
      return;
    }

    onCloseRef.current();
  }, []);

  const cancelDiscard = useCallback(() => {
    setIsConfirmingDiscard(false);
  }, []);

  // Open/close lifecycle: scroll lock, Escape, focus trap, focus restore.
  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => setIsVisible(true));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        if (isConfirmingRef.current) {
          setIsConfirmingDiscard(false);
        } else {
          requestClose();
        }
        return;
      }

      // While the discard prompt is up, trap focus inside it; otherwise inside the dialog.
      const container = isConfirmingRef.current ? confirmRef.current : dialogRef.current;

      if (event.key !== 'Tab' || !container) {
        return;
      }

      const focusable = getFocusable(container);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      setIsVisible(false);
      setIsConfirmingDiscard(false);
      setRegisterMounted(false);
      setLoginNotice(undefined);
      registerDirtyRef.current = false;
      previouslyFocused?.focus?.();
    };
  }, [open, requestClose]);

  // On open and on every view switch: scroll to the top and focus the view's first field.
  useEffect(() => {
    if (!view) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      dialog.scrollTop = 0;
      const panel = dialog.querySelector<HTMLElement>(`[data-auth-view="${view}"]`);
      // Skip fields inside hidden registration steps.
      const firstField = Array.from(
        panel?.querySelectorAll<HTMLElement>('input:not([disabled]):not([readonly]), select:not([disabled])') ?? []
      ).find((element) => element.getClientRects().length > 0);
      (firstField ?? dialog).focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  // Move focus into the discard prompt when it appears, and back to where it was when it goes away.
  useEffect(() => {
    if (!open) {
      return;
    }

    if (isConfirmingDiscard) {
      confirmRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      return;
    }

    const dialog = dialogRef.current;
    const previous = focusBeforePromptRef.current;
    focusBeforePromptRef.current = null;

    if (dialog && !dialog.contains(document.activeElement)) {
      (previous && dialog.contains(previous) ? previous : dialog).focus();
    }
  }, [isConfirmingDiscard, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const isRegister = view === 'register';
  const goToLogin = () => onViewChange('login');

  return createPortal(
    <div
      // Register is top-anchored: its height changes while typing (hints, errors, the strength meter), and a
      // centred dialog would shift up and down by half of every change.
      className={`fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none sm:p-6 ${isRegister ? 'sm:items-start sm:pt-[6dvh]' : 'sm:items-center'} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={[
          'relative w-full overflow-y-auto overscroll-contain bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] outline-none transition-[transform,max-width] duration-200 ease-out motion-reduce:transition-none sm:rounded-[20px]',
          // Login: bottom sheet on phones. Register: full-screen sheet on phones (the form is long).
          isRegister ? 'h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(94dvh-1.5rem)] sm:max-w-[640px]' : 'max-h-[92dvh] rounded-t-[20px] sm:max-h-[calc(100dvh-3rem)] sm:max-w-[440px]',
          isVisible ? 'translate-y-0 sm:scale-100' : 'translate-y-4 sm:translate-y-0 sm:scale-[0.97]'
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_IDS[view]}
        aria-busy={isSubmitting}
        tabIndex={-1}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003A8F]/40 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={requestClose}
          disabled={isSubmitting}
          aria-label={CLOSE_LABELS[view]}
        >
          <i className="fas fa-xmark text-lg" aria-hidden="true" />
        </button>

        <div data-auth-view="login" hidden={view !== 'login'}>
          <LoginForm
            onSubmittingChange={setLoginSubmitting}
            onSwitchToRegister={() => onViewChange('register')}
            onSwitchToForgotPassword={() => onViewChange('forgot')}
            notice={loginNotice}
          />
        </div>

        {registerMounted ? (
          <div data-auth-view="register" hidden={view !== 'register'}>
            <RegisterForm
              onSubmittingChange={setRegisterSubmitting}
              onDirtyChange={handleRegisterDirtyChange}
              onSwitchToLogin={goToLogin}
            />
          </div>
        ) : null}

        {/* Password reset steps: only the active step is mounted (each reads its state from sessionStorage). */}
        {view === 'forgot' ? (
          <div data-auth-view="forgot">
            <ForgotPasswordForm onSubmittingChange={setResetSubmitting} onBackToLogin={goToLogin} onCodeSent={() => onViewChange('verify')} />
          </div>
        ) : null}

        {view === 'verify' ? (
          <div data-auth-view="verify">
            <VerifyResetCodeForm
              onSubmittingChange={setResetSubmitting}
              onBackToLogin={goToLogin}
              onVerified={() => onViewChange('reset')}
              onRequestNewCode={() => onViewChange('forgot')}
            />
          </div>
        ) : null}

        {view === 'reset' ? (
          <div data-auth-view="reset">
            <ResetPasswordForm
              onSubmittingChange={setResetSubmitting}
              onBackToLogin={goToLogin}
              onComplete={(message) => {
                setLoginNotice({ text: message, id: Date.now() });
                onViewChange('login');
              }}
            />
          </div>
        ) : null}

      </div>

      {isConfirmingDiscard ? (
        // Sibling of the dialog (not inside it): the dialog scrolls and is transformed, which would
        // break fixed positioning. Clicking this layer dismisses the prompt, never the modal.
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/30 p-4 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelDiscard();
            }
          }}
        >
          <div
            ref={confirmRef}
            className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.22)]"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="auth-discard-title"
            aria-describedby="auth-discard-text"
          >
            <h3 className="m-0 text-base font-extrabold text-[#102033]" id="auth-discard-title">
              Discard your registration?
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-600" id="auth-discard-text">
              The details you entered will be lost if you close this window.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300"
                onClick={() => onCloseRef.current()}
              >
                Discard and close
              </button>
              <button
                type="button"
                data-autofocus
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#003A8F] bg-[#003A8F] px-4 text-sm font-bold text-white transition hover:bg-[#002F75] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20"
                onClick={cancelDiscard}
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
