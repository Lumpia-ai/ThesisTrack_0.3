'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type SessionStatusResponse = {
  success?: boolean;
  authenticated?: boolean;
  suspended?: boolean;
  suspendedAt?: string | null;
  suspendedUntil?: string | null;
};

const AUTH_STORAGE_KEYS = [
  'capstoneAuthUser',
  'capstonePortalSession',
  'capstoneStudentProfileDraft'
];

function canPollApi() {
  return (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
    window.navigator.onLine
  );
}

function isExpectedPollError(error: unknown) {
  return (
    error instanceof DOMException && error.name === 'AbortError'
  ) || (
    error instanceof TypeError && (!canPollApi() || error.message === 'Failed to fetch')
  );
}

function hasStoredSession() {
  if (typeof window === 'undefined') {
    return false;
  }

  return AUTH_STORAGE_KEYS.some((key) => Boolean(window.localStorage.getItem(key) || window.sessionStorage.getItem(key)));
}

function clearClientSession() {
  AUTH_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
  document.cookie = 'capstoneMockAuthUser=; path=/; max-age=0; samesite=lax';
}

function getRemainingSeconds(value?: string | null) {
  if (!value) {
    return null;
  }

  const expiresAt = new Date(value).getTime();

  if (Number.isNaN(expiresAt)) {
    return null;
  }

  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

function formatRemainingTime(seconds: number | null) {
  if (seconds === null) {
    return 'until an administrator restores access';
  }

  if (seconds <= 0) {
    return 'a few seconds';
  }

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function SessionSuspensionWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/forgot-password');

  useEffect(() => {
    if (isAuthPage || !hasStoredSession()) {
      return;
    }

    let cancelled = false;
    let inFlight = false;
    let inFlightController: AbortController | null = null;

    const checkSessionStatus = async () => {
      if (cancelled || inFlight || !canPollApi()) {
        return;
      }

      inFlight = true;
      const controller = new AbortController();
      inFlightController = controller;

      try {
        const response = await fetch('/api/auth/session-status', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as SessionStatusResponse | null;

        if (!cancelled && payload?.suspended) {
          setSuspendedUntil(payload.suspendedUntil || null);
          setRemainingSeconds(getRemainingSeconds(payload.suspendedUntil));
          setModalOpen(true);
        }
      } catch (error) {
        if (!isExpectedPollError(error)) {
          console.warn('Failed to check session status during polling', error);
        }
      } finally {
        inFlight = false;
        if (inFlightController === controller) {
          inFlightController = null;
        }
      }
    };

    void checkSessionStatus().catch((error) => {
      if (!isExpectedPollError(error)) {
        console.warn('Failed to check session status during polling', error);
      }
    });

    return () => {
      cancelled = true;
      inFlightController?.abort();
    };
  }, [isAuthPage]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(suspendedUntil));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [modalOpen, suspendedUntil]);

  const durationLabel = useMemo(() => formatRemainingTime(remainingSeconds), [remainingSeconds]);

  const handleConfirm = async () => {
    clearClientSession();

    try {
      await fetch('/api/auth/session-status', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true
      });
    } finally {
      router.push('/login?suspended=1');
      router.refresh();
    }
  };

  if (!modalOpen || isAuthPage) {
    return null;
  }

  return (
    <div className="session-suspension-overlay" role="presentation">
      <section
        aria-labelledby="session-suspension-title"
        aria-modal="true"
        className="session-suspension-modal"
        role="dialog"
      >
        <span className="session-suspension-icon" aria-hidden="true">
          <i className="fas fa-user-lock"></i>
        </span>
        <div>
          <span className="session-suspension-kicker">Account access restricted</span>
          <h2 id="session-suspension-title">This account has been suspended.</h2>
          <p>
            Your current session has been paused by an administrator. Access will remain restricted for approximately{' '}
            <strong>{durationLabel}</strong>.
          </p>
        </div>
        <div className="session-suspension-countdown" aria-live="polite">
          <span>Remaining time</span>
          <strong>{durationLabel}</strong>
        </div>
        <button className="session-suspension-button" type="button" onClick={handleConfirm}>
          Got it
        </button>
      </section>
    </div>
  );
}
