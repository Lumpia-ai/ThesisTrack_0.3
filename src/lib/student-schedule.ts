import type { StudentDashboardData } from '@/lib/services/student-workspace';

export type ScheduleItemType = 'Meeting' | 'Deadline' | 'Event' | 'Reminder' | 'Consultation';
export type ScheduleItemStatus = 'upcoming' | 'today' | 'overdue' | 'completed';
export type ScheduleItemPriority = 'high' | 'medium' | 'low';
export type ScheduleMode = 'Online' | 'On Site' | 'Hybrid' | 'Scheduled Venue';
export type AlertTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type MilestoneKind = 'title-proposal' | 'approval' | 'chapters' | 'development' | 'testing' | 'defense' | 'archive' | 'general';

type RawMilestone = StudentDashboardData['milestones'][number];
type RawSchedule = StudentDashboardData['schedules'][number];

type DerivedMilestone = RawMilestone & {
  kind: MilestoneKind;
  dueDate: string;
  assignedTo: string;
  notes: string;
  relatedPhase: string;
  priority: ScheduleItemPriority;
  isCompleted: boolean;
  generated?: boolean;
};

type GeneratedScheduleSeed = {
  id: string;
  title: string;
  type: ScheduleItemType;
  date: string;
  endDate?: string;
  description: string;
  location: string;
  mode: ScheduleMode;
  timeLabel?: string;
  priority: ScheduleItemPriority;
  sourceLabel: string;
};

export type StudentScheduleItem = {
  id: string;
  title: string;
  type: ScheduleItemType;
  date: string;
  endDate?: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  mode: ScheduleMode;
  status: ScheduleItemStatus;
  milestoneId?: string;
  milestoneTitle?: string;
  description: string;
  priority: ScheduleItemPriority;
  isCompleted: boolean;
  source: 'milestone' | 'schedule' | 'presentation';
  sourceLabel: string;
  relatedPhase?: string;
  dayKey: string;
};

export type StudentScheduleAlert = {
  id: string;
  tone: AlertTone;
  label: string;
  detail: string;
};

export type WeeklyPlannerCell = {
  day: Date;
  dayKey: string;
  items: StudentScheduleItem[];
  isToday: boolean;
  hasUrgent: boolean;
};

export type StudentScheduleSummary = {
  totalMilestones: number;
  completedMilestones: number;
  activeMilestones: number;
  overdueMilestones: number;
  totalItems: number;
  activeItems: number;
};

export type StudentScheduleModel = {
  weekStart: Date;
  weekEnd: Date;
  weeklyPlannerCells: WeeklyPlannerCell[];
  referenceDate: Date;
  allItems: StudentScheduleItem[];
  activeItems: StudentScheduleItem[];
  completedItems: StudentScheduleItem[];
  todayItems: StudentScheduleItem[];
  upcomingDeadlines: StudentScheduleItem[];
  consultationSessions: StudentScheduleItem[];
  urgentDeadlines: StudentScheduleItem[];
  thisWeekItems: StudentScheduleItem[];
  priorityUpcoming: StudentScheduleItem[];
  nextUpcomingEvent: StudentScheduleItem | null;
  alerts: StudentScheduleAlert[];
  plannerNote: string;
  summary: StudentScheduleSummary;
};

const LOCAL_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3}))?Z?)?$/;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function parseDateValue(value: string | Date | number) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  const match = value.match(LOCAL_ISO_PATTERN);

  if (match) {
    const [, year, month, day, hour = '0', minute = '0', second = '0', millisecond = '0'] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond)
    );
  }

  return new Date(value);
}

function toIsoLikeLocal(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}.000Z`;
}

export function startOfDay(value: string | Date | number) {
  const next = parseDateValue(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(value: Date, count: number) {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + count);
  return next;
}

function withLocalTime(value: Date, hours: number, minutes: number) {
  const next = new Date(value.getTime());
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function toDateKey(value: string | Date | number) {
  const date = parseDateValue(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function startOfWeek(value: Date) {
  const next = startOfDay(value);
  const mondayOffset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - mondayOffset);
  return next;
}

export function formatWeekdayLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(value);
}

export function formatMonthDayLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value);
}

export function formatDayNumber(value: Date) {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(value);
}

export function formatWeekRangeLabel(start: Date, end: Date) {
  return `${formatMonthDayLabel(start)} - ${formatMonthDayLabel(end)}`;
}

function formatDateLabel(value: string | Date | number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parseDateValue(value));
}

function formatTimeWindow(startValue: string | Date | number, endValue?: string | Date | number) {
  const start = parseDateValue(startValue);
  const hasSpecificTime = start.getHours() !== 0 || start.getMinutes() !== 0;

  if (!hasSpecificTime) {
    return 'All day';
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  if (!endValue) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} - ${formatter.format(parseDateValue(endValue))}`;
}

