'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { useRoutePrefetch } from '@/components/shared/use-route-prefetch';
import { STUDENT_NAV_ITEMS, STUDENT_NAV_SECTIONS } from '@/components/students/student-navigation';
import { PremiumAnimatedButton } from '@/components/ui/premium-animated-button';
import { isBackupTitleNotification } from '@/lib/notification-tags';
import { requestLogout } from '@/components/auth/logout-flow';

const STUDENT_THEME_STORAGE_KEY = 'studentWorkspaceTheme';
const AUTH_USER_STORAGE_KEY = 'capstoneAuthUser';
const PROFILE_DRAFT_STORAGE_KEY = 'capstoneStudentProfileDraft';
const FULL_WORKSPACE_DEMO_STUDENT_IDS = new Set([2, 8, 9, 10, 11]);
const FULL_WORKSPACE_DEMO_STUDENT_EMAILS = new Set([
  'maria.santos@university.edu.ph',
  'rafael.dizon@university.edu.ph',
  'bianca.navarro@university.edu.ph',
  'cedric.alvarez@university.edu.ph',
  'isabela.cortez@university.edu.ph'
]);

type StoredAuthUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

type StoredProfileDraft = {
  firstName?: string;
  lastName?: string;
  studentId?: string;
  email?: string;
  department?: string;
  yearLevel?: string;
};

type LimitedStudentProfile = {
  fullName: string;
  email: string;
  studentId: string;
  department: string;
  yearLevel: string;
};

type StudentWorkspaceAccess = {
  isLimited: boolean;
  profile: LimitedStudentProfile | null;
};

const limitedStudentRouteLabels = [
  { href: '/students/project-overview', label: 'Project Overview' },
  { href: '/students/project-files', label: 'Project Files' },
  { href: '/students/progress-reports', label: 'Progress Reports' },
  { href: '/students/faculty-feedback', label: 'Faculty Feedback' },
  { href: '/students/milestones', label: 'Project Stages' },
  { href: '/students/schedule', label: 'Schedule' },
  { href: '/students/title-submission', label: 'Title Submission' },
  { href: '/students/timeline', label: 'Timeline' },
  { href: '/students/notifications', label: 'Notifications' },
  { href: '/students/history', label: 'History' }
] as const;

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function readStoredJson<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch {
    return null;
  }
}

function getFirstName(value: string) {
  return value.split(' ').filter(Boolean)[0] || 'Student';
}

function buildLimitedStudentProfile(
  data: StudentDashboardData,
  storedUser: StoredAuthUser | null,
  draft: StoredProfileDraft | null
): LimitedStudentProfile {
  const draftName = normalizeText(`${draft?.firstName || ''} ${draft?.lastName || ''}`);
  const fullName = normalizeText(storedUser?.name) || draftName || data.profile.fullName;

  return {
    fullName,
    email: normalizeText(storedUser?.email) || normalizeText(draft?.email) || data.profile.email,
    studentId: normalizeText(draft?.studentId) || 'Pending student ID',
    department: normalizeText(draft?.department) || 'Pending department',
    yearLevel: normalizeText(draft?.yearLevel) || 'Pending year level'
  };
}

function getInitialWorkspaceAccess(data: StudentDashboardData): StudentWorkspaceAccess {
  // Use data from the server instead of localStorage to prevent SSR hydration mismatches
  const normalizedEmail = normalizeText(data.profile.email).toLowerCase();
  
  const hasFullDemoWorkspace = FULL_WORKSPACE_DEMO_STUDENT_EMAILS.has(normalizedEmail);

  const hasActiveGroup = Boolean(
    data.group && 
    data.group.id && 
    data.group.id !== '' && 
    (data.group.status === 'active' || data.group.status === 'completed')
  );

  if (hasFullDemoWorkspace || hasActiveGroup) {
    return { isLimited: false, profile: null };
  }

  // Profile draft can still be read from localStorage on client-side (during hydration/subsequent renders)
  const draft = typeof window !== 'undefined' ? readStoredJson<StoredProfileDraft>(PROFILE_DRAFT_STORAGE_KEY) : null;
  const storedUser = typeof window !== 'undefined' ? readStoredJson<StoredAuthUser>(AUTH_USER_STORAGE_KEY) : null;

  return {
    isLimited: true,
    profile: buildLimitedStudentProfile(data, storedUser, draft)
  };
}

function isLimitedStudentAllowedRoute(pathname: string, data?: StudentDashboardData) {
  const hasGroup = Boolean(data?.group?.id && data.group.id !== '');
  return (
    matchesRoute(pathname, '/students/dashboard') ||
    matchesRoute(pathname, '/students/repository') ||
    matchesRoute(pathname, '/students/profile') ||
    (hasGroup && matchesRoute(pathname, '/students/title-submission'))
  );
}

