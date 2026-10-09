'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  WORKSPACE_MODE_STORAGE_KEY,
  getWorkspaceBasePath,
  getWorkspaceDashboardPath,
  getWorkspaceModeFromPathname,
  type WorkspaceMode
} from '@/components/adviser/shared/config/dashboard-utils';

/**
 * Derives the active workspace mode from the current URL pathname
 * and provides a function to switch workspaces by navigating to
 * the target workspace's dashboard.
 */
export function useWorkspaceMode() {
  const pathname = usePathname();
  const router = useRouter();
  const workspaceMode: WorkspaceMode = getWorkspaceModeFromPathname(pathname);
  const basePath = getWorkspaceBasePath(workspaceMode);
  const dashboardPath = getWorkspaceDashboardPath(workspaceMode);

  function switchWorkspace(mode: WorkspaceMode) {
    if (mode === workspaceMode) return;

    try {
      window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures.
    }

    router.push(getWorkspaceDashboardPath(mode));
  }

  return { workspaceMode, switchWorkspace, pathname, basePath, dashboardPath } as const;
}
