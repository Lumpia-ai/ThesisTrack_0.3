'use client';

import { PortalShellBrand } from '@/components/shared/portal-shell-brand';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';

export function AdviserShellBrand() {
  const { dashboardPath } = useWorkspaceMode();

  return (
    <PortalShellBrand
      className="adviser-shell-brand"
      href={dashboardPath}
      icon="fa-user-graduate"
      title="Thesis Track"
    />
  );
}
