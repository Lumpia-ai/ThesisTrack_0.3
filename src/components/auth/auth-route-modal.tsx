'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthModal, type AuthView } from './auth-modal';

/**
 * The auth URLs (/login, /register, /forgot-password, /verify-reset-code, /reset-password) render
 * the landing page with this modal already open on the matching view. Redirects that land on those
 * URLs (expired session, suspension, Google sign-in, password reset) keep working, and closing the
 * modal leaves the visitor on the landing page at "/".
 */
export function AuthRouteModal({ initialView }: { initialView: AuthView }) {
  const router = useRouter();
  const [view, setView] = useState<AuthView | null>(initialView);
  // Open after mount so the server HTML (no modal) and the first client render match.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <AuthModal
      view={view}
      onViewChange={setView}
      onClose={() => {
        setView(null);
        router.replace('/');
      }}
    />
  );
}
