'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';

type UseShellSidebarOptions = {
  mobileBreakpoint: number;
};

export function useShellSidebar({
  mobileBreakpoint
}: UseShellSidebarOptions) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Default to expanded on desktop so navigation labels are clearly visible.
  // Layout properly offsets main content so it never overlaps or obscures content.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`);

    const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const nextIsMobile = event.matches;
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setSidebarOpen(false);
      }
    };

    handleMediaChange(mediaQuery);

    const listener = (event: MediaQueryListEvent) => {
      handleMediaChange(event);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [mobileBreakpoint]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarOpen((current) => !current);
      return;
    }

    setSidebarCollapsed((current) => !current);
  }, [isMobile]);

  // Closes the mobile drawer. On desktop, preserves the user's toggle state.
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Attach to the sidebar: on mobile, clicking a link closes the drawer.
  // On desktop, the sidebar stays in the user's preferred toggle state.
  const collapseOnLinkClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (isMobile && event.target instanceof Element && event.target.closest('a[href]')) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Navigating away on mobile closes the mobile drawer.
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, pathname]);

  const toggleLabel = isMobile
    ? sidebarOpen
      ? 'Close sidebar'
      : 'Open sidebar'
    : sidebarCollapsed
      ? 'Expand sidebar'
      : 'Collapse sidebar';

  const toggleIconClass = isMobile
    ? sidebarOpen
      ? 'fa-xmark'
      : 'fa-bars'
    : sidebarCollapsed
      ? 'fa-chevron-right'
      : 'fa-bars';

  return {
    closeSidebar,
    collapseOnLinkClick,
    isMobile,
    sidebarCollapsed,
    sidebarOpen,
    toggleIconClass,
    toggleLabel,
    toggleSidebar
  };
}