function normalizePriority(value?: string): ScheduleItemPriority {
  const normalized = value?.toLowerCase();

  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
}

function normalizeMode(mode?: string, location?: string): ScheduleMode {
  const haystack = `${mode || ''} ${location || ''}`.toLowerCase();

  if ((mode || '').toLowerCase() === 'hybrid') return 'Hybrid';
  if (haystack.includes('online') && (haystack.includes('office') || haystack.includes('laboratory') || haystack.includes('room'))) {
    return 'Hybrid';
  }
  if (haystack.includes('online') || haystack.includes('portal') || haystack.includes('virtual')) {
    return 'Online';
  }
  if (
    haystack.includes('office') ||
    haystack.includes('laboratory') ||
    haystack.includes('room') ||
    haystack.includes('auditorium') ||
    haystack.includes('gymnasium') ||
    haystack.includes('conference')
  ) {
    return 'On Site';
  }

  return 'Scheduled Venue';
}

function getItemType(value: string): ScheduleItemType {
  const normalized = value.toLowerCase();

  if (normalized.includes('consultation')) return 'Consultation';
  if (normalized.includes('deadline') || normalized.includes('submission') || normalized.includes('revision')) return 'Deadline';
  if (normalized.includes('meeting') || normalized.includes('checkpoint') || normalized.includes('review')) return 'Meeting';
  if (normalized.includes('event') || normalized.includes('defense') || normalized.includes('presentation') || normalized.includes('symposium')) return 'Event';
  return 'Reminder';
}

