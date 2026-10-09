// One place that decides what every file, schedule, and status is CALLED at each
// thesis stage, so labels are derived from where the project is instead of
// being typed (or guessed from file names) on each screen.
//
// Client-safe: no Prisma imports. The checkpoint keys mirror
// THESIS_MILESTONE_WORKFLOW in milestone-checkpoint-tracking.ts — keep them in sync.

export type ProjectStageKey = 'concept' | 'proposal' | 'development' | 'mock-defense' | 'final-defense' | 'completion';

export const PROJECT_STAGES: Array<{ key: ProjectStageKey; label: string; defenseLabel: string | null }> = [
  { key: 'concept', label: 'Concept', defenseLabel: 'Concept Presentation' },
  { key: 'proposal', label: 'Proposal', defenseLabel: 'Proposal Defense' },
  { key: 'development', label: 'Development', defenseLabel: null },
  { key: 'mock-defense', label: 'Pre-Final', defenseLabel: 'Pre-Final Defense' },
  { key: 'final-defense', label: 'Final', defenseLabel: 'Final Defense' },
  { key: 'completion', label: 'Completion', defenseLabel: null }
];

// What a file uploaded against each checkpoint IS, per stage. This is the label
// shown on the file everywhere (lists, defense packet, repository).
export const CHECKPOINT_FILE_LABELS: Record<string, { stage: ProjectStageKey; label: string }> = {
  'concept-title': { stage: 'concept', label: 'Concept Paper' },
  'concept-adviser-approval': { stage: 'concept', label: 'Concept Adviser Approval' },
  'concept-defense-application': { stage: 'concept', label: 'Concept Oral Defense Application' },
  'concept-presentation-scheduled': { stage: 'concept', label: 'Concept Presentation' },
  'concept-panel-approval': { stage: 'concept', label: 'Concept Panel Approval' },
  'proposal-chapters': { stage: 'proposal', label: 'Proposal Manuscript' },
  'proposal-adviser-review': { stage: 'proposal', label: 'Proposal Adviser Review' },
  'proposal-defense-application': { stage: 'proposal', label: 'Proposal Oral Defense Application' },
  'proposal-defense-scheduled': { stage: 'proposal', label: 'Proposal Defense' },
  'proposal-panel-evaluation': { stage: 'proposal', label: 'Proposal Panel Evaluation' },
  'proposal-final-approval': { stage: 'proposal', label: 'Proposal Final Approval' },
  'development-prototype': { stage: 'development', label: 'System / Prototype' },
  'development-progress-report': { stage: 'development', label: 'Development Progress Report' },
  'development-testing-evidence': { stage: 'development', label: 'Testing Evidence' },
  'development-adviser-monitoring': { stage: 'development', label: 'Development Adviser Monitoring' },
  'mock-presentation': { stage: 'mock-defense', label: 'Pre-Final Presentation' },
  'mock-defense-scheduled': { stage: 'mock-defense', label: 'Pre-Final Defense' },
  'mock-panel-comments': { stage: 'mock-defense', label: 'Pre-Final Panel Comments' },
  'mock-revisions-completed': { stage: 'mock-defense', label: 'Pre-Final Revisions' },
  'final-manuscript': { stage: 'final-defense', label: 'Final Manuscript' },
  'final-defense-application': { stage: 'final-defense', label: 'Final Oral Defense Application' },
  'final-defense-scheduled': { stage: 'final-defense', label: 'Final Defense' },
  'final-panel-approval': { stage: 'final-defense', label: 'Final Panel Approval' },
  'final-revisions-submitted': { stage: 'final-defense', label: 'Final Revisions' },
  'completion-approved-manuscript': { stage: 'completion', label: 'Approved Manuscript' },
  'completion-approval-sheet': { stage: 'completion', label: 'Approval Sheet' },
  'completion-repository-submission': { stage: 'completion', label: 'Repository Submission' },
  'completion-archive-confirmation': { stage: 'completion', label: 'Archive Confirmation' }
};

export function getStageLabel(stage: ProjectStageKey | null | undefined) {
  return PROJECT_STAGES.find((entry) => entry.key === stage)?.label ?? 'Unassigned';
}

export function getStageForCheckpointKey(checkpointKey: string | null | undefined): ProjectStageKey | null {
  return (checkpointKey && CHECKPOINT_FILE_LABELS[checkpointKey]?.stage) || null;
}

export function getCheckpointKeysForStage(stage: ProjectStageKey) {
  return Object.entries(CHECKPOINT_FILE_LABELS)
    .filter(([, entry]) => entry.stage === stage)
    .map(([key]) => key);
}

// Upload categories that say what KIND of file it is but not which stage it's
// for ("Presentation Files") — their label is prefixed with the stage the file
// was filed under, e.g. "Concept · Presentation Slides", "Final · Chapter 2".
const GENERIC_CATEGORY_LABELS: Record<string, string> = {
  'chapter-1': 'Chapter 1',
  'chapter-2': 'Chapter 2',
  'chapter-3': 'Chapter 3',
  'chapter-4': 'Chapter 4',
  'chapter-5': 'Chapter 5',
  'presentation-files': 'Presentation Slides',
  'supporting-documents': 'Supporting Document',
  'system-files': 'System Files',
  other: 'Other Document'
};

