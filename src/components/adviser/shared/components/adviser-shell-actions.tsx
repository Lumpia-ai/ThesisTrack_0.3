'use client';

import { useRouter } from 'next/navigation';
import { PortalShellActionMenus, type PortalNotificationItem } from '@/components/shared/portal-shell-action-menus';
import { getInitials, WORKSPACE_META, type WorkspaceMode } from '@/components/adviser/shared/config/dashboard-utils';
import { requestLogout } from '@/components/auth/logout-flow';

type AdviserShellActionsProps = {
  basePath: string;
  fullName: string;
  notificationCount: number;
  notificationItems?: PortalNotificationItem[];
  userId?: string;
  rawRole?: string;
  themeMode?: 'light' | 'dark' | 'system';
  workspaceMode: WorkspaceMode;
  onToggleTheme?: () => void;
  onSwitchWorkspace: (mode: WorkspaceMode) => void;
};

function buildNotificationItems(basePath: string, workspaceMode: WorkspaceMode): PortalNotificationItem[] {
  if (workspaceMode === 'panel') {
    return [
      {
        id: 'panel-evaluation',
        title: 'Evaluation packet ready',
        message: 'A defense review packet is waiting for scoring and comments.',
        href: `${basePath}/evaluation-queue`,
        icon: 'fa-clipboard-check',
        meta: 'Evaluation Queue',
        tone: 'warning',
        actionLabel: 'Review now'
      },
      {
        id: 'panel-schedule',
        title: 'Defense schedule updated',
        message: 'One defense schedule was adjusted and needs confirmation.',
        href: `${basePath}/defense-schedule`,
        icon: 'fa-calendar-days',
        meta: 'Defense Schedule',
        tone: 'info',
        actionLabel: 'Open schedule'
      },
      {
        id: 'panel-history',
        title: 'Recent review archived',
        message: 'A completed review was moved into your panel history.',
        href: `${basePath}/review-history`,
        icon: 'fa-folder-open',
        meta: 'Review History',
        tone: 'success',
        actionLabel: 'Open history',
        unread: false
      }
    ];
  }

  return [
    {
      id: 'adviser-submission',
      title: 'Submission awaiting review',
      message: 'A group uploaded a new document set for adviser checking.',
      href: `${basePath}/submissions`,
      icon: 'fa-check-double',
      meta: 'Submissions',
      tone: 'warning',
      actionLabel: 'Review now'
    },
    {
      id: 'adviser-progress',
      title: 'Project stage needs attention',
      message: 'One supervised group is behind the current progress target.',
      href: `${basePath}/progress`,
      icon: 'fa-chart-line',
      meta: 'Progress Monitoring',
      tone: 'danger',
      actionLabel: 'Check progress'
    },
    {
      id: 'adviser-schedule',
      title: 'Consultation schedule confirmed',
      message: 'An upcoming consultation slot was confirmed for this week.',
      href: `${basePath}/schedule`,
      icon: 'fa-calendar',
      meta: 'Schedule',
      tone: 'info',
      actionLabel: 'View calendar',
      unread: false
    }
  ];
}

export function AdviserShellActions({
  basePath,
  fullName,
  notificationCount,
  notificationItems,
  userId,
  rawRole,
  themeMode = 'light',
  workspaceMode,
  onToggleTheme,
  onSwitchWorkspace
}: AdviserShellActionsProps) {
  const router = useRouter();
  const workspaceMeta = WORKSPACE_META[workspaceMode];

  return (
    <PortalShellActionMenus
      notificationHref={`${basePath}/notifications`}
      notificationCount={notificationCount}
      notificationTitle="Workspace Notifications"
      notificationItems={notificationItems ?? buildNotificationItems(basePath, workspaceMode)}
      notificationMarkAllReadEnabled={Boolean(notificationItems)}
      notificationUserId={userId}
      profileName={fullName}
      profileSubtitle={workspaceMeta.pillLabel}
      profileDetail={`${workspaceMeta.headerLabel} • ${getInitials(fullName) || 'AD'}`}
      profileBadges={[
        { label: workspaceMeta.pillLabel, icon: workspaceMode === 'adviser' ? 'fa-chalkboard-user' : 'fa-scale-balanced', tone: 'primary' },
        { label: 'Notifications', icon: 'fa-bell' }
      ]}
      extraProfileSection={
        <>
          <span className="portal-shell-profile-dropdown-label">Workspace Mode</span>
          <div className="workspace-mode-menu" aria-label="Switch dashboard mode">
            {rawRole === 'PROGRAM_HEAD' ? (
              <button type="button" className="workspace-mode-item" onClick={() => router.push('/program-head/dashboard')}>
                <span className="workspace-mode-item-left">
                  <i className="fas fa-building-user" /> Program Head
                </span>
              </button>
            ) : null}
            <button type="button" className={`workspace-mode-item ${workspaceMode === 'adviser' ? 'is-active' : ''}`} onClick={() => onSwitchWorkspace('adviser')}>
              <span className="workspace-mode-item-left">
                <i className="fas fa-chalkboard-user" /> Adviser
              </span>
              {workspaceMode === 'adviser' && <i className="fas fa-circle-check" />}
            </button>
            <button type="button" className={`workspace-mode-item ${workspaceMode === 'panel' ? 'is-active' : ''}`} onClick={() => onSwitchWorkspace('panel')}>
              <span className="workspace-mode-item-left">
                <i className="fas fa-scale-balanced" /> Panel
              </span>
              {workspaceMode === 'panel' && <i className="fas fa-circle-check" />}
            </button>
          </div>
        </>
      }
      profileActions={[
        { label: 'Profile Settings', icon: 'fa-user-pen', href: `${basePath}/profile` },
        { label: 'Notifications', icon: 'fa-bell', href: `${basePath}/notifications` },
        {
          label: 'Sign Out',
          icon: 'fa-right-from-bracket',
          danger: true,
          onClick: requestLogout
        }
      ]}
    />
  );
}
