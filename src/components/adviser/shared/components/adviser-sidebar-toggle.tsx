'use client';

import { useEffect, useState } from 'react';

const ADVISER_SIDEBAR_STORAGE_KEY = 'adviserSidebarCollapsed';

export function AdviserSidebarToggle() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedValue = window.localStorage.getItem(ADVISER_SIDEBAR_STORAGE_KEY);
    if (storedValue === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');

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
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ADVISER_SIDEBAR_STORAGE_KEY, sidebarCollapsed ? 'true' : 'false');
  }, [sidebarCollapsed]);

  useEffect(() => {
    document.body.classList.toggle('adviser-sidebar-collapsed', !isMobile && sidebarCollapsed);
    document.body.classList.toggle('adviser-sidebar-open', isMobile && sidebarOpen);

    return () => {
      document.body.classList.remove('adviser-sidebar-open');
    };
  }, [isMobile, sidebarCollapsed, sidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen((current) => !current);
      return;
    }

    setSidebarCollapsed((current) => !current);
  };

  const toggleLabel = isMobile
    ? sidebarOpen
      ? 'Close sidebar'
      : 'Open sidebar'
    : sidebarCollapsed
      ? 'Expand sidebar'
      : 'Collapse sidebar';

  return (
    <button aria-label={toggleLabel} className="adviser-shell-toggle" type="button" onClick={toggleSidebar}>
      <i
        aria-hidden="true"
        className={`fas ${isMobile ? (sidebarOpen ? 'fa-xmark' : 'fa-bars') : sidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`}
      />
    </button>
  );
}
