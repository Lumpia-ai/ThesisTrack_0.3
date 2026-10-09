/*
 * Sample data for the Defense Scheduler, so every tab, stage and conflict check can be
 * seen without real groups in the database. Everything here is flagged `isSample` and is
 * never sent to the API: the scheduler "publishes" sample-only queues locally and blocks
 * any queue that mixes sample and real groups (see handlePublish).
 */
import type { DefenseAssignment, FacultyOption, ScheduleProject } from '@/components/program-head/program-head-schedule';

export const SAMPLE_CODE_PREFIX = 'DEMO-';
export const SAMPLE_FACULTY_PREFIX = 'sample-faculty-';

export const isSampleCode = (code: string) => code.startsWith(SAMPLE_CODE_PREFIX);
export const isSampleFacultyId = (id: string) => id.startsWith(SAMPLE_FACULTY_PREFIX);

/** YYYY-MM-DD for `days` from today, skipping weekends, so sample defenses stay upcoming. */
function upcomingWeekday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const faculty = (index: number, name: string, role = 'ADVISER'): FacultyOption => ({
  id: `${SAMPLE_FACULTY_PREFIX}${index}`,
  name,
  department: 'IT',
  role,
  isSample: true
});

/** Advisers from the adviser mock data (so the "adviser can't sit on their own panel" lock shows), plus panel-only faculty. */
export const SAMPLE_FACULTY: FacultyOption[] = [
  faculty(1, 'Dr. Elena Santos'),
  faculty(2, 'Dr. Ricardo Cruz'),
  faculty(3, 'Dr. Paolo Navarro'),
  faculty(4, 'Prof. Liza Mendoza'),
  faculty(5, 'Prof. Grace Dela Cruz'),
  faculty(6, 'Engr. Mark Villanueva'),
  faculty(7, 'Dr. Carlo Bautista'),
  faculty(8, 'Dr. Ramon Garcia', 'PANEL'),
  faculty(9, 'Prof. Teresa Lim', 'PANEL')
];

const approved = (id: string, title: string) => ({ id, title, status: 'APPROVED', isApproved: true, submittedAt: null, reviewedAt: null });
const pending = (id: string, title: string, status = 'UNDER_REVIEW') => ({ id, title, status, isApproved: false, submittedAt: null, reviewedAt: null });

type SampleGroupInput = Omit<ScheduleProject, 'id' | 'groupId' | 'projectId' | 'department' | 'batchSection' | 'isSample'>;

const group = (input: SampleGroupInput): ScheduleProject => ({
  id: `sample-${input.code}`,
  groupId: `sample-${input.code}`,
  projectId: null,
  department: 'IT',
  batchSection: input.code,
  isSample: true,
  ...input
});

