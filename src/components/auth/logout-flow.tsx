'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogoIcon } from '@/components/branding/logo-icon';
import { logout } from '@/lib/mock/auth';
import { resetAuthVerificationCache } from './protected-route';

const REQUEST_EVENT = 'thesistrack:request-logout';
const MIN_SIGNING_OUT_MS = 700;
const TOAST_MS = 3200;

/** Ask the app-wide LogoutFlow to confirm, sign out, and return to the landing page. */
export function requestLogout() {
  window.dispatchEvent(new Event(REQUEST_EVENT));
}

type Phase = 'idle' | 'confirm' | 'signing-out' | 'leaving';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Mounted once in the root layout, so the transition overlay survives the route change:
 * confirm -> "Signing you out..." -> full-screen fade -> landing page -> fade lifts -> toast.
 */
export function LogoutFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const close = useCallback(() => {
    if (phaseRef.current !== 'confirm') {
      return;
    }

    setVisible(false);
    window.setTimeout(() => {
      setPhase('idle');
      openerRef.current?.focus?.();
    }, 180);
  }, []);

  // Portal only after mount, so the server HTML and the first client render match.
  useEffect(() => setMounted(true), []);

  // Open on request (ignored while a sign-out is already running).
  useEffect(() => {
    const handleRequest = () => {
      if (phaseRef.current !== 'idle') {
        return;
      }

      openerRef.current = document.activeElement as HTMLElement | null;
      setShowToast(false);
      setPhase('confirm');
      window.requestAnimationFrame(() => {
        setVisible(true);
        cancelRef.current?.focus();
      });
    };

    window.addEventListener(REQUEST_EVENT, handleRequest);
    return () => window.removeEventListener(REQUEST_EVENT, handleRequest);
  }, []);

  // Keyboard: Escape cancels, Tab stays inside the dialog.
  useEffect(() => {
    if (phase !== 'confirm' && phase !== 'signing-out') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [phase, close]);

  const confirmLogout = async () => {
    if (phaseRef.current !== 'confirm') {
      return;
    }

    setPhase('signing-out');
    // Clears local session data and the server session; keep the spinner up briefly so it reads as a step.
    await Promise.all([logout(), wait(MIN_SIGNING_OUT_MS)]);
    // Drop the guard's "recently verified" cache so Back can't reopen a dashboard for the next 60s.
    resetAuthVerificationCache();
    setPhase('leaving');
    window.requestAnimationFrame(() => setOverlayVisible(true));
    await wait(320);
    router.push('/');
  };

  // Once the landing page is showing, lift the overlay and confirm with a toast.
  useEffect(() => {
    if (phase !== 'leaving' || pathname !== '/') {
      return;
    }

    const lift = window.setTimeout(() => {
      setOverlayVisible(false);
      setVisible(false);
      window.setTimeout(() => {
        setPhase('idle');
        setShowToast(true);
      }, 320);
    }, 250);

    return () => window.clearTimeout(lift);
  }, [phase, pathname]);

  useEffect(() => {
    if (!showToast) {
      return;
    }

    const timer = window.setTimeout(() => setShowToast(false), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  if (!mounted) {
    return null;
  }

  const isSigningOut = phase === 'signing-out';

  return createPortal(
    <>
      {phase === 'confirm' || phase === 'signing-out' ? (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <div
            ref={dialogRef}
            className={`w-full max-w-[380px] rounded-[20px] bg-white p-6 text-center shadow-[0_30px_80px_rgba(15,23,42,0.28)] transition-all duration-200 ease-out motion-reduce:transition-none ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.96] opacity-0'}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-text"
            aria-busy={isSigningOut}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF1FB] text-xl text-[#003A8F]">
              {isSigningOut ? (
                <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#003A8F]/20 border-t-[#003A8F] motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <i className="fas fa-right-from-bracket" aria-hidden="true" />
              )}
            </div>
            <h2 className="m-0 font-serif text-[1.35rem] font-bold text-[#102033]" id="logout-title">
              {isSigningOut ? 'Signing you out…' : 'Sign out of ThesisTrack?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600" id="logout-text" aria-live="polite">
              {isSigningOut
                ? 'Ending your session securely.'
                : 'You’ll return to the home page and need to sign in again to reach your dashboard.'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                ref={cancelRef}
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003A8F]/40 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={close}
                disabled={isSigningOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#003A8F] bg-[#003A8F] px-4 text-sm font-bold text-white transition hover:bg-[#002F75] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#003A8F]/20 disabled:cursor-not-allowed disabled:opacity-80"
                onClick={confirmLogout}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === 'leaving' ? (
        <div
          className={`fixed inset-0 z-[210] flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#F4F8FE] via-white to-[#EAF1FB] transition-opacity duration-300 motion-reduce:transition-none ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(15,43,89,0.12)] motion-reduce:animate-none">
            <LogoIcon style={{ width: 'auto' }} className="h-10" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Taking you home…</p>
        </div>
      ) : null}

      <div
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-[190] flex justify-center px-4 transition-all duration-300 motion-reduce:transition-none ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
        role="status"
        aria-live="polite"
      >
        {showToast ? (
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
            <i className="fas fa-circle-check text-emerald-500" aria-hidden="true" />
            You’ve been signed out.
          </div>
        ) : null}
      </div>
    </>,
    document.body
  );
}
