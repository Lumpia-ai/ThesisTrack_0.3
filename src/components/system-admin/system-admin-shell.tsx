'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getStoredUser } from '@/lib/mock/auth';
import { PortalShellActionMenus } from '@/components/shared/portal-shell-action-menus';
import { useBranding } from '@/components/branding/branding-provider';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import { useShellSidebar } from '@/components/shared/use-shell-sidebar';
import { requestLogout } from '@/components/auth/logout-flow';

const SYSTEM_ADMIN_NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', href: '/system-admin/dashboard', label: 'Dashboard', icon: 'fa-gauge-high' }
    ]
  },
  {
    label: 'Access Control',
    items: [
      { key: 'users', href: '/system-admin/users', label: 'User Management', icon: 'fa-users-gear' },
      { key: 'roles', href: '/system-admin/roles', label: 'Roles & Permissions', icon: 'fa-shield-halved' }
    ]
  },
  {
    label: 'Configuration',
    items: [
      { key: 'branding', href: '/system-admin/branding', label: 'Theme & Branding', icon: 'fa-palette' },
      { key: 'settings', href: '/system-admin/settings', label: 'System Settings', icon: 'fa-sliders' }
    ]
  },
  {
    label: 'System Health',
    items: [
      { key: 'logs', href: '/system-admin/logs', label: 'Logs & Security', icon: 'fa-file-shield' },
      { key: 'backups', href: '/system-admin/backups', label: 'Backup & Restore', icon: 'fa-database' },
      { key: 'maintenance', href: '/system-admin/maintenance', label: 'Maintenance Mode', icon: 'fa-screwdriver-wrench' }
    ]
  }
] as const;

const SYSTEM_ADMIN_NAV_ITEMS = SYSTEM_ADMIN_NAV_GROUPS.flatMap((group) => group.items as unknown as (typeof SYSTEM_ADMIN_NAV_GROUPS)[number]['items'][number][]);

export type SystemAdminNavKey = (typeof SYSTEM_ADMIN_NAV_GROUPS)[number]['items'][number]['key'];

const BRANDING_SUBMENU_ITEMS = [
  { key: 'overview', href: '/system-admin/branding?section=overview', label: 'Brand Overview', icon: 'fa-building-columns' },
  { key: 'logos', href: '/system-admin/branding?section=logos', label: 'Logo Management', icon: 'fa-image' },
  { key: 'colors', href: '/system-admin/branding?section=colors', label: 'Color Theme', icon: 'fa-droplet' },
  { key: 'auth', href: '/system-admin/branding?section=auth', label: 'Login & Register', icon: 'fa-right-to-bracket' },
  { key: 'landing', href: '/system-admin/branding?section=landing', label: 'Landing Page', icon: 'fa-globe' },
  { key: 'programs', href: '/system-admin/branding?section=programs', label: 'Programs Content', icon: 'fa-layer-group' },
  { key: 'backup', href: '/system-admin/branding?section=backup', label: 'Backup & Restore Branding', icon: 'fa-file-export' }
] as const;
const SYSTEM_ADMIN_PREFETCH_ROUTES = [
  ...SYSTEM_ADMIN_NAV_ITEMS.map((item) => item.href),
  ...BRANDING_SUBMENU_ITEMS.map((item) => item.href)
];

function getActiveBrandingSection(value: string | null): (typeof BRANDING_SUBMENU_ITEMS)[number]['key'] {
  const matchedItem = BRANDING_SUBMENU_ITEMS.find((item) => item.key === value);

  return matchedItem?.key ?? 'overview';
}

type SystemAdminShellProps = {
  activeNav: SystemAdminNavKey;
  title: string;
  description: string;
  children: ReactNode;
  notificationCount?: number;
};

