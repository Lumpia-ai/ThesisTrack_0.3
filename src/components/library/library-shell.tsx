'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { getStoredUser } from '@/lib/mock/auth';
import {
  LIBRARY_NAV_ITEMS,
  type LibraryNavKey
} from '@/components/library/library-data';
import { PortalShellActionMenus } from '@/components/shared/portal-shell-action-menus';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import { useShellSidebar } from '@/components/shared/use-shell-sidebar';
import { requestLogout } from '@/components/auth/logout-flow';

const LIBRARY_PREFETCH_ROUTES = LIBRARY_NAV_ITEMS.map((item) => item.href);

type LibraryShellProps = {
  activeNav: LibraryNavKey | 'notifications';
  title: string;
  description: string;
  notificationCount?: number;
  hideHeader?: boolean;
  children: ReactNode;
};

export function LibraryShell({
  activeNav,
  title,
  description,
  notificationCount = 2,
  hideHeader = true,
  children
}: LibraryShellProps) {
  
  const prefetchRoute = useRoutePrefetch(LIBRARY_PREFETCH_ROUTES);
  const [displayName, setDisplayName] = useState('Sarah Rivera');
  const [displayEmail, setDisplayEmail] = useState('library@university.edu.ph');
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
      className={`student-shell${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${sidebarOpen ? ' is-sidebar-open' : ''}`} data-theme={themeMode}
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
            onClick={toggleSidebar}
          >
            <i className={`fas ${toggleIconClass}`} aria-hidden="true" />
          </button>

          <div className="student-navbar-title" aria-label="Current page">
            <span className="student-navbar-title-kicker">ThesisTrack</span>
            <strong>{title}</strong>
          </div>
        </div>

        <div className="student-global-navbar-actions">
            <PortalShellActionMenus
              notificationHref="/library/notifications"
              notificationCount={notificationCount}
              notificationTitle="Library Notifications"
              notificationDescription="Repository updates and archive activity for the digital library workspace."
              notificationItems={[
                {
                  id: 'library-repository',
                  title: 'Repository update posted',
                  message: 'A new repository release is ready for catalog review.',
                  href: '/library/repository',
                  icon: 'fa-book-open',
                  meta: 'Repository',
                  tone: 'info',
                  actionLabel: 'Open repository'
                },
                {
                  id: 'library-saved',
                  title: 'Saved collection changed',
                  message: 'A saved research collection has new matching entries.',
                  href: '/library/saved',
                  icon: 'fa-bookmark',
                  meta: 'Saved Collections',
                  tone: 'warning',
                  actionLabel: 'Open saved'
                },
                {
                  id: 'library-profile',
                  title: 'Profile updated',
                  message: 'Your library access details were refreshed in the system.',
                  href: '/library/profile',
                  icon: 'fa-user',
                  meta: 'Profile',
                  tone: 'success',
                  actionLabel: 'Review profile',
                  unread: false
                }
              ]}
              profileName={displayName}
              profileSubtitle="E-Library Access"
              profileDetail={displayEmail}
              profileBadges={[
                { label: 'Library Workspace', icon: 'fa-book-open', tone: 'primary' },
                { label: 'Digital Archive', icon: 'fa-folder-open' }
              ]}
              profileActions={[
                {
                  label: 'Sign Out',
                  icon: 'fa-right-from-bracket',
                  danger: true,
                  onClick: requestLogout
                }
              ]}
            />
        </div>
      </header>

      <aside className={`student-global-sidebar sidebar${sidebarOpen ? ' is-open' : ''}`} onClick={collapseOnLinkClick}>
        <div className="sidebar-header">
          <div className="sidebar-header-copy">
            <span className="sidebar-context-kicker">Repository</span>
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
            <i className="fas fa-book-open" aria-hidden="true" />
            <span>E-Library Access</span>
          </span>
        </div>

        <nav className="student-role-sidebar-nav" aria-label="Library navigation">
          <div className="sidebar-nav-group">
            <span className="sidebar-nav-heading">Digital Library</span>
            <div className="sidebar-nav-links">
              {LIBRARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  aria-current={item.key === activeNav ? 'page' : undefined}
                  className={`sidebar-link ${item.key === activeNav ? 'is-active' : ''}`}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  onFocus={() => prefetchRoute(item.href)}
                  onMouseEnter={() => prefetchRoute(item.href)}
                >
                  <span className="sidebar-link-icon">
                    <i className={`fas ${item.icon}`} aria-hidden="true" />
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

      <main className="student-global-main relative z-10">

        <div className="student-global-content relative z-10">
          {!hideHeader && (
            <header className="top-nav" aria-labelledby="library-page-title">
              <div className="top-nav-leading">
                <div className="page-title">
                  <div className="page-title-context">
                    <span className="page-kicker">E-Library</span>
                    <span className="page-breadcrumb" aria-hidden="true">
                      <i className="fas fa-angle-right" />
                      <span>{title}</span>
                    </span>
                  </div>
                  <h1 id="library-page-title">{title}</h1>
                  <p>{description}</p>
                </div>
              </div>
            </header>
          )}

          <div className="page-body">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}





