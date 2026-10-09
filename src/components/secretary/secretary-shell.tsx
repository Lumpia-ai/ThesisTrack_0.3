'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { getStoredUser } from '@/lib/mock/auth';
import { PortalShellActionMenus } from '@/components/shared/portal-shell-action-menus';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import { useShellSidebar } from '@/components/shared/use-shell-sidebar';
import { requestLogout } from '@/components/auth/logout-flow';
import { EVENT_META, meetingHref } from '@/components/secretary/secretary-data';
import { useSecretary } from '@/components/secretary/secretary-store';

const SECRETARY_NAV_ITEMS = [
  { key: 'dashboard', href: '/secretary/dashboard', label: 'Dashboard', icon: 'fa-gauge' },
  { key: 'meetings', href: '/secretary/meetings', label: 'Defense Meetings', icon: 'fa-calendar-check' },
  { key: 'reports', href: '/secretary/reports', label: 'Meeting Reports', icon: 'fa-file-signature' },
  { key: 'notifications', href: '/secretary/notifications', label: 'Notifications', icon: 'fa-bell' }
] as const;
const SECRETARY_PREFETCH_ROUTES = SECRETARY_NAV_ITEMS.map((item) => item.href);

export type SecretaryNavKey = (typeof SECRETARY_NAV_ITEMS)[number]['key'];

type SecretaryShellProps = {
  activeNav: SecretaryNavKey;
  title: string;
  children: ReactNode;
};

export function SecretaryShell({ activeNav, title, children }: SecretaryShellProps) {
  const prefetchRoute = useRoutePrefetch(SECRETARY_PREFETCH_ROUTES);
  const { events } = useSecretary();
  const [displayName, setDisplayName] = useState('Defense Secretary');
  const [displayEmail, setDisplayEmail] = useState('');
  const [themeMode, setThemeMode] = useState('light');
  const { closeSidebar, collapseOnLinkClick, sidebarCollapsed, sidebarOpen, toggleIconClass, toggleLabel, toggleSidebar } = useShellSidebar({
    mobileBreakpoint: 1100
  });

  const unreadEvents = events.filter((item) => !item.read);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser?.name) setDisplayName(storedUser.name);
    if (storedUser?.email) setDisplayEmail(storedUser.email);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSidebar();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeSidebar]);

  useEffect(() => {
    setThemeMode(document.documentElement.getAttribute('data-student-theme') || 'light');

    const observer = new MutationObserver(() => {
      setThemeMode(document.documentElement.getAttribute('data-student-theme') || 'light');
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-student-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`student-shell secretary-shell${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${sidebarOpen ? ' is-sidebar-open' : ''}`}
      data-theme={themeMode}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
    >
      <header className="student-global-navbar">
        <div className="student-global-navbar-main">
          <button aria-label={toggleLabel} className="icon-btn student-shell-toggle" type="button" onClick={toggleSidebar}>
            <i aria-hidden="true" className={`fas ${toggleIconClass}`} />
          </button>
          <div className="student-navbar-title" aria-label="Current page">
            <span className="student-navbar-title-kicker">ThesisTrack</span>
            <strong>{title}</strong>
          </div>
        </div>
        <div className="student-global-navbar-actions">
          <PortalShellActionMenus
            notificationHref="/secretary/notifications"
            notificationCount={unreadEvents.length}
            notificationTitle="Notifications"
            notificationCompact
            notificationItems={events.slice(0, 5).map((item) => ({
              id: item.id,
              title: item.title,
              message: item.message,
              href: meetingHref(item.meetingId),
              icon: EVENT_META[item.type].icon,
              meta: EVENT_META[item.type].label,
              tone: item.type === 'returned' ? 'warning' : 'info',
              unread: !item.read
            }))}
            profileName={displayName}
            profileSubtitle="Defense Secretary"
            profileDetail={displayEmail}
            profileBadges={[{ label: 'Defense Secretary', icon: 'fa-pen-to-square', tone: 'primary' }]}
            profileActions={[{ label: 'Sign Out', icon: 'fa-right-from-bracket', danger: true, onClick: requestLogout }]}
          />
        </div>
      </header>

      <aside className={`student-global-sidebar sidebar${sidebarOpen ? ' is-open' : ''}`} onClick={collapseOnLinkClick}>
        <div className="sidebar-header">
          <div className="sidebar-header-copy">
            <span className="sidebar-context-kicker">Defense Secretary</span>
            <div className="brand-mark system-brand-mark" aria-label="ThesisTrack">
              <img alt="ThesisTrack logo" className="system-brand-logo" src="/System%20Logo/logo-transparent.png" />
              <span className="system-brand-name">
                <span>Thesis</span>
                <strong>Track</strong>
              </span>
              <span className="system-brand-subtitle">Higher Education Institutions</span>
            </div>
          </div>
          <span className="user-badge">
            <i aria-hidden="true" className="fas fa-pen-to-square" />
            <span>Minutes of Meeting</span>
          </span>
        </div>

        <nav className="student-role-sidebar-nav" aria-label="Secretary navigation">
          <div className="sidebar-nav-group">
            <span className="sidebar-nav-heading">Minutes &amp; Reports</span>
            <div className="sidebar-nav-links">
              {SECRETARY_NAV_ITEMS.map((item) => (
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
                  {item.key === 'notifications' && unreadEvents.length ? (
                    <span className="secretary-nav-count" aria-label={`${unreadEvents.length} unread`}>
                      {unreadEvents.length}
                    </span>
                  ) : null}
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
          <div className="page-body">{children}</div>
        </div>
      </main>
    </div>
  );
}
