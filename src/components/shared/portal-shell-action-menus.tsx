'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { WorkspaceSwitcher } from '@/components/rbac/workspace-switcher';

type NotificationTone = 'primary' | 'info' | 'warning' | 'danger' | 'success' | 'neutral';

export type PortalNotificationItem = {
  id: string;
  title: string;
  message: string;
  href: string;
  icon: string;
  meta: string;
  tone?: NotificationTone;
  actionLabel?: string;
  unread?: boolean;
  // Small topic badge shown next to the title (e.g. "Backup") — for
  // notification types that could otherwise be mistaken for something else
  // at a glance, since severity tone alone doesn't distinguish topic.
  tag?: string;
};

export type PortalProfileBadge = {
  label: string;
  icon: string;
  tone?: 'primary' | 'neutral' | 'warning';
};

export type PortalProfileAction = {
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
};

type PortalShellActionMenusProps = {
  notificationHref: string;
  notificationCount?: number;
  notificationButtonLabel?: string;
  notificationTitle: string;
  notificationDescription?: string;
  notificationItems: PortalNotificationItem[];
  notificationMarkAllReadEnabled?: boolean;
  notificationUserId?: string;
  notificationFooterLabel?: string;
  notificationEmptyTitle?: string;
  notificationEmptyMessage?: string;
  /**
   * Minimal notification menu: title with the unread count and one "See all" link at the top
   * right, then the items (icon, title, message). Drops the kicker, description, "Open center"
   * button, footer link, summary pills, and each item's meta/CTA line (the whole item is the link).
   */
  notificationCompact?: boolean;
  profileName: string;
  profileSubtitle: string;
  profileDetail?: string;
  profileBadges?: PortalProfileBadge[];
  extraProfileSection?: ReactNode;
  profileActions: PortalProfileAction[];
};

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getShortName(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).join(' ') || value;
}