export const SAMPLE_GROUPS: ScheduleProject[] = [
  // Ready for a first schedule — one per stage
  group({
    code: 'DEMO-IT-01',
    title: 'Team Aurora',
    approvedTitle: 'Campus Lost-and-Found Portal with Image Matching',
    titles: [approved('t1', 'Campus Lost-and-Found Portal with Image Matching')],
    isEligible: true,
    adviser: 'Dr. Elena Santos',
    students: ['Ana Lim', 'Ben Ortiz', 'Cara Sy'],
    currentStage: 'Concept',
    eligibleStage: 'Concept Presentation',
    attemptCount: 1,
    scheduleStatus: 'Ready First Schedule'
  }),
  group({
    code: 'DEMO-IT-02',
    title: 'Team Borealis',
    approvedTitle: 'Clinic Queue Management System with SMS Alerts',
    titles: [approved('t2', 'Clinic Queue Management System with SMS Alerts'), pending('t2b', 'Pharmacy Inventory Forecasting', 'REJECTED')],
    isEligible: true,
    adviser: 'Dr. Paolo Navarro',
    students: ['Dan Uy', 'Eve Tan', 'Finn Go', 'Gia Co'],
    currentStage: 'Proposal',
    eligibleStage: 'Proposal Defense',
    attemptCount: 1,
    scheduleStatus: 'Ready First Schedule'
  }),
  group({
    code: 'DEMO-IT-03',
    title: 'Team Cirrus',
    approvedTitle: 'IoT-Based Classroom Energy Monitor',
    titles: [approved('t3', 'IoT-Based Classroom Energy Monitor')],
    isEligible: true,
    adviser: 'Prof. Liza Mendoza',
    students: ['Hana Yu', 'Ivan Sia', 'Jade Lee'],
    currentStage: 'Pre-Final',
    eligibleStage: 'Pre-Final Defense',
    attemptCount: 1,
    scheduleStatus: 'Ready First Schedule'
  }),
  group({
    code: 'DEMO-IT-04',
    title: 'Team Dorado',
    approvedTitle: 'Barangay Document Request and Tracking System',
    titles: [approved('t4', 'Barangay Document Request and Tracking System')],
    isEligible: true,
    adviser: 'Prof. Grace Dela Cruz',
    students: ['Kai Ong', 'Lia Dy', 'Max Chua'],
    currentStage: 'Final',
    eligibleStage: 'Final Defense',
    attemptCount: 1,
    scheduleStatus: 'Ready First Schedule'
  }),
  // Ready for reschedule — after a failed or redirected defense
  group({
    code: 'DEMO-IT-05',
    title: 'Team Equinox',
    approvedTitle: 'Adaptive Quiz Generator for Senior High Science',
    titles: [approved('t5', 'Adaptive Quiz Generator for Senior High Science')],
    isEligible: true,
    adviser: 'Engr. Mark Villanueva',
    students: ['Nia Sy', 'Omar Lao', 'Pia Tiu'],
    currentStage: 'Proposal',
    eligibleStage: 'Proposal Defense',
    attemptCount: 2,
    scheduleStatus: 'Ready for Reschedule',
    redefenseReason: { label: 'Redefense', detail: 'The panel requested a redefense after the Proposal Defense (scope and methodology).' }
  }),
  group({
    code: 'DEMO-IT-06',
    title: 'Team Fjord',
    approvedTitle: 'Tricycle Fare Estimator with Route Mapping',
    titles: [approved('t6', 'Tricycle Fare Estimator with Route Mapping'), pending('t6b', 'Jeepney Route Finder', 'REJECTED')],
    isEligible: true,
    adviser: 'Dr. Carlo Bautista',
    students: ['Quin Ang', 'Rae Chan', 'Sam Yap'],
    currentStage: 'Proposal',
    eligibleStage: 'Proposal Defense',
    attemptCount: 2,
    scheduleStatus: 'Ready for Reschedule',
    redefenseReason: {
      label: 'Redefense (New Title)',
      detail: 'The panel required a new title after the Proposal Defense.',
      previousTitle: 'Jeepney Route Finder'
    }
  }),
  // Already scheduled (see SAMPLE_ASSIGNMENTS)
  group({
    code: 'DEMO-IT-07',
    title: 'Team Gale',
    approvedTitle: 'Library Seat Reservation App',
    titles: [approved('t7', 'Library Seat Reservation App')],
    isEligible: true,
    adviser: 'Dr. Ricardo Cruz',
    students: ['Tia Bo', 'Uri Ko', 'Val Pe'],
    currentStage: 'Proposal',
    eligibleStage: 'Proposal Defense',
    attemptCount: 1,
    scheduleStatus: 'Scheduled'
  }),
  group({
    code: 'DEMO-IT-08',
    title: 'Team Halo',
    approvedTitle: 'Crop Disease Detection Using Leaf Images',
    titles: [approved('t8', 'Crop Disease Detection Using Leaf Images')],
    isEligible: true,
    adviser: 'Dr. Elena Santos',
    students: ['Wes Lu', 'Xia Ng', 'Yen Po'],
    currentStage: 'Final',
    eligibleStage: 'Final Defense',
    attemptCount: 1,
    scheduleStatus: 'Scheduled'
  }),
  // Revision required
  group({
    code: 'DEMO-IT-09',
    title: 'Team Iris',
    approvedTitle: 'Student Org Budget Tracker',
    titles: [approved('t9', 'Student Org Budget Tracker')],
    isEligible: true,
    adviser: 'Engr. Mark Villanueva',
    students: ['Zed Ty', 'Amy Ro'],
    currentStage: 'Pre-Final',
    eligibleStage: 'Pre-Final Defense',
    attemptCount: 1,
    scheduleStatus: 'Revision Required'
  }),
  // Not eligible — no approved title yet
  group({
    code: 'DEMO-IT-10',
    title: 'Team Jasper',
    approvedTitle: null,
    titles: [pending('t10', 'Smart Parking Slot Finder'), pending('t10b', 'Campus Shuttle Tracker')],
    isEligible: false,
    ineligibilityReason: 'No adviser-approved title yet.',
    adviser: 'Dr. Carlo Bautista',
    students: ['Bea Sy', 'Cal Uy', 'Dee Go'],
    currentStage: 'Concept',
    eligibleStage: 'Concept Presentation',
    attemptCount: 1,
    scheduleStatus: 'Not Eligible'
  }),
  group({
    code: 'DEMO-IT-11',
    title: 'Team Kestrel',
    approvedTitle: null,
    titles: [],
    isEligible: false,
    ineligibilityReason: 'No title proposal submitted.',
    adviser: 'Prof. Liza Mendoza',
    students: ['Eli Tan', 'Fay Lim', 'Gus Co'],
    currentStage: 'Concept',
    eligibleStage: 'Concept Presentation',
    attemptCount: 1,
    scheduleStatus: 'Not Eligible'
  })
];

const panelist = (index: number, panelRole: 'CHAIR' | 'MEMBER') => ({
  id: `${SAMPLE_FACULTY_PREFIX}${index}`,
  name: SAMPLE_FACULTY[index - 1].name,
  panelRole
});

/** Two upcoming sample defenses in Room 401 on the same day (09:00 and 10:00), useful for trying the conflict checks. */
export function getSampleAssignments(): DefenseAssignment[] {
  const day = upcomingWeekday(3);
  return [
    {
      id: 'sample-assignment-07',
      groupCode: 'DEMO-IT-07',
      scheduleType: 'Proposal Defense',
      date: day,
      time: '09:00',
      room: 'Room 401',
      chairId: `${SAMPLE_FACULTY_PREFIX}8`,
      memberIds: [`${SAMPLE_FACULTY_PREFIX}4`, `${SAMPLE_FACULTY_PREFIX}9`],
      scheduledAt: `${day}T09:00:00`,
      panelists: [panelist(8, 'CHAIR'), panelist(4, 'MEMBER'), panelist(9, 'MEMBER')]
    },
    {
      id: 'sample-assignment-08',
      groupCode: 'DEMO-IT-08',
      scheduleType: 'Final Defense',
      date: day,
      time: '10:00',
      room: 'Room 401',
      chairId: `${SAMPLE_FACULTY_PREFIX}2`,
      memberIds: [`${SAMPLE_FACULTY_PREFIX}3`, `${SAMPLE_FACULTY_PREFIX}5`],
      scheduledAt: `${day}T10:00:00`,
      panelists: [panelist(2, 'CHAIR'), panelist(3, 'MEMBER'), panelist(5, 'MEMBER')]
    }
  ];
}
