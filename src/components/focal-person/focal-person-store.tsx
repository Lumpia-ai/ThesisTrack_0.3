'use client';

// Client-side store for the Research Focal Person workflow (sample data persisted in this
// browser's localStorage). Both the focal person workspace and the Research Head's review of
// forwarded projects read and write it, so a forward/return made on one side shows on the other.
// Replace these actions with API calls once the workflow is stored server-side.

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { getStoredUser } from '@/lib/mock/auth';
import { findInventoryRecord } from '@/components/research-head/research-head-projects-data';
import {
  FORWARDABLE_STATUSES,
  SEED_WORKFLOW_STATE,
  createId,
  getDocumentCompletion,
  getScopedProjects,
  getValidationResult,
  getWorkflowRecord,
  normalizeScope,
  resolveFocalProject,
  type HistoryEntry,
  type WorkflowAudience,
  type WorkflowEvent,
  type WorkflowState
} from '@/components/focal-person/focal-person-data';

const STORAGE_KEY = 'thesistrack:focal-person-workflow:v1';

let cachedState: WorkflowState | null = null;
const listeners = new Set<() => void>();

function readState(): WorkflowState {
  if (cachedState) {
    return cachedState;
  }

  let stored: WorkflowState | null = null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    stored = raw ? (JSON.parse(raw) as WorkflowState) : null;
  } catch {
    stored = null;
  }

  cachedState = stored?.version === 1 ? stored : SEED_WORKFLOW_STATE;
  return cachedState;
}

function commit(next: WorkflowState) {
  cachedState = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): the change still applies for this session.
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Keep other open tabs in sync.
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedState = null;
      listener();
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function useWorkflowState() {
  return useSyncExternalStore(subscribe, readState, () => SEED_WORKFLOW_STATE);
}

type ActionResult = { ok: true } | { ok: false; error: string };

const currentUserName = (fallback: string) => getStoredUser()?.name || fallback;

function appendEvent(
  events: WorkflowEvent[],
  fields: Omit<WorkflowEvent, 'id' | 'at' | 'read'> & { read?: boolean },
  at: string
): WorkflowEvent[] {
  return [{ id: createId('evt'), at, read: false, ...fields }, ...events];
}

// ---------------------------------------------------------------------------------------------
// Research Focal Person actions
// ---------------------------------------------------------------------------------------------

export function saveValidationNote(projectId: string, note: string): ActionResult {
  const state = readState();
  const record = getWorkflowRecord(state, projectId);
  const trimmed = note.trim();

  if (!FORWARDABLE_STATUSES.includes(record.status)) {
    return { ok: false, error: 'Validation notes are locked while the project is with the Research Head.' };
  }

  if (trimmed === record.validationNote) {
    return { ok: true };
  }

  const project = findInventoryRecord(projectId);
  const result = project ? getValidationResult(project) : null;
  const at = new Date().toISOString();
  const entry: HistoryEntry = {
    id: createId('h'),
    projectId,
    action: 'Validation note updated',
    actor: currentUserName('Research Focal Person'),
    actorRole: 'Research Focal Person',
    at,
    previousStatus: record.status,
    newStatus: record.status,
    remarks: `${result?.complete ? 'Complete' : 'Incomplete'}${trimmed ? `: ${trimmed}` : ''}`
  };

  commit({
    ...state,
    records: { ...state.records, [projectId]: { ...record, validationNote: trimmed } },
    history: [entry, ...state.history]
  });

  return { ok: true };
}

export function forwardToResearchHead(projectId: string): ActionResult {
  const state = readState();
  const record = getWorkflowRecord(state, projectId);
  const project = findInventoryRecord(projectId);

  if (!project) {
    return { ok: false, error: 'Project not found in Project Inventory.' };
  }

  // Prevents duplicate forwarding: only pending or returned projects can be forwarded.
  if (!FORWARDABLE_STATUSES.includes(record.status)) {
    return { ok: false, error: `This project is already ${record.status.toLowerCase()}.` };
  }

  const validation = getValidationResult(project);

  if (!validation.complete) {
    return { ok: false, error: 'Complete all validation requirements before forwarding.' };
  }

  const actor = currentUserName('Research Focal Person');
  const at = new Date().toISOString();
  const documents = getDocumentCompletion(project);
  const isResubmission = record.status === 'Returned';

  const history: HistoryEntry[] = [
    {
      id: createId('h'),
      projectId,
      action: isResubmission ? 'Forwarded again to Research Head' : 'Forwarded to Research Head',
      actor,
      actorRole: 'Research Focal Person',
      at,
      previousStatus: 'Validated',
      newStatus: 'Forwarded to Research Head',
      remarks: isResubmission ? 'Required corrections completed.' : ''
    },
    {
      id: createId('h'),
      projectId,
      action: 'Validated',
      actor,
      actorRole: 'Research Focal Person',
      at,
      previousStatus: record.status,
      newStatus: 'Validated',
      remarks: record.validationNote || 'All validation requirements complete.'
    }
  ];

  let events = appendEvent(
    state.events,
    {
      type: 'forwarded',
      audience: 'research_head',
      projectId,
      title: isResubmission ? 'Returned project forwarded again' : 'Project forwarded for review',
      message: `${actor} forwarded "${project.title}" (${project.program}) after validation.`
    },
    at
  );
  events = appendEvent(
    events,
    {
      type: 'forwarded',
      audience: 'focal_person',
      projectId,
      title: 'Project forwarded to Research Head',
      message: `You forwarded "${project.title}" with a complete validation result.`,
      read: true
    },
    at
  );

  commit({
    ...state,
    records: {
      ...state.records,
      [projectId]: {
        ...record,
        status: 'Forwarded to Research Head',
        forward: {
          forwardedBy: actor,
          forwardedAt: at,
          progress: project.progressValue,
          documentCompletion: documents.label,
          validationResult: 'Complete',
          notes: record.validationNote
        }
      }
    },
    history: [...history, ...state.history],
    events
  });

  return { ok: true };
}

