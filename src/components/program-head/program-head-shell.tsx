'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getStoredUser } from '@/lib/mock/auth';
import {
  PROGRAM_HEAD_NAV_GROUPS,
  type ProgramHeadNavKey
} from '@/components/program-head/program-head-data';
import { PortalShellActionMenus } from '@/components/shared/portal-shell-action-menus';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import { useShellSidebar } from '@/components/shared/use-shell-sidebar';
import { requestLogout } from '@/components/auth/logout-flow';

const PROGRAM_HEAD_PREFETCH_ROUTES = PROGRAM_HEAD_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));

type ProgramHeadShellProps = {
  activeNav: ProgramHeadNavKey;
  title: string;
  description: string;
  departmentLabel?: string;
  notificationCount?: number;
  children: ReactNode;
};

export function ProgramHeadShell({
  activeNav,
  title,
  description,
  departmentLabel = 'IT Department',
  notificationCount = 3,
  children
}: ProgramHeadShellProps) {
  const router = useRouter();
  
  const prefetchRoute = useRoutePrefetch(PROGRAM_HEAD_PREFETCH_ROUTES);
  const [displayName, setDisplayName] = useState('Dr. Anna Dimagiba');
  const [displayEmail, setDisplayEmail] = useState('program.head@university.edu.ph');
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
    const syncStoredUser = () => {
      const storedUser = getStoredUser();
      if (storedUser?.name) {
        setDisplayName(storedUser.name);
      }

      if (storedUser?.email) {
        setDisplayEmail(storedUser.email);
      }
    };

    syncStoredUser();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('thesistrack:user-updated', syncStoredUser);
    window.addEventListener('storage', syncStoredUser);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('thesistrack:user-updated', syncStoredUser);
      window.removeEventListener('storage', syncStoredUser);
    };
  }, [closeSidebar]);

  const handleLogout = () => {
    requestLogout();
  };

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
      className={`student-shell adviser-shell adviser-workspace-shell ph-portal-shell${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${sidebarOpen ? ' is-sidebar-open' : ''}`} data-theme={themeMode}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
    >
      {/* Decorative Light Background for Glassmorphism */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#0F3DDE]/[0.03] via-[#0F3DDE]/[0.01] to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0F3DDE]/[0.05] to-indigo-500/[0.03] blur-[80px]"></div>
        <div className="absolute top-[20%] -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/[0.03] to-[#0F3DDE]/[0.03] blur-[80px]"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
      </div>
      <header className="student-global-navbar adviser-global-navbar">
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
                notificationHref="/program-head/notifications"
                notificationCount={notificationCount}
                notificationTitle="Program Head Notifications"
                notificationDescription="Department oversight, evaluation progress, and transfer readiness updates."
                notificationItems={[
                  {
                    id: 'program-projects',
                    title: 'Project oversight review needed',
                    message: 'A program project requires department-level verification.',
                    href: '/program-head/projects',
                    icon: 'fa-diagram-project',
                    meta: 'Projects',
                    tone: 'warning',
                    actionLabel: 'Open projects'
                  },
                  {
                    id: 'program-performance',
                    title: 'Performance snapshot refreshed',
                    message: 'Program metrics were updated with the latest submission and evaluation data.',
                    href: '/program-head/performance',
                    icon: 'fa-chart-line',
                    meta: 'Performance',
                    tone: 'info',
                    actionLabel: 'Review metrics'
                  },
                  {
                    id: 'program-transfer',
                    title: 'Transfer report completed',
                    message: 'A transfer readiness review was finalized for this cycle.',
                    href: '/program-head/transfer',
                    icon: 'fa-arrow-up-right-dots',
                    meta: 'Transfer',
                    tone: 'success',
                    actionLabel: 'Open transfer',
                    unread: false
                  }
                ]}
                profileName={displayName}
                profileSubtitle="Program Head"
                profileDetail={displayEmail}
                profileBadges={[
                  { label: 'Program Head', icon: 'fa-user-tie', tone: 'primary' },
                  { label: departmentLabel, icon: 'fa-building-columns' }
                ]}
                extraProfileSection={
                  <>
                    <span className="portal-shell-profile-dropdown-label">Workspace Mode</span>
                    <div className="workspace-mode-menu" aria-label="Switch dashboard mode">
                      <button type="button" className="workspace-mode-item is-active">
                        <span className="workspace-mode-item-left">
                          <i className="fas fa-building-user" /> Program Head
                        </span>
                        <i className="fas fa-circle-check" />
                      </button>
                      <button type="button" className="workspace-mode-item" onClick={() => router.push('/adviser/adviser-mode/dashboard')}>
                        <span className="workspace-mode-item-left">
                          <i className="fas fa-chalkboard-user" /> Adviser
                        </span>
                      </button>
                      <button type="button" className="workspace-mode-item" onClick={() => router.push('/adviser/panel-mode/dashboard')}>
                        <span className="workspace-mode-item-left">
                          <i className="fas fa-scale-balanced" /> Panel
                        </span>
                      </button>
                    </div>
                  </>
                }
                profileActions={[
                  { label: 'Profile Settings', icon: 'fa-user-pen', onClick: () => router.push('/program-head/profile') },
                  { label: 'Sign Out', icon: 'fa-right-from-bracket', danger: true, onClick: handleLogout }
                ]}
              />
        </div>
      </header>

      <aside className={`student-global-sidebar adviser-global-sidebar sidebar${sidebarOpen ? ' is-open' : ''}`} onClick={collapseOnLinkClick}>
        <div className="sidebar-header">
          <div className="sidebar-header-copy">
            <span className="sidebar-context-kicker">Program Head Portal</span>
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
            <span>{departmentLabel}</span>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Program head navigation">
          {PROGRAM_HEAD_NAV_GROUPS.map((group) => (
            <div key={group.heading} className="sidebar-nav-group">
              <span className="sidebar-nav-heading">{group.heading}</span>
              <div className="sidebar-nav-links">
                {group.items.map((item) => (
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
                    <span
                      className="sidebar-link-label"
                      style={{ whiteSpace: 'normal', overflow: 'visible', wordBreak: 'break-word', lineHeight: 1.25 }}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <button
        aria-label="Close sidebar"
        className={`student-global-backdrop sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={closeSidebar}
      />

      <main className="student-global-main adviser-global-main relative z-10">

        <div className="student-global-content adviser-global-content relative z-10">

          
          <div className="page-body">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}





