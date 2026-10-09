// Mock data for the Secretary workspace. The secretary is their own user (not
// faculty): they record the minutes of meeting for the Concept, Proposal and
// Final defenses and produce the reports of those meetings. UI-only — nothing
// here is persisted to the database.

export type DefenseStage = 'Concept' | 'Proposal' | 'Final Defense';

export const STAGE_META: Record<DefenseStage, { icon: string; label: string }> = {
  Concept: { icon: 'fa-lightbulb', label: 'Concept Presentation' },
  Proposal: { icon: 'fa-file-lines', label: 'Proposal Defense' },
  'Final Defense': { icon: 'fa-landmark', label: 'Final Defense' }
};

export const DEFENSE_STAGES = Object.keys(STAGE_META) as DefenseStage[];

// Minutes lifecycle. Colors follow the app's status palette:
// slate = waiting/locked, amber = waiting on you, blue = under review,
// rose = needs revision, emerald = done.
export type MinutesStatus = 'Upcoming' | 'To Record' | 'Draft' | 'Submitted to Chair' | 'Returned' | 'Confirmed';

export const MINUTES_STATUS_META: Record<MinutesStatus, { tone: 'slate' | 'amber' | 'blue' | 'rose' | 'emerald'; hint: string }> = {
  Upcoming: { tone: 'slate', hint: 'Scheduled — minutes open on the day of the defense.' },
  'To Record': { tone: 'amber', hint: 'Defense is today or done — minutes not started.' },
  Draft: { tone: 'amber', hint: 'Minutes started but not yet submitted to the chair.' },
  'Submitted to Chair': { tone: 'blue', hint: 'Waiting for the panel chair to confirm.' },
  Returned: { tone: 'rose', hint: 'The chair returned the minutes for correction.' },
  Confirmed: { tone: 'emerald', hint: 'Confirmed by the chair — official record.' }
};

export const MINUTES_STATUSES = Object.keys(MINUTES_STATUS_META) as MinutesStatus[];

export type Verdict = 'Passed' | 'Passed with Minor Revisions' | 'Passed with Major Revisions' | 'Redefense' | 'Failed';

export const VERDICTS: Verdict[] = ['Passed', 'Passed with Minor Revisions', 'Passed with Major Revisions', 'Redefense', 'Failed'];

export const VERDICT_TONE: Record<Verdict, 'emerald' | 'amber' | 'rose'> = {
  Passed: 'emerald',
  'Passed with Minor Revisions': 'emerald',
  'Passed with Major Revisions': 'amber',
  Redefense: 'rose',
  Failed: 'rose'
};

export type AttendeeRole = 'Panel Chair' | 'Panel Member' | 'Adviser' | 'Proponent';

export type Attendee = {
  id: string;
  name: string;
  role: AttendeeRole;
  present: boolean;
};

export type QuestionItem = {
  id: string;
  askedBy: string;
  question: string;
  response: string;
};

export type RevisionItem = {
  id: string;
  item: string;
  raisedBy: string;
};

export type MinutesRecord = {
  calledToOrder: string;
  adjourned: string;
  attendees: Attendee[];
  presentationSummary: string;
  questions: QuestionItem[];
  revisions: RevisionItem[];
  verdict: Verdict | '';
  remarks: string;
  chairNote: string;
};

export type DefenseMeeting = {
  id: string;
  stage: DefenseStage;
  title: string;
  groupName: string;
  program: string;
  adviser: string;
  chair: string;
  members: string[];
  proponents: string[];
  date: string; // ISO date-time of the sitting
  venue: string;
  status: MinutesStatus;
  updatedAt: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  minutes: MinutesRecord;
};

export type SecretaryEventType = 'assigned' | 'rescheduled' | 'returned' | 'confirmed' | 'reminder';

export const EVENT_META: Record<SecretaryEventType, { label: string; icon: string; color: string }> = {
  assigned: { label: 'New Assignment', icon: 'fa-calendar-plus', color: '#3B82F6' },
  rescheduled: { label: 'Rescheduled', icon: 'fa-calendar-days', color: '#8B5CF6' },
  returned: { label: 'Returned by Chair', icon: 'fa-rotate-left', color: '#E11D48' },
  confirmed: { label: 'Minutes Confirmed', icon: 'fa-circle-check', color: '#10B981' },
  reminder: { label: 'Reminder', icon: 'fa-bell', color: '#F59E0B' }
};

export type SecretaryEvent = {
  id: string;
  type: SecretaryEventType;
  meetingId: string;
  title: string;
  message: string;
  at: string;
  read: boolean;
};

