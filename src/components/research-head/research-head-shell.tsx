'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { getStoredUser } from '@/lib/mock/auth';
import { PortalShellActionMenus } from '@/components/shared/portal-shell-action-menus';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import { useShellSidebar } from '@/components/shared/use-shell-sidebar';
import { requestLogout } from '@/components/auth/logout-flow';

const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', href: '/research-head/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
  { key: 'projects', href: '/research-head/projects', label: 'Project Inventory', icon: 'fa-boxes' },
  { key: 'approvals', href: '/research-head/approvals', label: 'Approvals & Monitoring', icon: 'fa-list-check' },
  { key: 'technology-transfer', href: '/research-head/technology-transfer', label: 'Technology Transfer', icon: 'fa-handshake-angle' },
  { key: 'intellectual-property', href: '/research-head/intellectual-property', label: 'Intellectual Property', icon: 'fa-copyright' },
  { key: 'reports', href: '/research-head/reports', label: 'Reports', icon: 'fa-chart-bar' },
  { key: 'final-repository-approval', href: '/research-head/final-repository-approval', label: 'Final Repository Approval', icon: 'fa-clipboard-check' },
  { key: 'repository', href: '/research-head/repository', label: 'Documents Repository', icon: 'fa-folder' },
  { key: 'announcements', href: '/research-head/announcements', label: 'Announcements', icon: 'fa-bullhorn' },
  { key: 'document-templates', href: '/research-head/document-templates', label: 'Document Templates', icon: 'fa-file-shield' }
] as const;
const ADMIN_PREFETCH_ROUTES = ADMIN_NAV_ITEMS.map((item) => item.href);

export type ResearchHeadNavKey = (typeof ADMIN_NAV_ITEMS)[number]['key'];
type ResearchHeadShellActiveNav = ResearchHeadNavKey | 'notifications' | 'settings';

type ResearchHeadShellProps = {
  activeNav: ResearchHeadShellActiveNav;
  title: string;
  description: string;
  children: ReactNode;
  notificationCount?: number;
  actions?: ReactNode;
};

