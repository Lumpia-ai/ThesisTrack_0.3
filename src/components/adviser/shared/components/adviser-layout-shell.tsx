'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { ADVISER_NAV_ITEMS, ADVISER_NAV_SECTIONS } from '@/components/adviser/shared/config/adviser-navigation';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import {
  WORKSPACE_META,
  WORKSPACE_MODE_STORAGE_KEY,
  getWorkspaceBasePath,
  getWorkspaceDashboardPath,
  getWorkspaceModeFromPathname,
  isNavItemActive,
  type WorkspaceMode
} from '@/components/adviser/shared/config/dashboard-utils';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import type { AdviserNotificationRecord } from '@/components/adviser/shared/components/adviser-notifications';
import type { PortalNotificationItem } from '@/components/shared/portal-shell-action-menus';
import { isBackupTitleNotification } from '@/lib/notification-tags';

const STUDENT_THEME_STORAGE_KEY = 'studentWorkspaceTheme';

type ShellThemeMode = 'light' | 'dark' | 'system';

type AdviserLayoutShellProps = {
  children: React.ReactNode;
  data: AdviserDashboardData;
  notifications?: AdviserNotificationRecord[];
};

function toNotificationPreviewItems(
  notifications: AdviserNotificationRecord[] | undefined,
  basePath: string
): PortalNotificationItem[] | undefined {
  if (!notifications) {
    return undefined;
  }

  return notifications.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.text,
    href: item.entityType === 'uploaded_file'
      ? basePath.includes('/panel-mode')
        ? `${basePath}/evaluation-queue`
        : `${basePath}/submissions`
      : item.href.startsWith('/adviser/')
        ? item.href
        : `${basePath}/notifications`,
    icon: item.icon,
    meta: item.meta,
    tone: item.tone,
    unread: item.status !== 'read',
    actionLabel: 'Open',
    tag: isBackupTitleNotification(item.title) ? 'Backup' : undefined
  }));
}