function buildAttendees(meeting: Pick<DefenseMeeting, 'chair' | 'members' | 'adviser' | 'proponents'>, present = false): Attendee[] {
  return [
    { id: 'chair', name: meeting.chair, role: 'Panel Chair' as const },
    ...meeting.members.map((name, index) => ({ id: `member-${index}`, name, role: 'Panel Member' as const })),
    { id: 'adviser', name: meeting.adviser, role: 'Adviser' as const },
    ...meeting.proponents.map((name, index) => ({ id: `proponent-${index}`, name, role: 'Proponent' as const }))
  ].map((person) => ({ ...person, present }));
}

export function emptyMinutes(meeting: Pick<DefenseMeeting, 'chair' | 'members' | 'adviser' | 'proponents'>): MinutesRecord {
  return {
    calledToOrder: '',
    adjourned: '',
    attendees: buildAttendees(meeting),
    presentationSummary: '',
    questions: [],
    revisions: [],
    verdict: '',
    remarks: '',
    chairNote: ''
  };
}

type MeetingSeed = Omit<DefenseMeeting, 'minutes'> & { minutes?: Partial<MinutesRecord> };

const SEEDS: MeetingSeed[] = [
  {
    id: 'MOM-2026-014',
    stage: 'Final Defense',
    title: 'SmartAttend: Facial Recognition Attendance System for Higher Education',
    groupName: 'Group 3 — BSIT 4A',
    program: 'BSIT',
    adviser: 'Dr. Ricardo Cruz',
    chair: 'Dr. Maria Santos',
    members: ['Engr. Paolo Reyes', 'Prof. Lina Gomez'],
    proponents: ['Juan Dela Cruz', 'Ana Villanueva', 'Carlo Mendoza'],
    date: '2026-10-03T09:00:00+08:00',
    venue: 'CITC Room 301',
    status: 'To Record',
    updatedAt: null,
    submittedAt: null,
    confirmedAt: null
  },
  {
    id: 'MOM-2026-015',
    stage: 'Proposal',
    title: 'AgriSense: IoT-Based Soil Moisture Monitoring for Smallholder Farms',
    groupName: 'Group 7 — BSIT 3B',
    program: 'BSIT',
    adviser: 'Prof. Andrea Lim',
    chair: 'Engr. Paolo Reyes',
    members: ['Dr. Maria Santos', 'Prof. Noel Bautista'],
    proponents: ['Mika Torres', 'Jessa Ramos', 'Leo Fernandez'],
    date: '2026-10-03T13:30:00+08:00',
    venue: 'CITC Room 204',
    status: 'Draft',
    updatedAt: '2026-10-03T08:15:00+08:00',
    submittedAt: null,
    confirmedAt: null,
    minutes: {
      calledToOrder: '13:35',
      presentationSummary:
        'The group presented the problem of irregular irrigation among smallholder farms in Bukidnon and their proposed IoT sensor network with SMS alerts.'
    }
  },
  {
    id: 'MOM-2026-016',
    stage: 'Concept',
    title: 'ParkWise: Real-Time Campus Parking Availability Using Computer Vision',
    groupName: 'Group 2 — BSIT 3A',
    program: 'BSIT',
    adviser: 'Dr. Ricardo Cruz',
    chair: 'Prof. Lina Gomez',
    members: ['Prof. Noel Bautista'],
    proponents: ['Rafael Ong', 'Bea Castillo'],
    date: '2026-10-06T10:00:00+08:00',
    venue: 'CITC Room 301',
    status: 'Upcoming',
    updatedAt: null,
    submittedAt: null,
    confirmedAt: null
  },
  {
    id: 'MOM-2026-017',
    stage: 'Proposal',
    title: 'MedQueue: Outpatient Queue Management System for Rural Health Units',
    groupName: 'Group 5 — BSIT 3A',
    program: 'BSIT',
    adviser: 'Prof. Andrea Lim',
    chair: 'Dr. Maria Santos',
    members: ['Engr. Paolo Reyes', 'Prof. Lina Gomez'],
    proponents: ['Kyle Navarro', 'Trisha Aquino', 'Paul Sison'],
    date: '2026-10-08T14:00:00+08:00',
    venue: 'CITC Room 204',
    status: 'Upcoming',
    updatedAt: null,
    submittedAt: null,
    confirmedAt: null
  },
  {
    id: 'MOM-2026-011',
    stage: 'Final Defense',
    title: 'LibroTrack: RFID-Enabled Library Circulation System',
    groupName: 'Group 1 — BSIT 4B',
    program: 'BSIT',
    adviser: 'Prof. Noel Bautista',
    chair: 'Engr. Paolo Reyes',
    members: ['Dr. Maria Santos', 'Prof. Lina Gomez'],
    proponents: ['Sofia Reyes', 'Mark Dizon', 'Ella Cruz'],
    date: '2026-09-30T09:00:00+08:00',
    venue: 'CITC Room 301',
    status: 'Submitted to Chair',
    updatedAt: '2026-09-30T15:20:00+08:00',
    submittedAt: '2026-09-30T15:20:00+08:00',
    confirmedAt: null,
    minutes: {
      calledToOrder: '09:05',
      adjourned: '10:40',
      presentationSummary:
        'The proponents demonstrated the RFID circulation module, the overdue notification service, and the librarian dashboard. Testing results were presented from a two-week pilot at the CITC library.',
      questions: [
        { id: 'q1', askedBy: 'Engr. Paolo Reyes', question: 'How is tag collision handled when several books pass the reader at once?', response: 'The reader uses anti-collision polling; the pilot logged a 98.7% read rate.' },
        { id: 'q2', askedBy: 'Prof. Lina Gomez', question: 'Was the user acceptance survey validated?', response: 'The instrument was adapted from ISO 25010 and reviewed by the adviser.' }
      ],
      revisions: [
        { id: 'r1', item: 'Add the read-rate test results table to Chapter 4.', raisedBy: 'Engr. Paolo Reyes' },
        { id: 'r2', item: 'Revise the recommendations to cover multi-branch deployment.', raisedBy: 'Dr. Maria Santos' }
      ],
      verdict: 'Passed with Minor Revisions',
      remarks: 'Revisions to be submitted to the adviser within two weeks.'
    }
  },
  {
    id: 'MOM-2026-009',
    stage: 'Concept',
    title: 'EcoBin: Smart Waste Segregation Using Image Classification',
    groupName: 'Group 4 — BSIT 3B',
    program: 'BSIT',
    adviser: 'Dr. Ricardo Cruz',
    chair: 'Prof. Noel Bautista',
    members: ['Prof. Andrea Lim'],
    proponents: ['Gab Santiago', 'Nina Lopez'],
    date: '2026-09-26T10:00:00+08:00',
    venue: 'CITC Room 204',
    status: 'Returned',
    updatedAt: '2026-09-26T13:00:00+08:00',
    submittedAt: '2026-09-26T13:00:00+08:00',
    confirmedAt: null,
    minutes: {
      calledToOrder: '10:02',
      adjourned: '10:50',
      presentationSummary: 'The group pitched a smart bin that sorts biodegradable and recyclable waste using a camera and a trained classifier.',
      revisions: [{ id: 'r1', item: 'Narrow the scope to two waste categories for the prototype.', raisedBy: 'Prof. Noel Bautista' }],
      verdict: 'Passed with Major Revisions',
      chairNote: 'Please list the questions raised by Prof. Lim on the dataset source — they are missing from the minutes.'
    }
  },
  {
    id: 'MOM-2026-007',
    stage: 'Proposal',
    title: 'TutorMatch: Peer Tutoring Matchmaking Platform for Freshmen',
    groupName: 'Group 6 — BSIT 3A',
    program: 'BSIT',
    adviser: 'Prof. Lina Gomez',
    chair: 'Dr. Maria Santos',
    members: ['Prof. Noel Bautista', 'Prof. Andrea Lim'],
    proponents: ['Iris Manalo', 'Jomar Uy', 'Kate Robles'],
    date: '2026-09-22T14:00:00+08:00',
    venue: 'CITC Room 301',
    status: 'Confirmed',
    updatedAt: '2026-09-22T17:10:00+08:00',
    submittedAt: '2026-09-22T17:10:00+08:00',
    confirmedAt: '2026-09-23T09:00:00+08:00',
    minutes: {
      calledToOrder: '14:04',
      adjourned: '15:30',
      presentationSummary: 'The proponents presented Chapters 1–3, the matching algorithm based on course and schedule overlap, and the proposed evaluation plan.',
      questions: [{ id: 'q1', askedBy: 'Dr. Maria Santos', question: 'How will tutor quality be measured?', response: 'Through session ratings and pre/post quiz scores.' }],
      revisions: [
        { id: 'r1', item: 'Cite at least five studies on peer tutoring outcomes.', raisedBy: 'Prof. Andrea Lim' },
        { id: 'r2', item: 'Clarify the sampling method in Chapter 3.', raisedBy: 'Prof. Noel Bautista' }
      ],
      verdict: 'Passed with Minor Revisions',
      remarks: 'Proceed to development after the adviser signs off on the revisions.'
    }
  },
  {
    id: 'MOM-2026-005',
    stage: 'Concept',
    title: 'BayadNow: Cashless Canteen Payment Using QR Wallets',
    groupName: 'Group 8 — BSIT 3B',
    program: 'BSIT',
    adviser: 'Prof. Andrea Lim',
    chair: 'Engr. Paolo Reyes',
    members: ['Prof. Lina Gomez'],
    proponents: ['Dan Javier', 'Lea Pascual'],
    date: '2026-09-18T09:00:00+08:00',
    venue: 'CITC Room 204',
    status: 'Confirmed',
    updatedAt: '2026-09-18T11:30:00+08:00',
    submittedAt: '2026-09-18T11:30:00+08:00',
    confirmedAt: '2026-09-18T16:45:00+08:00',
    minutes: {
      calledToOrder: '09:03',
      adjourned: '09:55',
      presentationSummary: 'The group presented the concept of QR-based wallets for the campus canteen with top-up through the cashier.',
      verdict: 'Passed',
      remarks: 'Ready for Proposal.'
    }
  },
  {
    id: 'MOM-2026-003',
    stage: 'Final Defense',
    title: 'AlumniLink: Alumni Tracer and Job Matching Portal',
    groupName: 'Group 2 — BSIT 4A',
    program: 'BSIT',
    adviser: 'Prof. Noel Bautista',
    chair: 'Dr. Maria Santos',
    members: ['Engr. Paolo Reyes', 'Prof. Andrea Lim'],
    proponents: ['Rica Velasco', 'Tom Garcia', 'Ivy Salazar'],
    date: '2026-09-12T13:00:00+08:00',
    venue: 'CITC Room 301',
    status: 'Confirmed',
    updatedAt: '2026-09-12T16:00:00+08:00',
    submittedAt: '2026-09-12T16:00:00+08:00',
    confirmedAt: '2026-09-13T10:00:00+08:00',
    minutes: {
      calledToOrder: '13:02',
      adjourned: '14:45',
      presentationSummary: 'Full system demonstration including the tracer survey, job board and employer verification.',
      revisions: [{ id: 'r1', item: 'Rerun the usability test with at least 30 alumni respondents.', raisedBy: 'Prof. Andrea Lim' }],
      verdict: 'Redefense',
      remarks: 'Redefense to be scheduled after the usability test is redone.'
    }
  }
];

