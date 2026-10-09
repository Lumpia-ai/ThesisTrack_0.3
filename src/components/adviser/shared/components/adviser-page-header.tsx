'use client';

import type { ReactNode } from 'react';
import { WORKSPACE_META } from '@/components/adviser/shared/config/dashboard-utils';
import { AdviserShellBrand } from '@/components/adviser/shared/components/adviser-shell-brand';
import { AdviserSidebarToggle } from '@/components/adviser/shared/components/adviser-sidebar-toggle';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';

type AdviserPageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  titleId?: string;
  descriptionId?: string;
  showPageHeader?: boolean;
};

export function AdviserPageHeader({
  title,
  description,
  actions,
  titleId,
  descriptionId,
  showPageHeader = true
}: AdviserPageHeaderProps) {
  const { workspaceMode } = useWorkspaceMode();
  const workspaceMeta = WORKSPACE_META[workspaceMode];
  const secondaryMetaLabel =
    workspaceMode === 'adviser' ? 'IT supervision flow' : 'Defense evaluation flow';

  return (
    <>
      {showPageHeader ? (
        <header className="top-nav" aria-labelledby={titleId || 'adviser-page-title'}>
          <div className="top-nav-leading">
            <div className="page-title">
              <div className="page-title-context">
                <span className="page-kicker">{workspaceMeta.pillLabel}</span>
                <span className="page-breadcrumb" aria-hidden="true">
                  <i className="fas fa-angle-right" />
                  <span>{title}</span>
                </span>
              </div>
              <h1 id={titleId || 'adviser-page-title'}>{title}</h1>
              <p id={descriptionId}>{description}</p>
            </div>
          </div>
          {actions ? (
            <div className="top-nav-actions">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}
    </>
  );
}