function titleCase(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// The label a file carries everywhere. Derived from the checkpoint it was filed
// under (which is decided from the project's stage at upload time, not from the
// file name); legacy uploads with no checkpoint fall back to their category.
export function getFileLabel(file: { checkpointKey?: string | null; documentCategory?: string | null; fileName?: string | null }) {
  const category = file.documentCategory?.trim().toLowerCase() || '';
  const checkpoint = file.checkpointKey ? CHECKPOINT_FILE_LABELS[file.checkpointKey] : null;
  const genericLabel = GENERIC_CATEGORY_LABELS[category];

  if (checkpoint && genericLabel) {
    return `${getStageLabel(checkpoint.stage)} · ${genericLabel}`;
  }
  if (checkpoint) return checkpoint.label;
  if (genericLabel) return genericLabel;
  if (category && category !== 'uncategorized') return titleCase(file.documentCategory!.trim());
  return file.fileName || 'Document';
}

// Defense schedule types are stored as their display name ("Proposal Defense").
export function getStageForScheduleType(scheduleType: string | null | undefined): ProjectStageKey | null {
  const normalized = String(scheduleType ?? '').trim().toLowerCase();
  return PROJECT_STAGES.find((entry) => entry.defenseLabel?.toLowerCase() === normalized)?.key ?? null;
}

export type DefenseLifecycleEvent = 'scheduled' | 'in-progress' | 'rated' | 'passed' | 'not-passed' | 'cancelled';

const DEFENSE_EVENT_SUFFIX: Record<DefenseLifecycleEvent, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  rated: 'Rated',
  passed: 'Passed',
  'not-passed': 'Not Passed',
  cancelled: 'Cancelled'
};

// "Concept Presentation Scheduled", "Proposal Defense In Progress", ...
export function getDefenseEventLabel(scheduleType: string | null | undefined, event: DefenseLifecycleEvent) {
  const stage = getStageForScheduleType(scheduleType);
  const name = PROJECT_STAGES.find((entry) => entry.key === stage)?.defenseLabel || scheduleType || 'Defense';
  return `${name} ${DEFENSE_EVENT_SUFFIX[event]}`;
}

// The adviser clearing a file is NOT the title/stage being "Approved" — only the
// panel decides that at the defense. What the adviser's clearance means depends
// on where the file sits in the flow: before a defense it readies the group for
// that defense; after one it confirms the panel's revisions were addressed.
const ADVISER_CLEARED_BY_STAGE: Record<ProjectStageKey, string> = {
  concept: 'Ready for Concept Presentation',
  proposal: 'Ready for Proposal Defense',
  development: 'Progress Checked',
  'mock-defense': 'Ready for Pre-Final Defense',
  'final-defense': 'Ready for Final Defense',
  completion: 'Cleared for Repository'
};

const POST_DEFENSE_CHECKPOINT_KEYS = new Set([
  'concept-panel-approval',
  'proposal-panel-evaluation',
  'proposal-final-approval',
  'mock-panel-comments',
  'mock-revisions-completed',
  'final-panel-approval',
  'final-revisions-submitted'
]);

export const ADVISER_REVISE_LABEL = 'Revise';

// Accepts a stage key ("final-defense"), a stage label ("Final"), or a defense
// name ("Proposal Defense") — callers have whichever their payload carries.
export function resolveStageKey(value: string | null | undefined): ProjectStageKey | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return PROJECT_STAGES.find((entry) =>
    entry.key === normalized ||
    entry.label.toLowerCase() === normalized ||
    entry.defenseLabel?.toLowerCase() === normalized
  )?.key ?? null;
}

// Reverse of CHECKPOINT_FILE_LABELS, for screens that only received the file's
// display label ("Concept Paper") rather than its checkpoint key.
export function getCheckpointKeyForFileLabel(label: string | null | undefined): string | null {
  const normalized = String(label ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return Object.entries(CHECKPOINT_FILE_LABELS).find(([, entry]) => entry.label.toLowerCase() === normalized)?.[0] ?? null;
}

// "Ready for Concept Presentation", "Ready for Final Defense", "Revisions Verified", ...
export function getAdviserClearedLabel(context: { checkpointKey?: string | null; stage?: string | null }) {
  if (context.checkpointKey && POST_DEFENSE_CHECKPOINT_KEYS.has(context.checkpointKey)) {
    return 'Revisions Verified';
  }
  const stage = getStageForCheckpointKey(context.checkpointKey) ?? resolveStageKey(context.stage);
  return stage ? ADVISER_CLEARED_BY_STAGE[stage] : 'Cleared by Adviser';
}

// "Concept Paper Submitted", "Final Manuscript Submitted", ...
export function getFileSubmittedLabel(checkpointKey: string | null | undefined) {
  const label = checkpointKey ? CHECKPOINT_FILE_LABELS[checkpointKey]?.label : null;
  return label ? `${label} Submitted` : 'Document Submitted';
}
