'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, logout, type UserRole } from '@/lib/mock/auth';
import { getRoleRedirectPath } from '@/lib/client-auth';

type ProtectedRouteProps = Readonly<{
  allowedRole: UserRole | UserRole[];
  children: React.ReactNode;
}>;

type AuthMeResponse = {
  success?: boolean;
  code?: string;
  redirectTo?: string;
  user?: {
    role?: UserRole;
  };
};

const ACCOUNT_NOT_ACTIVE_CODE = 'ACCOUNT_NOT_ACTIVE';
const ACCOUNT_STATUS_PATH = '/account/status';

const AUTH_CHECK_TTL_MS = 60_000;

// Cache is keyed by the role the SERVER last confirmed — never by the
// client-only `getStoredUser()` value. That local value lives in
// localStorage, which is shared across every tab of the browser, so logging
// into a different account in one tab silently changes what it returns in
// every other open tab. Trusting it for the access decision (as this used
// to) meant two tabs on different role dashboards could each decide the
// OTHER one is now "wrong" and bounce back and forth between routes.
let lastVerifiedRole: { role: UserRole; checkedAt: number } | null = null;

/** Forget the last server-confirmed role (call on logout, or Back could reopen a dashboard within the TTL). */
export function resetAuthVerificationCache() {
  lastVerifiedRole = null;
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const router = useRouter();
  const allowedRoleKey = Array.isArray(allowedRole) ? allowedRole.join('|') : allowedRole;
  const allowedRoles = useMemo(
    () => allowedRoleKey.split('|') as UserRole[],
    [allowedRoleKey]
  );
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      // Fast path: a role was confirmed against the real server session
      // recently. Still never trusts getStoredUser() for the decision.
      if (lastVerifiedRole && Date.now() - lastVerifiedRole.checkedAt < AUTH_CHECK_TTL_MS) {
        if (allowedRoles.includes(lastVerifiedRole.role)) {
          if (!cancelled) setIsAuthorized(true);
          return;
        }

        if (!cancelled) {
          setIsAuthorized(false);
          router.replace(getRoleRedirectPath(lastVerifiedRole.role));
        }
        return;
      }

      // No local session hint at all — skip the network round trip and go
      // straight to login. This never GRANTS access off local data, so it
      // can't cause the cross-tab bounce described above.
      if (!getStoredUser()) {
        lastVerifiedRole = null;
        logout();

        if (!cancelled) {
          setIsAuthorized(false);
          router.replace('/login');
        }
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-store',
          credentials: 'same-origin'
        });
        const payload = response.headers.get('content-type')?.includes('application/json')
          ? ((await response.json()) as AuthMeResponse)
          : null;

        // Signed in, but pending, rejected or without a usable role: only the status page is available.
        if (response.status === 403 && payload?.code === ACCOUNT_NOT_ACTIVE_CODE) {
          lastVerifiedRole = null;

          if (!cancelled) {
            setIsAuthorized(false);
            router.replace(ACCOUNT_STATUS_PATH);
          }
          return;
        }

        if (!response.ok || !payload?.success || !payload.user?.role) {
          lastVerifiedRole = null;
          logout();

          if (!cancelled) {
            setIsAuthorized(false);
            router.replace('/login');
          }
          return;
        }

        const verifiedRole = payload.user.role;
        lastVerifiedRole = { role: verifiedRole, checkedAt: Date.now() };

        if (!allowedRoles.includes(verifiedRole)) {
          if (!cancelled) {
            setIsAuthorized(false);
            router.replace(getRoleRedirectPath(verifiedRole));
          }
          return;
        }

        if (!cancelled) {
          setIsAuthorized(true);
        }
      } catch {
        lastVerifiedRole = null;
        logout();

        if (!cancelled) {
          setIsAuthorized(false);
          router.replace('/login');
        }
      }
    }

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [allowedRoleKey, allowedRoles, router]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