export function SystemAdminShell({
  activeNav,
  title,
  description,
  children,
  notificationCount = 2
}: SystemAdminShellProps) {
  const router = useRouter();
  const prefetchRoute = useRoutePrefetch(SYSTEM_ADMIN_PREFETCH_ROUTES);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { branding } = useBranding();
  const shellBranding = branding.shell;
  const [displayName, setDisplayName] = useState('System Administrator');
  const [displayEmail, setDisplayEmail] = useState('system.admin@university.edu.ph');
  const currentNavItem = SYSTEM_ADMIN_NAV_ITEMS.find((item) => item.key === activeNav);
  const activeBrandingSection = getActiveBrandingSection(searchParams.get('section'));
  const isBrandingPath = pathname.startsWith('/system-admin/branding');
  const [brandingMenuOpen, setBrandingMenuOpen] = useState(activeNav === 'branding' || isBrandingPath);
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

  useEffect(() => {
    if (activeNav === 'branding' || isBrandingPath) {
      setBrandingMenuOpen(true);
    }
  }, [activeNav, isBrandingPath]);

  const handleLogout = () => {
    requestLogout();
  };

  return (
    <div
      className={`student-shell is-system-admin${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${sidebarOpen ? ' is-sidebar-open' : ''}`}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
    >
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
            <strong>{currentNavItem?.label ?? title}</strong>
          </div>
        </div>
        <div className="student-global-navbar-actions">
          <PortalShellActionMenus
            notificationHref="/system-admin/logs"
            notificationCount={notificationCount}
            notificationTitle="System Admin Alerts"
            notificationDescription="Security, configuration, and maintenance events that need technical review."
            notificationItems={[
              {
                id: 'maintenance-window',
                title: 'Maintenance window pending',
                message: 'A scheduled patch window is waiting for activation.',
                href: '/system-admin/maintenance',
                icon: 'fa-screwdriver-wrench',
                meta: 'Maintenance',
                tone: 'warning',
                actionLabel: 'Review'
              },
              {
                id: 'backup-complete',
                title: 'Backup completed',
                message: 'The latest database backup finished successfully.',
                href: '/system-admin/backups',
                icon: 'fa-database',
                meta: 'Backup',
                tone: 'success',
                actionLabel: 'Open',
                unread: false
              }
            ]}
            profileName={displayName}
            profileSubtitle="System Administrator"
            profileDetail={displayEmail}
            profileBadges={[
              { label: 'Super Admin', icon: 'fa-lock', tone: 'primary' },
              { label: 'Technical Manager', icon: 'fa-server' }
            ]}
            profileActions={[
              { label: 'Logs & Security', icon: 'fa-file-shield', href: '/system-admin/logs' },
              { label: 'System Settings', icon: 'fa-sliders', href: '/system-admin/settings' },
              { label: 'Sign Out', icon: 'fa-right-from-bracket', danger: true, onClick: handleLogout }
            ]}
          />
        </div>
      </header>

      <aside className={`student-global-sidebar sidebar${sidebarOpen ? ' is-open' : ''}`} onClick={collapseOnLinkClick}>
        <div className="sidebar-header">
          <div className="sidebar-header-copy">
            <span className="sidebar-context-kicker">System Admin Portal</span>
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
            <i aria-hidden="true" className="fas fa-lock" />
            <span>{shellBranding.sidebarBadge}</span>
          </span>
        </div>

        <nav className="student-role-sidebar-nav" aria-label="System admin workspace navigation">
          {SYSTEM_ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.label} className="sidebar-nav-group">
              <span className="sidebar-nav-heading">{group.label}</span>
              <div className="sidebar-nav-links">
                {group.items.map((item) => {
                  if (item.key === 'branding') {
                    return (
                      <div
                        key={item.key}
                        className={`sidebar-nav-dropdown${brandingMenuOpen ? ' is-open' : ''}${activeNav === 'branding' ? ' is-active' : ''}`}
                      >
                        <button
                          aria-controls="system-admin-branding-submenu"
                          aria-expanded={brandingMenuOpen}
                          className={`sidebar-link${activeNav === 'branding' || brandingMenuOpen ? ' is-active' : ''}`}
                          title={sidebarCollapsed ? item.label : undefined}
                          type="button"
                          onFocus={() => prefetchRoute(item.href)}
                          onMouseEnter={() => prefetchRoute(item.href)}
                          onClick={() => {
                            setBrandingMenuOpen((current) => !current);
                            if (!isBrandingPath) {
                              router.push(item.href);
                            }
                          }}
                        >
                          <span className="sidebar-link-icon">
                            <i aria-hidden="true" className={`fas ${item.icon}`}></i>
                          </span>
                          <span className="sidebar-link-label">{item.label}</span>
                          <i className="fas fa-chevron-down sidebar-nav-chevron" aria-hidden="true"></i>
                        </button>
                        <div
                          id="system-admin-branding-submenu"
                          className="sidebar-submenu"
                          aria-label="Theme and Branding sections"
                        >
                          {BRANDING_SUBMENU_ITEMS.map((subItem) => (
                            <Link
                              key={subItem.key}
                              className={`sidebar-link ${activeBrandingSection === subItem.key ? 'is-active' : ''}`}
                              href={subItem.href}
                              title={sidebarCollapsed ? subItem.label : undefined}
                              onClick={closeSidebar}
                              onFocus={() => prefetchRoute(subItem.href)}
                              onMouseEnter={() => prefetchRoute(subItem.href)}
                            >
                              <span className="sidebar-link-icon">
                                <i aria-hidden="true" className={`fas ${subItem.icon}`}></i>
                              </span>
                              <span className="sidebar-link-label">{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.key}
                      className={`sidebar-link ${item.key === activeNav ? 'is-active' : ''}`}
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      onFocus={() => prefetchRoute(item.href)}
                      onMouseEnter={() => prefetchRoute(item.href)}
                    >
                      <span className="sidebar-link-icon">
                        <i aria-hidden="true" className={`fas ${item.icon}`}></i>
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

      <button
        aria-label="Close sidebar"
        className={`student-global-backdrop sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={closeSidebar}
      />

      <main className="student-global-main">
        <div className="student-global-content">

          <div className="page-body">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