export function AdviserLayoutShell({ children, data, notifications }: AdviserLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [themeMode, setThemeMode] = useState<ShellThemeMode>('light');

  const workspaceMode: WorkspaceMode = getWorkspaceModeFromPathname(pathname);
  const basePath = getWorkspaceBasePath(workspaceMode);
  const meta = WORKSPACE_META[workspaceMode];
  const notificationPreviewItems = useMemo(
    () => toNotificationPreviewItems(notifications, basePath),
    [basePath, notifications]
  );

  const switchWorkspace = useCallback((mode: WorkspaceMode) => {
    if (mode === workspaceMode) return;
    try { window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, mode); } catch {}
    router.push(getWorkspaceDashboardPath(mode));
  }, [router, workspaceMode]);

  // Mobile breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1100px)');
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (!e.matches) setSidebarOpen(false);
    };
    handle(mq);
    const listener = (e: MediaQueryListEvent) => handle(e);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
    mq.addListener(listener);
    return () => mq.removeListener(listener);
  }, []);

  // Close menus on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readTheme = () => {
      const storedTheme = window.localStorage.getItem(STUDENT_THEME_STORAGE_KEY);
      setThemeMode(storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'light');
      document.documentElement.dataset.studentTheme = storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'light';
    };

    readTheme();
    window.addEventListener('thesistrack:student-theme-changed', readTheme);
    window.addEventListener('storage', readTheme);

    return () => {
      window.removeEventListener('thesistrack:student-theme-changed', readTheme);
      window.removeEventListener('storage', readTheme);
    };
  }, []);

  const updateAdviserTheme = useCallback((nextTheme: ShellThemeMode) => {
    setThemeMode(nextTheme);

    if (typeof window === 'undefined') {
      return;
    }

    document.documentElement.dataset.studentTheme = nextTheme;
    window.localStorage.setItem(STUDENT_THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event('thesistrack:student-theme-changed'));
  }, []);

  const navigationSections = useMemo(() => {
    const sections = ADVISER_NAV_SECTIONS[workspaceMode];
    const items = ADVISER_NAV_ITEMS[workspaceMode];
    return sections.map((section) => ({
      ...section,
      items: items.filter((item) => item.section === section.key)
    })).filter((section) => section.items.length);
  }, [workspaceMode]);
  const sidebarRoutes = useMemo(
    () => navigationSections.flatMap((section) => section.items.map((item) => item.href)),
    [navigationSections]
  );
  const prefetchRoute = useRoutePrefetch(sidebarRoutes);

  const toggleSidebar = useCallback(() => {
    if (isMobile) { setSidebarOpen((c) => !c); return; }
    setSidebarCollapsed((c) => !c);
  }, [isMobile]);

  // Clicking a sidebar link closes the mobile drawer; on desktop keeps the current toggle state.
  const collapseOnLinkClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (isMobile && event.target instanceof Element && event.target.closest('a[href]')) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleLabel = isMobile
    ? sidebarOpen ? 'Close sidebar' : 'Open sidebar'
    : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const activeNavItem = ADVISER_NAV_ITEMS[workspaceMode].find((item) => isNavItemActive(pathname, item.href));
  const navbarTitle = activeNavItem?.key === 'dashboard'
    ? meta.pageTitle
    : activeNavItem?.label ?? meta.pageTitle;

  return (
    <div
      className={`student-shell adviser-shell adviser-workspace-shell${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${sidebarOpen ? ' is-sidebar-open' : ''}`}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
      data-theme={themeMode}
    >
      {/* Decorative Light Background for Glassmorphism */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#0F3DDE]/[0.03] via-[#0F3DDE]/[0.01] to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0F3DDE]/[0.05] to-indigo-500/[0.03] blur-[80px]"></div>
        <div className="absolute top-[20%] -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/[0.03] to-[#0F3DDE]/[0.03] blur-[80px]"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
      </div>
      {/* ─── Top Navbar ─── */}
      <header className="student-global-navbar adviser-global-navbar">
        <div className="student-global-navbar-main adviser-global-navbar-main">
          <button
            aria-label={toggleLabel}
            className="icon-btn student-shell-toggle adviser-shell-toggle"
            type="button"
            onClick={toggleSidebar}
          >
            <i
              aria-hidden="true"
              className={`fas ${isMobile ? (sidebarOpen ? 'fa-xmark' : 'fa-bars') : sidebarCollapsed ? 'fa-chevron-right' : 'fa-bars'}`}
            />
          </button>

          <div className="student-navbar-title adviser-navbar-title" aria-label="Current page">
            <span className="student-navbar-title-kicker adviser-navbar-title-kicker">ThesisTrack</span>
            <strong>{navbarTitle}</strong>
          </div>
        </div>

        <div className="student-global-navbar-actions adviser-global-navbar-actions">
          <AdviserShellActions
            basePath={basePath}
            fullName={data.profile.fullName}
            notificationCount={data.profile.notificationCount}
            notificationItems={notificationPreviewItems}
            userId={data.profile.user_id}
            rawRole={data.profile.rawRole}
            themeMode={themeMode}
            workspaceMode={workspaceMode}
            onToggleTheme={() => updateAdviserTheme(themeMode === 'dark' ? 'light' : 'dark')}
            onSwitchWorkspace={switchWorkspace}
          />
        </div>
      </header>

      {/* ─── Sidebar ─── */}
      <aside className={`student-global-sidebar sidebar${sidebarOpen ? ' is-open' : ''}`} onClick={collapseOnLinkClick}>
        <div className="sidebar-header">
          <div className="sidebar-header-copy">
            <span className="sidebar-context-kicker">Adviser Portal</span>
            <div className="brand-mark system-brand-mark" aria-label="ThesisTrack">
              <Image
                alt="ThesisTrack logo"
                className="system-brand-logo"
                height={56}
                priority
                src={themeMode === 'dark' ? '/System%20Logo/image.png' : '/System%20Logo/logo-transparent.png'}
                style={{ transform: themeMode === 'dark' ? 'scale(1.15)' : 'none' }}
                width={72}
              />
              <span className="system-brand-name">
                <span>Thesis</span>
                <strong>Track</strong>
              </span>
              <span className="system-brand-subtitle">Higher Education Institutions</span>
            </div>
          </div>
          <span className="user-badge">
            <i aria-hidden="true" className={`fas ${meta.badgeIcon}`} />
            <span>{workspaceMode === 'adviser' ? data.profile.department || meta.badgeLabel : meta.badgeLabel}</span>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Adviser workspace navigation">
          {navigationSections.map((section) => (
            <div key={section.key} className="sidebar-nav-group">
              <span className="sidebar-nav-heading">{section.label}</span>
              <div className="sidebar-nav-links">
                {section.items.map((item) => {
                  const isActive = isNavItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.key}
                      aria-current={isActive ? 'page' : undefined}
                      className={`sidebar-link ${isActive ? 'is-active' : ''}`}
                      href={item.href}
                      prefetch={false}
                      title={sidebarCollapsed ? item.label : undefined}
                      onFocus={() => prefetchRoute(item.href)}
                      onMouseEnter={() => prefetchRoute(item.href)}
                    >
                      <span className="sidebar-link-icon">
                        <i aria-hidden="true" className={`fas ${item.icon}`} />
                      </span>
                      <span className="sidebar-link-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* ─── Mobile backdrop ─── */}
      <button
        aria-label="Close sidebar"
        className={`student-global-backdrop adviser-global-backdrop sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setSidebarOpen(false)}
      />

      {/* ─── Main content ─── */}
      <main className="student-global-main adviser-global-main relative z-10">
        <div className="student-global-content adviser-global-content relative z-10">{children}</div>
      </main>
    </div>
  );
}