export function ResearchHeadShell({
  activeNav,
  title,
  description,
  children,
  notificationCount = 4,
  actions
}: ResearchHeadShellProps) {
  
  const prefetchRoute = useRoutePrefetch(ADMIN_PREFETCH_ROUTES);
  const [displayName, setDisplayName] = useState('School Research Head');
  const [displayEmail, setDisplayEmail] = useState('research.head@university.edu.ph');
  const currentNavItem = ADMIN_NAV_ITEMS.find((item) => item.key === activeNav);
  const {
    closeSidebar,
    collapseOnLinkClick,
    sidebarCollapsed,
    sidebarOpen,
    toggleIconClass,
    toggleLabel,
    toggleSidebar
  } = useShellSidebar({
    mobileBreakpoint: 1100
  });

  // Smooth content slide when the sidebar collapses/expands (FLIP). The main area's layout
  // (margin + width) switches once per toggle, so the page and its charts re-lay out a single
  // time instead of on every animation frame; the visible slide is a GPU-composited transform
  // from where the content was on screen at click time. Starting from the on-screen position
  // (which includes any slide still running) keeps rapid repeated clicks smooth.
  const shellRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const slideFromLeftRef = useRef<number | null>(null);
  const slideAnimationRef = useRef<Animation | null>(null);
  const animatingTimeoutRef = useRef<number | null>(null);

  // Data attributes (not className, which React rewrites on every render):
  // - data-sidebar-transitions="on" is set two frames after mount, so applying the stored
  //   collapsed state on a new page never animates;
  // - data-sidebar-animating is present only while a toggle animates, so the CSS can drop the
  //   expensive glass blur for those frames.
  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (shellRef.current) {
          shellRef.current.dataset.sidebarTransitions = 'on';
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      if (animatingTimeoutRef.current !== null) {
        window.clearTimeout(animatingTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleSidebar = () => {
    if (mainRef.current) {
      slideFromLeftRef.current = mainRef.current.getBoundingClientRect().left;
    }

    const shell = shellRef.current;

    if (shell) {
      shell.dataset.sidebarAnimating = 'true';

      if (animatingTimeoutRef.current !== null) {
        window.clearTimeout(animatingTimeoutRef.current);
      }

      animatingTimeoutRef.current = window.setTimeout(() => {
        delete shell.dataset.sidebarAnimating;
        animatingTimeoutRef.current = null;
      }, 260);
    }

    toggleSidebar();
  };

  useLayoutEffect(() => {
    const main = mainRef.current;
    const fromLeft = slideFromLeftRef.current;
    slideFromLeftRef.current = null;

    if (!main || fromLeft === null) {
      return;
    }

    slideAnimationRef.current?.cancel();
    slideAnimationRef.current = null;

    const offset = fromLeft - main.getBoundingClientRect().left;

    if (Math.abs(offset) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    slideAnimationRef.current = main.animate(
      [{ transform: `translateX(${offset}px)` }, { transform: 'translateX(0)' }],
      { duration: 200, easing: 'ease' } // matches the sidebar's `width 0.2s ease`
    );
  }, [sidebarCollapsed]);

  useEffect(() => () => slideAnimationRef.current?.cancel(), []);

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser?.name) {
      setDisplayName(storedUser.name);
    }

    if (storedUser?.email) {
      setDisplayEmail(storedUser.email);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeSidebar]);

  const handleLogout = () => {
    requestLogout();
  };

  const defaultActions = (
    <PortalShellActionMenus
      notificationHref="/research-head/notifications"
      notificationCount={notificationCount}
      notificationTitle="Notifications"
      notificationCompact
      notificationItems={[
        {
          id: 'admin-approvals',
          title: 'Approval queue updated',
          message: 'New project records are waiting for review and release.',
          href: '/research-head/notifications',
          icon: 'fa-circle-check',
          meta: 'Notifications Center',
          tone: 'warning',
          actionLabel: 'Review queue'
        },
        {
          id: 'admin-repository',
          title: 'Repository release completed',
          message: 'A document batch is now available in the institutional repository.',
          href: '/research-head/repository',
          icon: 'fa-folder-open',
          meta: 'Documents Repository',
          tone: 'success',
          actionLabel: 'Open repository',
          unread: false
        }
      ]}
      profileName={displayName}
      profileSubtitle="Research Head"
      profileDetail={displayEmail}
      profileBadges={[
        { label: 'Research Oversight', icon: 'fa-building-columns', tone: 'primary' },
        { label: 'Research Head Office', icon: 'fa-id-badge' }
      ]}
      profileActions={[
        { label: 'Sign Out', icon: 'fa-right-from-bracket', danger: true, onClick: handleLogout }
      ]}
    />
  );

  const [themeMode, setThemeMode] = useState('light');
  
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-student-theme') || 'light';
    setThemeMode(currentTheme);
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-student-theme') {
          setThemeMode(document.documentElement.getAttribute('data-student-theme') || 'light');
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-student-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={shellRef}
      className={`student-shell research-head-shell${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${sidebarOpen ? ' is-sidebar-open' : ''}`} data-theme={themeMode}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
    >
            {/* Decorative Light Background for Glassmorphism */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#0F3DDE]/[0.03] via-[#0F3DDE]/[0.01] to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0F3DDE]/[0.05] to-indigo-500/[0.03] blur-[80px]"></div>
        <div className="absolute top-[20%] -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/[0.03] to-[#0F3DDE]/[0.03] blur-[80px]"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
      </div>
      <header className="student-global-navbar">
        <div className="student-global-navbar-main">
          <button
            aria-label={toggleLabel}
            className="icon-btn student-shell-toggle"
            type="button"
            onClick={handleToggleSidebar}
          >
            <i aria-hidden="true" className={`fas ${toggleIconClass}`} />
          </button>
          <div className="student-navbar-title" aria-label="Current page">
            <span className="student-navbar-title-kicker">ThesisTrack</span>
            <strong>{currentNavItem?.label ?? title}</strong>
          </div>
        </div>
        <div className="student-global-navbar-actions">
          {actions ?? defaultActions}
        </div>
      </header>

      <aside className={`student-global-sidebar sidebar${sidebarOpen ? ' is-open' : ''}`} onClick={collapseOnLinkClick}>
        <div className="sidebar-header">
          <div className="sidebar-header-copy">
            <span className="sidebar-context-kicker">Research Head</span>
            <div className="brand-mark system-brand-mark" aria-label="ThesisTrack">
              <img
                alt="ThesisTrack logo"
                className="system-brand-logo"
                src="/System%20Logo/logo-transparent.png"
              />
              <span className="system-brand-name">
                <span>Thesis</span>
                <strong>Track</strong>
              </span>
              <span className="system-brand-subtitle">Higher Education Institutions</span>
            </div>
          </div>
          <span className="user-badge">
            <i aria-hidden="true" className="fas fa-building-columns" />
            <span>Research Head Office</span>
          </span>
        </div>

        <nav className="student-role-sidebar-nav" aria-label="Admin workspace navigation">
          <div className="sidebar-nav-group">
            <span className="sidebar-nav-heading">Research Management</span>
            <div className="sidebar-nav-links">
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  aria-current={item.key === activeNav ? 'page' : undefined}
                  className={`sidebar-link ${item.key === activeNav ? 'is-active' : ''}`}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={closeSidebar}
                  onFocus={() => prefetchRoute(item.href)}
                  onMouseEnter={() => prefetchRoute(item.href)}
                >
                  <span className="sidebar-link-icon">
                    <i aria-hidden="true" className={`fas ${item.icon}`} />
                  </span>
                  <span className="sidebar-link-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <button
        aria-label="Close sidebar"
        className={`student-global-backdrop sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={closeSidebar}
      />

      <main ref={mainRef} className="student-global-main relative z-10">

        <div className="student-global-content relative z-10">

          <div className="page-body">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}





