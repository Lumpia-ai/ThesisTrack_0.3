'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import type { WeeklyScheduleItem } from '@/components/adviser/shared/config/dashboard-types';
import {
  NAV_ITEMS,
  WORKSPACE_META,
  buildAdviserScheduleItems,
  buildPanelScheduleItems,
  isNavItemActive
} from '@/components/adviser/shared/config/dashboard-utils';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

type ScheduleFilter = 'all' | 'consultation' | 'deadline' | 'meeting' | 'reminder' | 'event' | 'defense';

type AdviserScheduleApiItem = {
  id: string;
  projectId: string;
  type: string;
  typeLabel: string;
  status: string;
  title: string;
  scheduledAt: string;
  endsAt?: string | null;
  location?: string;
  notes?: string;
  groupCode?: string;
  groupTitle: string;
  projectTitle: string;
};

type AdviserScheduleProjectOption = {
  id: string;
  title: string;
  groupCode?: string;
  groupTitle: string;
  leaderName?: string;
  members: Array<{
    userId: string;
    name: string;
    isLeader: boolean;
  }>;
};

type ScheduleFormState = {
  projectId: string;
  type: string;
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  notifyStudents: boolean;
  requiredSubmission: string;
  // Own dedicated fields for the two "Other" text boxes, kept separate from `title` so the
  // Agenda field never doubles up with a second box editing the exact same value live.
  otherTypeLabel: string;
  otherSubmissionLabel: string;
};

const SCHEDULE_TYPE_OPTIONS = [
  { value: 'CONSULTATION', label: 'Consultation', icon: 'fa-comments' },
  { value: 'DEADLINE', label: 'Submission', icon: 'fa-hourglass-half' },
  { value: 'MEETING', label: 'Meeting', icon: 'fa-users' },
  { value: 'REMINDER', label: 'Reminder', icon: 'fa-bell' },
  { value: 'EVENT', label: 'Event', icon: 'fa-calendar-day' },
  { value: 'REVIEW', label: 'Review', icon: 'fa-clipboard-check' },
  // UI-only — AdviserScheduleItemType has no "other" value in the schema, so this is
  // translated to EVENT before it's ever sent to the API (see saveScheduleItem below);
  // the adviser's own wording is preserved in the title instead of the type badge.
  { value: 'OTHER', label: 'Other', icon: 'fa-shapes' }
] as const;

// Deadline-only: lets the adviser say exactly what deliverable a deadline is for, instead of
// students having to guess from a generic "Deadline" agenda line. Not a DB column — there's no
// AdviserScheduleItem field for this, so picking one just pre-fills the Agenda/Notes text below
// (which the adviser can still edit), rather than requiring a schema migration for a label.
const REQUIRED_SUBMISSION_OPTIONS = [
  { value: '', label: 'Not specified', hint: '' },
  { value: 'title-proposal', label: 'Title Proposal', hint: 'Students submit their proposed thesis/capstone title for review.' },
  { value: 'concept-paper', label: 'Concept Paper', hint: 'Students submit the concept paper covering the research problem and scope.' },
  { value: 'proposal-chapters', label: 'Proposal (Chapters 1-3)', hint: 'Students submit the formal proposal document (Introduction, Review of Related Literature, Methodology).' },
  {
    value: 'progress-development',
    label: 'Progress of Development',
    hint: 'Students submit a development progress update. Remind them to attach photo or video evidence if the project is a hardware prototype or IoT system.'
  },
  { value: 'web-application', label: 'Web Application / System Demo', hint: 'Students submit or demo the working web application or system build.' },
  { value: 'system-documentation', label: 'System Documentation', hint: 'Students submit technical or user documentation for the system.' },
  { value: 'final-manuscript', label: 'Final Manuscript', hint: 'Students submit the final, panel-approved manuscript.' },
  { value: 'other', label: 'Other requirement', hint: 'Specify the exact requirement in the field below so students know what to submit.' }
] as const;