export function markEventRead(eventId: string) {
  const state = readState();
  commit({
    ...state,
    events: state.events.map((item) => (item.id === eventId ? { ...item, read: true } : item))
  });
}

export function markEventsRead(eventIds: string[]) {
  const ids = new Set(eventIds);
  const state = readState();
  commit({
    ...state,
    events: state.events.map((item) => (ids.has(item.id) ? { ...item, read: true } : item))
  });
}

// ---------------------------------------------------------------------------------------------
// Research Head decisions on forwarded projects
// ---------------------------------------------------------------------------------------------

export function returnForwardedProject(
  projectId: string,
  details: { reason: string; comments: string; requiredCorrections: string[] }
): ActionResult {
  const state = readState();
  const record = getWorkflowRecord(state, projectId);
  const project = findInventoryRecord(projectId);

  if (record.status !== 'Forwarded to Research Head' || !project) {
    return { ok: false, error: 'Only forwarded projects can be returned.' };
  }

  if (!details.reason.trim()) {
    return { ok: false, error: 'Enter a reason for returning the project.' };
  }

  const actor = currentUserName('Research Head');
  const at = new Date().toISOString();
  const corrections = details.requiredCorrections.map((item) => item.trim()).filter(Boolean);

  let events = appendEvent(
    state.events,
    {
      type: 'returned',
      audience: 'focal_person',
      projectId,
      title: 'Project returned by Research Head',
      message: `Reason: ${details.reason.trim()}.`
    },
    at
  );

  if (corrections.length) {
    events = appendEvent(
      events,
      {
        type: 'revision_required',
        audience: 'focal_person',
        projectId,
        title: 'Project requires revision',
        message: `${corrections.length} correction${corrections.length === 1 ? '' : 's'} required before the project can be forwarded again.`
      },
      at
    );
  }

  commit({
    ...state,
    records: {
      ...state.records,
      [projectId]: {
        ...record,
        status: 'Returned',
        lastReturn: {
          returnedBy: actor,
          returnedAt: at,
          reason: details.reason.trim(),
          comments: details.comments.trim(),
          requiredCorrections: corrections
        }
      }
    },
    history: [
      {
        id: createId('h'),
        projectId,
        action: 'Returned for Revision',
        actor,
        actorRole: 'Research Head',
        at,
        previousStatus: record.status,
        newStatus: 'Returned',
        remarks: details.reason.trim()
      },
      ...state.history
    ],
    events
  });

  return { ok: true };
}

export function approveForwardedProject(projectId: string, remarks: string): ActionResult {
  const state = readState();
  const record = getWorkflowRecord(state, projectId);
  const project = findInventoryRecord(projectId);

  if (record.status !== 'Forwarded to Research Head' || !project) {
    return { ok: false, error: 'Only forwarded projects can be approved.' };
  }

  const actor = currentUserName('Research Head');
  const at = new Date().toISOString();

  commit({
    ...state,
    records: { ...state.records, [projectId]: { ...record, status: 'Approved', decidedAt: at } },
    history: [
      {
        id: createId('h'),
        projectId,
        action: 'Approved',
        actor,
        actorRole: 'Research Head',
        at,
        previousStatus: record.status,
        newStatus: 'Approved',
        remarks: remarks.trim()
      },
      ...state.history
    ],
    events: appendEvent(
      state.events,
      {
        type: 'approved',
        audience: 'focal_person',
        projectId,
        title: 'Project approved by Research Head',
        message: remarks.trim() || `"${project.title}" was approved.`
      },
      at
    )
  });

  return { ok: true };
}

export const eventsFor = (state: WorkflowState, audience: WorkflowAudience, projectIds?: Set<string>) =>
  state.events.filter((item) => item.audience === audience && (!projectIds || projectIds.has(item.projectId)));

// ---------------------------------------------------------------------------------------------
// Assigned program scope (User.department of the signed-in focal person)
// ---------------------------------------------------------------------------------------------

type FocalScope = {
  loading: boolean;
  scope: string | null;
  name: string;
  email: string;
};

const FocalScopeContext = createContext<FocalScope>({ loading: true, scope: null, name: '', email: '' });

export function FocalPersonScopeProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<FocalScope>({ loading: true, scope: null, name: '', email: '' });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { user?: { department?: string | null; name?: string; email?: string } } | null) => {
        if (cancelled) return;
        const department = normalizeScope(payload?.user?.department);
        setValue({
          loading: false,
          scope: department || null,
          name: payload?.user?.name ?? '',
          email: payload?.user?.email ?? ''
        });
      })
      .catch(() => {
        if (!cancelled) setValue({ loading: false, scope: null, name: '', email: '' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <FocalScopeContext.Provider value={value}>{children}</FocalScopeContext.Provider>;
}

export const useFocalScope = () => useContext(FocalScopeContext);

/** Projects in the signed-in focal person's program, each resolved with its workflow record. */
export function useFocalProjects() {
  const { loading, scope } = useFocalScope();
  const state = useWorkflowState();
  const items = useMemo(
    () => getScopedProjects(scope).map((project) => resolveFocalProject(state, project)),
    [scope, state]
  );
  const projectIds = useMemo(() => new Set(items.map((item) => item.project.id)), [items]);

  return { loading, scope, state, items, projectIds };
}
