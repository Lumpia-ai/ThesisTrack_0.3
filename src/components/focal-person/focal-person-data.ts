// Research Focal Person workflow — SAMPLE DATA for UI demonstration; replace with an API once the
// validation workflow is stored (AuditLog for history, Notification for events).
//
// The focal person monitors, validates, and forwards projects; the Research Head decides. This file
// holds ONLY the workflow layer (validation status, notes, forward/return records, history, events),
// keyed by project id. Project details, milestones (Progress Monitoring), and supporting documents
// are always read from Project Inventory (research-head-projects-data) and never copied here.

import {
  INVENTORY_RECORDS,
  type InventoryRecord
} from '@/components/research-head/research-head-projects-data';

export type WorkflowStatus = 'Pending Validation' | 'Forwarded to Research Head' | 'Returned' | 'Approved';

// Statuses from which the focal person may forward. A forwarded project can only be forwarded
// again after the Research Head returns it.
export const FORWARDABLE_STATUSES: WorkflowStatus[] = ['Pending Validation', 'Returned'];

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  'Pending Validation',
  'Forwarded to Research Head',
  'Returned',
  'Approved'
];

export type ActorRole = 'Program Head' | 'Research Focal Person' | 'Research Head' | 'Adviser';

export type HistoryEntry = {
  id: string;
  projectId: string;
  action: string;
  actor: string;
  actorRole: ActorRole;
  at: string; // ISO date-time
  previousStatus: string;
  newStatus: string;
  remarks: string;
};

export type ForwardRecord = {
  forwardedBy: string;
  forwardedAt: string;
  progress: number;
  documentCompletion: string;
  validationResult: 'Complete';
  notes: string;
};

export type ReturnRecord = {
  returnedBy: string;
  returnedAt: string;
  reason: string;
  comments: string;
  requiredCorrections: string[];
};

export type WorkflowRecord = {
  projectId: string;
  status: WorkflowStatus;
  validationNote: string;
  forward: ForwardRecord | null;
  lastReturn: ReturnRecord | null;
  decidedAt: string | null; // Research Head approval time
};

export type WorkflowEventType =
  | 'new_validation'
  | 'info_updated'
  | 'milestone_updated'
  | 'document_uploaded'
  | 'forwarded'
  | 'returned'
  | 'revision_required'
  | 'approved'
  | 'completed';

export type WorkflowAudience = 'focal_person' | 'research_head';

export type WorkflowEvent = {
  id: string;
  type: WorkflowEventType;
  audience: WorkflowAudience;
  projectId: string;
  title: string;
  message: string;
  at: string;
  read: boolean;
};

export type WorkflowState = {
  version: 1;
  records: Record<string, WorkflowRecord>;
  history: HistoryEntry[];
  events: WorkflowEvent[];
};

export const EVENT_META: Record<WorkflowEventType, { label: string; icon: string; color: string }> = {
  new_validation: { label: 'New for Validation', icon: 'fa-inbox', color: 'var(--primary)' },
  info_updated: { label: 'Project Updated', icon: 'fa-pen-to-square', color: 'var(--primary)' },
  milestone_updated: { label: 'Project Stage Updated', icon: 'fa-flag-checkered', color: 'var(--primary)' },
  document_uploaded: { label: 'Document Uploaded', icon: 'fa-file-arrow-up', color: 'var(--primary)' },
  forwarded: { label: 'Forwarded', icon: 'fa-share-from-square', color: 'var(--primary)' },
  returned: { label: 'Returned', icon: 'fa-rotate-left', color: 'var(--danger)' },
  revision_required: { label: 'Revision Required', icon: 'fa-triangle-exclamation', color: 'var(--warning)' },
  approved: { label: 'Approved', icon: 'fa-circle-check', color: 'var(--success)' },
  completed: { label: 'Project Completed', icon: 'fa-flag', color: 'var(--success)' }
};

// ---------------------------------------------------------------------------------------------
// Validation rules. Everything below is computed from the Project Inventory record.
// ---------------------------------------------------------------------------------------------