// Mirrors DEADLINE_REQUIREMENT_MILESTONE_SEQUENCE in milestone-checkpoint-tracking.ts —
// which stage's due date (shown on the student's roadmap and driving the overdue alert)
// gets set when this requirement is picked, so the adviser knows this isn't just a
// calendar note. 'other'/unset are deliberately left out there — too ambiguous to map.
const REQUIRED_SUBMISSION_STAGE_LABEL: Record<string, string> = {
  'title-proposal': 'Concept',
  'concept-paper': 'Concept',
  'proposal-chapters': 'Proposal',
  'progress-development': 'Development',
  'web-application': 'Development',
  'system-documentation': 'Development',
  'final-manuscript': 'Final Defense'
};

function getRequiredSubmissionOption(value: string) {
  return REQUIRED_SUBMISSION_OPTIONS.find((option) => option.value === value) ?? REQUIRED_SUBMISSION_OPTIONS[0];
}

// Folds the dedicated "Other" specify field into the final title, since AdviserScheduleItem
// has nowhere else to store it. Used by both the live Preview panel and the actual save,
// so what the adviser previews is exactly what gets sent.
function buildScheduleTitle(form: ScheduleFormState) {
  const otherLabel = (
    form.type === 'OTHER'
      ? form.otherTypeLabel
      : form.type === 'DEADLINE' && form.requiredSubmission === 'other'
        ? form.otherSubmissionLabel
        : ''
  ).trim();

  if (!otherLabel) {
    return form.title;
  }

  return form.title.trim() ? `${otherLabel}: ${form.title.trim()}` : otherLabel;
}

function getInitialScheduleForm(): ScheduleFormState {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  return {
    projectId: '',
    type: 'CONSULTATION',
    title: '',
    date,
    time: '09:00',
    location: '',
    notes: '',
    notifyStudents: true,
    requiredSubmission: '',
    otherTypeLabel: '',
    otherSubmissionLabel: ''
  };
}

function getScheduleTypeOption(type: string) {
  return SCHEDULE_TYPE_OPTIONS.find((option) => option.value === type) || SCHEDULE_TYPE_OPTIONS[0];
}

function getScheduleTone(type: string): WeeklyScheduleItem['tone'] {
  if (type === 'DEADLINE') return 'danger';
  if (type === 'REMINDER') return 'warning';
  if (type === 'EVENT') return 'success';
  if (type === 'REVIEW') return 'primary';
  return 'info';
}

function formatApiScheduleDate(value: string) {
  const date = new Date(value);

  return {
    dateLabel: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date),
    timeLabel: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date)
  };
}

function mapApiScheduleItem(item: AdviserScheduleApiItem): WeeklyScheduleItem {
  const option = getScheduleTypeOption(item.type);
  const { dateLabel, timeLabel } = formatApiScheduleDate(item.scheduledAt);

  return {
    id: item.id,
    projectId: item.projectId,
    dateLabel,
    timeLabel,
    groupName: item.groupCode ? `${item.groupCode} - ${item.groupTitle}` : item.groupTitle,
    eventType: `${option.label}: ${item.title}`,
    location: item.location || undefined,
    tone: getScheduleTone(item.type),
    scheduleType: item.type,
    notes: item.notes || undefined
  };
}

const SCHEDULE_FILTERS: Array<{ id: ScheduleFilter; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: 'fa-calendar' },
  { id: 'consultation', label: 'Consultations', icon: 'fa-comments' },
  { id: 'meeting', label: 'Meetings', icon: 'fa-users' },
  { id: 'deadline', label: 'Submissions', icon: 'fa-hourglass-half' },
  { id: 'reminder', label: 'Reminders', icon: 'fa-bell' },
  { id: 'event', label: 'Events', icon: 'fa-calendar-day' },
  { id: 'defense', label: 'Defense', icon: 'fa-gavel' }
];

function getScheduleCategory(item: WeeklyScheduleItem): Exclude<ScheduleFilter, 'all'> {
  switch (item.scheduleType) {
    case 'CONSULTATION':
      return 'consultation';
    case 'DEADLINE':
      return 'deadline';
    case 'MEETING':
    case 'REVIEW':
      return 'meeting';
    case 'REMINDER':
      return 'reminder';
    case 'EVENT':
      return 'event';
  }

  const reference = `${item.groupName} ${item.eventType}`.toLowerCase();
  if (reference.includes('defense')) return 'defense';
  if (reference.includes('deadline') || reference.includes('due')) return 'deadline';
  if (reference.includes('reminder')) return 'reminder';
  if (reference.includes('event')) return 'event';
  if (reference.includes('consultation')) return 'consultation';
  return 'meeting';
}

