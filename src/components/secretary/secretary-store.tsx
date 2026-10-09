'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  INITIAL_EVENTS,
  MOCK_NOW,
  buildInitialMeetings,
  type DefenseMeeting,
  type MinutesRecord,
  type SecretaryEvent
} from '@/components/secretary/secretary-data';

// Mock-only store. Edits are kept in this browser's localStorage so the demo
// survives a reload; the database is never touched.
const STORAGE_KEY = 'thesistrack.secretary.mock.v1';

type SecretaryState = {
  meetings: DefenseMeeting[];
  events: SecretaryEvent[];
};

type SecretaryStore = SecretaryState & {
  saveMinutes: (id: string, minutes: MinutesRecord) => void;
  submitToChair: (id: string, minutes: MinutesRecord) => void;
  markEventRead: (id: string) => void;
  markEventsRead: (ids: string[]) => void;
  resetDemo: () => void;
};

const SecretaryContext = createContext<SecretaryStore | null>(null);

function initialState(): SecretaryState {
  return { meetings: buildInitialMeetings(), events: INITIAL_EVENTS.map((event) => ({ ...event })) };
}

function readStored(): SecretaryState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SecretaryState;
    return Array.isArray(parsed.meetings) && Array.isArray(parsed.events) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(state: SecretaryState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private window, blocked site data) — the demo still works in memory.
  }
}

export function SecretaryStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SecretaryState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) setState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStored(state);
  }, [hydrated, state]);

  const updateMeeting = useCallback((id: string, update: (meeting: DefenseMeeting) => DefenseMeeting) => {
    setState((current) => ({
      ...current,
      meetings: current.meetings.map((meeting) => (meeting.id === id ? update(meeting) : meeting))
    }));
  }, []);

  const saveMinutes = useCallback(
    (id: string, minutes: MinutesRecord) =>
      updateMeeting(id, (meeting) => ({
        ...meeting,
        minutes,
        // A returned record stays "Returned" until it is resubmitted.
        status: meeting.status === 'Returned' ? 'Returned' : 'Draft',
        updatedAt: MOCK_NOW.toISOString()
      })),
    [updateMeeting]
  );

  const submitToChair = useCallback(
    (id: string, minutes: MinutesRecord) =>
      updateMeeting(id, (meeting) => ({
        ...meeting,
        minutes: { ...minutes, chairNote: '' },
        status: 'Submitted to Chair',
        updatedAt: MOCK_NOW.toISOString(),
        submittedAt: MOCK_NOW.toISOString()
      })),
    [updateMeeting]
  );

  const markEventsRead = useCallback((ids: string[]) => {
    setState((current) => ({
      ...current,
      events: current.events.map((event) => (ids.includes(event.id) ? { ...event, read: true } : event))
    }));
  }, []);

  const markEventRead = useCallback((id: string) => markEventsRead([id]), [markEventsRead]);
  const resetDemo = useCallback(() => setState(initialState()), []);

  const value = useMemo(
    () => ({ ...state, saveMinutes, submitToChair, markEventRead, markEventsRead, resetDemo }),
    [markEventRead, markEventsRead, resetDemo, saveMinutes, state, submitToChair]
  );

  return <SecretaryContext.Provider value={value}>{children}</SecretaryContext.Provider>;
}

export function useSecretary() {
  const store = useContext(SecretaryContext);
  if (!store) throw new Error('useSecretary must be used inside SecretaryStoreProvider');
  return store;
}

export function sortByDate(meetings: DefenseMeeting[], direction: 'asc' | 'desc' = 'asc') {
  const sign = direction === 'asc' ? 1 : -1;
  return [...meetings].sort((left, right) => sign * (new Date(left.date).getTime() - new Date(right.date).getTime()));
}