export const REQUIRED_DOCUMENT_TYPES = ['Manuscript', 'Approval Sheet', 'Progress Report'];
// Documents that count as the research output (beyond the manuscript itself).
export const OUTPUT_DOCUMENT_TYPES = ['Dataset', 'Presentation', 'Evidence', 'Source Code', 'Impact Report'];

export type ChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  missing: string[];
};

export type ValidationResult = {
  complete: boolean;
  items: ChecklistItem[];
  missing: string[];
};

export function getDocumentCompletion(project: InventoryRecord) {
  const provided = REQUIRED_DOCUMENT_TYPES.filter((type) =>
    project.documents.some((document) => document.type === type && document.status !== 'Rejected')
  );

  return {
    provided: provided.length,
    required: REQUIRED_DOCUMENT_TYPES.length,
    missingTypes: REQUIRED_DOCUMENT_TYPES.filter((type) => !provided.includes(type)),
    label: `${provided.length}/${REQUIRED_DOCUMENT_TYPES.length}`,
    percent: Math.round((provided.length / REQUIRED_DOCUMENT_TYPES.length) * 100)
  };
}

export function getValidationResult(project: InventoryRecord): ValidationResult {
  const infoMissing = [
    !project.title.trim() && 'Title',
    !project.abstract.trim() && 'Abstract / description',
    !project.researchType.trim() && 'Research type',
    !project.dateStarted.trim() && 'Date started',
    !project.keywords.trim() && 'Keywords'
  ].filter(Boolean) as string[];

  const researcherMissing = project.researchers.filter((name) => name.trim()).length
    ? []
    : ['No researchers are recorded for this project'];

  const adviserMissing = project.adviser.trim() ? [] : ['No adviser is assigned'];

  const milestoneMissing = project.milestones.length
    ? project.milestones
        .filter((milestone) => milestone.status === 'Completed' && !milestone.completedDate)
        .map((milestone) => `"${milestone.title}" is marked completed but has no completion date`)
    : ['No project stages are recorded in Progress Monitoring'];

  const documents = getDocumentCompletion(project);
  const documentMissing = documents.missingTypes.map((type) => `${type} not uploaded`);

  const approvalMissing = project.approvals
    .filter((approval) => approval.status !== 'Approved')
    .map((approval) => `${approval.role} approval is still pending`);

  const hasOutput = project.documents.some(
    (document) => OUTPUT_DOCUMENT_TYPES.includes(document.type) && document.status === 'Verified'
  );
  const outputMissing = [
    !hasOutput && 'No verified research output (dataset, evidence, presentation, or source code)',
    ...project.documents
      .filter((document) => document.status !== 'Verified')
      .map((document) => `${document.name} is ${document.status.toLowerCase()}`)
  ].filter(Boolean) as string[];

  const items: ChecklistItem[] = [
    { key: 'info', label: 'Project information complete', passed: !infoMissing.length, missing: infoMissing.map((field) => `${field} is missing`) },
    { key: 'researchers', label: 'Researcher information complete', passed: !researcherMissing.length, missing: researcherMissing },
    { key: 'adviser', label: 'Adviser assigned', passed: !adviserMissing.length, missing: adviserMissing },
    { key: 'milestones', label: 'Required project stages recorded', passed: !milestoneMissing.length, missing: milestoneMissing },
    { key: 'documents', label: 'Required supporting documents uploaded', passed: !documentMissing.length, missing: documentMissing },
    { key: 'approvals', label: 'Required approvals completed', passed: !approvalMissing.length, missing: approvalMissing },
    { key: 'output', label: 'Research output/documentation complete', passed: !outputMissing.length, missing: outputMissing }
  ];

  return {
    complete: items.every((item) => item.passed),
    items,
    missing: items.flatMap((item) => item.missing)
  };
}

export function getMilestoneSummary(project: InventoryRecord) {
  const count = (status: string) => project.milestones.filter((milestone) => milestone.status === status).length;

  return {
    completed: count('Completed'),
    ongoing: count('Ongoing'),
    pending: count('Pending'),
    total: project.milestones.length
  };
}

export const getResearchState = (project: InventoryRecord) =>
  project.status === 'Completed' ? 'Completed' : 'Ongoing';