function getScheduleCategoryLabel(item: WeeklyScheduleItem) {
  switch (getScheduleCategory(item)) {
    case 'defense':
      return 'Defense-Related';
    case 'deadline':
      return 'Submission';
    case 'reminder':
      return 'Reminder';
    case 'event':
      return 'Event';
    case 'consultation':
      return 'Consultation';
    case 'meeting':
    default:
      return 'Meeting / Review';
  }
}

function getActionMeta(workspaceMode: keyof typeof WORKSPACE_META, basePath: string, item: WeeklyScheduleItem) {
  if (workspaceMode === 'panel') {
    return {
      href: `${basePath}/evaluation-queue`,
      label: 'Open queue'
    };
  }

  return {
    href: `${basePath}/groups`,
    label: getScheduleCategory(item) === 'defense' ? 'Open groups' : 'Review groups'
  };
}

export function AdviserSchedule({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, pathname, basePath } = useWorkspaceMode();
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>('all');
  const [search, setSearch] = useState('');
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() => getInitialScheduleForm());
  const [adviserScheduleItems, setAdviserScheduleItems] = useState<AdviserScheduleApiItem[]>([]);
  const [scheduleProjects, setScheduleProjects] = useState<AdviserScheduleProjectOption[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const meta = WORKSPACE_META[workspaceMode];
  const fallbackScheduleItems = useMemo(
    () =>
      workspaceMode === 'panel'
        ? buildPanelScheduleItems(data.panelProjects)
        : buildAdviserScheduleItems(data.upcomingSchedule, data.groups),
    [workspaceMode, data.panelProjects, data.upcomingSchedule, data.groups]
  );
  const savedAdviserScheduleItems = useMemo(
    () => adviserScheduleItems.map(mapApiScheduleItem),
    [adviserScheduleItems]
  );
  const scheduleItems = workspaceMode === 'adviser' ? savedAdviserScheduleItems : fallbackScheduleItems;

  useEffect(() => {
    if (workspaceMode !== 'adviser') {
      return;
    }

    let cancelled = false;

    async function loadScheduleItems() {
      setIsLoadingSchedule(true);
      setScheduleError(null);

      try {
        const response = await fetch('/api/adviser-schedule-items?limit=50&projectLimit=100', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load adviser schedule items.');
        }

        if (!cancelled) {
          const nextItems = payload?.items || [];
          const nextProjects = payload?.projects || [];
          setAdviserScheduleItems(nextItems);
          // Nothing scheduled yet: open the form so the first item is one click away.
          if (!nextItems.length) setShowForm(true);
          setScheduleProjects(nextProjects);
          setScheduleForm((current) => ({
            ...current,
            projectId: current.projectId || nextProjects[0]?.id || ''
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setScheduleError(error instanceof Error ? error.message : 'Unable to load adviser schedule items.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchedule(false);
        }
      }
    }

    void loadScheduleItems();

    return () => {
      cancelled = true;
    };
  }, [workspaceMode]);

  function updateScheduleForm<Key extends keyof ScheduleFormState>(key: Key, value: ScheduleFormState[Key]) {
    setScheduleForm((current) => ({ ...current, [key]: value }));
  }

  async function saveScheduleItem() {
    if (workspaceMode !== 'adviser' || isSavingSchedule) {
      return;
    }

    setIsSavingSchedule(true);
    setScheduleError(null);
    setScheduleNotice(null);

    try {
      // AdviserScheduleItemType has no "other" value, and there's no column for a custom
      // requirement label either — so both get folded into the title here, exactly as the
      // Preview panel already shows it, and only the DB-safe type needs swapping.
      const response = await fetch('/api/adviser-schedule-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleForm,
          title: buildScheduleTitle(scheduleForm),
          type: scheduleForm.type === 'OTHER' ? 'EVENT' : scheduleForm.type
        })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save schedule item.');
      }

      setAdviserScheduleItems((current) => [...current, payload.item].sort((left, right) =>
        new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
      ));
      setScheduleForm((current) => ({
        ...getInitialScheduleForm(),
        projectId: current.projectId,
        type: current.type,
        notifyStudents: current.notifyStudents
      }));
      setScheduleNotice(payload?.message || 'Schedule item saved.');
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'Unable to save schedule item.');
    } finally {
      setIsSavingSchedule(false);
    }
  }

  const filteredItems = useMemo(() => {
    let result = scheduleItems;

    if (activeFilter !== 'all') {
      result = result.filter((item) => getScheduleCategory(item) === activeFilter);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((item) =>
        [item.dateLabel, item.timeLabel, item.groupName, item.eventType, item.location ?? '', item.notes ?? '', item.scheduleType ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query)
      );
    }

    return result;
  }, [activeFilter, scheduleItems, search]);

  // Counts always reflect the full scheduleItems set (not filteredItems) so pills show
  // how many exist in each bucket regardless of which filter is currently active.
  const filterCounts = useMemo(() => {
    const counts: Record<ScheduleFilter, number> = {
      all: scheduleItems.length,
      consultation: 0,
      meeting: 0,
      deadline: 0,
      reminder: 0,
      event: 0,
      defense: 0
    };

    scheduleItems.forEach((item) => {
      counts[getScheduleCategory(item)] += 1;
    });

    return counts;
  }, [scheduleItems]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, WeeklyScheduleItem[]>();

    filteredItems.forEach((item) => {
      const current = groups.get(item.dateLabel) ?? [];
      current.push(item);
      groups.set(item.dateLabel, current);
    });

    return Array.from(groups.entries()).map(([dateLabel, items]) => ({
      dateLabel,
      items
    }));
  }, [filteredItems]);

  const isOtherType = scheduleForm.type === 'OTHER';
  const isOtherRequirement = scheduleForm.type === 'DEADLINE' && scheduleForm.requiredSubmission === 'other';
  const requirement = getRequiredSubmissionOption(scheduleForm.requiredSubmission);
  const selectedTypeOption = getScheduleTypeOption(scheduleForm.type);
  const summaryProject = scheduleProjects.find((project) => project.id === scheduleForm.projectId);
  const summaryDate = scheduleForm.date
    ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${scheduleForm.date}T${scheduleForm.time || '00:00'}`))
    : 'No date';
  const summaryTime = scheduleForm.time
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${scheduleForm.time}`))
    : '';
  // One line that confirms what will be created (replaces the old preview panel).
  const formSummary = [
    buildScheduleTitle(scheduleForm) || selectedTypeOption.label,
    scheduleForm.projectId === 'ALL' ? `All groups (${scheduleProjects.length})` : summaryProject?.groupCode || summaryProject?.groupTitle,
    summaryDate,
    summaryTime
  ]
    .filter(Boolean)
    .join(' · ');
  const canCreate = workspaceMode === 'adviser';
  const isFormVisible = canCreate && showForm;
  const visibleFilters = SCHEDULE_FILTERS.filter((option) => option.id === 'all' || filterCounts[option.id] > 0);
  const hasFilters = activeFilter !== 'all' || search.trim() !== '';

  return (
    <>
      <AdviserPageHeader
        title={workspaceMode === 'panel' ? 'Defense Schedule' : 'Schedule'}
        description={
          workspaceMode === 'panel'
            ? 'Track defense evaluations, review windows, and panel commitments.'
            : 'Manage consultations, project stage reviews, and defense-related sessions.'
        }
        actions={
          <AdviserShellActions
            basePath={basePath}
            fullName={data.profile.fullName}
            notificationCount={data.profile.notificationCount}
            workspaceMode={workspaceMode}
            onSwitchWorkspace={switchWorkspace}
          />
        }
      />

      <div className="adviser-dash adviser-sched">
        <section className="adviser-dash-card adviser-groups-panel" aria-labelledby="adviser-sched-title">
          <header className="adviser-queue-head">
            <h2 id="adviser-sched-title">{workspaceMode === 'panel' ? 'Defense schedule' : 'Schedule'}</h2>
            <span className="adviser-dash-count">{scheduleItems.length}</span>
            {canCreate ? (
              <button
                type="button"
                className={`adviser-subs-review adviser-sched-new${isFormVisible ? ' is-quiet' : ''}`}
                aria-expanded={isFormVisible}
                onClick={() => setShowForm((current) => !current)}
              >
                <i className={`fas ${isFormVisible ? 'fa-xmark' : 'fa-plus'}`} aria-hidden="true" />
                {isFormVisible ? 'Close' : 'New schedule item'}
              </button>
            ) : null}
          </header>

          {isFormVisible ? (
            <form
              className="adviser-sched-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveScheduleItem();
              }}
            >
              <div className="adviser-sched-form-head">
                <span className="adviser-sched-form-icon" aria-hidden="true">
                  <i className={`fas ${selectedTypeOption.icon}`} />
                </span>
                <div>
                  <h3>New schedule item</h3>
                  <p>Pick a type, then when and where. Students see it on their schedule.</p>
                </div>
              </div>

              <fieldset className="adviser-sched-types">
                <legend>Type</legend>
                {SCHEDULE_TYPE_OPTIONS.map((option) => (
                  <label key={option.value} className={scheduleForm.type === option.value ? 'is-active' : undefined}>
                    <input
                      type="radio"
                      name="schedule-type"
                      value={option.value}
                      checked={scheduleForm.type === option.value}
                      disabled={isLoadingSchedule}
                      onChange={() =>
                        setScheduleForm((current) => ({
                          ...current,
                          type: option.value,
                          requiredSubmission: option.value === 'DEADLINE' ? current.requiredSubmission : '',
                          otherTypeLabel: option.value === 'OTHER' ? current.otherTypeLabel : ''
                        }))
                      }
                    />
                    <i className={`fas ${option.icon}`} aria-hidden="true" />
                    {option.label}
                  </label>
                ))}
              </fieldset>

              {isOtherType || scheduleForm.type === 'DEADLINE' ? (
                <div className="adviser-sched-extra">
                  {isOtherType ? (
                    <label className="adviser-sched-field is-wide">
                      <span>Specify type</span>
                      <span className="adviser-sched-input">
                        <i className="fas fa-shapes" aria-hidden="true" />
                        <input
                          className="adviser-groups-control"
                          value={scheduleForm.otherTypeLabel}
                          onChange={(event) => updateScheduleForm('otherTypeLabel', event.target.value)}
                          placeholder="e.g. Ethics review, MOA signing"
                          required
                        />
                      </span>
                    </label>
                  ) : null}

                  {scheduleForm.type === 'DEADLINE' ? (
                    <label className="adviser-sched-field is-wide">
                      <span>Students submit</span>
                      <span className="adviser-sched-input">
                        <i className="fas fa-file-circle-check" aria-hidden="true" />
                        <select
                          className="adviser-groups-control"
                          value={scheduleForm.requiredSubmission}
                          onChange={(event) => {
                            const option = getRequiredSubmissionOption(event.target.value);
                            const isOther = option.value === 'other';
                            setScheduleForm((current) => ({
                              ...current,
                              requiredSubmission: option.value,
                              // "Other" has no generic label worth prefilling; the field beside it asks for it.
                              title: isOther || current.title.trim() ? current.title : option.label,
                              notes: isOther || current.notes.trim() ? current.notes : option.hint,
                              otherSubmissionLabel: isOther ? current.otherSubmissionLabel : ''
                            }));
                          }}
                        >
                          {REQUIRED_SUBMISSION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </span>
                    </label>
                  ) : null}

                  {isOtherRequirement ? (
                    <label className="adviser-sched-field is-wide">
                      <span>Specify requirement</span>
                      <span className="adviser-sched-input">
                        <i className="fas fa-pen" aria-hidden="true" />
                        <input
                          className="adviser-groups-control"
                          value={scheduleForm.otherSubmissionLabel}
                          onChange={(event) => updateScheduleForm('otherSubmissionLabel', event.target.value)}
                          placeholder="e.g. Source code repository link"
                          required
                        />
                      </span>
                    </label>
                  ) : null}

                  {scheduleForm.type === 'DEADLINE' && (requirement.hint || REQUIRED_SUBMISSION_STAGE_LABEL[scheduleForm.requiredSubmission]) ? (
                    <p className="adviser-sched-hint">
                      <i className="fas fa-circle-info" aria-hidden="true" />
                      {requirement.hint}
                      {REQUIRED_SUBMISSION_STAGE_LABEL[scheduleForm.requiredSubmission]
                        ? ` This also sets the ${REQUIRED_SUBMISSION_STAGE_LABEL[scheduleForm.requiredSubmission]} due date on the student roadmap.`
                        : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="adviser-sched-grid">
                <label className="adviser-sched-field is-wide">
                  <span>Group</span>
                  <span className="adviser-sched-input">
                    <i className="fas fa-users" aria-hidden="true" />
                    <select
                      className="adviser-groups-control"
                      value={scheduleForm.projectId}
                      onChange={(event) => updateScheduleForm('projectId', event.target.value)}
                      disabled={isLoadingSchedule || !scheduleProjects.length}
                    >
                      {scheduleProjects.length > 1 ? <option value="ALL">All my groups ({scheduleProjects.length})</option> : null}
                      {scheduleProjects.length ? (
                        scheduleProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.groupCode ? `${project.groupCode} - ` : ''}
                            {project.groupTitle}
                          </option>
                        ))
                      ) : (
                        <option value="">No assigned project found</option>
                      )}
                    </select>
                  </span>
                </label>

                <label className="adviser-sched-field">
                  <span>Date</span>
                  <span className="adviser-sched-input">
                    <i className="fas fa-calendar" aria-hidden="true" />
                    <input
                      className="adviser-groups-control"
                      type="date"
                      value={scheduleForm.date}
                      onChange={(event) => updateScheduleForm('date', event.target.value)}
                      required
                    />
                  </span>
                </label>

                <label className="adviser-sched-field">
                  <span>Time</span>
                  <span className="adviser-sched-input">
                    <i className="fas fa-clock" aria-hidden="true" />
                    <input
                      className="adviser-groups-control"
                      type="time"
                      value={scheduleForm.time}
                      onChange={(event) => updateScheduleForm('time', event.target.value)}
                      required
                    />
                  </span>
                </label>

                <label className="adviser-sched-field is-wide">
                  <span>Agenda</span>
                  <span className="adviser-sched-input">
                    <i className="fas fa-align-left" aria-hidden="true" />
                    <input
                      className="adviser-groups-control"
                      value={scheduleForm.title}
                      onChange={(event) => updateScheduleForm('title', event.target.value)}
                      placeholder="Optional detail, e.g. Chapter 2 walkthrough"
                    />
                  </span>
                </label>

                <label className="adviser-sched-field is-wide">
                  <span>Location or link</span>
                  <span className="adviser-sched-input">
                    <i className="fas fa-location-dot" aria-hidden="true" />
                    <input
                      className="adviser-groups-control"
                      value={scheduleForm.location}
                      onChange={(event) => updateScheduleForm('location', event.target.value)}
                      placeholder="Room or meeting link"
                    />
                  </span>
                </label>

                <label className="adviser-sched-field is-full">
                  <span>Notes for students</span>
                  <span className="adviser-sched-input">
                    <i className="fas fa-clipboard-list" aria-hidden="true" />
                    <input
                      className="adviser-groups-control"
                      value={scheduleForm.notes}
                      onChange={(event) => updateScheduleForm('notes', event.target.value)}
                      placeholder="What should they prepare?"
                    />
                  </span>
                </label>
              </div>

              <div className="adviser-sched-form-foot">
                <label className="adviser-sched-toggle">
                  <input
                    type="checkbox"
                    checked={scheduleForm.notifyStudents}
                    onChange={(event) => updateScheduleForm('notifyStudents', event.target.checked)}
                  />
                  <i className={`fas ${scheduleForm.notifyStudents ? 'fa-bell' : 'fa-bell-slash'}`} aria-hidden="true" />
                  Notify students
                </label>
                {scheduleError ? (
                  <p className="adviser-sched-message is-error">{scheduleError}</p>
                ) : scheduleNotice ? (
                  <p className="adviser-sched-message">{scheduleNotice}</p>
                ) : (
                  <p className="adviser-sched-summary" aria-live="polite">
                    <i className={`fas ${selectedTypeOption.icon}`} aria-hidden="true" />
                    {formSummary}
                  </p>
                )}
                <button
                  className="adviser-subs-review"
                  type="submit"
                  disabled={isSavingSchedule || isLoadingSchedule || !scheduleForm.projectId}
                >
                  <i className={`fas ${isSavingSchedule ? 'fa-spinner fa-spin' : 'fa-check'}`} aria-hidden="true" />
                  {isSavingSchedule ? 'Saving…' : 'Save to schedule'}
                </button>
              </div>
            </form>
          ) : scheduleNotice ? (
            <p className="adviser-sched-message is-standalone">{scheduleNotice}</p>
          ) : null}

          <div className="adviser-groups-toolbar">
            {visibleFilters.length > 1 ? (
              <div className="adviser-groups-segmented" role="group" aria-label="Filter by type">
                {visibleFilters.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={activeFilter === option.id}
                    className={activeFilter === option.id ? 'is-active' : undefined}
                    onClick={() => setActiveFilter(option.id)}
                  >
                    {option.id === 'consultation' && workspaceMode === 'panel' ? 'Review windows' : option.label}
                    <span className="adviser-groups-count">{filterCounts[option.id]}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <label className="adviser-groups-search">
              <i aria-hidden="true" className="fas fa-search"></i>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search group, agenda, room, or date"
                aria-label="Search schedule"
                className="adviser-groups-control"
              />
            </label>
            {hasFilters ? (
              <div className="adviser-groups-toolbar-end">
                <button
                  type="button"
                  className="adviser-subs-clear"
                  onClick={() => {
                    setActiveFilter('all');
                    setSearch('');
                  }}
                >
                  <i aria-hidden="true" className="fas fa-xmark"></i>
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          {isLoadingSchedule ? (
            <ul className="adviser-subs-list" aria-hidden="true">
              {[0, 1].map((item) => (
                <li key={item} className="adviser-subs-row is-skeleton" />
              ))}
            </ul>
          ) : groupedItems.length ? (
            <div className="adviser-sched-days">
              {groupedItems.map((group) => (
                <section key={group.dateLabel} className="adviser-sched-day" aria-label={group.dateLabel}>
                  <h3>
                    {group.dateLabel}
                    <span>{group.items.length}</span>
                  </h3>
                  <ul>
                    {group.items.map((item) => {
                      const action = getActionMeta(workspaceMode, basePath, item);
                      const category = SCHEDULE_FILTERS.find((option) => option.id === getScheduleCategory(item));
                      return (
                        <li key={item.id} className="adviser-sched-item">
                          <span className="adviser-sched-time">{item.timeLabel}</span>
                          <div className="adviser-subs-main">
                            <strong title={item.eventType}>{item.eventType}</strong>
                            <small>
                              {item.groupName}
                              {item.notes ? ` · ${item.notes}` : ''}
                            </small>
                          </div>
                          <span className="adviser-sched-type">
                            <i className={`fas ${category?.icon ?? 'fa-calendar'}`} aria-hidden="true" />
                            {getScheduleCategoryLabel(item)}
                          </span>
                          <span className="adviser-sched-place" title={item.location}>
                            <i className="fas fa-location-dot" aria-hidden="true" />
                            {item.location ?? 'Venue to be confirmed'}
                          </span>
                          <Link href={action.href} className="adviser-subs-review is-quiet">
                            {action.label}
                            <i aria-hidden="true" className="fas fa-arrow-right" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="adviser-subs-empty">
              <span aria-hidden="true">
                <i className="fas fa-calendar-day" />
              </span>
              <p>
                {scheduleItems.length === 0
                  ? canCreate
                    ? 'Nothing scheduled yet. Add your first consultation, deadline, or meeting above.'
                    : 'Sessions your advisees schedule will show up here.'
                  : 'No schedule items match these filters.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
