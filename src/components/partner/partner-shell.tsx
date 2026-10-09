'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { getStoredUser } from '@/lib/mock/auth';
import { PARTNER_NAV_ITEMS, type PartnerNavKey } from '@/components/partner/partner-data';
import { PortalShellActionMenus } from '@/components/shared/portal-shell-action-menus';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import { useShellSidebar } from '@/components/shared/use-shell-sidebar';
import { requestLogout } from '@/components/auth/logout-flow';

const PARTNER_PREFETCH_ROUTES = PARTNER_NAV_ITEMS.map((item) => item.href);

export function PartnerShell({
  activeNav,
  title,
  description,
  badgeLabel = 'TechCorp Inc.',
  notificationCount = 3,
  children
}: {
  activeNav: PartnerNavKey;
  title: string;
  description: string;
  badgeLabel?: string;
  notificationCount?: number;
  children: ReactNode;
}) {
  
  const prefetchRoute = useRoutePrefetch(PARTNER_PREFETCH_ROUTES);
  const [displayName, setDisplayName] = useState('TechCorp Partner Liaison');
  const [displayEmail, setDisplayEmail] = useState('partner@techcorp.inc');
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
            <i aria-hidden="true" className={`fas ${toggleIconClass}`} />
          </button>

          <div className="student-navbar-title" aria-label="Current page">
            <span className="student-navbar-title-kicker">ThesisTrack</span>
            <strong>{title}</strong>
          </div>
        </div>

        <div className="student-global-navbar-actions">
              <PortalShellActionMenus
                notificationHref="/partner/notifications"
                notificationCount={notificationCount}
                notificationTitle="Partner Notifications"
                notificationDescription="Updates on collaboration requests, implementation follow-ups, and review feedback."
                notificationItems={[
                  {
                    id: 'partner-request',
                    title: 'Collaboration request advanced',
                    message: 'A submitted collaboration request moved to the next review stage.',
                    href: '/partner/requests',
                    icon: 'fa-list-check',
                    meta: 'My Requests',
                    tone: 'warning',
                    actionLabel: 'Open requests'
                  },
                  {
                    id: 'partner-project',
                    title: 'Project details updated',
                    message: 'A project implementation note was posted for partner review.',
                    href: '/partner/project',
                    icon: 'fa-diagram-project',
                    meta: 'Project Workspace',
                    tone: 'info',
                    actionLabel: 'View details'
                  },
                  {
                    id: 'partner-feedback',
                    title: 'Feedback archived',
                    message: 'One feedback thread was marked complete and stored for reference.',
                    href: '/partner/feedback',
                    icon: 'fa-comments',
                    meta: 'Feedback',
                    tone: 'success',
                    actionLabel: 'Open feedback',
                    unread: false
                  }
                ]}
                profileName={displayName}
                profileSubtitle={badgeLabel}
                profileDetail={displayEmail}
                profileBadges={[
                  { label: 'Partner Workspace', icon: 'fa-handshake', tone: 'primary' },
                  { label: badgeLabel, icon: 'fa-building' }
                ]}
                profileActions={[
                  { label: 'My Requests', icon: 'fa-list', href: '/partner/requests' },
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
            <span className="sidebar-context-kicker">Partner Desk</span>
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
            <i aria-hidden="true" className="fas fa-building" />
            <span>{badgeLabel}</span>
          </span>
        </div>

        <nav className="student-role-sidebar-nav" aria-label="Partner navigation">
          <div className="sidebar-nav-group">
            <span className="sidebar-nav-heading">Industry Partner</span>
            <div className="sidebar-nav-links">
              {PARTNER_NAV_ITEMS.map((item) => (
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

      <main className="student-global-main relative z-10">

        <div className="student-global-content relative z-10">


          <div className="page-body">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}





