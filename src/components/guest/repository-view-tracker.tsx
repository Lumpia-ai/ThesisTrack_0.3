'use client';

import { useEffect } from 'react';

// Records one view of a repository record for the Library's view statistics.
// Renders nothing. The server decides whether the visitor counts as a guest or
// under their department, and ignores repeat loads within a short window.
export function RepositoryViewTracker({ repositoryProjectId }: { repositoryProjectId: string }) {
  useEffect(() => {
    void fetch(`/api/repository/projects/${encodeURIComponent(repositoryProjectId)}/views`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true
    }).catch(() => undefined);
  }, [repositoryProjectId]);

  return null;
}