export function buildInitialMeetings(): DefenseMeeting[] {
  return SEEDS.map((seed) => {
    const started = seed.status !== 'Upcoming' && seed.status !== 'To Record';
    return {
      ...seed,
      minutes: {
        ...emptyMinutes(seed),
        attendees: buildAttendees(seed, started),
        ...seed.minutes
      }
    };
  });
}

export const INITIAL_EVENTS: SecretaryEvent[] = [
  { id: 'ev-1', type: 'reminder', meetingId: 'MOM-2026-014', title: 'Final defense today at 9:00 AM', message: 'SmartAttend — CITC Room 301. Open the minutes when the chair starts the session.', at: '2026-10-03T07:00:00+08:00', read: false },
  { id: 'ev-2', type: 'returned', meetingId: 'MOM-2026-009', title: 'Minutes returned for correction', message: 'Prof. Noel Bautista asked you to add the dataset questions raised by Prof. Lim.', at: '2026-09-27T08:30:00+08:00', read: false },
  { id: 'ev-3', type: 'assigned', meetingId: 'MOM-2026-017', title: 'Assigned to a proposal defense', message: 'MedQueue — Oct 8, 2:00 PM, CITC Room 204.', at: '2026-09-29T10:00:00+08:00', read: false },
  { id: 'ev-4', type: 'rescheduled', meetingId: 'MOM-2026-016', title: 'Concept presentation moved', message: 'ParkWise moved from Oct 2 to Oct 6, 10:00 AM.', at: '2026-09-28T14:20:00+08:00', read: true },
  { id: 'ev-5', type: 'confirmed', meetingId: 'MOM-2026-007', title: 'Minutes confirmed', message: 'Dr. Maria Santos confirmed the TutorMatch proposal defense minutes.', at: '2026-09-23T09:00:00+08:00', read: true },
  { id: 'ev-6', type: 'confirmed', meetingId: 'MOM-2026-005', title: 'Minutes confirmed', message: 'Engr. Paolo Reyes confirmed the BayadNow concept presentation minutes.', at: '2026-09-18T16:45:00+08:00', read: true }
];

// Fixed "now" so the mock schedule reads the same on every visit.
export const MOCK_NOW = new Date('2026-10-03T08:30:00+08:00');

export function isSameDay(iso: string, reference = MOCK_NOW) {
  const date = new Date(iso);
  return date.toDateString() === reference.toDateString();
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function formatRelative(iso: string, reference = MOCK_NOW) {
  const diffMinutes = Math.round((reference.getTime() - new Date(iso).getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export const meetingHref = (id: string) => `/secretary/meetings/${encodeURIComponent(id)}`;