export function PortalShellActionMenus({
  notificationHref,
  notificationCount = 0,
  notificationButtonLabel = 'Notifications',
  notificationTitle,
  notificationDescription,
  notificationItems,
  notificationMarkAllReadEnabled = false,
  notificationUserId,
  notificationFooterLabel = 'See all notifications',
  notificationEmptyTitle = 'All caught up',
  notificationEmptyMessage = 'No notification is waiting right now.',
  notificationCompact = false,
  profileName,
  profileSubtitle,
  profileDetail,
  profileBadges = [],
  extraProfileSection,
  profileActions
}: PortalShellActionMenusProps) {
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const suppressNextOutsideClickRef = useRef(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [allNotificationsRead, setAllNotificationsRead] = useState(false);
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

  const updateTheme = (nextTheme: string) => {
    setThemeMode(nextTheme);
    document.documentElement.setAttribute('data-student-theme', nextTheme);
    window.localStorage.setItem('studentWorkspaceTheme', nextTheme);
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (suppressNextOutsideClickRef.current) {
        return;
      }

      const target = event.target as Node;

      // A click that removes its own target from the DOM (e.g. "Mark all
      // read" hiding itself once the unread count hits 0) leaves a detached
      // node here — Node.contains() reports false for it, which would
      // otherwise be misread as an outside click and close the menu.
      if (!target.isConnected) {
        return;
      }

      if (!notificationMenuRef.current?.contains(target)) {
        setNotificationMenuOpen(false);
      }

      if (!profileMenuRef.current?.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((current) => new Set(current).add(notificationId));
    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, action: 'read' }),
      keepalive: true
    }).finally(() => {
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    });
  };

  const markAllNotificationsRead = () => {
    if (allNotificationsRead) {
      return;
    }

    // Marking every unread notification for the user (not just the up-to-5
    // preview items rendered here) needs the real userId, since the "N
    // unread" count in the trigger/pills reflects the user's full inbox,
    // which can hold unread items older than what's previewed.
    if (notificationUserId) {
      setAllNotificationsRead(true);
      void fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: notificationUserId, action: 'read-all' }),
        keepalive: true
      }).finally(() => {
        window.dispatchEvent(new Event('thesistrack:notifications-updated'));
      });
      return;
    }

    const unreadItems = notificationItems.filter((item) => item.unread !== false && !readNotificationIds.has(item.id));

    if (!unreadItems.length) {
      return;
    }

    setReadNotificationIds((current) => {
      const next = new Set(current);
      unreadItems.forEach((item) => next.add(item.id));
      return next;
    });

    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: unreadItems.map((item) => item.id), action: 'read' }),
      keepalive: true
    }).finally(() => {
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    });
  };

  const unreadPreviewCount = allNotificationsRead
    ? 0
    : notificationItems.filter((item) => item.unread !== false && !readNotificationIds.has(item.id)).length;
  const urgentPreviewCount = notificationItems.filter((item) => item.tone === 'danger' || item.tone === 'warning').length;
  const visibleNotificationCount = allNotificationsRead ? 0 : Math.max(0, notificationCount - readNotificationIds.size);

  return (
    <div className="portal-shell-action-menus">
      <div className="portal-shell-notification-shell" ref={notificationMenuRef}>
        <button
          aria-expanded={notificationMenuOpen ? 'true' : 'false'}
          aria-haspopup="menu"
          className={`portal-shell-notification-trigger notification-trigger${notificationMenuOpen ? ' is-open is-active' : ''}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setProfileMenuOpen(false);
            setNotificationMenuOpen((current) => !current);
          }}
        >
          <span className="portal-shell-notification-trigger-icon notification-trigger-icon">
            <i aria-hidden="true" className="fas fa-bell" />
          </span>
          <span className="portal-shell-notification-trigger-copy notification-trigger-copy">
            <strong>{notificationButtonLabel}</strong>
            <small>{visibleNotificationCount ? `${visibleNotificationCount} unread` : 'All caught up'}</small>
          </span>
          {visibleNotificationCount ? <span className="portal-shell-notification-trigger-count notification-trigger-count">{visibleNotificationCount}</span> : null}
        </button>

        <div className={`portal-shell-notification-menu${notificationMenuOpen ? ' is-open' : ''}${notificationCompact ? ' is-compact' : ''}`}>
          <div className="portal-shell-notification-menu-hero">
            <div className="portal-shell-notification-menu-hero-copy">
              {notificationCompact ? null : <span className="portal-shell-notification-menu-kicker">Inbox</span>}
              <strong>{notificationTitle}</strong>
              {notificationCompact ? (
                <small>
                  {visibleNotificationCount || unreadPreviewCount
                    ? `${visibleNotificationCount || unreadPreviewCount} unread`
                    : 'All caught up'}
                </small>
              ) : notificationDescription ? (
                <small>{notificationDescription}</small>
              ) : null}
            </div>
            <div className="portal-shell-notification-menu-actions">
              {notificationMarkAllReadEnabled && !allNotificationsRead && (unreadPreviewCount || visibleNotificationCount) ? (
                <button
                  className="portal-shell-notification-menu-view-all is-secondary"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    suppressNextOutsideClickRef.current = true;
                    window.setTimeout(() => {
                      suppressNextOutsideClickRef.current = false;
                    }, 0);
                    markAllNotificationsRead();
                  }}
                >
                  Mark all read
                </button>
              ) : null}
              {notificationCompact ? (
                <Link
                  className="portal-shell-notification-menu-view-all is-secondary"
                  href={notificationHref}
                  prefetch={false}
                  onClick={() => setNotificationMenuOpen(false)}
                >
                  {notificationFooterLabel}
                </Link>
              ) : (
                <Link
                  className="portal-shell-notification-menu-view-all is-primary"
                  href={notificationHref}
                  prefetch={false}
                  onClick={() => setNotificationMenuOpen(false)}
                >
                  Open center
                </Link>
              )}
            </div>
          </div>

          {notificationCompact ? null : (
            <div className="portal-shell-notification-menu-summary">
              <span className="portal-shell-notification-summary-pill is-primary">
                <i aria-hidden="true" className="fas fa-envelope-open-text" />
                {visibleNotificationCount || unreadPreviewCount ? `${visibleNotificationCount || unreadPreviewCount} unread` : '0 unread'}
              </span>
              <span className={`portal-shell-notification-summary-pill${urgentPreviewCount ? ' is-danger' : ''}`}>
                <i aria-hidden="true" className="fas fa-bolt" />
                {urgentPreviewCount ? `${urgentPreviewCount} urgent` : 'No urgent items'}
              </span>
            </div>
          )}

          {notificationItems.length ? (
            <div className="portal-shell-notification-menu-list" role="menu" aria-label={`${notificationButtonLabel} preview`}>
              {notificationItems.map((item) => (
                <Link
                  key={item.id}
                  className={`portal-shell-notification-menu-item${item.unread === false || allNotificationsRead || readNotificationIds.has(item.id) ? '' : ' is-unread'}`}
                  href={item.href}
                  prefetch={false}
                  onClick={() => {
                    if (item.unread !== false && !allNotificationsRead && !readNotificationIds.has(item.id)) {
                      markNotificationRead(item.id);
                    }
                    setNotificationMenuOpen(false);
                  }}
                >
                  <span className={`portal-shell-notification-menu-item-icon is-${item.tone || 'neutral'}`}>
                    <i aria-hidden="true" className={`fas ${item.icon}`} />
                  </span>
                  <span className="portal-shell-notification-menu-item-copy">
                    <span className="portal-shell-notification-menu-item-head">
                      <span className="portal-shell-notification-menu-item-title-group">
                        <strong>{item.title}</strong>
                        {item.tag ? (
                          <span className="portal-shell-notification-menu-item-tag">{item.tag}</span>
                        ) : null}
                      </span>
                      {item.unread === false || allNotificationsRead || readNotificationIds.has(item.id) ? null : <span aria-hidden="true" className="portal-shell-notification-menu-item-dot" />}
                    </span>
                    <small>{item.message}</small>
                    {notificationCompact ? null : (
                      <span className="portal-shell-notification-menu-item-footer">
                        <span className="portal-shell-notification-menu-item-meta">{item.meta}</span>
                        <span className="portal-shell-notification-menu-item-cta">
                          {item.actionLabel || 'Open'}
                          <i aria-hidden="true" className="fas fa-arrow-right" />
                        </span>
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="portal-shell-notification-menu-empty">
              <strong>{notificationEmptyTitle}</strong>
              <p>{notificationEmptyMessage}</p>
            </div>
          )}

          {notificationCompact ? null : (
            <div className="portal-shell-notification-menu-footer">
              <Link
                className="portal-shell-notification-menu-footer-link"
                href={notificationHref}
                prefetch={false}
                onClick={() => setNotificationMenuOpen(false)}
              >
                {notificationFooterLabel}
                <i aria-hidden="true" className="fas fa-arrow-up-right-from-square" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="portal-shell-profile-shell" ref={profileMenuRef}>
        <div className={`portal-shell-profile-menu${profileMenuOpen ? ' is-open' : ''}`}>
          <button
            aria-expanded={profileMenuOpen ? 'true' : 'false'}
            aria-haspopup="menu"
            className={`portal-shell-profile-trigger profile-pill profile-nav-btn${profileMenuOpen ? ' is-active' : ''}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setNotificationMenuOpen(false);
              setProfileMenuOpen((current) => !current);
            }}
          >
            <span className="portal-shell-profile-avatar profile-nav-btn-avatar">{getInitials(profileName)}</span>
            <span className="portal-shell-profile-copy profile-nav-btn-copy">
              <strong>{getShortName(profileName)}</strong>
              <small>{profileSubtitle}</small>
            </span>
            <i aria-hidden="true" className="fas fa-chevron-down portal-shell-profile-chevron profile-nav-btn-chevron" />
          </button>

          <div className="portal-shell-profile-dropdown" role="menu" aria-label="User menu">
            <div className="portal-shell-profile-dropdown-header">
              <strong>{profileName}</strong>
              <span>{profileDetail || profileSubtitle}</span>
            </div>

            {profileBadges.length ? (
              <div className="portal-shell-profile-dropdown-section">
                <span className="portal-shell-profile-dropdown-label">Workspace</span>
                <div className="portal-shell-profile-badges">
                  {profileBadges.map((badge) => (
                    <span
                      key={`${badge.label}-${badge.icon}`}
                      className={`portal-shell-profile-badge${badge.tone === 'primary' ? ' is-primary' : badge.tone === 'warning' ? ' is-warning' : ''}`}
                    >
                      <i aria-hidden="true" className={`fas ${badge.icon}`} />
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <WorkspaceSwitcher
              renderSection={(content) => (
                <>
                  <div className="portal-shell-profile-dropdown-divider" />
                  <div className="portal-shell-profile-dropdown-section">{content}</div>
                </>
              )}
            />

            <div className="portal-shell-profile-dropdown-divider" />
            <div className="portal-shell-profile-dropdown-section">
              <span className="portal-shell-profile-dropdown-label">Theme</span>
              <button
                aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                aria-pressed={themeMode === 'dark'}
                className="profile-theme-toggle"
                type="button"
                onClick={() => updateTheme(themeMode === 'dark' ? 'light' : 'dark')}
              >
                <span className="profile-theme-toggle-icon">
                  <i aria-hidden="true" className={`fas ${themeMode === 'dark' ? 'fa-moon' : 'fa-sun'}`} />
                </span>
                <span className="profile-theme-toggle-copy">
                  <strong>{themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
                  <small>Switch workspace appearance</small>
                </span>
                <span className="profile-theme-toggle-track" aria-hidden="true">
                  <span />
                </span>
              </button>
            </div>

            {extraProfileSection ? (
              <>
                <div className="portal-shell-profile-dropdown-divider" />
                <div className="portal-shell-profile-dropdown-section">{extraProfileSection}</div>
              </>
            ) : null}

            <div className="portal-shell-profile-dropdown-divider" />

            <div className="portal-shell-profile-dropdown-links">
              {profileActions.map((action) =>
                action.href ? (
                  <Link
                    key={`${action.label}-${action.href}`}
                    className={`portal-shell-profile-link${action.danger ? ' is-danger' : ''}`}
                    href={action.href}
                    prefetch={false}
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <i aria-hidden="true" className={`fas ${action.icon}`} />
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={`${action.label}-${action.icon}`}
                    className={`portal-shell-profile-link${action.danger ? ' is-danger' : ''}`}
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      action.onClick?.();
                    }}
                  >
                    <i aria-hidden="true" className={`fas ${action.icon}`} />
                    {action.label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