function computeStatus(dateValue: string, referenceDate: Date, isCompleted: boolean) {
  if (isCompleted) {
    return 'completed' as ScheduleItemStatus;
  }

  const itemDay = startOfDay(dateValue);
  const today = startOfDay(referenceDate);

  if (itemDay.getTime() < today.getTime()) return 'overdue';
  if (itemDay.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

function getMilestoneKind(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes('title')) return 'title-proposal' as MilestoneKind;
  if (normalized.includes('approval')) return 'approval' as MilestoneKind;
  if (normalized.includes('chapter')) return 'chapters' as MilestoneKind;
  if (normalized.includes('system') || normalized.includes('development')) return 'development' as MilestoneKind;
  if (normalized.includes('testing')) return 'testing' as MilestoneKind;
  if (normalized.includes('defense')) return 'defense' as MilestoneKind;
  if (normalized.includes('archive') || normalized.includes('repository')) return 'archive' as MilestoneKind;
  return 'general' as MilestoneKind;
}

function getMilestonePrimarySeed(milestone: DerivedMilestone): GeneratedScheduleSeed {
  switch (milestone.kind) {
    case 'title-proposal':
      return {
        id: `${milestone.id}-primary`,
        title: 'Title Proposal Submission',
        type: 'Deadline',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Title Submission Workspace',
        mode: 'Online',
        timeLabel: 'Due by 5:00 PM',
        priority: milestone.priority,
        sourceLabel: 'Milestone deadline'
      };
    case 'approval':
      return {
        id: `${milestone.id}-primary`,
        title: 'Proposal Approval Review',
        type: 'Event',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Research Review Panel Room',
        mode: 'On Site',
        timeLabel: 'Panel review window',
        priority: milestone.priority,
        sourceLabel: 'Milestone review'
      };
    case 'chapters':
      return {
        id: `${milestone.id}-primary`,
        title: 'Chapter 1-3 Completion',
        type: 'Deadline',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Student Upload Portal',
        mode: 'Online',
        timeLabel: 'Due by 5:00 PM',
        priority: milestone.priority,
        sourceLabel: 'Milestone deadline'
      };
    case 'development':
      return {
        id: `${milestone.id}-primary`,
        title: 'System Development Checkpoint',
        type: 'Meeting',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Project Workspace / Computing Laboratory',
        mode: 'Hybrid',
        timeLabel: 'Sprint review window',
        priority: milestone.priority,
        sourceLabel: 'Milestone checkpoint'
      };
    case 'testing':
      return {
        id: `${milestone.id}-primary`,
        title: 'Testing Phase Preparation',
        type: 'Deadline',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Student Testing Workspace',
        mode: 'Hybrid',
        timeLabel: 'Due by 9:30 AM',
        priority: milestone.priority,
        sourceLabel: 'Milestone deadline'
      };
    case 'defense':
      return {
        id: `${milestone.id}-primary`,
        title: 'Defense Preparation',
        type: 'Deadline',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Department Conference Room',
        mode: 'On Site',
        timeLabel: 'Due by 5:00 PM',
        priority: milestone.priority,
        sourceLabel: 'Milestone deadline'
      };
    case 'archive':
      return {
        id: `${milestone.id}-primary`,
        title: 'Repository Submission Deadline',
        type: 'Deadline',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Library Repository Portal',
        mode: 'Online',
        timeLabel: 'Due by 4:00 PM',
        priority: milestone.priority,
        sourceLabel: 'Milestone deadline'
      };
    default:
      return {
        id: `${milestone.id}-primary`,
        title: `${milestone.title} Follow-up`,
        type: 'Reminder',
        date: milestone.dueDate,
        description: milestone.notes,
        location: 'Student Workspace',
        mode: 'Online',
        timeLabel: 'Review schedule',
        priority: milestone.priority,
        sourceLabel: 'Milestone reminder'
      };
  }
}

function getConsultationSeed(milestone: DerivedMilestone) {
  const consultationDate = milestone.consultationDate;

  if (!consultationDate) {
    return null;
  }

  const titleByKind: Record<MilestoneKind, string> = {
    'title-proposal': 'Title Scope Consultation',
    approval: 'Proposal Review Consultation',
    chapters: 'Manuscript Revision Consultation',
    development: 'Development Consultation',
    testing: 'Testing Preparation Consultation',
    defense: 'Defense Consultation',
    archive: 'Repository Turnover Consultation',
    general: `${milestone.title} Consultation`
  };

  return {
    id: `${milestone.id}-consultation`,
    title: titleByKind[milestone.kind],
    type: 'Consultation' as ScheduleItemType,
    date: consultationDate,
    description: `Coordinate adviser-facing requirements for ${milestone.title.toLowerCase()} and close the next action items.`,
    location: milestone.kind === 'archive' ? 'Library Office / Online' : 'Adviser Office / Online',
    mode: 'Hybrid' as ScheduleMode,
    timeLabel: '10:00 AM - 11:00 AM',
    priority: milestone.priority,
    sourceLabel: 'Milestone consultation'
  };
}

function getRevisionSeed(milestone: DerivedMilestone) {
  const revisionDate = milestone.revisionDate;

  if (!revisionDate) {
    return null;
  }

  return {
    id: `${milestone.id}-revision`,
    title: milestone.kind === 'chapters' ? 'Chapter Revision Deadline' : `${milestone.title} Revision Deadline`,
    type: 'Deadline' as ScheduleItemType,
    date: revisionDate,
    description: 'Submit the revised files, reviewer responses, and updated checklist before the revision window closes.',
    location: 'Student Upload Portal',
    mode: 'Online' as ScheduleMode,
    timeLabel: 'Due by 5:00 PM',
    priority: 'high' as ScheduleItemPriority,
    sourceLabel: 'Revision deadline'
  };
}

function getEventSeed(milestone: DerivedMilestone) {
  const eventDate = milestone.eventDate;

  if (!eventDate) {
    return null;
  }

  const titleByKind: Record<MilestoneKind, string> = {
    'title-proposal': 'Title Review Event',
    approval: 'Proposal Approval Review',
    chapters: 'Manuscript Review Session',
    development: 'Prototype Review Session',
    testing: 'Pilot Testing Kickoff',
    defense: 'Defense Session',
    archive: 'Repository Endorsement Review',
    general: `${milestone.title} Event`
  };

  const locationByKind: Record<MilestoneKind, string> = {
    'title-proposal': 'Adviser Office',
    approval: 'Research Review Panel Room',
    chapters: 'Student Upload Portal',
    development: 'Computing Laboratory',
    testing: 'Pilot Testing Venue',
    defense: 'Department Conference Room',
    archive: 'Library Repository Desk',
    general: 'Student Workspace'
  };

  return {
    id: `${milestone.id}-event`,
    title: titleByKind[milestone.kind],
    type: 'Event' as ScheduleItemType,
    date: eventDate,
    description: milestone.notes,
    location: locationByKind[milestone.kind],
    mode: milestone.kind === 'chapters' || milestone.kind === 'archive' ? ('Online' as ScheduleMode) : ('On Site' as ScheduleMode),
    timeLabel: formatTimeWindow(eventDate),
    priority: milestone.priority,
    sourceLabel: 'Milestone event'
  };
}

function createScheduleItem(
  seed: GeneratedScheduleSeed,
  milestone: DerivedMilestone,
  referenceDate: Date
): StudentScheduleItem {
  const isCompleted = milestone.isCompleted && parseDateValue(seed.date).getTime() <= parseDateValue(milestone.dueDate).getTime();

  return {
    id: seed.id,
    title: seed.title,
    type: seed.type,
    date: seed.date,
    endDate: seed.endDate,
    dateLabel: formatDateLabel(seed.date),
    timeLabel: seed.timeLabel || formatTimeWindow(seed.date, seed.endDate),
    location: seed.location,
    mode: seed.mode,
    status: computeStatus(seed.date, referenceDate, isCompleted),
    milestoneId: milestone.id,
    milestoneTitle: milestone.title,
    description: seed.description,
    priority: seed.priority,
    isCompleted,
    source: 'milestone',
    sourceLabel: seed.sourceLabel,
    relatedPhase: milestone.relatedPhase,
    dayKey: toDateKey(seed.date)
  };
}

function hasExistingMilestoneSchedule(
  schedules: RawSchedule[],
  milestoneId: string,
  type: ScheduleItemType,
  dateValue: string
) {
  const targetDay = toDateKey(dateValue);

  return schedules.some((item) => {
    if (item.milestoneId !== milestoneId || toDateKey(item.startDate) !== targetDay) {
      return false;
    }

    const existingType = getItemType(item.type);
    const isSessionType = (value: ScheduleItemType) => value === 'Meeting' || value === 'Consultation';

    return existingType === type || (isSessionType(existingType) && isSessionType(type));
  });
}

function deriveMilestones(data: StudentDashboardData) {
  const milestones: DerivedMilestone[] = data.milestones.map((item) => ({
    ...item,
    kind: getMilestoneKind(item.title),
    dueDate: item.dueDate || item.eventDate || item.created_at,
    assignedTo: item.assignedTo || data.group.leaderName,
    notes: item.notes || item.summary,
    relatedPhase: item.relatedPhase || item.title,
    priority: normalizePriority(item.priority),
    isCompleted:
      item.isCompleted ||
      item.status.toLowerCase().includes('completed') ||
      item.status.toLowerCase().includes('approved')
  }));

  const testingMilestone = milestones.find((item) => item.kind === 'testing');
  const defenseSchedule = data.schedules.find((item) => /defense/i.test(item.title) || /defense/i.test(item.type));
  const defenseEventDate = defenseSchedule
    ? parseDateValue(defenseSchedule.startDate)
    : withLocalTime(addDays(parseDateValue(testingMilestone?.dueDate || data.project.updated_at), 6), 13, 30);

  if (!milestones.some((item) => item.kind === 'defense')) {
    const defenseDueDate = withLocalTime(addDays(startOfDay(defenseEventDate), -1), 17, 0);
    const defenseConsultation = withLocalTime(addDays(startOfDay(defenseEventDate), -3), 10, 0);

    milestones.push({
      id: 'milestone-derived-defense',
      user_id: data.profile.user_id,
      project_id: data.project.project_id,
      status: 'pending',
      created_at: toIsoLikeLocal(defenseDueDate),
      updated_at: toIsoLikeLocal(defenseDueDate),
      title: 'Defense',
      dateLabel: formatDateLabel(defenseDueDate),
      summary: 'Prepare the formal defense deck, walkthrough, and evaluator packet.',
      route: '/students/schedule',
      actionLabel: 'Review Schedule',
      dueDate: toIsoLikeLocal(defenseDueDate),
      assignedTo: data.group.leaderName,
      notes: 'Finalize the slide deck, demo flow, speaking order, and evaluator-facing evidence before the formal defense.',
      relatedPhase: 'Defense',
      consultationDate: toIsoLikeLocal(defenseConsultation),
      eventDate: toIsoLikeLocal(defenseEventDate),
      isCompleted: false,
      priority: 'high',
      kind: 'defense',
      generated: true
    });
  }

  const defenseMilestone = milestones.find((item) => item.kind === 'defense');
  const latestDueDate = milestones.reduce((latest, item) => {
    const current = parseDateValue(item.dueDate).getTime();
    return current > latest.getTime() ? parseDateValue(item.dueDate) : latest;
  }, parseDateValue(defenseMilestone?.dueDate || data.project.updated_at));

  if (!milestones.some((item) => item.kind === 'archive')) {
    const archiveDueDate = withLocalTime(addDays(startOfDay(latestDueDate), 14), 16, 0);
    const archiveConsultation = withLocalTime(addDays(startOfDay(archiveDueDate), -3), 11, 0);

    milestones.push({
      id: 'milestone-derived-archive',
      user_id: data.profile.user_id,
      project_id: data.project.project_id,
      status: 'pending',
      created_at: toIsoLikeLocal(archiveDueDate),
      updated_at: toIsoLikeLocal(archiveDueDate),
      title: 'Archive / Repository Submission',
      dateLabel: formatDateLabel(archiveDueDate),
      summary: 'Prepare the final archive package and repository turnover documents.',
      route: '/students/repository',
      actionLabel: 'Open Repository',
      dueDate: toIsoLikeLocal(archiveDueDate),
      assignedTo: data.group.leaderName,
      notes: 'Submit the final manuscript, repository link, and repository endorsement package for final library review.',
      relatedPhase: 'Repository',
      consultationDate: toIsoLikeLocal(archiveConsultation),
      isCompleted: false,
      priority: 'high',
      kind: 'archive',
      generated: true
    });
  }

  return milestones.sort((left, right) => parseDateValue(left.dueDate).getTime() - parseDateValue(right.dueDate).getTime());
}

function buildMilestoneItems(data: StudentDashboardData, milestones: DerivedMilestone[], referenceDate: Date) {
  const generatedItems: StudentScheduleItem[] = [];

  for (const milestone of milestones) {
    const primary = getMilestonePrimarySeed(milestone);

    if (!hasExistingMilestoneSchedule(data.schedules, milestone.id, primary.type, primary.date)) {
      generatedItems.push(createScheduleItem(primary, milestone, referenceDate));
    }

    const consultation = getConsultationSeed(milestone);
    if (consultation && !hasExistingMilestoneSchedule(data.schedules, milestone.id, consultation.type, consultation.date)) {
      generatedItems.push(createScheduleItem(consultation, milestone, referenceDate));
    }

    const revision = getRevisionSeed(milestone);
    if (revision && !hasExistingMilestoneSchedule(data.schedules, milestone.id, revision.type, revision.date)) {
      generatedItems.push(createScheduleItem(revision, milestone, referenceDate));
    }

    const event = getEventSeed(milestone);
    if (event && !hasExistingMilestoneSchedule(data.schedules, milestone.id, event.type, event.date)) {
      generatedItems.push(createScheduleItem(event, milestone, referenceDate));
    }
  }

  return generatedItems;
}

function normalizeRawScheduleItem(item: RawSchedule, referenceDate: Date): StudentScheduleItem {
  const isCompleted =
    Boolean(item.isCompleted) ||
    item.status.toLowerCase().includes('completed') ||
    item.status.toLowerCase().includes('closed') ||
    item.status.toLowerCase().includes('submitted');

  return {
    id: `schedule-${item.id}`,
    title: item.title,
    type: getItemType(item.type),
    date: item.startDate,
    endDate: item.endDate,
    dateLabel: item.startDateLabel || formatDateLabel(item.startDate),
    timeLabel: item.time || formatTimeWindow(item.startDate, item.endDate),
    location: item.location,
    mode: normalizeMode(item.mode, item.location),
    status: computeStatus(item.startDate, referenceDate, isCompleted),
    milestoneId: item.milestoneId,
    description: item.description,
    priority: normalizePriority(item.priority),
    isCompleted,
    source: 'schedule',
    sourceLabel: 'Scheduled entry',
    dayKey: toDateKey(item.startDate)
  };
}

function normalizePresentationItems(data: StudentDashboardData, referenceDate: Date): StudentScheduleItem[] {
  return data.presentations.map((item) => {
    const completed = parseDateValue(item.date).getTime() <= referenceDate.getTime();

    return {
      id: `presentation-${item.id}`,
      title: item.eventName,
      type: 'Event',
      date: item.date,
      dateLabel: item.dateLabel || formatDateLabel(item.date),
      timeLabel: formatTimeWindow(item.date),
      location: item.venue,
      mode: normalizeMode(undefined, item.venue),
      status: computeStatus(item.date, referenceDate, completed),
      description: item.achievement
        ? `${item.description} Recognition: ${item.achievement}.`
        : item.description || 'Academic event record linked to the project.',
      priority: item.achievement ? 'high' : 'medium',
      isCompleted: completed,
      source: 'presentation',
      sourceLabel: item.achievement ? 'Academic achievement' : 'Academic event',
      relatedPhase: 'Presentation',
      dayKey: toDateKey(item.date)
    };
  });
}

function getSourceRank(source: StudentScheduleItem['source']) {
  if (source === 'schedule') return 0;
  if (source === 'milestone') return 1;
  return 2;
}

function mergeScheduleItems(items: StudentScheduleItem[]) {
  const merged = new Map<string, StudentScheduleItem>();

  for (const item of items) {
    const dedupeKey = `${item.milestoneId || item.title.toLowerCase()}|${item.type}|${item.dayKey}`;
    const current = merged.get(dedupeKey);

    if (!current || getSourceRank(item.source) < getSourceRank(current.source)) {
      merged.set(dedupeKey, item);
    }
  }

  return Array.from(merged.values());
}

function getStatusRank(status: ScheduleItemStatus) {
  if (status === 'overdue') return 0;
  if (status === 'today') return 1;
  if (status === 'upcoming') return 2;
  return 3;
}

function getTypeRank(type: ScheduleItemType) {
  if (type === 'Deadline') return 0;
  if (type === 'Consultation') return 1;
  if (type === 'Meeting') return 2;
  if (type === 'Event') return 3;
  return 4;
}

function getPriorityRank(priority: ScheduleItemPriority) {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function compareActiveItems(left: StudentScheduleItem, right: StudentScheduleItem) {
  const statusDelta = getStatusRank(left.status) - getStatusRank(right.status);
  if (statusDelta !== 0) return statusDelta;

  const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority);
  if (priorityDelta !== 0) return priorityDelta;

  const dateDelta = parseDateValue(left.date).getTime() - parseDateValue(right.date).getTime();
  if (dateDelta !== 0) return dateDelta;

  return getTypeRank(left.type) - getTypeRank(right.type);
}

function compareCompletedItems(left: StudentScheduleItem, right: StudentScheduleItem) {
  return parseDateValue(right.date).getTime() - parseDateValue(left.date).getTime();
}

export function buildStudentScheduleModel(data: StudentDashboardData, referenceDate: Date): StudentScheduleModel {
  const today = startOfDay(referenceDate);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const derivedMilestones = deriveMilestones(data);

  const items = mergeScheduleItems([
    ...buildMilestoneItems(data, derivedMilestones, today),
    ...data.schedules.map((item) => normalizeRawScheduleItem(item, today)),
    ...normalizePresentationItems(data, today)
  ]);

  const allItems = [...items].sort(compareActiveItems);
  const activeItems = allItems.filter((item) => item.status !== 'completed').sort(compareActiveItems);
  const completedItems = allItems.filter((item) => item.status === 'completed').sort(compareCompletedItems);
  const todayItems = activeItems.filter((item) => item.status === 'today');
  const upcomingDeadlines = activeItems.filter((item) => item.type === 'Deadline');
  const consultationSessions = activeItems.filter((item) => item.type === 'Consultation' || item.type === 'Meeting');
  const nextUpcomingEvent = activeItems.find((item) => item.status === 'today' || item.status === 'upcoming') || null;
  const urgentDeadlines = upcomingDeadlines
    .filter((item) => item.status === 'overdue' || parseDateValue(item.date).getTime() <= addDays(today, 14).getTime())
    .sort(compareActiveItems)
    .slice(0, 4);
  const thisWeekItems = activeItems.filter((item) => {
    const itemDay = startOfDay(item.date);
    return itemDay.getTime() >= weekStart.getTime() && itemDay.getTime() <= weekEnd.getTime();
  });
  const priorityUpcoming = activeItems.slice(0, 6);
  const overdueMilestones = derivedMilestones.filter((item) => !item.isCompleted && startOfDay(item.dueDate).getTime() < today.getTime());
  const weeklyConsultations = thisWeekItems.filter((item) => item.type === 'Consultation' || item.type === 'Meeting');
  const defensePreparation = activeItems.find((item) => item.milestoneId === 'milestone-derived-defense' || /defense/i.test(item.title)) || null;
  const repositoryPending = activeItems.some((item) => item.milestoneId === 'milestone-derived-archive');

  const weeklyPlannerCells = weekDays.map((day) => {
    const dayKey = toDateKey(day);
    const dayItems = allItems.filter((item) => item.dayKey === dayKey).sort(compareActiveItems);

    return {
      day,
      dayKey,
      items: dayItems,
      isToday: dayKey === toDateKey(today),
      hasUrgent: dayItems.some((item) => item.status === 'overdue' || item.priority === 'high')
    };
  });

  const alerts: StudentScheduleAlert[] = [];

  if (!todayItems.length) {
    alerts.push({
      id: 'today-clear',
      tone: 'success',
      label: 'No schedule item due today',
      detail: 'The current day is clear, so you can focus on the next milestone preparation window.'
    });
  } else {
    alerts.push({
      id: 'today-active',
      tone: 'warning',
      label: `${todayItems.length} schedule item${todayItems.length === 1 ? '' : 's'} due today`,
      detail: 'Review today\'s meetings, deadlines, and academic follow-ups before the day closes.'
    });
  }

  if (urgentDeadlines.length) {
    alerts.push({
      id: 'urgent-deadlines',
      tone: 'warning',
      label: `${urgentDeadlines.length} urgent deadline${urgentDeadlines.length === 1 ? '' : 's'} ahead`,
      detail: 'Near-term submission windows and milestone deadlines need attention first.'
    });
  }

  if (overdueMilestones.length) {
    alerts.push({
      id: 'overdue-milestones',
      tone: 'danger',
      label: `${overdueMilestones.length} overdue milestone${overdueMilestones.length === 1 ? '' : 's'}`,
      detail: 'One or more milestone checkpoints are behind schedule and should be reconciled immediately.'
    });
  }

  if (weeklyConsultations.length) {
    alerts.push({
      id: 'consultation-week',
      tone: 'info',
      label: `${weeklyConsultations.length} consultation session${weeklyConsultations.length === 1 ? '' : 's'} this week`,
      detail: 'Use the adviser sessions this week to close revision gaps and confirm next actions.'
    });
  }

  if (defensePreparation && defensePreparation.status !== 'completed') {
    alerts.push({
      id: 'defense-prep',
      tone: 'warning',
      label: 'Upcoming defense preparation',
      detail: `${defensePreparation.title} is scheduled for ${defensePreparation.dateLabel}.`
    });
  }

  if (repositoryPending) {
    alerts.push({
      id: 'repository-pending',
      tone: 'neutral',
      label: 'Repository submission pending',
      detail: 'The archive and repository handoff window is already part of the planner queue.'
    });
  }

  const plannerNote = nextUpcomingEvent
    ? `${nextUpcomingEvent.title} is the next active planner item on ${nextUpcomingEvent.dateLabel} ${nextUpcomingEvent.timeLabel !== 'All day' ? `at ${nextUpcomingEvent.timeLabel}` : ''}.`
    : 'No upcoming planner item is currently recorded.';

  return {
    weekStart,
    weekEnd,
    weeklyPlannerCells,
    referenceDate: today,
    allItems,
    activeItems,
    completedItems,
    todayItems,
    upcomingDeadlines,
    consultationSessions,
    urgentDeadlines,
    thisWeekItems,
    priorityUpcoming,
    nextUpcomingEvent,
    alerts,
    plannerNote,
    summary: {
      totalMilestones: derivedMilestones.length,
      completedMilestones: derivedMilestones.filter((item) => item.isCompleted).length,
      activeMilestones: derivedMilestones.filter((item) => !item.isCompleted).length,
      overdueMilestones: overdueMilestones.length,
      totalItems: allItems.length,
      activeItems: activeItems.length
    }
  };
}
