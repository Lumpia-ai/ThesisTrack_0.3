'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import {
  ADVISER_GROUP_STATUS_META,
  GROUP_STATUS_COLORS,
  NAV_ITEMS,
  WORKSPACE_META,
  getComputedGroupStatus,
  getGroupDepartmentLabel,
  getGroupMilestoneLabel,
  getGroupProjectTitle,
  getProgressBand,
  isGroupCompleted,
  isNavItemActive
} from '@/components/adviser/shared/config/dashboard-utils';
import type { AdviserGroupLifecycleStatus } from '@/components/adviser/shared/config/dashboard-utils';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

type WorkspaceMode = keyof typeof WORKSPACE_META;
type GroupViewMode = 'table' | 'card';
type GroupLifecycleTab = 'active' | 'completed';
type AdviserGroup = AdviserDashboardData['groups'][number];
type ManagedAdviserGroup = AdviserGroup;
type LifecycleGroup = ManagedAdviserGroup & { status: AdviserGroupLifecycleStatus };
type GroupFilterStatus = 'all' | 'attention' | AdviserGroupLifecycleStatus;
type GroupDraft = {
  code: string;
  title: string;
  students: string[];
  leader: string;
};
type StudentRosterRecord = { name?: string | null };
type GroupRosterRecord = { students?: unknown };

const GROUP_STATUS_META = ADVISER_GROUP_STATUS_META;

function createEmptyGroupDraft(): GroupDraft {
  return {
    code: '',
    title: '',
    students: [],
    leader: ''
  };
}

const DEFAULT_NEW_GROUP_STATUS: AdviserGroupLifecycleStatus = 'pending';
const DEFAULT_NEW_GROUP_PROGRESS = 0;
const DEFAULT_NEW_GROUP_MILESTONE = 'Awaiting initial progress update';

// Same blue ramp and meaning as the dashboard: the stronger the blue, the healthier the group.
function getStatusTone(status: AdviserGroupLifecycleStatus) {
  const color = GROUP_STATUS_COLORS[status] ?? GROUP_STATUS_COLORS.pending;
  return { borderColor: color, surfaceColor: `color-mix(in srgb, ${color} 12%, transparent)` };
}

function getLifecycleGroup(group: ManagedAdviserGroup): LifecycleGroup {
  const completed = isGroupCompleted(group);
  const status = completed ? 'completed' : getComputedGroupStatus(group);
  const statusMeta = GROUP_STATUS_META[status];
  const projectTitle = getGroupProjectTitle(group);
  const department = getGroupDepartmentLabel(group);
  const milestone = getGroupMilestoneLabel(group);

  return {
    ...group,
    status,
    title: projectTitle,
    projectTitle,
    dept: department,
    department,
    milestone,
    currentMilestone: milestone,
    progress: completed ? 100 : group.progress,
    statusLabel: statusMeta.label,
    statusClass: statusMeta.className,
    completedAt: completed ? group.completedAt ?? group.updated_at : group.completedAt
  };
}

function isAttentionStatus(status: AdviserGroupLifecycleStatus) {
  return status === 'pending' || status === 'needs-revision' || status === 'at-risk';
}

function normalizeStudentRosterName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getGroupStudentKeys(group: GroupRosterRecord) {
  if (!Array.isArray(group.students)) {
    return [];
  }

  return group.students
    .filter((student): student is string => typeof student === 'string')
    .map(normalizeStudentRosterName)
    .filter(Boolean);
}

function mergeStudentKeys(currentKeys: string[], students: string[]) {
  const nextKeys = new Set(currentKeys);

  students.forEach((student) => {
    const key = normalizeStudentRosterName(student);
    if (key) {
      nextKeys.add(key);
    }
  });

  return Array.from(nextKeys);
}

function formatCompletedDate(value: string | null | undefined) {
  if (!value) {
    return 'Pending archive';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
  color,
  onClick,
  active = false
}: {
  icon: string;
  label: string;
  value: string | number;
  helper: string;
  /** Semantic tone from the dashboard blue ramp, derived from the value. */
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <span className="adviser-dash-hero-icon">
        <i aria-hidden="true" className={`fas ${icon}`} />
      </span>
      <span className="adviser-dash-hero-copy">
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </>
  );
  const style = { '--tone': color } as CSSProperties;

  return onClick ? (
    <button type="button" onClick={onClick} title={helper} aria-pressed={active} className={active ? 'is-active' : undefined} style={style}>
      {content}
    </button>
  ) : (
    <div title={helper} style={style}>
      {content}
    </div>
  );
}

function StatusPill({ status, label }: { status: AdviserGroupLifecycleStatus; label: string }) {
  return (
    <span className="adviser-dash-status">
      <span className="adviser-dash-swatch" style={{ background: GROUP_STATUS_COLORS[status] }} aria-hidden="true" />
      {label}
    </span>
  );
}

function ViewToggle({
  viewMode,
  onChange
}: {
  viewMode: GroupViewMode;
  onChange: (mode: GroupViewMode) => void;
}) {
  const options: Array<{ mode: GroupViewMode; icon: string; label: string }> = [
    { mode: 'table', icon: 'fa-table-list', label: 'Table view' },
    { mode: 'card', icon: 'fa-grip', label: 'Card view' }
  ];

  return (
    <div className="adviser-groups-segmented is-icons" role="group" aria-label="Layout">
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          onClick={() => onChange(option.mode)}
          aria-pressed={viewMode === option.mode}
          aria-label={option.label}
          title={option.label}
          className={viewMode === option.mode ? 'is-active' : undefined}
        >
          <i aria-hidden="true" className={`fas ${option.icon}`}></i>
        </button>
      ))}
    </div>
  );
}

type RowActionItem = {
  label: string;
  icon: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
};

