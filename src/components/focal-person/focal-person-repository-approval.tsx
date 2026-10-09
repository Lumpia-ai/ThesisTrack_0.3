'use client';

import { FocalPersonShell } from '@/components/focal-person/focal-person-shell';
import { RepositoryApprovalBoard } from '@/components/research-head/research-head-final-repository-approval';

// The department's Research Focal Person gives the final approval that publishes a completed
// project to the institutional repository. The queue is limited to their department server-side.
export function FocalPersonRepositoryApproval() {
  return (
    <RepositoryApprovalBoard
      canApprove
      renderShell={(children) => (
        <FocalPersonShell activeNav="repository-approval" title="Repository Approval">
          {children}
        </FocalPersonShell>
      )}
    />
  );
}
