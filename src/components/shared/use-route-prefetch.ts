'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

function isPrefetchableRoute(href: string) {
  const route = href.trim();
  return route.startsWith('/') && !route.startsWith('//') && !route.startsWith('/api/') && !route.includes('#');
}

export function useRoutePrefetch(_routes: readonly string[]) {
  const router = useRouter();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const pendingRoutesRef = useRef<Set<string>>(new Set());

  const prefetchRoute = useCallback(
    (href: string) => {
      if (!isPrefetchableRoute(href)) {
        return;
      }

      const route = href.trim();
      if (prefetchedRoutesRef.current.has(route) || pendingRoutesRef.current.has(route)) {
        return;
      }

      const runPrefetch = () => {
        pendingRoutesRef.current.delete(route);
        prefetchedRoutesRef.current.add(route);

        try {
          router.prefetch(route);
        } catch {
          prefetchedRoutesRef.current.delete(route);
        }
      };

      pendingRoutesRef.current.add(route);

      if (typeof window === 'undefined') {
        runPrefetch();
        return;
      }

      const requestIdleCallback = window.requestIdleCallback?.bind(window);
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(runPrefetch, { timeout: 700 });
        return;
      }

      globalThis.setTimeout(runPrefetch, 120);
    },
    [router]
  );

  return prefetchRoute;
}