function RowActionsMenu({ items }: { items: RowActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;

    const MENU_WIDTH = 192;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - MENU_WIDTH)
      });
    };

    updatePosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      // The menu itself renders through a portal to document.body, so it's never a
      // DOM descendant of buttonRef — checking only buttonRef here treated every
      // click on a menu item as an "outside" click, closing the menu on mousedown
      // before the item's own onClick had a chance to fire. Nothing in the menu
      // was clickable as a result.
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-[rgba(0,58,143,0.24)] hover:bg-[rgba(0,58,143,0.06)] hover:text-[var(--primary)] ${
          open ? 'border-[rgba(0,58,143,0.24)] bg-[rgba(0,58,143,0.06)] text-[var(--primary)]' : 'border-slate-200/60 bg-white'
        }`}
      >
        <i className="fas fa-ellipsis-vertical"></i>
      </button>
      {open && portalContainer && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: 'fixed', top: position.top, left: position.left, width: 192 }}
              className="z-[9999] overflow-hidden rounded-2xl border border-slate-200/70 bg-white py-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition ${
                    item.tone === 'danger' ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <i className={`fas ${item.icon} w-4 text-xs`}></i>
                  {item.label}
                </button>
              ))}
            </div>,
            portalContainer
          )
        : null}
    </>
  );
}

function DefenseOutcomeBadge({
  tag,
  compact = false
}: {
  tag: { label: string; tone: 'success' | 'danger' };
  compact?: boolean;
}) {
  // Blue ramp like the rest of the adviser module; the icon (check vs. exclamation) and
  // the label carry the outcome, so it never depends on hue alone.
  const color = tag.tone === 'success' ? DASH_COLORS.good : DASH_COLORS.critical;

  // Compact table cells can't fit the full sentence-length label without wrapping
  // awkwardly, so shorten it there and rely on the title tooltip for the rest.
  const displayLabel = compact ? tag.label.split(' — ')[0].split(' Required')[0] : tag.label;

  return (
    <span
      title={tag.label}
      className="adviser-groups-outcome inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ '--tone': color } as CSSProperties}
    >
      <i className={`fas ${tag.tone === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} shrink-0 text-[10px]`}></i>
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

// Cumulative checkpoint boundaries for the 6 real thesis stages (Concept 5, Proposal 5,
// Development 4, Pre-Final 4, Final Defense 4, Completion 4 — 26 total), expressed as
// percentages so the bar can show where each stage actually starts, not just an even split.
const PROGRESS_STAGE_BOUNDARIES = [5, 10, 14, 18, 22].map((checkpoints) => (checkpoints / 26) * 100);

function ProgressBar({ percent, height = 'h-2' }: { percent: number; height?: string }) {
  const fillWidth = Math.max(percent, percent > 0 ? 4 : 0);

  return (
    <div className={`adviser-groups-progress relative overflow-hidden rounded-full ${height}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${fillWidth}%`, background: getProgressBand(percent).color }}
      ></div>
      {PROGRESS_STAGE_BOUNDARIES.map((boundary) => (
        <span
          key={boundary}
          className="absolute inset-y-0 w-px bg-white/80"
          style={{ left: `${boundary}%` }}
        ></span>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-12 text-center">
      <div>
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(0, 58, 143, 0.08)', color: 'var(--primary)' }}
        >
          <i className="fas fa-users text-xl"></i>
        </div>
        <p className="text-base font-semibold text-slate-700">{message}</p>
      </div>
    </div>
  );
}

function GroupLifecycleTabs({
  activeTab,
  activeCount,
  completedCount,
  onChange
}: {
  activeTab: GroupLifecycleTab;
  activeCount: number;
  completedCount: number;
  onChange: (tab: GroupLifecycleTab) => void;
}) {
  const tabs: Array<{ id: GroupLifecycleTab; label: string; count: number; icon: string }> = [
    { id: 'active', label: 'Active', count: activeCount, icon: 'fa-users' },
    { id: 'completed', label: 'Completed', count: completedCount, icon: 'fa-box-archive' }
  ];

  return (
    <div className="adviser-groups-segmented" role="tablist" aria-label="Group lifecycle">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={active ? 'is-active' : undefined}
          >
            <i aria-hidden="true" className={`fas ${tab.icon} text-xs`}></i>
            <span>{tab.label}</span>
            <span className="adviser-groups-count">{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function GroupTable({
  groups,
  onOpenDetails,
  onOpenAddStudent
}: {
  groups: LifecycleGroup[];
  onOpenDetails: (groupId: string) => void;
  onOpenAddStudent: (groupId: string) => void;
}) {
  if (!groups.length) return <EmptyState message="No groups match the current filters." />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="adviser-groups-thead">
            <th className="px-5 py-3">Group</th>
            <th className="px-5 py-3">Project</th>
            <th className="px-5 py-3">Members</th>
            <th className="px-5 py-3">Project Stage</th>
            <th className="px-5 py-3">Defense Result</th>
            <th className="px-5 py-3">Progress</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              key={group.id}
              className="adviser-groups-row"
              style={
                group.defenseOutcomeTag
                  ? {
                      boxShadow: `inset 3px 0 0 0 ${group.defenseOutcomeTag.tone === 'danger' ? DASH_COLORS.critical : DASH_COLORS.good}`
                    }
                  : undefined
              }
            >
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <div className="space-y-1.5">
                  <p className="whitespace-nowrap text-sm font-bold text-slate-900">{group.code}</p>
                  <span className="dept-badge">{group.dept}</span>
                </div>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <p className="font-bold text-slate-900">{group.title}</p>
                {group.title === 'Pending Title Approval' && group.projectTitle && (
                  <p
                    className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed"
                    title={`Proposed Title: "${group.projectTitle}"`}
                  >
                    {`Proposed Title: "${group.projectTitle}"`}
                  </p>
                )}
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <p className="text-sm font-bold text-slate-900">{group.members} students</p>
                <p
                  className="mt-1.5 text-sm text-slate-500 leading-relaxed line-clamp-2"
                  title={group.students.join(', ')}
                >
                  {group.students.join(', ')}
                </p>
                <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Leader: <span className="tracking-normal font-semibold text-slate-700">{group.leader ?? 'Not assigned'}</span>
                </p>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <p
                  className="text-sm font-medium text-slate-600 line-clamp-2 max-w-[220px] leading-relaxed"
                  title={group.milestone}
                >
                  {group.milestone}
                </p>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                {group.defenseOutcomeTag ? (
                  group.defenseOutcomeTag.tone === 'danger' ? (
                    <button
                      type="button"
                      onClick={() => onOpenDetails(group.id)}
                      title="Click to open and resolve"
                      className="cursor-pointer transition hover:-translate-y-px"
                    >
                      <DefenseOutcomeBadge tag={group.defenseOutcomeTag} />
                    </button>
                  ) : (
                    <DefenseOutcomeBadge tag={group.defenseOutcomeTag} />
                  )
                ) : (
                  <span className="text-sm font-medium text-slate-400">No defense yet</span>
                )}
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <div className="w-[150px] space-y-1.5" title={group.progressDetail ?? undefined}>
                  <ProgressBar percent={group.progress} />
                  <span className="text-xs font-bold text-slate-500">
                    {group.progress > 0 ? `${group.progress}%` : 'Not started'}
                  </span>
                  {group.progressStage && (
                    <p className="text-[11px] font-medium leading-tight text-slate-400 line-clamp-1">
                      In {group.progressStage}
                    </p>
                  )}
                </div>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <StatusPill status={group.status} label={group.statusLabel} />
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <div className="flex justify-end">
                  <RowActionsMenu
                    items={[
                      { label: 'View Details', icon: 'fa-eye', onClick: () => onOpenDetails(group.id) },
                      { label: 'Add Student', icon: 'fa-user-plus', onClick: () => onOpenAddStudent(group.id) }
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupCards({
  groups,
  onOpenDetails,
  onOpenAddStudent
}: {
  groups: LifecycleGroup[];
  onOpenDetails: (groupId: string) => void;
  onOpenAddStudent: (groupId: string) => void;
}) {
  if (!groups.length) return <EmptyState message="No groups match the current filters." />;

  return (
    <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
      {groups.map((group) => {
        const tone = getStatusTone(group.status);
        return (
          <article
            key={group.id}
            className="group relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
            style={{ borderLeftWidth: '4px', borderLeftColor: tone.borderColor }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">{group.code}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{group.title}</h3>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusPill status={group.status} label={group.statusLabel} />
                {group.defenseOutcomeTag && <DefenseOutcomeBadge tag={group.defenseOutcomeTag} />}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="dept-badge">{group.dept}</span>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-slate-600"
                style={{ background: tone.surfaceColor }}
              >
                {group.members} members
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current Project Stage</p>
                <p className="mt-2 text-sm text-slate-700">{group.milestone}</p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-500">Progress</span>
                  <span className="font-semibold text-slate-700">
                    {group.progress > 0 ? `${group.progress}%` : 'Not started yet'}
                  </span>
                </div>
                <ProgressBar percent={group.progress} />
                {group.progressStage && (
                  <p className="mt-1.5 text-xs font-medium text-slate-400">
                    Currently in {group.progressStage}
                    {group.progressDetail ? ` · ${group.progressDetail}` : ''}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Students</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{group.students.join(', ')}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Leader: {group.leader ?? 'Not assigned'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAddStudent(group.id)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[rgba(0,58,143,0.24)] hover:bg-[rgba(0,58,143,0.06)] hover:text-[var(--primary)]"
              >
                <i className="fas fa-user-plus text-xs"></i>
                Add Student
              </button>
              <button
                type="button"
                onClick={() => onOpenDetails(group.id)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-md shadow-[rgba(0,58,143,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[rgba(0,58,143,0.3)]"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
              >
                <i className="fas fa-eye text-xs"></i>
                Details
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CompletedGroupTable({
  groups,
  onOpenDetails
}: {
  groups: LifecycleGroup[];
  onOpenDetails: (groupId: string) => void;
}) {
  if (!groups.length) {
    return <EmptyState message="No completed groups are archived yet." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="adviser-groups-thead">
            <th className="px-5 py-3">Group</th>
            <th className="px-5 py-3">Project</th>
            <th className="px-5 py-3">Final Defense</th>
            <th className="px-5 py-3">Completed</th>
            <th className="px-5 py-3">Record</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id} className="adviser-groups-row">
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{group.code}</p>
                  <span className="dept-badge">{group.dept}</span>
                </div>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <p className="font-semibold text-slate-900">{group.title}</p>
                <p className="mt-1 text-sm text-slate-500">Final recommendation archived for adviser reference.</p>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <div className="space-y-2">
                  <StatusPill status={group.status} label={group.statusLabel} />
                  <p className="text-sm font-medium text-slate-700">{group.finalDefenseResult}</p>
                </div>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top text-sm text-slate-600">
                {formatCompletedDate(group.completedAt)}
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <p className="text-sm font-semibold text-slate-900">
                  {group.finalScore !== null ? `${group.finalScore}% final score` : 'Record on file'}
                </p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  {group.finalRecommendation ?? 'Final recommendation archived for future reference.'}
                </p>
              </td>
              <td className="border-t border-slate-100 px-5 py-4 align-top">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenDetails(group.id)}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,58,143,0.2)] transition hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
                  >
                    <i className="fas fa-folder-open text-xs"></i>
                    View Record
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompletedGroupCards({
  groups,
  onOpenDetails
}: {
  groups: LifecycleGroup[];
  onOpenDetails: (groupId: string) => void;
}) {
  if (!groups.length) {
    return <EmptyState message="No completed groups are archived yet." />;
  }

  return (
    <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
      {groups.map((group) => {
        const tone = getStatusTone('completed');
        return (
          <article
            key={group.id}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            style={{ borderLeftWidth: '4px', borderLeftColor: tone.borderColor }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">{group.code}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{group.title}</h3>
              </div>
              <StatusPill status={group.status} label={group.statusLabel} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="dept-badge">{group.dept}</span>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-slate-600"
                style={{ background: tone.surfaceColor }}
              >
                {formatCompletedDate(group.completedAt)}
              </span>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Final Defense</p>
                <p className="mt-2 font-semibold text-slate-900">{group.finalDefenseResult}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Final Record</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {group.finalScore !== null ? `${group.finalScore}% final score` : 'Recommendation on file'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {group.finalRecommendation ?? 'Completed archive ready for adviser reference.'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => onOpenDetails(group.id)}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,58,143,0.2)] transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
              >
                <i className="fas fa-folder-open text-xs"></i>
                View Record
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

type AdviserProgressReportComment = { id: string; body: string; authorName: string; createdAt: string };
type AdviserProgressReport = {
  id: string;
  submissionId: string | null;
  submittedByName: string;
  dateLabel: string;
  progressDescription: string;
  percentageCompleted: number;
  feedback: AdviserProgressReportComment[];
};

export function AdviserProgressReportsPanel({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<AdviserProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/progress-reports?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setReports(payload.reports || []);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load progress reports.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleSubmitFeedback = async (report: AdviserProgressReport) => {
    const body = (commentDrafts[report.id] || '').trim();
    if (!body || !report.submissionId) return;

    setSubmittingId(report.id);
    try {
      const response = await fetch('/api/review-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: report.submissionId, body })
      });
      const payload = await response.json();

      if (response.ok && payload.comment) {
        setReports((current) =>
          current.map((item) =>
            item.id === report.id
              ? { ...item, feedback: [...item.feedback, { id: payload.comment.id, body: payload.comment.body, authorName: 'You', createdAt: payload.comment.createdAt }] }
              : item
          )
        );
        setCommentDrafts((current) => ({ ...current, [report.id]: '' }));
      }
    } finally {
      setSubmittingId(null);
    }
  };

  if (!projectId) return null;

  return (
    <section className="adviser-gdm-section">
      <div className="adviser-gdm-section-head">
        <h3>
          Progress reports {reports.length ? <span className="adviser-dash-count">{reports.length}</span> : null}
        </h3>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading reports…</p>
      ) : loadError ? (
        <p className="mt-4 text-sm text-rose-600">{loadError}</p>
      ) : reports.length ? (
        <div className="mt-4 space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">{report.submittedByName}</p>
                  <p className="text-xs text-slate-500">{report.dateLabel}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-[rgba(0,58,143,0.08)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
                  {report.percentageCompleted}% complete
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-700">{report.progressDescription}</p>

              {report.feedback.length ? (
                <div className="mt-3 space-y-2">
                  {report.feedback.map((comment) => (
                    <div key={comment.id} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/60">
                      <p className="text-[11px] font-bold text-slate-600">{comment.authorName}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{comment.body}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                <input
                  className="min-h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-[var(--primary)]"
                  placeholder="Leave feedback on this report..."
                  value={commentDrafts[report.id] || ''}
                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [report.id]: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSubmitFeedback(report);
                    }
                  }}
                />
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[var(--primary)] px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submittingId === report.id || !(commentDrafts[report.id] || '').trim()}
                  onClick={() => handleSubmitFeedback(report)}
                >
                  {submittingId === report.id ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : 'Send'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No progress reports filed yet.</p>
      )}
    </section>
  );
}

function GroupDetailsModal({
  group,
  open,
  onClose,
  onAssignLeader,
  onOpenAddStudent,
  onRemoveStudent,
  onApproveTitle,
  onDemoteGroup
}: {
  group: LifecycleGroup | null;
  open: boolean;
  onClose: () => void;
  onAssignLeader: (groupId: string, leader: string) => void;
  onOpenAddStudent: (groupId: string) => void;
  onRemoveStudent?: (groupId: string, student: string) => void;
  onApproveTitle?: (groupId: string, projectTitle: string) => void;
  onDemoteGroup?: (groupId: string, reason: string) => Promise<void>;
}) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [confirmingDemote, setConfirmingDemote] = useState(false);
  const [demoteReason, setDemoteReason] = useState('');
  const [demoteSubmitting, setDemoteSubmitting] = useState(false);
  const [demoteError, setDemoteError] = useState<string | null>(null);
  const [demoteJustSucceeded, setDemoteJustSucceeded] = useState(false);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  useEffect(() => {
    setConfirmingDemote(false);
    setDemoteReason('');
    setDemoteSubmitting(false);
    setDemoteError(null);
    setDemoteJustSucceeded(false);
  }, [group?.id]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirmingDemote) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, confirmingDemote, onClose]);

  if (!open || !group || !portalContainer) return null;

  const completed = group.status === 'completed';
  const statusColor = GROUP_STATUS_COLORS[group.status];
  const isPendingTitle = group.title === 'Pending Title Approval';
  // Flagged groups (a rejected defense, or already at risk) get the reset as a prominent alert at
  // the top. For a routine group it's the adviser's own discretionary call, so it sits quietly at
  // the bottom instead of being the first thing on every modal.
  const isFlagged = group.status === 'needs-revision' || group.status === 'at-risk';
  const canDemote =
    !demoteJustSucceeded && !completed && !isPendingTitle && group.title !== 'Pending Student Submission' && Boolean(onDemoteGroup);

  const cancelDemote = () => {
    setConfirmingDemote(false);
    setDemoteReason('');
    setDemoteError(null);
  };

  const submitDemote = async () => {
    const trimmedReason = demoteReason.trim();
    if (!trimmedReason) {
      setDemoteError('A reason is required.');
      return;
    }
    if (!onDemoteGroup) return;
    setDemoteSubmitting(true);
    setDemoteError(null);
    try {
      await onDemoteGroup(group.id, trimmedReason);
      cancelDemote();
      setDemoteJustSucceeded(true);
    } catch (e) {
      setDemoteError(e instanceof Error ? e.message : 'Unable to reset this group.');
    } finally {
      setDemoteSubmitting(false);
    }
  };

  const demoteSection = canDemote ? (
    <section className={`adviser-gdm-danger${isFlagged ? ' is-flagged' : ''}`}>
      <div className="adviser-gdm-danger-copy">
        <strong>{isFlagged ? 'Restart the title proposal' : 'Reject the current title'}</strong>
        <p>
          {isFlagged
            ? group.defenseOutcomeTag
              ? `The panel's latest defense verdict was "${group.defenseOutcomeTag.label}". Resetting sends the group back to a new title proposal.`
              : `If the panel rejected the project at the ${group.milestone || 'current'} stage, reset it so the group submits a new title.`
            : 'Your own call, no panel decision needed. Resets progress to 0%, archives the current project, and notifies the students.'}
        </p>
      </div>

      {!confirmingDemote ? (
        <button type="button" className="adviser-gdm-btn is-danger" onClick={() => setConfirmingDemote(true)}>
          <i className="fas fa-rotate-left" aria-hidden="true"></i>
          Reject &amp; request new title
        </button>
      ) : (
        <div className="adviser-gdm-danger-form">
          <label htmlFor="demote-reason">Reason (the students will see this)</label>
          <textarea
            id="demote-reason"
            value={demoteReason}
            onChange={(event) => setDemoteReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                cancelDemote();
              }
            }}
            rows={3}
            autoFocus
            disabled={demoteSubmitting}
            placeholder="e.g. Panel rejected the concept defense; scope needs to be redefined."
          />
          {demoteError ? (
            <p className="adviser-gdm-error">
              <i className="fas fa-circle-exclamation" aria-hidden="true"></i>
              {demoteError}
            </p>
          ) : null}
          <div className="adviser-gdm-row-actions">
            <button type="button" className="adviser-gdm-btn" disabled={demoteSubmitting} onClick={cancelDemote}>
              Cancel
            </button>
            <button type="button" className="adviser-gdm-btn is-danger-solid" disabled={demoteSubmitting} onClick={submitDemote}>
              <i className={`fas ${demoteSubmitting ? 'fa-spinner fa-spin' : 'fa-check'}`} aria-hidden="true"></i>
              {demoteSubmitting ? 'Resetting…' : 'Confirm reset'}
            </button>
          </div>
        </div>
      )}
    </section>
  ) : null;

  return createPortal(
    <div
      className="adviser-tdm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adviser-gdm-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="adviser-gdm">
        <header className="adviser-gdm-header">
          <div className="adviser-tdm-heading">
            <h2 id="adviser-gdm-title" title={group.title}>{group.title}</h2>
            <p className="adviser-tdm-meta">
              <span className="adviser-tdm-code">{group.code}</span>
              <span>{group.dept}</span>
              {!completed ? <span>{group.milestone}</span> : null}
            </p>
          </div>
          <span className="adviser-tdm-status" style={{ '--tone': statusColor } as CSSProperties}>
            <span aria-hidden="true" />
            {group.statusLabel}
          </span>
          <button type="button" className="adviser-tdm-close" aria-label="Close" onClick={onClose}>
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div className="adviser-gdm-body">
          {group.defenseOutcomeTag ? (
            <div className="adviser-gdm-outcome">
              <DefenseOutcomeBadge tag={group.defenseOutcomeTag} />
            </div>
          ) : null}

          {demoteJustSucceeded ? (
            <p className="adviser-gdm-notice">
              <i className="fas fa-circle-check" aria-hidden="true"></i>
              Group reset. The students can now submit a new title.
            </p>
          ) : null}

          {isPendingTitle && onApproveTitle ? (
            <section className="adviser-gdm-callout">
              <div>
                <strong>Working title submitted</strong>
                <p>&ldquo;{group.projectTitle}&rdquo;</p>
                <small>Accepting unlocks the Concept phase. The panel can still ask for a revision later.</small>
              </div>
              <button
                type="button"
                className="adviser-gdm-btn is-primary"
                onClick={() => onApproveTitle(group.id, group.projectTitle)}
              >
                <i className="fas fa-check" aria-hidden="true"></i>
                Accept working title
              </button>
            </section>
          ) : null}

          {isFlagged ? demoteSection : null}

          {completed ? (
            <section className="adviser-gdm-section">
              <h3>Completion record</h3>
              <dl className="adviser-gdm-facts">
                <div><dt>Final score</dt><dd>{group.finalScore !== null ? `${group.finalScore}%` : 'N/A'}</dd></div>
                <div><dt>Completed</dt><dd>{formatCompletedDate(group.completedAt)}</dd></div>
                <div><dt>Final defense</dt><dd>{group.finalDefenseResult}</dd></div>
                <div><dt>Final manuscript</dt><dd>{group.finalManuscriptApproved ? 'Approved' : 'Pending'}</dd></div>
                <div><dt>Required project stages</dt><dd>{group.allRequiredMilestonesCompleted ? 'Completed' : 'Pending'}</dd></div>
              </dl>
              <p className="adviser-gdm-text">
                {group.finalRecommendation ?? 'No final recommendation was attached to this archive record.'}
              </p>
            </section>
          ) : (
            <section className="adviser-gdm-section">
              <div className="adviser-gdm-section-head">
                <h3>Progress</h3>
                <Link href="/adviser/adviser-mode/submissions" className="adviser-gdm-link">
                  Review submissions
                  <i className="fas fa-arrow-right" aria-hidden="true"></i>
                </Link>
              </div>
              <div className="adviser-gdm-progress">
                <strong>{group.progress}%</strong>
                <div>
                  <ProgressBar percent={group.progress} height="h-2.5" />
                  <small>
                    {group.progressStage ? `In ${group.progressStage}` : 'Not started yet'}
                    {group.progressDetail ? ` · ${group.progressDetail}` : ''}
                  </small>
                </div>
              </div>
            </section>
          )}

          <section className="adviser-gdm-section">
            <div className="adviser-gdm-section-head">
              <h3>
                Members <span className="adviser-dash-count">{group.students.length}</span>
              </h3>
              {!completed ? (
                <button type="button" className="adviser-gdm-btn is-small" onClick={() => onOpenAddStudent(group.id)}>
                  <i className="fas fa-user-plus" aria-hidden="true"></i>
                  Add student
                </button>
              ) : null}
            </div>
            <ul className="adviser-gdm-members">
              {group.students.map((student) => {
                const isPending = group.pendingStudents?.includes(student);
                const isLeader = group.leader === student;
                return (
                  <li key={student}>
                    <span className="adviser-gdm-avatar" aria-hidden="true">{student.trim().charAt(0).toUpperCase() || '?'}</span>
                    <span className="adviser-gdm-name" title={student}>{student}</span>
                    {isLeader ? <span className="adviser-gdm-tag is-leader">Leader</span> : null}
                    {isPending ? (
                      <span className="adviser-gdm-tag" title="This student hasn't accepted the group invitation yet.">
                        Invite pending
                      </span>
                    ) : null}
                    {!completed ? (
                      <span className="adviser-gdm-member-actions">
                        {!isLeader ? (
                          <button type="button" className="adviser-gdm-btn is-ghost" onClick={() => onAssignLeader(group.id, student)}>
                            Make leader
                          </button>
                        ) : null}
                        {onRemoveStudent ? (
                          <button
                            type="button"
                            className="adviser-gdm-icon-btn"
                            aria-label={`Remove ${student} from the group`}
                            title="Remove from group"
                            onClick={() => onRemoveStudent(group.id, student)}
                          >
                            <i className="fas fa-user-minus" aria-hidden="true"></i>
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {!group.leader && !completed ? <p className="adviser-gdm-hint">No leader assigned yet.</p> : null}
          </section>

          {group.project_id ? <AdviserProgressReportsPanel projectId={group.project_id} /> : null}

          {!isFlagged ? demoteSection : null}
        </div>
      </div>
    </div>,
    portalContainer
  );
}

function AddStudentToGroupModal({
  open,
  group,
  availableStudents,
  onClose,
  onAddStudent
}: {
  open: boolean;
  group: LifecycleGroup | null;
  availableStudents: string[];
  onClose: () => void;
  onAddStudent: (groupId: string, student: string) => void;
}) {
  const [studentSearch, setStudentSearch] = useState('');
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      setStudentSearch('');
    }
  }, [open]);

  if (!open || !group || !portalContainer) return null;

  const groupStudentKeys = new Set(group.students.map(normalizeStudentRosterName));
  const searchQuery = studentSearch.trim().toLowerCase();
  const filteredStudents = availableStudents.filter(
    (student) =>
      !groupStudentKeys.has(normalizeStudentRosterName(student)) &&
      student.toLowerCase().includes(searchQuery)
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6"
      aria-hidden="false"
      aria-modal="true"
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content !max-w-[700px] flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-0 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Premium Header */}
        <div className="relative flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-8 py-6">
          <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(to right, var(--primary), var(--primary-dark))' }} />
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,58,143,0.06)] text-[var(--primary)] shadow-inner ring-1 ring-inset ring-[rgba(0,58,143,0.12)]">
              <i className="fas fa-user-plus text-2xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">Add Student</h3>
              <p className="mt-1.5 text-sm font-medium text-slate-500">
                Search and assign an available student to this group.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-slate-200" />
            <div className="px-6 py-5 pl-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Target Group</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{group.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{group.code}</p>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <label htmlFor="existing-group-student-search" className="block text-sm font-bold text-slate-900">
                  Available Roster
                </label>
                <p className="mt-1 text-sm font-medium text-slate-500">Find students who aren't currently assigned to a group.</p>
              </div>
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                {group.members} current members
              </span>
            </div>

            <div className="relative mt-5">
              <i className="fas fa-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
              <input
                id="existing-group-student-search"
                type="text"
                placeholder="Search by name..."
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                className="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(0,58,143,0.1)]"
              />
            </div>

            {group.students.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Currently Assigned</p>
                <div className="flex flex-wrap gap-2">
                  {group.students.map((student) => (
                    <span
                      key={student}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      {student}
                      {group.leader === student && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                          Leader
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Search Results</p>
              <div className="max-h-[280px] space-y-2.5 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                {filteredStudents.length ? (
                  filteredStudents.map((student) => (
                    <div key={student} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[rgba(0,58,143,0.24)] hover:bg-[rgba(0,58,143,0.06)] hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 transition group-hover:bg-[rgba(0,58,143,0.1)] group-hover:text-[var(--primary)]">
                          {student.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 transition group-hover:text-[var(--primary-dark)]">{student}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddStudent(group.id, student)}
                        className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-[rgba(0,58,143,0.16)] bg-white px-4 text-xs font-bold text-[var(--primary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[rgba(0,58,143,0.3)] hover:bg-[var(--primary)] hover:text-white hover:shadow-md"
                      >
                        <i className="fas fa-plus"></i>
                        Assign
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <i className="fas fa-users-slash text-xl"></i>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No students available</p>
                    <p className="mt-1 text-xs text-slate-500">Try a different search term or check roster.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-8 py-5 flex items-center justify-end">
          <button 
            type="button" 
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900" 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    portalContainer
  );
}

function CreateGroupModal({
  open,
  department,
  availableStudents,
  draft,
  onDraftChange,
  onClose,
  onSubmit
}: {
  open: boolean;
  department: string;
  availableStudents: string[];
  draft: GroupDraft;
  onDraftChange: (draft: GroupDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [studentSearch, setStudentSearch] = useState('');
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const groupCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      setStudentSearch('');
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => {
      groupCodeInputRef.current?.focus();
    }, 40);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const draftStudentKeys = new Set(draft.students.map(normalizeStudentRosterName));
  const searchQuery = studentSearch.trim().toLowerCase();
  const filteredStudents = availableStudents.filter(
    (student) =>
      !draftStudentKeys.has(normalizeStudentRosterName(student)) &&
      student.toLowerCase().includes(searchQuery)
  );

  const addStudentToDraft = (student: string) => {
    onDraftChange({
      ...draft,
      students: [...draft.students, student],
      leader: draft.leader
    });
  };

  const removeStudentFromDraft = (student: string) => {
    const nextStudents = draft.students.filter((entry) => entry !== student);
    onDraftChange({
      ...draft,
      students: nextStudents,
      leader: draft.leader === student ? (nextStudents[0] ?? '') : draft.leader
    });
  };

  const assignLeader = (student: string) => {
    onDraftChange({ ...draft, leader: student });
  };

  const isReadyToCreate = draft.code.trim().length > 0 && draft.students.length > 0 && Boolean(draft.leader);

  if (!open || !portalContainer) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6"
      aria-hidden="false"
      aria-modal="true"
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content !max-w-[900px] flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-0 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Premium Header */}
        <div className="relative flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-8 py-6">
          <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(to right, var(--primary), var(--primary-dark))' }} />
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,58,143,0.06)] text-[var(--primary)] shadow-inner ring-1 ring-inset ring-[rgba(0,58,143,0.12)]">
              <i className="fas fa-users text-2xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">Create New Group</h3>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200">
                  {department}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-500">Configure group identity and assign student members to start tracking progress.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* Left Column: Config & Search */}
            <div className="flex flex-col space-y-6">
              
              {/* Group Code */}
              <div className="rounded-[1.25rem] border border-slate-200/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <label htmlFor="group-code" className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Group Code</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Required</span>
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-[var(--primary)]">
                    <i className="fas fa-hashtag"></i>
                  </div>
                  <input
                    id="group-code"
                    ref={groupCodeInputRef}
                    type="text"
                    placeholder={`e.g. ${department.replace(/ Office| Department/i, '').trim().toUpperCase()}-2024-05`}
                    value={draft.code}
                    onChange={(event) => onDraftChange({ ...draft, code: event.target.value })}
                    className="block min-h-[48px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(0,58,143,0.1)]"
                  />
                </div>
              </div>

              {/* Available Students */}
              <div className="flex flex-col flex-1 rounded-[1.25rem] border border-slate-200/60 bg-white shadow-sm overflow-hidden min-h-[360px]">
                <div className="border-b border-slate-100 p-5 bg-gradient-to-b from-slate-50 to-white">
                  <label className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Available Roster</span>
                    <span className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2 text-[10px] font-bold text-slate-500">{filteredStudents.length} Students</span>
                  </label>
                  <div className="relative group mt-2">
                    <i className="fas fa-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition-colors group-focus-within:text-[var(--primary)]"></i>
                    <input
                      type="text"
                      placeholder="Search students by name..."
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      className="block min-h-[48px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(0,58,143,0.1)]"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                  {filteredStudents.length > 0 ? (
                    <div className="space-y-2">
                      {filteredStudents.map((student) => {
                        const initials = student.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        return (
                          <div key={student} className="group flex items-center justify-between rounded-2xl p-3 bg-white border border-slate-100 hover:border-[rgba(0,58,143,0.24)] hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,58,143,0.06)] text-[11px] font-bold text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
                                {initials}
                              </div>
                              <span className="truncate text-sm font-semibold text-slate-700 transition-colors group-hover:text-[var(--primary-dark)]">{student}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => addStudentToDraft(student)}
                              className="shrink-0 rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-[var(--primary)] hover:text-white hover:ring-[var(--primary)] opacity-0 md:opacity-0 group-hover:opacity-100"
                            >
                              Add
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white m-2">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <i className="fas fa-user-slash text-xl"></i>
                      </div>
                      <p className="text-sm font-bold text-slate-700">No students found</p>
                      <p className="mt-1 text-xs text-slate-500 max-w-[200px] leading-relaxed">Check your spelling or confirm if all matching students are already in the group.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Selected Roster */}
            <div className="flex flex-col h-full rounded-[1.25rem] border border-slate-200/60 bg-white shadow-sm overflow-hidden min-h-[460px]">
              <div className="border-b border-slate-100 p-5 bg-gradient-to-b from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-1">Selected Team</h4>
                    <p className="text-sm font-bold text-slate-900">Review & Assign Leader</p>
                  </div>
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[rgba(0,58,143,0.1)] text-[var(--primary)] font-bold text-sm">
                    {draft.students.length}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
                {draft.students.length > 0 ? (
                  <div className="space-y-3">
                    {draft.students.map((student) => {
                      const isLeader = draft.leader === student;
                      const initials = student.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                      return (
                        <div
                          key={student}
                          className={`group flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${
                            isLeader 
                              ? 'border-[var(--primary)]/30 bg-[rgba(0,58,143,0.06)] shadow-sm ring-1 ring-[rgba(0,58,143,0.1)]' 
                              : 'border-slate-200 bg-white hover:border-[rgba(0,58,143,0.24)] hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-colors ${
                              isLeader ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-bold ${isLeader ? 'text-[var(--primary)]' : 'text-slate-700'}`}>{student}</p>
                              {isLeader ? (
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 flex items-center gap-1.5">
                                  <i className="fas fa-crown"></i> Group Leader
                                </p>
                              ) : (
                                <p className="mt-0.5 text-xs text-slate-400 font-medium">Group Member</p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {!isLeader && (
                              <button
                                type="button"
                                onClick={() => assignLeader(student)}
                                className="flex min-h-[36px] items-center rounded-xl px-4 text-xs font-bold text-slate-600 bg-slate-50 ring-1 ring-inset ring-slate-200 hover:bg-[var(--primary)] hover:text-white hover:ring-[var(--primary)] transition-all opacity-0 md:opacity-0 group-hover:opacity-100 shadow-sm"
                              >
                                Make Leader
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeStudentFromDraft(student)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 bg-white ring-1 ring-inset ring-slate-200 hover:bg-red-50 hover:text-red-600 hover:ring-red-200 transition-all shadow-sm"
                              title="Remove"
                            >
                              <i className="fas fa-trash-alt text-[11px]"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-[1.25rem] bg-white m-1 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[rgba(0,58,143,0.03)] rounded-full blur-3xl"></div>
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300 shadow-sm border border-slate-100 relative z-10">
                      <i className="fas fa-user-plus text-2xl"></i>
                    </div>
                    <p className="text-base font-bold text-slate-800 relative z-10">Your roster is empty</p>
                    <p className="mt-2 text-sm text-slate-500 max-w-[220px] leading-relaxed relative z-10">Select students from the available roster to start building this group.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Premium Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/60 bg-white px-8 py-5">
          <div className="flex items-center">
            {isReadyToCreate ? (
              <div className="flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-2 ring-1 ring-inset ring-emerald-200 animate-in slide-in-from-left-4 fade-in">
                <i className="fas fa-check-circle text-emerald-500 text-lg"></i>
                <span className="text-sm font-bold text-emerald-700">Ready to create group</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-full bg-amber-50 px-4 py-2 ring-1 ring-inset ring-amber-200">
                <i className="fas fa-circle-exclamation text-amber-500 text-lg"></i>
                <span className="text-sm font-bold text-amber-700">
                  {!draft.code.trim() ? "Missing group code" : draft.students.length === 0 ? "Add at least one member" : "Leader not assigned"}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!isReadyToCreate}
              className={`flex min-h-[48px] items-center gap-2 rounded-xl px-8 text-sm font-bold text-white shadow-lg transition-all duration-300 ${
                isReadyToCreate 
                  ? 'hover:shadow-xl hover:scale-[1.02] active:scale-95' 
                  : 'bg-slate-300 shadow-none cursor-not-allowed opacity-80'
              }`}
              style={isReadyToCreate ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' } : undefined}
            >
              <i className="fas fa-folder-plus"></i>
              Create Group
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalContainer
  );
}

export function AdviserGroups({ data }: { data: AdviserDashboardData }) {
  const adviserDepartment = data.profile.department?.replace(' Department', '') || 'IT';
  const { workspaceMode, switchWorkspace, pathname, basePath } = useWorkspaceMode();
  const initialAdviserGroups = useMemo(
    () => data.groups.filter((group) => group.user_id === data.profile.user_id),
    [data.groups, data.profile.user_id]
  );
  const [groups, setGroups] = useState<ManagedAdviserGroup[]>(() => initialAdviserGroups);

  const [activeTab, setActiveTab] = useState<GroupLifecycleTab>('active');
  const [viewMode, setViewMode] = useState<GroupViewMode>('table');
  const [statusFilter, setStatusFilter] = useState<GroupFilterStatus>('all');
  const [search, setSearch] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [studentGroupId, setStudentGroupId] = useState<string | null>(null);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(createEmptyGroupDraft());
  const [availableDbStudents, setAvailableDbStudents] = useState<string[]>([]);
  const [assignedStudentKeys, setAssignedStudentKeys] = useState<string[]>([]);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const [studentsResponse, groupsResponse, myGroupsResponse] = await Promise.all([
          fetch(`/api/students?department=${encodeURIComponent(adviserDepartment)}&limit=200&availableOnly=true`),
          fetch(`/api/groups?department=${encodeURIComponent(adviserDepartment)}&fields=students&limit=200`),
          fetch(`/api/groups?userId=${encodeURIComponent(data.profile.user_id)}`)
        ]);

        if (studentsResponse.ok) {
          const students: StudentRosterRecord[] = await studentsResponse.json();
          setAvailableDbStudents(
            students
              .map((student) => student.name?.trim())
              .filter((student): student is string => Boolean(student))
          );
        }

        if (groupsResponse.ok) {
          const departmentGroups: GroupRosterRecord[] = await groupsResponse.json();
          setAssignedStudentKeys(Array.from(new Set(departmentGroups.flatMap(getGroupStudentKeys))));
        } else {
          setAssignedStudentKeys([]);
        }

        if (myGroupsResponse.ok) {
          const myDbGroups = await myGroupsResponse.json();
          // Map DB groups to ManagedAdviserGroup structure
          const mappedGroups = myDbGroups.map((g: any) => ({
            ...g,
            id: g.id,
            user_id: g.userId,
            project_id: g.projectId,
            status: g.status,
            created_at: g.createdAt,
            updated_at: g.updatedAt,
            milestone: g.milestone || 1,
            currentMilestone: g.currentMilestone || 1,
            leader: g.leader || null
          }));
          setGroups(mappedGroups);
        }
      } catch (e) {
        console.error('Failed to fetch students', e);
        setAssignedStudentKeys([]);
      }
    }
    // Always fetch on mount, and re-fetch if modals are opened
    fetchStudents();
  }, [addStudentModalOpen, createGroupModalOpen, adviserDepartment, data.profile.user_id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailsOpen(false);
        setAddStudentModalOpen(false);
        setCreateGroupModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const meta = WORKSPACE_META[workspaceMode];
  const lifecycleGroups = useMemo(() => groups.map(getLifecycleGroup), [groups]);
  const activeGroups = useMemo(
    () => lifecycleGroups.filter((group) => group.status !== 'completed'),
    [lifecycleGroups]
  );
  const completedGroups = useMemo(
    () => lifecycleGroups.filter((group) => group.status === 'completed'),
    [lifecycleGroups]
  );
  const tabGroups = activeTab === 'active' ? activeGroups : completedGroups;

  const filteredGroups = useMemo(() => {
    let result = tabGroups;

    if (activeTab === 'active' && statusFilter !== 'all') {
      result =
        statusFilter === 'attention'
          ? result.filter((group) => isAttentionStatus(group.status))
          : result.filter((group) => group.status === statusFilter);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (group) =>
          group.code.toLowerCase().includes(query) ||
          group.title.toLowerCase().includes(query) ||
          group.students.some((student) => student.toLowerCase().includes(query))
      );
    }

    return result;
  }, [activeTab, search, statusFilter, tabGroups]);

  const selectedGroup = useMemo(
    () => lifecycleGroups.find((group) => group.id === selectedGroupId) ?? null,
    [lifecycleGroups, selectedGroupId]
  );
  const studentTargetGroup = useMemo(
    () => activeGroups.find((group) => group.id === studentGroupId) ?? null,
    [activeGroups, studentGroupId]
  );
  const localAssignedStudentKeys = useMemo(
    () => Array.from(new Set(groups.flatMap(getGroupStudentKeys))),
    [groups]
  );
  const assignedStudentKeySet = useMemo(
    () => new Set([...assignedStudentKeys, ...localAssignedStudentKeys]),
    [assignedStudentKeys, localAssignedStudentKeys]
  );
  const availableStudents = useMemo(
    () => {
      return availableDbStudents
        .filter((student) => !assignedStudentKeySet.has(normalizeStudentRosterName(student)))
        .sort((left, right) => left.localeCompare(right));
    },
    [assignedStudentKeySet, availableDbStudents]
  );
  const totalStudents = lifecycleGroups.reduce((sum, group) => sum + group.members, 0);
  const needsAttention = activeGroups.filter((group) => isAttentionStatus(group.status)).length;
  const averageProgress = Math.round(
    activeGroups.reduce((sum, group) => sum + group.progress, 0) / Math.max(1, activeGroups.length)
  );

  const openDetails = (groupId: string) => {
    setSelectedGroupId(groupId);
    setDetailsOpen(true);
  };

  const openAddStudentModal = (groupId: string) => {
    if (!activeGroups.some((group) => group.id === groupId)) {
      return;
    }

    setStudentGroupId(groupId);
    setAddStudentModalOpen(true);
  };

  const openCreateGroupModal = () => {
    setGroupDraft(createEmptyGroupDraft());
    setCreateGroupModalOpen(true);
  };

  const assignLeaderToGroup = async (groupId: string, leader: string) => {
    // Optimistic UI update
    setGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === groupId ? { ...group, leader } : group))
    );

    try {
      const response = await fetch('/api/groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: groupId, leader })
      });

      if (!response.ok) {
        throw new Error('Failed to update leader');
      }
    } catch (e) {
      console.error('Failed to update group leader on server', e);
      alert('An error occurred while setting the leader. Please refresh and try again.');
    }
  };

  const handleAddStudentToGroup = async (groupId: string, student: string) => {
    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup || targetGroup.students.includes(student) || getComputedGroupStatus(targetGroup) === 'completed') {
      return;
    }

    if (assignedStudentKeySet.has(normalizeStudentRosterName(student))) {
      alert('This student already belongs to a group.');
      return;
    }

    const nextStudents = [...targetGroup.students, student];

    try {
      const response = await fetch('/api/groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: groupId, students: nextStudents })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error || 'Failed to add student to group.');
        return;
      }

      const updatedGroup = await response.json();
      const updatedStudents = Array.isArray(updatedGroup.students) ? updatedGroup.students : nextStudents;

      setGroups((currentGroups) =>
        currentGroups.map((group) => {
          if (group.id !== groupId) {
            return group;
          }

          return {
            ...group,
            students: updatedStudents,
            members: updatedGroup.members ?? updatedStudents.length
          };
        })
      );
      setAssignedStudentKeys((currentKeys) => mergeStudentKeys(currentKeys, updatedStudents));
      setAddStudentModalOpen(false);
      
      alert(`${student} has been successfully added to the group.`);
    } catch (e) {
      console.error('Failed to update group students on server', e);
      alert('An error occurred while adding the student.');
    }
  };

  const handleRemoveStudentFromGroup = async (groupId: string, student: string) => {
    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup || !targetGroup.students.includes(student) || getComputedGroupStatus(targetGroup) === 'completed') {
      return;
    }

    if (!confirm(`Are you sure you want to remove ${student} from this group?`)) {
      return;
    }

    const nextStudents = targetGroup.students.filter((s) => s !== student);
    let nextLeader = targetGroup.leader;
    if (nextLeader === student) {
      nextLeader = nextStudents[0] || '';
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: groupId, students: nextStudents, leader: nextLeader })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error || 'Failed to remove student from group.');
        return;
      }

      setGroups((currentGroups) =>
        currentGroups.map((group) => {
          if (group.id !== groupId) {
            return group;
          }
          return {
            ...group,
            students: nextStudents,
            leader: nextLeader,
            members: nextStudents.length
          };
        })
      );
      
      const removedKey = normalizeStudentRosterName(student);
      setAssignedStudentKeys((currentKeys) => currentKeys.filter(k => k !== removedKey));
      
      alert(`${student} has been successfully removed from the group.`);
    } catch (e) {
      console.error('Failed to remove group student on server', e);
      alert('An error occurred while removing the student.');
    }
  };

  const handleApproveTitle = async (groupId: string, newTitle: string) => {
    setGroups(groups => groups.map(g => g.id === groupId ? { 
      ...g, 
      title: newTitle, 
      projectTitle: newTitle,
      status: 'active',
      statusLabel: 'Active',
      statusClass: 'status-active',
      milestone: 'Concept Proposal',
      currentMilestone: 'Concept Proposal'
    } : g));
    try {
      await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: groupId, 
          title: newTitle, 
          projectTitle: newTitle,
          status: 'active',
          statusLabel: 'Active',
          statusClass: 'status-active',
          milestone: 'Concept Proposal',
          currentMilestone: 'Concept Proposal'
        })
      });
    } catch (e) {
      console.error('Failed to approve title', e);
    }
  };

  const handleDemoteGroup = async (groupId: string, reason: string) => {
    const resetFields = {
      title: 'Pending Student Submission',
      projectTitle: 'Pending Student Submission',
      status: 'pending',
      statusLabel: 'Pending',
      statusClass: 'status-warning',
      milestone: 'Awaiting initial progress update',
      currentMilestone: 'Awaiting initial progress update'
    };

    try {
      const response = await fetch(`/api/groups/${groupId}/demote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to demote this group.');
      }
      setGroups(groups => groups.map(g => g.id === groupId ? { ...g, ...resetFields } : g));
    } catch (e) {
      console.error('Failed to demote group', e);
      throw e;
    }
  };

  const handleCreateGroup = async () => {
    const code = groupDraft.code.trim();
    if (!code || groupDraft.students.length === 0 || !groupDraft.leader) return;

    const students = groupDraft.students;
    const assignedStudents = students.filter((student) => assignedStudentKeySet.has(normalizeStudentRosterName(student)));
    if (assignedStudents.length > 0) {
      alert('One or more selected students already belong to a group.');
      return;
    }

    const statusMeta = GROUP_STATUS_META[DEFAULT_NEW_GROUP_STATUS];
    const title = "Pending Student Submission";

    const payload = {
      userId: data.profile.user_id,
      code,
      title,
      projectTitle: title,
      dept: adviserDepartment,
      department: adviserDepartment,
      students,
      leader: groupDraft.leader,
      statusLabel: statusMeta.label,
      statusClass: statusMeta.className,
      projectId: `project-${Date.now()}`
    };

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const newDbGroup = await response.json();
        
        const nextGroup: ManagedAdviserGroup = {
          ...newDbGroup,
          id: newDbGroup.id,
          user_id: newDbGroup.userId,
          project_id: newDbGroup.projectId,
          status: newDbGroup.status,
          created_at: newDbGroup.createdAt,
          updated_at: newDbGroup.updatedAt,
          milestone: newDbGroup.milestone,
          currentMilestone: newDbGroup.currentMilestone,
          finalDefenseResult: newDbGroup.finalDefenseResult,
          finalManuscriptApproved: newDbGroup.finalManuscriptApproved,
          allRequiredMilestonesCompleted: newDbGroup.allRequiredMilestonesCompleted,
          completedAt: newDbGroup.completedAt,
          finalScore: newDbGroup.finalScore,
          finalRecommendation: newDbGroup.finalRecommendation,
          leader: newDbGroup.leader ?? null
        };

        setGroups((currentGroups) => [nextGroup, ...currentGroups]);
        setAssignedStudentKeys((currentKeys) => mergeStudentKeys(currentKeys, students));
        setSelectedGroupId(nextGroup.id);
        setGroupDraft(createEmptyGroupDraft());
        setCreateGroupModalOpen(false);
      } else {
        const error = await response.json().catch(() => null);
        alert(error?.error || 'Failed to create group. Please check if the group code is unique.');
      }
    } catch (e) {
      console.error('Error creating group:', e);
      alert('An error occurred while creating the group.');
    }
  };

  return (
    <>
      <AdviserPageHeader
        title="My Groups"
        description="Track project groups, manage members, and monitor supervision progress in one workspace."
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

        <div className="adviser-dash adviser-groups">
          <section className="adviser-dash-hero is-five" aria-label="Group overview">
            <SummaryCard
              icon="fa-layer-group"
              label="Total groups"
              value={lifecycleGroups.length}
              helper="Show every active group"
              color={DASH_COLORS.series}
              active={activeTab === 'active' && statusFilter === 'all'}
              onClick={() => {
                setActiveTab('active');
                setStatusFilter('all');
                setSearch('');
              }}
            />
            <SummaryCard icon="fa-user-graduate" label="Students" value={totalStudents} helper="Students across active and archived groups" color={DASH_COLORS.series} />
            <SummaryCard
              icon="fa-flag"
              label="Needs attention"
              value={needsAttention}
              helper="Show groups pending review, revision, or recovery"
              color={needsAttention > 0 ? DASH_COLORS.warning : DASH_COLORS.good}
              active={activeTab === 'active' && statusFilter === 'attention'}
              onClick={() => {
                setActiveTab('active');
                setStatusFilter('attention');
                setSearch('');
              }}
            />
            <SummaryCard
              icon="fa-chart-line"
              label="Average progress"
              value={`${averageProgress}%`}
              helper={`${getProgressBand(averageProgress).label} on average across active groups`}
              color={getProgressBand(averageProgress).color}
            />
            <SummaryCard
              icon="fa-box-archive"
              label="Completed"
              value={completedGroups.length}
              helper="Show the completed archive"
              color={DASH_COLORS.good}
              active={activeTab === 'completed'}
              onClick={() => {
                setActiveTab('completed');
                setStatusFilter('completed');
                setSearch('');
              }}
            />
          </section>

          <section className="adviser-dash-card adviser-groups-panel" aria-label="Groups">
            <div className="adviser-groups-toolbar">
              <GroupLifecycleTabs
                activeTab={activeTab}
                activeCount={activeGroups.length}
                completedCount={completedGroups.length}
                onChange={(tab) => {
                  setActiveTab(tab);
                  setStatusFilter(tab === 'completed' ? 'completed' : 'all');
                }}
              />

              {activeTab === 'active' ? (
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as GroupFilterStatus)}
                  aria-label="Filter groups by status"
                  className="adviser-groups-control is-select"
                >
                  <option value="all">All statuses</option>
                  <option value="attention">Needs attention</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="needs-revision">Needs revision</option>
                  <option value="at-risk">At risk</option>
                </select>
              ) : null}

              <label className="adviser-groups-search">
                <i aria-hidden="true" className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search groups or titles"
                  aria-label="Search groups or titles"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="adviser-groups-control"
                />
                {statusFilter !== (activeTab === 'completed' ? 'completed' : 'all') || search.trim() !== '' ? (
                  <button
                    type="button"
                    aria-label="Clear filters"
                    title="Clear filters"
                    onClick={() => {
                      setStatusFilter(activeTab === 'completed' ? 'completed' : 'all');
                      setSearch('');
                    }}
                  >
                    <i aria-hidden="true" className="fas fa-xmark"></i>
                  </button>
                ) : null}
              </label>

              <div className="adviser-groups-toolbar-end">
                <span className="adviser-groups-result">
                  {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}
                </span>
                <ViewToggle viewMode={viewMode} onChange={setViewMode} />
                <button type="button" onClick={openCreateGroupModal} className="adviser-groups-primary">
                  <i aria-hidden="true" className="fas fa-plus"></i>
                  Create group
                </button>
              </div>
            </div>

            {activeTab === 'active' ? (
              viewMode === 'table' ? (
                <GroupTable groups={filteredGroups} onOpenDetails={openDetails} onOpenAddStudent={openAddStudentModal} />
              ) : (
                <GroupCards groups={filteredGroups} onOpenDetails={openDetails} onOpenAddStudent={openAddStudentModal} />
              )
            ) : viewMode === 'table' ? (
              <CompletedGroupTable groups={filteredGroups} onOpenDetails={openDetails} />
            ) : (
              <CompletedGroupCards groups={filteredGroups} onOpenDetails={openDetails} />
            )}
          </section>
        </div>

        <GroupDetailsModal
          group={selectedGroup}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          onAssignLeader={assignLeaderToGroup}
          onApproveTitle={handleApproveTitle}
          onRemoveStudent={handleRemoveStudentFromGroup}
          onDemoteGroup={handleDemoteGroup}
          onOpenAddStudent={(groupId) => {
            setDetailsOpen(false);
            openAddStudentModal(groupId);
          }}
        />

        <AddStudentToGroupModal
          open={addStudentModalOpen}
          group={studentTargetGroup}
          availableStudents={availableStudents}
          onClose={() => setAddStudentModalOpen(false)}
          onAddStudent={handleAddStudentToGroup}
        />

        <CreateGroupModal
          open={createGroupModalOpen}
          department={adviserDepartment}
          availableStudents={availableStudents}
          draft={groupDraft}
          onDraftChange={setGroupDraft}
          onClose={() => {
            setGroupDraft(createEmptyGroupDraft());
            setCreateGroupModalOpen(false);
          }}
          onSubmit={handleCreateGroup}
        />
    </>
  );
}
