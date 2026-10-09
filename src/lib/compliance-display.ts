// Client-safe display helpers for compliance — kept apart from lib/compliance.ts,
// which pulls in the generated Prisma client.
import type { ComplianceDefensePayload } from '@/lib/compliance';

export type ComplianceDefense = ComplianceDefensePayload;
export type ComplianceSubmissionItem = ComplianceDefense['submissions'][number];

export const COMPLIANCE_STATUS_META: Record<string, { label: string; className: string; icon: string }> = {
  NOT_SUBMITTED: { label: 'Awaiting Submission', className: 'bg-slate-100 text-slate-700', icon: 'fa-hourglass-start' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-blue-50 text-blue-700', icon: 'fa-magnifying-glass' },
  NEEDS_REVISION: { label: 'Needs Revision', className: 'bg-amber-50 text-amber-800', icon: 'fa-rotate-left' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700', icon: 'fa-circle-check' }
};

export const COMPLIANCE_REVIEW_STATUS_META: Record<string, { label: string; className: string; icon: string }> = {
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-700', icon: 'fa-clock' },
  VERIFIED: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700', icon: 'fa-check' },
  NEEDS_REVISION: { label: 'Needs Revision', className: 'bg-amber-50 text-amber-800', icon: 'fa-pen' }
};

export function getComplianceStatusKey(defense: ComplianceDefense) {
  return defense.complianceStatus ?? 'NOT_SUBMITTED';
}

export function formatComplianceDate(value: string | null | undefined) {
  if (!value) return '—';

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function getCompliancePreviewHref(fileId: string) {
  return `/api/document-files/${fileId}/preview`;
}