// ---------------------------------------------------------------------------------------------
// Program scope. A focal person sees only projects of the program/department on their account
// (User.department), e.g. "BSIT" (one program) or "IT" (every program in the department).
// ---------------------------------------------------------------------------------------------

export function normalizeScope(value: string | null | undefined) {
  return (value ?? '')
    .toUpperCase()
    .replace(/\bDEPARTMENT\b|\bDEPT\.?\b|\bPROGRAM\b/g, '')
    .trim();
}

export function isProjectInScope(project: InventoryRecord, scope: string) {
  const normalized = normalizeScope(scope);
  return Boolean(normalized) && (project.program.toUpperCase() === normalized || project.department.toUpperCase() === normalized);
}

export function getScopedProjects(scope: string | null) {
  return scope ? INVENTORY_RECORDS.filter((project) => isProjectInScope(project, scope)) : [];
}

// ---------------------------------------------------------------------------------------------
// Resolving a project with its workflow record.
// ---------------------------------------------------------------------------------------------

export const defaultWorkflowRecord = (projectId: string): WorkflowRecord => ({
  projectId,
  status: 'Pending Validation',
  validationNote: '',
  forward: null,
  lastReturn: null,
  decidedAt: null
});

export const getWorkflowRecord = (state: WorkflowState, projectId: string) =>
  state.records[projectId] ?? defaultWorkflowRecord(projectId);

export type FocalProject = {
  project: InventoryRecord;
  workflow: WorkflowRecord;
  validation: ValidationResult;
  documents: ReturnType<typeof getDocumentCompletion>;
  researchState: 'Ongoing' | 'Completed';
};

export function resolveFocalProject(state: WorkflowState, project: InventoryRecord): FocalProject {
  return {
    project,
    workflow: getWorkflowRecord(state, project.id),
    validation: getValidationResult(project),
    documents: getDocumentCompletion(project),
    researchState: getResearchState(project)
  };
}

export const canForward = (item: FocalProject) =>
  item.validation.complete && FORWARDABLE_STATUSES.includes(item.workflow.status);

// ---------------------------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------------------------

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

export const formatDate = (iso: string | null | undefined) => (iso ? DATE_FORMAT.format(new Date(iso)) : '—');
export const formatDateTime = (iso: string | null | undefined) => (iso ? DATE_TIME_FORMAT.format(new Date(iso)) : '—');

export function daysSince(iso: string, now = new Date()) {
  const start = new Date(iso);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
}