function getLimitedRouteLabel(pathname: string) {
  return limitedStudentRouteLabels.find((item) => matchesRoute(pathname, item.href))?.label || 'Project Workspace';
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getShortName(value: string) {
  const parts = value.split(' ').filter(Boolean);
  return parts.slice(0, 2).join(' ') || value;
}

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type StudentLayoutShellProps = {
  children: React.ReactNode;
  data: StudentDashboardData;
};

type StudentNotification = StudentDashboardData['notifications'][number];
type StudentThemeMode = 'light' | 'dark';

function isStudentThemeMode(value: string | null): value is StudentThemeMode {
  return value === 'light' || value === 'dark';
}

function getResolvedStudentTheme(value: string | null): StudentThemeMode {
  if (isStudentThemeMode(value)) {
    return value;
  }

  if (typeof window !== 'undefined' && value === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}

function sortNotifications(items: StudentNotification[]) {
  return [...items].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

// A group can get re-saved several times in quick succession while an adviser is
// setting it up (e.g. adjusting membership/roles), and each save that adds a
// "new" member fires one of these — so the same student can end up with several
// unread ones stacked up, not just the latest. Accepting the invite modal (or
// opening one from the bell dropdown) needs to clear all of them, or the oldest
// leftover keeps resurfacing the modal even after the student has already synced.
const GROUP_INVITE_NOTIFICATION_TITLES = new Set([
  'Group Assignment Updated',
  'New Group Assignment',
  'Group Leadership Assigned'
]);

function toClientNotification(notification: StudentNotification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    status: notification.read ? 'READ' : 'UNREAD',
    createdAt: notification.created_at,
    readAt: notification.read ? notification.updated_at : null
  };
}

function getNotificationAction(notification: StudentNotification) {
  if (notification.route) {
    return {
      href: notification.route,
      label: notification.actionLabel || 'View detail'
    };
  }

  const fallbackActionByType: Record<string, { href: string; label: string }> = {
    approval: { href: '/students/project-files', label: 'Open project files' },
    deadline: { href: '/students/project-files', label: 'Open project files' },
    feedback: { href: '/students/faculty-feedback', label: 'Open feedback' },
    general: { href: '/students/dashboard', label: 'Open dashboard' },
    profile: { href: '/students/profile', label: 'Open profile' },
    schedule: { href: '/students/schedule', label: 'Check schedule' },
    transfer: { href: '/students/project-overview', label: 'Open project overview' }
  };

  return fallbackActionByType[notification.type] || fallbackActionByType.general;
}

function getNotificationTypeMeta(type: StudentNotification['type']) {
  switch (type) {
    case 'feedback':
      return { icon: 'fa-comments', tone: 'feedback', label: 'Feedback' };
    case 'deadline':
      return { icon: 'fa-hourglass-half', tone: 'deadline', label: 'Deadline' };
    case 'approval':
      return { icon: 'fa-circle-check', tone: 'approval', label: 'Approval' };
    case 'success':
      return { icon: 'fa-circle-check', tone: 'success', label: 'Success' };
    case 'warning':
      return { icon: 'fa-triangle-exclamation', tone: 'warning', label: 'Warning' };
    case 'danger':
      return { icon: 'fa-circle-exclamation', tone: 'danger', label: 'Urgent' };
    case 'schedule':
      return { icon: 'fa-calendar-check', tone: 'schedule', label: 'Schedule' };
    case 'transfer':
      return { icon: 'fa-diagram-project', tone: 'transfer', label: 'Project Update' };
    case 'profile':
      return { icon: 'fa-user-gear', tone: 'profile', label: 'Profile' };
    case 'general':
      return { icon: 'fa-bell', tone: 'general', label: 'General' };
    default:
      return { icon: 'fa-bell', tone: 'general', label: 'General' };
  }
}

function canPollApi() {
  return (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
    window.navigator.onLine
  );
}

function isExpectedPollError(error: unknown) {
  return (
    error instanceof DOMException && error.name === 'AbortError'
  ) || (
    error instanceof TypeError && (!canPollApi() || error.message === 'Failed to fetch')
  );
}

type LimitedWorkspaceSetupState = {
  accountActivated: boolean;
  profileCompleted: boolean;
  groupAssigned: boolean;
  adviserAssigned: boolean;
  workspaceUnlocked: boolean;
};

type LimitedWorkspaceSetupStep = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  icon: string;
};

type LimitedWorkspaceStatusItem = {
  label: string;
  value: string;
  helper: string;
  tone: 'success' | 'info' | 'warning' | 'neutral';
};

function hasProfileValue(value: string) {
  const normalized = normalizeText(value).toLowerCase();
  return Boolean(normalized && !normalized.startsWith('pending '));
}

function getLimitedWorkspaceSetupState(profile: LimitedStudentProfile, data: StudentDashboardData): LimitedWorkspaceSetupState {
  const profileCompleted =
    hasProfileValue(profile.studentId) && hasProfileValue(profile.department) && hasProfileValue(profile.yearLevel);

  const hasGroup = Boolean(data.group && data.group.id && data.group.id !== '');
  const hasAdviser = Boolean(hasGroup && data.project.adviser && !data.project.adviser.includes('Not assigned'));

  return {
    accountActivated: true,
    profileCompleted,
    groupAssigned: hasGroup,
    adviserAssigned: hasAdviser,
    workspaceUnlocked: false
  };
}

function getLimitedWorkspaceSetupSteps(setupState: LimitedWorkspaceSetupState): LimitedWorkspaceSetupStep[] {
  return [
    {
      key: 'account',
      label: 'Account Activated',
      description: 'Your student sign-in is ready and your portal access is live.',
      done: setupState.accountActivated,
      icon: 'fa-circle-check'
    },
    {
      key: 'profile',
      label: 'Profile Completed',
      description: 'Your student ID, department, and year level should be confirmed.',
      done: setupState.profileCompleted,
      icon: 'fa-id-card'
    },
    {
      key: 'group',
      label: 'Group Assigned',
      description: 'Your official capstone group appears here after assignment.',
      done: setupState.groupAssigned,
      icon: 'fa-people-group'
    },
    {
      key: 'adviser',
      label: 'Adviser Assigned',
      description: 'Your adviser becomes visible once supervision is assigned.',
      done: setupState.adviserAssigned,
      icon: 'fa-user-tie'
    },
    {
      key: 'workspace',
      label: 'Workspace Unlocked',
      description: 'Project tools open automatically when your assignment is complete.',
      done: setupState.workspaceUnlocked,
      icon: 'fa-unlock-keyhole'
    }
  ];
}

function getLimitedWorkspaceStatusItems(setupState: LimitedWorkspaceSetupState): LimitedWorkspaceStatusItem[] {
  return [
    {
      label: 'Account',
      value: 'Activated',
      helper: 'You can sign in and use the open student tools now.',
      tone: 'success'
    },
    {
      label: 'Profile',
      value: setupState.profileCompleted ? 'Ready for review' : 'Needs completion',
      helper: setupState.profileCompleted
        ? 'Your registration details are already in place.'
        : 'Review your saved details before assignment.',
      tone: setupState.profileCompleted ? 'info' : 'warning'
    },
    {
      label: 'Group',
      value: 'Not assigned yet',
      helper: 'The research office will attach your official group record here.',
      tone: 'warning'
    },
    {
      label: 'Adviser',
      value: 'Pending assignment',
      helper: 'Adviser details will appear as soon as they are assigned.',
      tone: 'warning'
    },
    {
      label: 'Project',
      value: 'No active project yet',
      helper: 'A project title and workspace will appear after assignment.',
      tone: 'neutral'
    }
  ];
}

function LimitedStudentWorkspaceHome({ profile, data }: { profile: LimitedStudentProfile; data: StudentDashboardData }) {
  const setupState = getLimitedWorkspaceSetupState(profile, data);
  const setupSteps = getLimitedWorkspaceSetupSteps(setupState);
  const completedSteps = setupSteps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedSteps / setupSteps.length) * 100);
  const statusItems = getLimitedWorkspaceStatusItems(setupState);
  const nextSteps = [
    ...(setupState.groupAssigned ? [{
      title: 'Submit your research title',
      description: 'Your group is assigned. You must submit a concept proposal to unlock the full workspace.',
      href: '/students/title-submission',
      action: 'Submit Title',
      icon: 'fa-pen-to-square'
    }] : [{
      title: 'Review your profile',
      description: 'Confirm your student ID, department, and year level so the assignment can match your record.',
      href: '/students/profile',
      action: 'Review Profile',
      icon: 'fa-user'
    }]),
    {
      title: 'Browse the repository',
      description: 'Read completed studies and sample outputs while you wait for your capstone workspace.',
      href: '/students/repository',
      action: 'Browse Repository',
      icon: 'fa-book'
    },
    {
      title: 'Prepare your capstone details',
      description: 'Keep your project ideas, notes, and references ready for the moment your workspace opens.',
      icon: 'fa-lightbulb'
    },
    {
      title: 'Watch for assignment updates',
      description: 'Once your group and adviser are assigned, the student workspace can unlock without extra setup.',
      icon: 'fa-bell'
    }
  ];
  const lockedFeatures = [
    {
      label: 'Project workspace',
      description: 'Overview, project title, group role, and live capstone record.'
    },
    {
      label: 'Project Stages',
      description: 'Timeline checkpoints, review dates, and completion tracking.'
    },
    {
      label: 'File submissions',
      description: 'Document uploads, revision history, and approved repository files.'
    },
    {
      label: 'Adviser feedback',
      description: 'Faculty comments, review notes, and formal guidance.'
    }
  ];

  return (
    <section className="student-limited-workspace-page space-y-6 animate-in fade-in duration-500">
      <div className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <span className="page-breadcrumb" aria-hidden="true">
              <i className="fas fa-user-graduate" /> Student Portal
            </span>
            <h1>Welcome, {getFirstName(profile.fullName)}</h1>
            <p className="text-[var(--muted)]">Your student account is active. Project tools unlock after your group, adviser, and project record are assigned.</p>
          </div>
        </div>
      </div>

      <section className="hero-card !mb-0 !grid !gap-5 relative">
        <div className="hero-card-main relative overflow-hidden rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8 isolate transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* Subtle Decorative Accent */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--primary)] to-sky-400" />
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sky-50 blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="chip-row flex flex-wrap gap-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 shadow-sm">
              <i className="fas fa-hourglass-half" aria-hidden="true" /> Pending assignment
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-bold text-[var(--text)] ring-1 ring-inset ring-slate-500/20 shadow-sm">
              <i className="fas fa-id-card" aria-hidden="true" /> {profile.studentId}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 ring-1 ring-inset ring-sky-600/20 shadow-sm">
              <i className="fas fa-list-check" aria-hidden="true" /> {completedSteps}/{setupSteps.length} steps ready
            </span>
          </div>

          <div className="space-y-4 relative z-10">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-[var(--text)]">
              Your capstone workspace is being prepared
            </h2>
            <p className="max-w-2xl text-lg text-[var(--muted)] leading-relaxed">
              Your account is active, but project tools stay locked until your official group and adviser are assigned.
              Once those assignments are added, your workspace can unlock and your project pages can populate
              automatically.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 relative z-10">
            <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--surface)] hover:shadow-md cursor-default">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Workspace status</span>
              <p className="mt-3 text-xl font-bold text-[var(--text)]">Pending assignment</p>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">Project tools unlock after group and adviser assignment.</p>
            </div>
            <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--surface)] hover:shadow-md cursor-default">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Available now</span>
              <p className="mt-3 text-xl font-bold text-[var(--text)]">Profile & repository</p>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">You can still confirm your details and explore completed studies.</p>
            </div>
            <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--surface)] hover:shadow-md cursor-default sm:col-span-2 xl:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Unlock trigger</span>
              <p className="mt-3 text-xl font-bold text-[var(--text)]">Assignment record</p>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">Group, adviser, and active project details feed the workspace.</p>
            </div>
          </div>

          <div className="hero-actions !mt-2 flex flex-wrap gap-4 relative z-10">
            <Link prefetch={false} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 hover:bg-sky-800" href="/students/repository">
              <i className="fas fa-book" aria-hidden="true" /> Browse Repository
            </Link>
            <Link prefetch={false} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-bold text-[var(--text)] shadow-sm transition-all duration-300 hover:bg-[var(--surface-alt)] hover:scale-105 active:scale-95" href="/students/profile">
              <i className="fas fa-user text-[var(--text-meta)]" aria-hidden="true" /> Review Profile
            </Link>
            {data?.profile?.pendingGroupInviteId && (
              <button 
                onClick={() => {
                  fetch('/api/notifications', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notificationId: data.profile.pendingGroupInviteId, action: 'read' })
                  }).then(() => {
                    setTimeout(() => window.location.reload(), 300);
                  });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[var(--primary)]/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[var(--primary)]/40 hover:brightness-110 active:scale-95 ml-auto"
              >
                <i className="fas fa-rocket text-sky-200" aria-hidden="true" /> Accept Pending Group Invite
              </button>
            )}
          </div>
        </div>

        <div className="hero-card-side h-full">
          <div className="h-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Status overview</span>
                <h3 className="mt-2 text-xl font-bold text-[var(--text)]">Assignment summary</h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20 shadow-sm">
                {progressPercent}% ready
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {statusItems.map((item) => (
                <div key={item.label} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 transition-all duration-300 hover:border-[var(--border)] hover:bg-[var(--surface-alt)] hover:shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-[var(--text)]">{item.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm transition-colors duration-300 ${
                        item.tone === 'success'
                          ? 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 group-hover:bg-emerald-200'
                          : item.tone === 'info'
                            ? 'bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-600/20 group-hover:bg-sky-200'
                            : item.tone === 'warning'
                              ? 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20 group-hover:bg-amber-200'
                              : 'bg-[var(--surface-alt)] text-[var(--muted)] ring-1 ring-inset ring-slate-500/20 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">{item.helper}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-4 transition-colors duration-300 hover:bg-[var(--surface-alt)]">
              <p className="text-sm font-bold text-[var(--text)]">No active project yet</p>
              <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">
                Group name, adviser, project title, and workspace activity appear here after assignment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <article className="surface-card !p-6 rounded-3xl shadow-sm transition-shadow duration-300 hover:shadow-md">
            <div className="card-heading border-b border-[var(--border)] pb-4 mb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Setup progress</span>
                <h3 className="mt-1 text-xl font-bold text-[var(--text)]">Pre-assignment checklist</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600 ring-1 ring-inset ring-sky-500/20">
                <i className="fas fa-check-circle"></i> {completedSteps} of {setupSteps.length} complete
              </span>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-alt)] shadow-inner">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-1000 ease-out shadow-[0_0_10px_var(--primary-soft,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-6 grid gap-3">
              {setupSteps.map((step, index) => (
                <div
                  key={step.key}
                  className={`group flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    step.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm shadow-sm transition-colors duration-300 ${
                      step.done ? 'bg-emerald-500 text-white group-hover:bg-emerald-600' : 'bg-[var(--surface-alt)] text-[var(--text-meta)] group-hover:bg-slate-200 group-hover:text-[var(--muted)]'
                    }`}
                  >
                    <i className={`fas ${step.done ? 'fa-check' : step.icon}`} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">
                        Step {index + 1}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm ${
                          step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                        }`}
                      >
                        {step.done ? 'Complete' : 'Pending'}
                      </span>
                    </div>
                    <p className={`mt-1.5 text-sm font-bold ${step.done ? 'text-emerald-900' : 'text-[var(--text)]'}`}>
                      {step.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card !p-6 rounded-3xl shadow-sm transition-shadow duration-300 hover:shadow-md">
            <div className="card-heading border-b border-[var(--border)] pb-4 mb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Next steps</span>
                <h3 className="mt-1 text-xl font-bold text-[var(--text)]">What you can do now</h3>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {nextSteps.map((item) => (
                <div key={item.title} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[var(--primary)] shadow-sm transition-colors duration-300 group-hover:bg-[var(--primary)] group-hover:text-white">
                      <i className={`fas ${item.icon} text-lg`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text)]">{item.title}</p>
                      <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">{item.description}</p>
                      {item.href ? (
                        <Link prefetch={false} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:text-sky-700 transition-colors" href={item.href}>
                          {item.action}
                          <i className="fas fa-arrow-right text-xs transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                      ) : (
                        <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--text-meta)]">
                          <i className="fas fa-clock text-xs" aria-hidden="true" />
                          Waiting for assignment
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="surface-card !p-6 rounded-3xl shadow-sm transition-shadow duration-300 hover:shadow-md">
            <div className="card-heading border-b border-[var(--border)] pb-4 mb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Available now</span>
                <h3 className="mt-1 text-xl font-bold text-[var(--text)]">Open student features</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">Review Profile</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Check the student record saved during registration.</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                    Available
                  </span>
                </div>
              </div>

              <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">Browse Repository</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Explore completed research and academic references.</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                    Available
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article className="surface-card !p-6 rounded-3xl shadow-sm transition-shadow duration-300 hover:shadow-md">
            <div className="card-heading border-b border-[var(--border)] pb-4 mb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-meta)]">Locked until assignment</span>
                <h3 className="mt-1 text-xl font-bold text-[var(--text)]">Awaiting workspace</h3>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {lockedFeatures.map((feature) => (
                <div key={feature.label} className="group rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] p-4 transition-colors duration-300 hover:bg-[var(--surface-alt)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{feature.label}</p>
                      <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{feature.description}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-meta)] shadow-sm ring-1 ring-slate-200 transition-transform duration-300 group-hover:scale-110">
                      <i className="fas fa-lock" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <i className="fas fa-lightbulb text-amber-500"></i>
                <p className="text-sm font-bold text-amber-900">Intentional pre-assignment state</p>
              </div>
              <p className="mt-2 text-sm text-amber-800 leading-relaxed">
                This dashboard stays lightweight until real assignment data is available, so it can connect cleanly to
                group, adviser, and project records later.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function LimitedStudentProfileView({ profile, data }: { profile: LimitedStudentProfile; data: StudentDashboardData }) {
  const setupState = getLimitedWorkspaceSetupState(profile, data);
  const setupSteps = getLimitedWorkspaceSetupSteps(setupState);
  const statusItems = getLimitedWorkspaceStatusItems(setupState);
  const completedSteps = setupSteps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedSteps / setupSteps.length) * 100);
  const profileItems = [
    { label: 'Full name', value: profile.fullName },
    { label: 'Email', value: profile.email },
    { label: 'Student ID', value: profile.studentId },
    { label: 'Department', value: profile.department },
    { label: 'Year level', value: profile.yearLevel },
    { label: 'Workspace status', value: 'Awaiting group and adviser assignment' }
  ];
  const profileReadiness = [
    {
      label: 'Student ID',
      value: profile.studentId,
      done: hasProfileValue(profile.studentId)
    },
    {
      label: 'Department',
      value: profile.department,
      done: hasProfileValue(profile.department)
    },
    {
      label: 'Year level',
      value: profile.yearLevel,
      done: hasProfileValue(profile.yearLevel)
    },
    {
      label: 'Assignment',
      value: 'Pending assignment',
      done: false
    }
  ];
  const nextMilestones = [
    'Your group record is linked to this student profile.',
    'Your adviser is assigned and appears in the student shell.',
    'Project pages unlock for workspace activity, project stages, and file submissions.'
  ];

  return (
    <section className="student-limited-workspace-page space-y-5">
      <div className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <span className="page-breadcrumb" aria-hidden="true">
              <i className="fas fa-user" /> Profile
            </span>
            <h1>Student Profile</h1>
            <p>Review the account details that will be used when your capstone assignment is posted.</p>
          </div>
        </div>
      </div>

      <section className="hero-card !mb-0 !grid !gap-5">
        <div className="hero-card-main space-y-5">
          <div className="chip-row flex flex-wrap gap-2">
            <span className="ui-badge is-warning">
              <i className="fas fa-hourglass-half" aria-hidden="true" /> Pending assignment
            </span>
            <span className="ui-badge is-info">
              <i className="fas fa-address-card" aria-hidden="true" /> Profile on file
            </span>
            <span className="ui-badge is-neutral">
              <i className="fas fa-list-check" aria-hidden="true" /> {completedSteps}/{setupSteps.length} setup steps ready
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="max-w-3xl">Your student record is ready for assignment</h2>
            <p className="max-w-3xl">
              These profile details support your future group, adviser, and workspace assignment. Once the assignment is
              posted, this profile can connect directly to your capstone records without extra setup.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 backdrop-blur-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Student ID</span>
              <p className="mt-2 text-lg font-semibold text-white">{profile.studentId}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Used to match your official student record.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 backdrop-blur-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Department</span>
              <p className="mt-2 text-lg font-semibold text-white">{profile.department}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Helps route your profile to the right academic workspace.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 backdrop-blur-sm sm:col-span-2 xl:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Year level</span>
              <p className="mt-2 text-lg font-semibold text-white">{profile.yearLevel}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Stored as part of your registration profile.</p>
            </div>
          </div>

          <div className="hero-actions !mt-0 flex flex-wrap gap-3">
            <Link prefetch={false} className="btn btn-primary" href="/students/dashboard">
              <i className="fas fa-gauge-high" aria-hidden="true" /> Back to Dashboard
            </Link>
            <Link prefetch={false} className="btn btn-secondary" href="/students/repository">
              <i className="fas fa-book" aria-hidden="true" /> Browse Repository
            </Link>
          </div>
        </div>

        <div className="hero-card-side">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Profile status</span>
                <h3 className="mt-2 text-xl font-semibold text-white">Assignment readiness</h3>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
                {progressPercent}% ready
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {statusItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--text)]">{item.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        item.tone === 'success'
                          ? 'bg-emerald-400/15 text-emerald-100'
                          : item.tone === 'info'
                            ? 'bg-sky-400/15 text-sky-100'
                            : item.tone === 'warning'
                              ? 'bg-amber-300/15 text-amber-100'
                              : 'bg-[var(--surface)] text-[var(--text)]'
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{item.helper}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <p className="text-sm font-semibold text-white">Waiting for assignment</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Group role, adviser, project code, and workspace details appear here after official assignment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <article className="surface-card !p-5">
            <div className="card-heading">
              <div>
                <span className="section-kicker">Registration details</span>
                <h3>{profile.fullName}</h3>
              </div>
              <span className={`ui-badge ${setupState.profileCompleted ? 'is-info' : 'is-warning'}`}>
                {setupState.profileCompleted ? 'Profile ready' : 'Review needed'}
              </span>
            </div>

            <div className="detail-grid">
              {profileItems.map((item) => (
                <div key={item.label} className="detail-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card !p-5">
            <div className="card-heading">
              <div>
                <span className="section-kicker">Setup progress</span>
                <h3>Pre-assignment checklist</h3>
              </div>
              <span className="ui-badge is-info">{completedSteps} of {setupSteps.length} complete</span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-4 grid gap-3">
              {setupSteps.map((step, index) => (
                <div
                  key={step.key}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                    step.done ? 'border-emerald-200 bg-emerald-50/80' : 'border-[var(--border)] bg-[var(--surface-alt)]'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                      step.done ? 'bg-emerald-500 text-white' : 'bg-[var(--surface)] text-[var(--text-meta)]'
                    }`}
                  >
                    <i className={`fas ${step.done ? 'fa-check' : step.icon}`} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-meta)]">
                        Step {index + 1}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-[var(--muted)]'
                        }`}
                      >
                        {step.done ? 'Complete' : 'Pending'}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm font-semibold ${step.done ? 'text-emerald-900' : 'text-[var(--text)]'}`}>
                      {step.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="surface-card !p-5">
            <div className="card-heading">
              <div>
                <span className="section-kicker">Profile readiness</span>
                <h3>What is already in place</h3>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {profileReadiness.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border px-4 py-4 ${
                    item.done ? 'border-emerald-200 bg-emerald-50/80' : 'border-[var(--border)] bg-[var(--surface-alt)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm font-semibold ${item.done ? 'text-emerald-900' : 'text-[var(--text)]'}`}>
                      {item.label}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-[var(--muted)]'
                      }`}
                    >
                      {item.done ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card !p-5">
            <div className="card-heading">
              <div>
                <span className="section-kicker">What happens next</span>
                <h3>After this profile is assigned</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {nextMilestones.map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--primary)] shadow-sm">
                    {index + 1}
                  </div>
                  <p className="text-sm text-[var(--muted)]">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4">
              <p className="text-sm font-semibold text-amber-900">Backend-ready profile state</p>
              <p className="mt-1 text-sm text-amber-800">
                This screen is structured so real group, adviser, and project assignment data can replace the current
                pending state without changing the layout.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function LimitedStudentLockedFeature({
  featureLabel,
  profile
}: {
  featureLabel: string;
  profile: LimitedStudentProfile;
}) {
  return (
    <section className="student-limited-workspace-page">
      <div className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <span className="page-breadcrumb" aria-hidden="true">
              <i className="fas fa-lock" /> Limited Access
            </span>
            <h1>{featureLabel} is locked</h1>
            <p>This feature needs an assigned group, adviser, and project record.</p>
          </div>
        </div>
      </div>

      <section className="hero-card">
        <div className="hero-card-main">
          <span className="ui-badge is-warning">
            <i className="fas fa-hourglass-half" aria-hidden="true" /> Awaiting assignment
          </span>
          <h2>Project tools are not available yet</h2>
          <p>
            {profile.fullName} can use the available student features while the project workspace is being prepared.
          </p>
          <div className="hero-actions">
            <Link prefetch={false} className="btn btn-primary" href="/students/dashboard">
              <i className="fas fa-gauge-high" aria-hidden="true" /> Back to dashboard
            </Link>
            <Link prefetch={false} className="btn btn-secondary" href="/students/repository">
              <i className="fas fa-book" aria-hidden="true" /> Browse repository
            </Link>
          </div>
        </div>

        <div className="hero-card-side">
          <div className="empty-state">
            <span className="empty-state-icon">
              <i className="fas fa-user-lock" aria-hidden="true" />
            </span>
            <h3>Assignment required</h3>
            <p>Ask the research office to assign your group and adviser when your capstone record is ready.</p>
          </div>
        </div>
      </section>
    </section>
  );
}

export function StudentLayoutShell({ children, data }: StudentLayoutShellProps) {
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const [workspaceAccess, setWorkspaceAccess] = useState<StudentWorkspaceAccess>(() => getInitialWorkspaceAccess(data));
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [layoutDebug, setLayoutDebug] = useState('Fetching...');
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [themeMode, setThemeMode] = useState<StudentThemeMode>('light');



  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const applyStoredTheme = () => {
      const storedTheme = window.localStorage.getItem(STUDENT_THEME_STORAGE_KEY);
      const nextTheme = getResolvedStudentTheme(storedTheme);
      setThemeMode(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.dataset.studentTheme = nextTheme;
      window.localStorage.setItem(STUDENT_THEME_STORAGE_KEY, nextTheme);
    };

    applyStoredTheme();

    window.addEventListener('storage', applyStoredTheme);
    window.addEventListener('thesistrack:student-theme-changed', applyStoredTheme);

    return () => {
      window.removeEventListener('storage', applyStoredTheme);
      window.removeEventListener('thesistrack:student-theme-changed', applyStoredTheme);
      delete document.documentElement.dataset.theme;
      delete document.documentElement.dataset.studentTheme;
    };
  }, []);

  const updateStudentTheme = (nextTheme: StudentThemeMode) => {
    setThemeMode(nextTheme);

    if (typeof window === 'undefined') {
      return;
    }

    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.studentTheme = nextTheme;
    window.localStorage.setItem(STUDENT_THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event('thesistrack:student-theme-changed'));
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1100px)');

    const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const nextIsMobile = event.matches;
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setSidebarOpen(false);
      }
    };

    handleMediaChange(mediaQuery);

    const listener = (event: MediaQueryListEvent) => {
      handleMediaChange(event);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }

      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setNotificationMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        setNotificationMenuOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
    setNotificationMenuOpen(false);
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, pathname]);

  useEffect(() => {
    if (data.group.id && workspaceAccess.isLimited) {
      setWorkspaceAccess((prev) => ({ ...prev, isLimited: false }));
    }
  }, [data.group.id, workspaceAccess.isLimited]);

  const [dbProfile, setDbProfile] = useState<{ fullName: string; email: string; studentId: string; groupRole: string | null; projectCode: string | null; profileImage: string | null } | null>(() =>
    data.profile.user_id
      ? {
          fullName: data.profile.fullName,
          email: data.profile.email,
          studentId: data.profile.studentId,
          groupRole: data.profile.groupRole,
          projectCode: data.project.projectCode,
          profileImage: data.profile.profileImage || null
        }
      : null
  );

  useEffect(() => {
    if (dbProfile || data.profile.user_id || !canPollApi()) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadDbProfile() {
      try {
        const response = await fetch('/api/profile', { credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) return;

        const result = await response.json();
        if (cancelled || !result?.success || !result.user) return;

        const u = result.user;
        const userName = u.name || u.displayName || '';

        // Check real group assignment
        let groupRole: string | null = null;
        let projectCode: string | null = null;

        if (userName) {
          try {
            const groupRes = await fetch(`/api/groups?studentName=${encodeURIComponent(userName)}&limit=1`, {
              cache: 'no-store',
              signal: controller.signal
            });
            if (groupRes.ok) {
              const groups = await groupRes.json();
              if (Array.isArray(groups) && groups.length > 0) {
                const group = groups[0];
                groupRole = group.leader === userName ? 'Group Leader' : 'Member';
                projectCode = group.code || group.projectTitle || null;
              }
            }
          } catch {
            // Group check failed — leave as null
          }
        }

        if (!cancelled) {
          setDbProfile({
            fullName: userName,
            email: u.email || '',
            studentId: u.studentId || '',
            groupRole,
            projectCode,
            profileImage: u.profileImage || null
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        // Silently fall back to mock data
      }
    }

    loadDbProfile();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [data.profile.user_id, dbProfile]);

  const isLimitedWorkspace = isCheckingAccess ? false : workspaceAccess.isLimited;
  const limitedProfile = workspaceAccess.profile;
  const shellProfile = {
    fullName: dbProfile?.fullName || limitedProfile?.fullName || data.profile.fullName,
    email: dbProfile?.email || limitedProfile?.email || data.profile.email,
    studentId: dbProfile?.studentId || limitedProfile?.studentId || data.profile.studentId,
    groupRole: dbProfile !== null
      ? (dbProfile.groupRole || 'Not assigned')
      : (isLimitedWorkspace ? 'Awaiting Assignment' : data.profile.groupRole),
    projectCode: dbProfile !== null
      ? (dbProfile.projectCode || 'No active project')
      : (isLimitedWorkspace ? 'No active project' : data.project.projectCode),
    profileImage: dbProfile?.profileImage || data.profile.profileImage || null
  };

  const [realNotifications, setRealNotifications] = useState<any[]>(() =>
    (data.notifications || []).map(toClientNotification)
  );
  
  const [showGroupInviteModal, setShowGroupInviteModal] = useState(
    Boolean(data?.profile?.pendingGroupInviteId)
  );

  const fetchShellNotifications = useCallback(
    async (signal?: AbortSignal) => {
      if (!data.profile.user_id || !canPollApi()) {
        return;
      }

      const notifRes = await fetch(`/api/notifications?userId=${encodeURIComponent(data.profile.user_id)}&limit=20`, {
        cache: 'no-store',
        signal
      });

      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setRealNotifications(notifs);
      }
    },
    [data.profile.user_id]
  );

  useEffect(() => {
    if (!notificationMenuOpen || !data.profile.user_id) {
      return;
    }

    const controller = new AbortController();
    void fetchShellNotifications(controller.signal).catch((error) => {
      if (!isExpectedPollError(error)) {
        console.warn('Failed to refresh notifications in shell', error);
      }
    });

    return () => controller.abort();
  }, [data.profile.user_id, fetchShellNotifications, notificationMenuOpen]);

  useEffect(() => {
    if (!data.profile.user_id) {
      return;
    }

    let inFlightController: AbortController | null = null;
    const refreshNotifications = () => {
      inFlightController?.abort();
      inFlightController = new AbortController();
      void fetchShellNotifications(inFlightController.signal).catch((error) => {
        if (!isExpectedPollError(error)) {
          console.warn('Failed to refresh notifications in shell', error);
        }
      });
    };

    window.addEventListener('thesistrack:notifications-updated', refreshNotifications);
    return () => {
      inFlightController?.abort();
      window.removeEventListener('thesistrack:notifications-updated', refreshNotifications);
    };
  }, [data.profile.user_id, fetchShellNotifications]);

  const shellNotifications = useMemo(() => {
    if (isLimitedWorkspace) return [];
    
    const combined: any[] = [];
    const seenIds = new Set<string>();
    if (realNotifications.length > 0) {
      realNotifications.forEach(notif => {
        if (seenIds.has(notif.id)) return;
        seenIds.add(notif.id);
        combined.push({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type === 'info' ? 'general' : notif.type,
          priority: notif.type === 'warning' || notif.type === 'danger' ? 'high' : 'normal',
          read: notif.status === 'READ',
          created_at: notif.createdAt,
          dateLabel: new Date(notif.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        } as any);
      });
    }
    return sortNotifications(combined);
  }, [isLimitedWorkspace, realNotifications]);

  const unreadNotificationsCount = shellNotifications.filter((item) => !item.read).length;
  const highPriorityNotificationsCount = shellNotifications.filter((item) => !item.read && item.priority === 'high').length;
  const unreadFeedbackCount = isLimitedWorkspace ? 0 : data.feedback.filter((item) => item.unread).length;
  const recentNotifications = useMemo(
    () => shellNotifications.slice(0, 4),
    [shellNotifications]
  );
  const navigationSections = useMemo(
    () =>
      STUDENT_NAV_SECTIONS.map((section) => ({
        ...section,
        items: STUDENT_NAV_ITEMS.filter((item) => item.section === section.key)
          .map((item) => {
            if (!isLimitedWorkspace) {
              return item;
            }

            const hasGroup = Boolean(data?.group?.id && data.group.id !== '');

            if (item.key === 'dashboard' || item.key === 'repository') {
              return item;
            }

            if (item.key === 'project-overview' && hasGroup && 'children' in item) {
              const titleChild = item.children.find((child) => child.key === 'title-submission');
              return titleChild ? { ...item, children: [titleChild] } : null;
            }

            return null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      })).filter((section) => section.items.length),
    [isLimitedWorkspace, data?.group?.id]
  );
  const sidebarRoutes = useMemo(
    () =>
      navigationSections.flatMap((section) =>
        section.items.flatMap((item) => [item.href, ...('children' in item ? item.children.map((child) => child.href) : [])])
      ),
    [navigationSections]
  );
  const prefetchRoute = useRoutePrefetch(sidebarRoutes);
  const isDashboardHome = matchesRoute(pathname, '/students/dashboard');
  const isProfileRoute = matchesRoute(pathname, '/students/profile');
  const limitedMainContent =
    isLimitedWorkspace && limitedProfile
      ? isDashboardHome
        ? <LimitedStudentWorkspaceHome profile={limitedProfile} data={data} />
        : isProfileRoute
        ? <LimitedStudentProfileView profile={limitedProfile} data={data} />
        : !isLimitedStudentAllowedRoute(pathname, data)
            ? <LimitedStudentLockedFeature featureLabel={getLimitedRouteLabel(pathname)} profile={limitedProfile} />
            : null
      : null;

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, action })
      });
      if (res.ok) {
        // Optimistically update
        setRealNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'READ' } : item)));
      }
    } catch (e) {
      console.error('Failed to process notification action', e);
    }
  };

  const markNotificationsRead = useCallback((ids: string[]) => {
    const notificationIds = Array.from(new Set(ids.filter(Boolean)));
    if (!notificationIds.length) {
      return;
    }

    const readAt = new Date().toISOString();
    setRealNotifications((prev) =>
      prev.map((item) => (notificationIds.includes(item.id) ? { ...item, status: 'READ', readAt } : item))
    );

    void fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        notificationIds.length === 1
          ? { notificationId: notificationIds[0], action: 'read' }
          : { notificationIds, action: 'read' }
      ),
      keepalive: true
    }).finally(() => {
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    });
  }, []);

  const markNotificationRead = (id: string) => {
    markNotificationsRead([id]);
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen((current) => !current);
      return;
    }

    setSidebarCollapsed((current) => !current);
  };

  // Clicking a sidebar link closes the mobile drawer; on desktop keeps the current toggle state.
  const collapseOnLinkClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isMobile && event.target instanceof Element && event.target.closest('a[href]')) {
      setSidebarOpen(false);
    }
  };

  const toggleLabel = isMobile
    ? sidebarOpen
      ? 'Close sidebar'
      : 'Open sidebar'
    : sidebarCollapsed
      ? 'Expand sidebar'
      : 'Collapse sidebar';
  const activeNavItem = useMemo(() => {
    for (const item of STUDENT_NAV_ITEMS) {
      if ('children' in item) {
        const activeChild = item.children.find((child) => matchesRoute(pathname, child.href));
        if (activeChild) {
          return activeChild;
        }
      }

      if (matchesRoute(pathname, item.href)) {
        return item;
      }
    }

    return undefined;
  }, [pathname]);
  const projectOverviewNavItem = STUDENT_NAV_ITEMS.find((item) => item.key === 'project-overview');
  const projectOverviewChildHrefs =
    projectOverviewNavItem && 'children' in projectOverviewNavItem
      ? projectOverviewNavItem.children.map((child) => child.href)
      : [];
  const isProjectOverviewGroupPath =
    matchesRoute(pathname, '/students/project-overview') ||
    projectOverviewChildHrefs.some((href) => matchesRoute(pathname, href));
  const [projectOverviewMenuOpen, setProjectOverviewMenuOpen] = useState(isProjectOverviewGroupPath);

  useEffect(() => {
    if (isProjectOverviewGroupPath) {
      setProjectOverviewMenuOpen(true);
    }
  }, [isProjectOverviewGroupPath]);
  const navbarTitle = activeNavItem?.key === 'dashboard'
    ? 'Student Dashboard'
    : activeNavItem?.label ?? 'Student Workspace';

  return (
    <div
      className={`student-shell student-workspace-shell${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${sidebarOpen ? ' is-sidebar-open' : ''}`}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
      data-theme={themeMode}
    >
      {/* Decorative Light Background for Glassmorphism */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#0F3DDE]/[0.03] via-[#0F3DDE]/[0.01] to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0F3DDE]/[0.05] to-indigo-500/[0.03] blur-[80px]"></div>
        <div className="absolute top-[20%] -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/[0.03] to-[#0F3DDE]/[0.03] blur-[80px]"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
      </div>
      <header className="student-global-navbar">
        <div className="student-global-navbar-main">
          <button
            aria-label={toggleLabel}
            className="icon-btn student-shell-toggle"
            type="button"
            onClick={toggleSidebar}
          >
            <i
              aria-hidden="true"
              className={`fas ${isMobile ? (sidebarOpen ? 'fa-xmark' : 'fa-bars') : sidebarCollapsed ? 'fa-chevron-right' : 'fa-bars'}`}
            />
          </button>

          <div className="student-navbar-title" aria-label="Current page">
            <span className="student-navbar-title-kicker">ThesisTrack</span>
            <strong>{navbarTitle}</strong>
          </div>
        </div>

        <div className="student-global-navbar-actions">
          <div className="notification-menu-shell" ref={notificationMenuRef}>
            <button
              aria-expanded={notificationMenuOpen ? 'true' : 'false'}
              aria-haspopup="menu"
              aria-label="Open notifications"
              className={`notification-trigger${notificationMenuOpen ? ' is-active' : ''}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setProfileMenuOpen(false);
                setNotificationMenuOpen((current) => !current);
              }}
            >
              <span className={`notification-trigger-icon ${highPriorityNotificationsCount ? 'is-urgent' : ''}`} aria-hidden="true">
                <i className="fas fa-bell" />
              </span>
              <span className="notification-trigger-copy">
                <strong>Notifications</strong>
                <small>{unreadNotificationsCount ? `${unreadNotificationsCount} unread updates` : 'All caught up'}</small>
              </span>
              {unreadNotificationsCount ? <span className={`notification-trigger-count ${highPriorityNotificationsCount ? 'is-urgent' : ''}`}>{unreadNotificationsCount}</span> : null}
            </button>

            <div className={`notification-menu ${notificationMenuOpen ? 'is-open' : ''}`}>
              <div className="notification-menu-hero">
                <div className="notification-menu-hero-copy">
                  <span className="notification-menu-kicker">Inbox</span>
                  <strong>Notifications</strong>
                </div>
                <div className="notification-menu-actions">
                  {unreadNotificationsCount > 0 && (
                    <button 
                      className="notification-menu-view-all is-secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const unreadIds = shellNotifications.filter(n => !n.read).map(n => n.id);
                        markNotificationsRead(unreadIds);
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                  <Link prefetch={false} className="notification-menu-view-all is-primary" href={isLimitedWorkspace ? '/students/dashboard' : '/students/notifications'} onClick={() => setNotificationMenuOpen(false)}>
                    {isLimitedWorkspace ? 'View setup' : 'Open center'}
                  </Link>
                </div>
              </div>

              <div className="notification-menu-summary">
                <span className="notification-menu-summary-pill is-primary">
                  <i aria-hidden="true" className="fas fa-envelope-open-text" />
                  {unreadNotificationsCount ? `${unreadNotificationsCount} unread` : '0 unread'}
                </span>
                <span className={`notification-menu-summary-pill${highPriorityNotificationsCount ? ' is-danger' : ''}`}>
                  <i aria-hidden="true" className="fas fa-bolt" />
                  {highPriorityNotificationsCount ? `${highPriorityNotificationsCount} urgent` : 'No urgent items'}
                </span>
              </div>

              {recentNotifications.length ? (
                <div className="notification-menu-list" role="menu">
                  {recentNotifications.map((notification) => {
                    const action = getNotificationAction(notification);
                    const meta = getNotificationTypeMeta(notification.type);
                    const isPermissionRequest = notification.title === 'Upload Permission Request';

                    return (
                      <div
                        key={notification.id}
                        className={`notification-menu-item${notification.read ? '' : ' is-unread'}`}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                      >
                        <Link prefetch={false}
                          href={action.href}
                          className="flex gap-4 w-full"
                          onClick={() => {
                            if (!notification.read) {
                              if (GROUP_INVITE_NOTIFICATION_TITLES.has(notification.title)) {
                                const backlogIds = realNotifications
                                  .filter((n) => GROUP_INVITE_NOTIFICATION_TITLES.has(n.title) && n.status !== 'READ')
                                  .map((n) => n.id as string);
                                markNotificationsRead(
                                  backlogIds.includes(notification.id) ? backlogIds : [...backlogIds, notification.id]
                                );
                                setTimeout(() => window.location.reload(), 300);
                              } else {
                                markNotificationRead(notification.id);
                              }
                            }
                            setNotificationMenuOpen(false);
                          }}
                        >
                          <span className={`notification-menu-item-icon is-${meta.tone}`}>
                            <i aria-hidden="true" className={`fas ${meta.icon}`} />
                          </span>
                          <span className="notification-menu-item-copy">
                            <span className="notification-menu-item-head">
                              <strong>{notification.title}</strong>
                              {isBackupTitleNotification(notification.title) ? (
                                <span className="notification-menu-item-tag">Backup</span>
                              ) : null}
                              {!notification.read ? <span className="notification-menu-item-dot" aria-hidden="true" /> : null}
                            </span>
                            <small className="line-clamp-2" title={notification.message}>{notification.message}</small>
                            <span className="notification-menu-item-footer">
                              <span className="notification-menu-item-meta">
                                <span>{notification.dateLabel}</span>
                                <span className={`notification-menu-item-badge${notification.priority === 'high' ? ' is-danger' : ''}`}>
                                  {notification.priority === 'high' ? 'High priority' : meta.label}
                                </span>
                              </span>
                              {!isPermissionRequest ? (
                                <span className="notification-menu-item-cta">
                                  {action.label}
                                  <i aria-hidden="true" className="fas fa-arrow-right" />
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </Link>

                        {isPermissionRequest && !notification.read && (
                          <div className="flex gap-2 pt-3 pl-[52px]">
                            <button
                              className="flex-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                              onClick={(e) => { e.preventDefault(); handleAction(notification.id, 'accept'); }}
                            >
                              <i className="fas fa-check mr-1" aria-hidden="true" /> Accept
                            </button>
                            <button
                              className="flex-1 rounded-md border border-rose-200 bg-[var(--surface)] px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                              onClick={(e) => { e.preventDefault(); handleAction(notification.id, 'reject'); }}
                            >
                              <i className="fas fa-xmark mr-1" aria-hidden="true" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="notification-menu-empty">
                  <strong>{isLimitedWorkspace ? 'No project notifications yet' : 'All caught up'}</strong>
                  <p>
                    {isLimitedWorkspace
                      ? 'Feedback, deadlines, and approvals begin after your group and adviser are assigned.'
                      : 'No notification is waiting right now.'}
                  </p>
                </div>
              )}

              <div className="notification-menu-footer">
                <Link prefetch={false} className="notification-menu-footer-link" href={isLimitedWorkspace ? '/students/dashboard' : '/students/notifications'} onClick={() => setNotificationMenuOpen(false)}>
                  {isLimitedWorkspace ? 'Back to dashboard' : 'See all notifications'}
                  <i aria-hidden="true" className="fas fa-arrow-up-right-from-square" />
                </Link>
              </div>
            </div>
          </div>

          <div className="profile-menu-shell" ref={profileMenuRef}>
            <div className={`profile-menu ${profileMenuOpen ? 'is-open' : ''}`}>
              <button
                aria-expanded={profileMenuOpen ? 'true' : 'false'}
                aria-haspopup="menu"
                className="profile-pill profile-nav-btn student-global-profile"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setNotificationMenuOpen(false);
                  setProfileMenuOpen((current) => !current);
                }}
              >
                <span className="profile-nav-btn-avatar flex items-center justify-center overflow-hidden">
                  {shellProfile.profileImage ? (
                    <img src={shellProfile.profileImage} alt={shellProfile.fullName} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(shellProfile.fullName)
                  )}
                </span>
                <span className="profile-nav-btn-copy">
                  <strong>{getShortName(shellProfile.fullName)}</strong>
                  <small>{shellProfile.groupRole}</small>
                </span>
                <i aria-hidden="true" className="fas fa-chevron-down profile-nav-btn-chevron" />
              </button>

              <div className="profile-dropdown" role="menu" aria-label="User menu">
                <div className="profile-dropdown-header">
                  <strong>{shellProfile.fullName}</strong>
                  <span>{shellProfile.email}</span>
                </div>

                <div className="profile-dropdown-section">
                  <span className="profile-dropdown-label">Workspace</span>
                  <div className="student-profile-dropdown-pills">
                    <span className="student-profile-dropdown-pill is-primary">
                      <i aria-hidden="true" className="fas fa-user-graduate" />
                      {shellProfile.groupRole}
                    </span>
                    <span className="student-profile-dropdown-pill">
                      <i aria-hidden="true" className="fas fa-id-card" />
                      {shellProfile.studentId}
                    </span>
                    <span className="student-profile-dropdown-pill">
                      <i aria-hidden="true" className="fas fa-folder-open" />
                      {shellProfile.projectCode}
                    </span>
                  </div>
                </div>

                <div className="profile-dropdown-divider" />

                <div className="profile-dropdown-section">
                  <span className="profile-dropdown-label">Theme</span>
                  <button
                    aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                    aria-pressed={themeMode === 'dark'}
                    className="profile-theme-toggle"
                    type="button"
                    onClick={() => updateStudentTheme(themeMode === 'dark' ? 'light' : 'dark')}
                  >
                    <span className="profile-theme-toggle-icon">
                      <i aria-hidden="true" className={`fas ${themeMode === 'dark' ? 'fa-moon' : 'fa-sun'}`} />
                    </span>
                    <span className="profile-theme-toggle-copy">
                      <strong>{themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
                      <small>Switch workspace appearance</small>
                    </span>
                    <span className="profile-theme-toggle-track" aria-hidden="true">
                      <span />
                    </span>
                  </button>
                </div>

                <div className="profile-dropdown-divider" />

                <Link prefetch={false} className="profile-dropdown-link" href="/students/profile" onClick={() => setProfileMenuOpen(false)}>
                  <i aria-hidden="true" className="fas fa-user" /> My Profile
                </Link>





                <Link prefetch={false} className="profile-dropdown-link" href="/students/settings" onClick={() => setProfileMenuOpen(false)}>
                  <i aria-hidden="true" className="fas fa-cog" /> Settings
                </Link>

                <div className="profile-dropdown-divider" />

                <button
                  className="profile-dropdown-link is-danger"
                  type="button"
                  onClick={requestLogout}
                >
                  <i aria-hidden="true" className="fas fa-right-from-bracket" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside className={`student-global-sidebar sidebar${sidebarOpen ? ' is-open' : ''}`} onClick={collapseOnLinkClick}>
        <div className="sidebar-header">
          <div className="sidebar-header-copy">
            <span className="sidebar-context-kicker">Student Portal</span>
            <div className="brand-mark system-brand-mark" aria-label="ThesisTrack">
              <Image
                alt="ThesisTrack logo"
                className="system-brand-logo"
                height={56}
                priority
                src={themeMode === 'dark' ? '/System%20Logo/image.png' : '/System%20Logo/logo-transparent.png'}
                style={{ transform: themeMode === 'dark' ? 'scale(1.15)' : 'none' }}
                width={72}
              />
              <span className="system-brand-name">
                <span>Thesis</span>
                <strong>Track</strong>
              </span>
              <span className="system-brand-subtitle">Higher Education Institutions</span>
            </div>
          </div>
          <span className="user-badge">
            <i aria-hidden="true" className="fas fa-id-card" />
            <span>{shellProfile.projectCode}</span>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Student workspace navigation">
          {navigationSections.map((section) => (
            <div key={section.key} className="sidebar-nav-group">
              <span className="sidebar-nav-heading">{section.label}</span>
              <div className="sidebar-nav-links">
                {section.items.map((item) => {
                  const isActive = matchesRoute(pathname, item.href);
                  const count = item.key === 'faculty-feedback' ? unreadFeedbackCount : 0;
                  const children = 'children' in item ? item.children : undefined;

                  if (children && children.length) {
                    const isChildActive = children.some((child) => matchesRoute(pathname, child.href));

                    return (
                      <div
                        key={item.key}
                        className={`sidebar-nav-dropdown${projectOverviewMenuOpen ? ' is-open' : ''}${isActive || isChildActive ? ' is-active' : ''}`}
                      >
                        <div className={`sidebar-nav-dropdown-row${isActive ? ' is-active' : ''}`}>
                          <Link prefetch={false}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`sidebar-link${isActive ? ' is-active' : isChildActive ? ' is-parent-active' : ''}`}
                            title={sidebarCollapsed ? item.label : undefined}
                            onFocus={() => prefetchRoute(item.href)}
                            onMouseEnter={() => prefetchRoute(item.href)}
                          >
                            <span className="sidebar-link-icon">
                              <i aria-hidden="true" className={`fas ${item.icon}`} />
                            </span>
                            <span className="sidebar-link-label">{item.label}</span>
                          </Link>
                          <button
                            aria-controls={`student-${item.key}-submenu`}
                            aria-expanded={projectOverviewMenuOpen}
                            aria-label={projectOverviewMenuOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                            className="sidebar-nav-dropdown-toggle"
                            type="button"
                            onClick={() => setProjectOverviewMenuOpen((current) => !current)}
                          >
                            <i aria-hidden="true" className="fas fa-chevron-down sidebar-nav-chevron" />
                          </button>
                        </div>
                        <div className="sidebar-submenu" id={`student-${item.key}-submenu`} aria-label={`${item.label} sections`}>
                          {children.map((child) => {
                            const isChildLinkActive = matchesRoute(pathname, child.href);

                            return (
                              <Link prefetch={false}
                                key={child.key}
                                aria-current={isChildLinkActive ? 'page' : undefined}
                                className={`sidebar-link ${isChildLinkActive ? 'is-active' : ''}`}
                                href={child.href}
                                title={child.label}
                                onFocus={() => prefetchRoute(child.href)}
                                onMouseEnter={() => prefetchRoute(child.href)}
                              >
                                <span className="sidebar-link-icon">
                                  <i aria-hidden="true" className={`fas ${child.icon}`} />
                                </span>
                                <span className="sidebar-link-label sidebar-link-label-truncate">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link prefetch={false}
                      key={item.key}
                      aria-current={isActive ? 'page' : undefined}
                      className={`sidebar-link ${isActive ? 'is-active' : ''}`}
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      onFocus={() => prefetchRoute(item.href)}
                      onMouseEnter={() => prefetchRoute(item.href)}
                    >
                      <span className="sidebar-link-icon">
                        <i aria-hidden="true" className={`fas ${item.icon}`} />
                      </span>
                      <span className="sidebar-link-label">{item.label}</span>
                      {count ? <span className="nav-count is-pending">{count}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      <button
        aria-label="Close sidebar"
        className={`student-global-backdrop sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setSidebarOpen(false)}
      />

      <main className="student-global-main relative z-10">
        <div className="student-global-content relative z-10">
          {isCheckingAccess ? (
            <div className="flex min-h-[80vh] items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <i className="fas fa-circle-notch fa-spin text-4xl text-[var(--primary)]" />
                <p className="font-semibold animate-pulse text-gray-500">Loading workspace...</p>
              </div>
            </div>
          ) : (
            limitedMainContent || children
          )}
        </div>
      </main>

      {showGroupInviteModal && data.profile.pendingGroupInviteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-500" style={{ position: 'fixed' }}>
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Ambient Glow */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute -top-[100px] -right-[100px] w-[300px] h-[300px] bg-[var(--primary)] opacity-10 blur-[80px] rounded-full"></div>
              <div className="absolute -bottom-[100px] -left-[100px] w-[300px] h-[300px] bg-sky-500 opacity-10 blur-[80px] rounded-full"></div>
            </div>


            
            <div className="relative z-10">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-sky-500/10 text-[var(--primary)] shadow-inner ring-1 ring-inset ring-[var(--primary)]/20 mb-8 mx-auto">
                <i className="fas fa-users-viewfinder text-3xl drop-shadow-sm" aria-hidden="true" />
              </div>
              
              <h2 className="text-3xl font-extrabold text-[var(--text)] mb-4 text-center tracking-tight">Group Invitation</h2>
              <div className="bg-[var(--bg)] p-5 rounded-2xl border border-[var(--border)] mb-8 text-center shadow-inner relative mt-6">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)] rounded-full border border-[var(--border)] shadow-sm">
                   Official Notice
                 </div>
                 <p className="text-[15px] text-[var(--text)] leading-relaxed font-medium italic mt-2 text-balance">
                   "{data.profile.pendingGroupInviteMessage || 'You have been added to a group by an adviser.'}"
                 </p>
                 <div className="mt-4 pt-4 border-t border-[var(--border-strong)]/30">
                   <p className="text-sm text-[var(--muted)] font-medium">
                     Click below to sync your profile and access the workspace.
                   </p>
                 </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <PremiumAnimatedButton
                  onPress={async () => {
                    if (data.profile.pendingGroupInviteId) {
                      // Clear every unread group-invite notification, not just the one
                      // currently shown — otherwise an older leftover (from an earlier
                      // group edit) stays unread and reopens this same modal next visit.
                      const backlogIds = realNotifications
                        .filter((n) => GROUP_INVITE_NOTIFICATION_TITLES.has(n.title) && n.status !== 'READ')
                        .map((n) => n.id as string);
                      markNotificationsRead(
                        backlogIds.includes(data.profile.pendingGroupInviteId)
                          ? backlogIds
                          : [...backlogIds, data.profile.pendingGroupInviteId]
                      );
                      await new Promise((r) => setTimeout(r, 600));
                      setShowGroupInviteModal(false);
                      setTimeout(() => window.location.reload(), 300);
                    }
                  }}
                  className="w-full h-14 rounded-xl bg-[var(--primary)] text-[15px] font-bold text-white shadow-md shadow-[var(--primary)]/30"
                >
                  <i className="fas fa-rocket opacity-70" aria-hidden="true" /> Accept & Enter Workspace
                </PremiumAnimatedButton>
                <button 
                  onClick={() => setShowGroupInviteModal(false)}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-transparent px-5 py-3.5 text-[15px] font-bold text-[var(--muted)] transition-all duration-300 hover:bg-[var(--surface-alt)] hover:text-[var(--text)] active:scale-95"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