export function formatRelative(iso: string, now = new Date()) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} hr ago`;
  if (minutes < 60 * 24 * 2) return 'Yesterday';
  return formatDate(iso);
}

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ---------------------------------------------------------------------------------------------
// Seed workflow (sample data, IT department).
// ---------------------------------------------------------------------------------------------

const FOCAL_PERSON = 'Engr. Lara Mercado';
const PROGRAM_HEAD = 'Prof. Elena Martinez';
const RESEARCH_HEAD = 'School Research Head';

const history = (
  id: string,
  projectId: string,
  action: string,
  actor: string,
  actorRole: ActorRole,
  at: string,
  previousStatus: string,
  newStatus: string,
  remarks = ''
): HistoryEntry => ({ id, projectId, action, actor, actorRole, at, previousStatus, newStatus, remarks });

const event = (
  id: string,
  type: WorkflowEventType,
  projectId: string,
  title: string,
  message: string,
  at: string,
  read = false,
  audience: WorkflowAudience = 'focal_person'
): WorkflowEvent => ({ id, type, audience, projectId, title, message, at, read });

export const SEED_WORKFLOW_STATE: WorkflowState = {
  version: 1,
  records: {
    'CAP-IT-2025-014': {
      projectId: 'CAP-IT-2025-014',
      status: 'Forwarded to Research Head',
      validationNote: 'All requirements verified. Manuscript, approval sheet, and Q3 progress report are on file.',
      forward: {
        forwardedBy: FOCAL_PERSON,
        forwardedAt: '2026-09-22T10:15:00+08:00',
        progress: 78,
        documentCompletion: '3/3',
        validationResult: 'Complete',
        notes: 'All requirements verified. Manuscript, approval sheet, and Q3 progress report are on file.'
      },
      lastReturn: null,
      decidedAt: null
    },
    'CAP-IS-2026-002': {
      projectId: 'CAP-IS-2026-002',
      status: 'Returned',
      validationNote: 'Revised manuscript (v2) and UAT results were uploaded on Sep 26. Ready to forward again.',
      forward: {
        forwardedBy: FOCAL_PERSON,
        forwardedAt: '2026-09-22T11:00:00+08:00',
        progress: 80,
        documentCompletion: '3/3',
        validationResult: 'Complete',
        notes: 'Complete. Partner endorsement from the Municipality of Opol is attached to the manuscript.'
      },
      lastReturn: {
        returnedBy: RESEARCH_HEAD,
        returnedAt: '2026-09-24T14:30:00+08:00',
        reason: 'Incomplete results chapter and manuscript formatting',
        comments:
          'Chapter 4 does not summarize the user acceptance testing results, and the manuscript does not follow the institutional format. Please attach the UAT results as evidence.',
        requiredCorrections: [
          'Attach the UAT results as a supporting document',
          'Add the UAT summary to Chapter 4',
          'Revise the manuscript to the institutional format'
        ]
      },
      decidedAt: null
    },
    'CAP-IT-2026-003': {
      projectId: 'CAP-IT-2026-003',
      status: 'Pending Validation',
      validationNote: '',
      forward: null,
      lastReturn: null,
      decidedAt: null
    },
    'CAP-IT-2026-007': {
      projectId: 'CAP-IT-2026-007',
      status: 'Pending Validation',
      validationNote:
        'Waiting on the Program Head approval and the signed approval sheet. Chapters 1-3 completion date is missing in Progress Monitoring; coordinated with Dr. Cruz.',
      forward: null,
      lastReturn: null,
      decidedAt: null
    },
    'CAP-IT-2026-011': {
      projectId: 'CAP-IT-2026-011',
      status: 'Approved',
      validationNote: 'Complete. Final manuscript and source code archive verified.',
      forward: {
        forwardedBy: FOCAL_PERSON,
        forwardedAt: '2026-09-01T09:30:00+08:00',
        progress: 100,
        documentCompletion: '3/3',
        validationResult: 'Complete',
        notes: 'Complete. Final manuscript and source code archive verified.'
      },
      lastReturn: null,
      decidedAt: '2026-09-10T15:00:00+08:00'
    }
  },
  history: [
    history('h-011-1', 'CAP-IT-2026-011', 'Approved', PROGRAM_HEAD, 'Program Head', '2026-08-29T10:00:00+08:00', 'For Program Head Review', 'Pending Validation', 'Final manuscript approved for research office review.'),
    history('h-011-2', 'CAP-IT-2026-011', 'Validated', FOCAL_PERSON, 'Research Focal Person', '2026-09-01T09:25:00+08:00', 'Pending Validation', 'Validated', 'Complete. Final manuscript and source code archive verified.'),
    history('h-011-3', 'CAP-IT-2026-011', 'Forwarded to Research Head', FOCAL_PERSON, 'Research Focal Person', '2026-09-01T09:30:00+08:00', 'Validated', 'Forwarded to Research Head'),
    history('h-011-4', 'CAP-IT-2026-011', 'Approved', RESEARCH_HEAD, 'Research Head', '2026-09-10T15:00:00+08:00', 'Forwarded to Research Head', 'Approved', 'Approved for repository release.'),

    history('h-014-1', 'CAP-IT-2025-014', 'Approved', PROGRAM_HEAD, 'Program Head', '2026-09-20T09:00:00+08:00', 'For Program Head Review', 'Pending Validation', 'Endorsed for final technical review.'),
    history('h-014-2', 'CAP-IT-2025-014', 'Validated', FOCAL_PERSON, 'Research Focal Person', '2026-09-22T10:10:00+08:00', 'Pending Validation', 'Validated', 'All requirements verified. Manuscript, approval sheet, and Q3 progress report are on file.'),
    history('h-014-3', 'CAP-IT-2025-014', 'Forwarded to Research Head', FOCAL_PERSON, 'Research Focal Person', '2026-09-22T10:15:00+08:00', 'Validated', 'Forwarded to Research Head'),

    history('h-002-1', 'CAP-IS-2026-002', 'Approved', PROGRAM_HEAD, 'Program Head', '2026-09-20T13:00:00+08:00', 'For Program Head Review', 'Pending Validation', 'Approved with partner endorsement.'),
    history('h-002-2', 'CAP-IS-2026-002', 'Validated', FOCAL_PERSON, 'Research Focal Person', '2026-09-22T10:55:00+08:00', 'Pending Validation', 'Validated', 'Complete. Partner endorsement from the Municipality of Opol is attached to the manuscript.'),
    history('h-002-3', 'CAP-IS-2026-002', 'Forwarded to Research Head', FOCAL_PERSON, 'Research Focal Person', '2026-09-22T11:00:00+08:00', 'Validated', 'Forwarded to Research Head'),
    history('h-002-4', 'CAP-IS-2026-002', 'Returned for Revision', RESEARCH_HEAD, 'Research Head', '2026-09-24T14:30:00+08:00', 'Forwarded to Research Head', 'Returned', 'Incomplete results chapter and manuscript formatting'),

    history('h-007-1', 'CAP-IT-2026-007', 'Validation note added', FOCAL_PERSON, 'Research Focal Person', '2026-09-25T11:00:00+08:00', 'Pending Validation', 'Pending Validation', 'Incomplete: Program Head approval and signed approval sheet pending.'),

    history('h-003-1', 'CAP-IT-2026-003', 'Approved', PROGRAM_HEAD, 'Program Head', '2026-09-25T16:00:00+08:00', 'For Program Head Review', 'Pending Validation', 'Approved for validation.')
  ],
  events: [
    event('e-1', 'document_uploaded', 'CAP-IT-2026-003', 'New supporting document uploaded', 'Field-Test-Evidence.zip was added to the Barangay Health Records project.', '2026-09-26T15:20:00+08:00'),
    event('e-2', 'document_uploaded', 'CAP-IS-2026-002', 'Corrections uploaded for a returned project', 'LGU-Procurement-Manuscript-v2.pdf and UAT-Results-Opol.xlsx were uploaded after the return.', '2026-09-26T10:05:00+08:00'),
    event('e-3', 'new_validation', 'CAP-IT-2026-003', 'New project available for validation', 'The Program Head approved the Barangay Health Records project. It is ready for your validation.', '2026-09-25T16:05:00+08:00'),
    event('e-4', 'info_updated', 'CAP-IT-2026-007', 'Project information updated', 'The research abstract and keywords of the Campus Parking project were revised.', '2026-09-25T09:40:00+08:00', true),
    event('e-5', 'returned', 'CAP-IS-2026-002', 'Project returned by Research Head', 'Reason: Incomplete results chapter and manuscript formatting.', '2026-09-24T14:30:00+08:00', true),
    event('e-6', 'revision_required', 'CAP-IS-2026-002', 'Project requires revision', 'Three corrections are required before the project can be forwarded again.', '2026-09-24T14:31:00+08:00', true),
    event('e-7', 'milestone_updated', 'CAP-IT-2026-007', 'Project stage updated', 'Model Training is now in progress.', '2026-09-24T08:15:00+08:00', true),
    event('e-8', 'forwarded', 'CAP-IT-2025-014', 'Project forwarded to Research Head', 'Forwarded by Engr. Lara Mercado with a complete validation result.', '2026-09-22T10:15:00+08:00', true),
    event('e-8-rh', 'forwarded', 'CAP-IT-2025-014', 'Project forwarded for review', 'The Research Focal Person forwarded "AI-Powered Learning Management System with Predictive Analytics" after validation.', '2026-09-22T10:15:00+08:00', false, 'research_head'),
    event('e-9', 'completed', 'CAP-IT-2026-011', 'Project completed', 'The Online Thesis Defense Scheduling project completed all project stages.', '2026-09-15T13:00:00+08:00', true),
    event('e-10', 'approved', 'CAP-IT-2026-011', 'Project approved by Research Head', 'Approved for repository release.', '2026-09-10T15:00:00+08:00', true)
  ]
};
