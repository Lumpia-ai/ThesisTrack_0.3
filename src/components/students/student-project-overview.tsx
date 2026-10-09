'use client';

import Link from 'next/link';
import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { logoutWithApi } from '@/lib/client-auth';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { STUDENT_NAV_ITEMS } from '@/components/students/student-navigation';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import {
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  createAcademicActivityForm,
  deleteAcademicActivity,
  fetchAcademicActivities,
  formatIsoDateLabel,
  isImageFileByName,
  saveAcademicActivity,
  type ApiAcademicActivity
} from '@/components/students/student-academic-activity.shared';
import { AcademicActivityDetailModal } from '@/components/students/student-academic-activity-detail';
import { hasCompletedConceptStage } from '@/components/students/student-project-files.shared';

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

function getStatusTone(status: string): BadgeTone {
  // Raw Prisma enum values (e.g. "NEEDS_REVISION", "UNDER_REVIEW") use
  // underscores, but the match lists below are space-separated — without this,
  // every multi-word enum status silently fell through to "neutral" instead of
  // its real tone.
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  if (['approved', 'completed', 'resolved', 'confirmed', 'in use', 'enhanced', 'incorporated', 'in development', 'recognized'].includes(normalized)) {
    return 'success';
  }
  if (['pending review', 'pending', 'upcoming', 'under review', 'submitted', 'for evaluation', 'proposed', 'pilot deployment planning', 'ongoing', 'planned'].includes(normalized)) {
    return 'warning';
  }
  if (['needs revision', 'returned for revision', 'not transferable', 'needs clarification', 'danger'].includes(normalized)) {
    return 'danger';
  }
  return 'neutral';
}

function getScopeTone(scope: string): BadgeTone {
  if (scope === 'International') return 'success';
  if (scope === 'National' || scope === 'Regional') return 'warning';
  return 'neutral';
}

function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: string }) {
  return (
    <span className={`ui-badge is-${tone}`}>
      {icon && <i className={`fas ${icon}`} aria-hidden="true" />}
      {label}
    </span>
  );
}

type AcademicActivityRecord = StudentDashboardData['presentations'][number] & {
  activityStatus?: string;
  relatedMilestone?: string;
  participantsOrBeneficiary?: string;
  addToTimeline?: boolean;
  markAsAchievement?: boolean;
  evidenceFiles?: Array<{
    name: string;
    type: string;
  }>;
  // Real, downloadable links to the evidence files attached via Document
  // Submissions — undefined for the brief local echo shown right after save,
  // populated once the list is refetched from the server.
  evidenceLinks?: Array<{
    id: string;
    fileName: string;
    url: string;
    previewUrl: string;
  }>;
  canDelete?: boolean;
  // The full record, for the detail modal — the fields above are just a
  // compatibility shape for the existing display helpers.
  raw: ApiAcademicActivity;
};

type AcademicActivityTab = 'events' | 'evidence' | 'recognitions';

// Adapts the real API shape back onto the record shape the existing display
// helpers (getEvidenceFileLabel, getRecognitionMeta, etc.) already expect, so
// none of that rendering code needed to change — only where the data comes
// from did.
function mapApiActivityToRecord(activity: ApiAcademicActivity, currentUserId: string): AcademicActivityRecord {
  const imageFiles = activity.files.filter((file) => isImageFileByName(file.fileName, file.fileType));
  const certificateFile = activity.files.find((file) => !isImageFileByName(file.fileName, file.fileType));

  return {
    id: activity.id,
    user_id: currentUserId,
    project_id: activity.projectId,
    status: 'active',
    created_at: activity.createdAt,
    updated_at: activity.createdAt,
    eventName: activity.eventName,
    eventType: activity.activityType,
    date: activity.eventDate || activity.createdAt,
    dateLabel: formatIsoDateLabel(activity.eventDate || activity.createdAt),
    venue: activity.venue || '',
    description: activity.description || '',
    achievement: activity.achievement || '',
    scope: activity.scope,
    certificateFile: certificateFile?.fileName || '',
    photoCount: imageFiles.length,
    activityStatus: activity.status,
    relatedMilestone: activity.relatedMilestone || '',
    participantsOrBeneficiary: activity.participantsOrBeneficiary || '',
    addToTimeline: activity.addToTimeline,
    markAsAchievement: activity.markAsAchievement,
    evidenceFiles: activity.files.map((file) => ({ name: file.fileName, type: file.fileType })),
    evidenceLinks: activity.files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      url: file.url,
      previewUrl: file.previewUrl
    })),
    raw: activity
  };
}

const OVERVIEW_PILL_STYLES: Record<BadgeTone, string> = {
  neutral: 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-blue-200 bg-blue-50 text-brand',
  accent: 'border-yellow-200 bg-yellow-50 text-amber-700'
};

function getEvidenceFileLabel(activity: AcademicActivityRecord) {
  return activity.certificateFile || `${activity.eventName} Evidence`;
}

function getEvidenceFileType(activity: AcademicActivityRecord) {
  if (activity.certificateFile) {
    const extension = activity.certificateFile.split('.').pop()?.toUpperCase();

    return extension ? `${extension} file` : 'Certificate file';
  }

  return activity.photoCount > 0 ? 'Image evidence' : 'Evidence record';
}

function getEvidenceNote(activity: AcademicActivityRecord) {
  if (activity.description) {
    return activity.description;
  }

  return activity.certificateFile
    ? `${activity.photoCount} photo${activity.photoCount === 1 ? '' : 's'} attached`
    : `${activity.photoCount} photo${activity.photoCount === 1 ? '' : 's'} recorded`;
}

function getRecognitionMeta(activity: AcademicActivityRecord) {
  const meta = [activity.eventName, activity.venue || activity.participantsOrBeneficiary, activity.relatedMilestone].filter(Boolean);

  return meta.length ? meta.join(' • ') : 'Recognition recorded';
}

function getEvidenceStatusLabel(activity: AcademicActivityRecord) {
  const normalized = activity.activityStatus?.toLowerCase() || '';

  if (['approved', 'completed', 'recognized', 'submitted', 'confirmed'].some((status) => normalized.includes(status))) {
    return 'Approved';
  }

  return 'Pending';
}

function getRecognitionSummary(activity: AcademicActivityRecord) {
  const meta = [activity.eventName, activity.venue || activity.participantsOrBeneficiary, activity.relatedMilestone].filter(Boolean);

  return meta.length ? meta.join(' / ') : 'Recognition recorded';
}

function InfoPill({
  label,
  tone = 'neutral',
  icon
}: {
  label: string;
  tone?: BadgeTone;
  icon?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] ${OVERVIEW_PILL_STYLES[tone]}`}
    >
      {icon ? <i className={`fas ${icon} text-[10px]`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function MetaStat({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

export function StudentProjectOverview({ data }: { data: StudentDashboardData }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { project, group } = data;
  const [activeAcademicActivityTab, setActiveAcademicActivityTab] = useState<AcademicActivityTab>('events');
  const [presentations, setPresentations] = useState<AcademicActivityRecord[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ApiAcademicActivity | null>(null);

  // Log Activity — moved here from Document Submission so logging an
  // achievement/activity lives next to where the rest of the log is already
  // displayed, instead of a separate page.
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState(() => createAcademicActivityForm(''));
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [activityFormError, setActivityFormError] = useState<string | null>(null);
  // .project-overview-page may sit under a backdrop-filter ancestor, which traps
  // position:fixed descendants to its own box instead of the real viewport —
  // rendering the modal via a portal to document.body sidesteps that.
  const [isModalPortalMounted, setIsModalPortalMounted] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<Array<{ id: string; fileName: string }>>([]);

  useEffect(() => {
    setIsModalPortalMounted(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('is-modal-open', isActivityModalOpen);

    return () => {
      document.body.classList.remove('is-modal-open');
    };
  }, [isActivityModalOpen]);

  // Evidence a new activity can attach — files the student has already
  // uploaded from Submit Documents under Award/Recognition or Activity
  // Evidence, sourced from the same /api/document-files data that page writes to.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/document-files?bucketName=${DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS}&page=1&limit=50`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const files = (payload.files || [])
          .filter((file: any) => file.documentCategory === 'award-recognition' || file.documentCategory === 'activity-evidence')
          .map((file: any) => ({ id: file.id, fileName: file.fileName }));

        if (!cancelled) {
          setEvidenceFiles(files);
        }
      } catch {
        // Non-critical: the evidence checklist simply stays empty if this fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openActivityModal = () => {
    setActivityForm(createAcademicActivityForm(project.currentMilestone || ''));
    setActivityFormError(null);
    setIsActivityModalOpen(true);
  };

  const closeActivityModal = () => {
    setIsActivityModalOpen(false);
  };

  const updateActivityForm = <Key extends keyof ReturnType<typeof createAcademicActivityForm>,>(
    field: Key,
    value: ReturnType<typeof createAcademicActivityForm>[Key]
  ) => {
    setActivityForm((current) => ({ ...current, [field]: value }));
  };

  const toggleActivityEvidenceFile = (fileId: string) => {
    setActivityForm((current) => ({
      ...current,
      selectedFileIds: current.selectedFileIds.includes(fileId)
        ? current.selectedFileIds.filter((id) => id !== fileId)
        : [...current.selectedFileIds, fileId]
    }));
  };

  const handleSaveActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activityForm.activityTitle.trim()) {
      setActivityFormError('Enter the academic activity title.');
      return;
    }

    if (!project.project_id) {
      setActivityFormError('No assigned thesis project was found for your account.');
      return;
    }

    setIsSavingActivity(true);
    setActivityFormError(null);

    try {
      const saved = await saveAcademicActivity(project.project_id, activityForm);

      if (saved) {
        setPresentations((current) => [mapApiActivityToRecord(saved, data.profile.user_id), ...current]);
      } else {
        await loadAcademicActivities();
      }

      closeActivityModal();
    } catch (error) {
      setActivityFormError(error instanceof Error ? error.message : 'Unable to save the academic activity.');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('Remove this academic activity? This only removes the log entry, not the uploaded evidence file.')) {
      return;
    }

    try {
      await deleteAcademicActivity(activityId);
      setPresentations((current) => current.filter((item) => item.id !== activityId));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to remove this activity.');
    }
  };

  const loadAcademicActivities = async () => {
    if (!project.project_id) {
      setIsLoadingActivities(false);
      return;
    }

    setIsLoadingActivities(true);

    try {
      const activities = await fetchAcademicActivities(project.project_id);
      setPresentations(activities.map((activity) => mapApiActivityToRecord(activity, data.profile.user_id)));
    } catch {
      // Non-critical: the log simply stays empty if this fails.
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    loadAcademicActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.project_id]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
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

  const summary = useMemo(() => {
    const unreadFeedback = data.feedback.filter((item) => item.unread).length;
    const unreadNotifications = data.notifications.filter((item) => !item.read).length;
    return { unreadFeedback, unreadNotifications };
  }, [data]);

  const latestEvent = presentations[0] || null;
  const latestRecognition = presentations.find((item) => item.achievement) || null;
  const latestEvidence = presentations.find((item) => item.certificateFile || item.photoCount > 0) || null;
  const presentationPhotoCount = presentations.reduce((sum, item) => sum + item.photoCount, 0);
  const recognizedEvents = presentations.filter((item) => item.achievement).length;
  const certificateCount = presentations.filter((item) => item.certificateFile).length;
  const eventRecords = presentations;
  const recentEvents = eventRecords;
  const evidenceRecords = presentations.filter((item) => item.certificateFile || item.photoCount > 0);
  const recognitionRecords = presentations.filter((item) => item.achievement);
  const scopes = {
    Local: presentations.filter((item) => item.scope === 'Local').length,
    Regional: presentations.filter((item) => item.scope === 'Regional').length,
    National: presentations.filter((item) => item.scope === 'National').length,
    International: presentations.filter((item) => item.scope === 'International').length
  };
  const highestScope = ['International', 'National', 'Regional', 'Local'].find((label) => scopes[label as keyof typeof scopes] > 0) || 'No events yet';

  const details = [
    { label: 'Project Code', value: project.projectCode },
    { label: 'Group Name', value: project.groupName },
    { label: 'Team Leader', value: group.leaderName },
    { label: 'Adviser', value: project.adviser },
    { label: 'Program', value: project.program },
    { label: 'Department', value: project.department },
    { label: 'Academic Year', value: project.academicYear },
    { label: 'Project Status', value: project.status },
    { label: 'Repository Status', value: project.repositoryStatus }
  ];

  const progressOrbStyle = {
    ['--progress' as string]: String(project.progressPercentage)
  } as CSSProperties;

  const isLeader = data.profile.groupRole.includes('Leader');
  const projectStatusTone = getStatusTone(project.status);
  // Whether the title itself has ever been approved (Concept stage) is a
  // separate question from the project's CURRENT overall status — a later
  // stage's redefense (e.g. Proposal) flips project.status to NEEDS_REVISION,
  // which used to also make an already-approved title vanish behind the
  // "pending approval" placeholder here even though the title was decided
  // long ago. Concept completion is the real, stable signal for that.
  const hasApprovedTitle = hasCompletedConceptStage(data);

  return (
    <>
    <div className="project-overview-page">
      <button className={`sidebar-backdrop ${sidebarOpen ? 'is-open' : ''}`} type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />

      <header className="top-nav project-overview-header">
          <div className="top-nav-leading">
            <div className="page-title project-overview-header-copy">
              <div className="page-title-context project-overview-header-context">
                <span className="page-kicker">Student Workspace</span>
                <span className="page-breadcrumb" aria-hidden="true">
                  <i className="fas fa-angle-right" />
                  <span>Project Overview</span>
                </span>
              </div>
              <h1>Project Overview</h1>
              <p className="project-overview-header-description">Review the full project profile, academic details, implementation notes, assigned faculty, and presentation record.</p>
            </div>
          </div>
        </header><div className="page-body">
          <section className="hero-card project-overview-summary-card relative overflow-hidden">
            <div className="pointer-events-none absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[var(--primary)] to-sky-400" />
            <div className="hero-card-main project-overview-summary-main">
              <div className="project-overview-summary-heading">
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="section-kicker">Project Summary</span>
                    <Badge label={project.status} tone={projectStatusTone} />
                  </div>
                  <div className="project-overview-summary-title flex items-center flex-wrap gap-3 mt-2 mb-2">
                    {!hasApprovedTitle ? (
                      <>
                        <h2 className="text-xl font-medium text-[var(--muted)] italic flex items-center">
                          <i className="fas fa-lock text-sm mr-2 opacity-60"></i>
                          Project title pending approval
                        </h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                          <i className="fas fa-clock"></i>
                          Pending Approval
                        </span>
                      </>
                    ) : (
                      <h2 className="text-2xl font-bold text-[#003A8F] leading-snug">{project.title}</h2>
                    )}
                  </div>
                  {!hasApprovedTitle ? (
                    <p className="project-overview-summary-copy text-sm text-[var(--muted)] max-w-2xl">Your project title will appear here once the concept proposal has been officially approved.</p>
                  ) : (
                    <p className="project-overview-summary-copy text-sm text-[var(--muted)] max-w-2xl">{project.description}</p>
                  )}
                </div>
              </div>
              <div className="chip-row project-overview-summary-tags">
                <Badge label={`Leader: ${group.leaderName}`} tone="warning" icon="fa-crown" />
                <Badge label={`${group.memberCount} Members`} tone="neutral" icon="fa-users" />
                {project.keywords?.map((keyword) => (
                  <Badge key={keyword} label={keyword} tone="neutral" />
                ))}
              </div>
              <div className={`workspace-note project-overview-summary-note ${isLeader ? 'is-leader' : 'is-member'} flex items-start gap-3`}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                  <i className="fas fa-users text-sm" aria-hidden="true" />
                </span>
                <div>
                  <strong>You are viewing the shared project record for your entire capstone group.</strong>
                  <p>This project page is shared by the full group. Official project-level edits are coordinated by the group leader.</p>
                </div>
              </div>
              <div className="hero-actions project-overview-summary-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => document.getElementById('project-details-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <i className="fas fa-circle-info" aria-hidden="true" /> View Full Information
                </button>
                <Link prefetch={false} className="btn btn-secondary" href="/students/milestones">
                  <i className="fas fa-timeline" aria-hidden="true" /> Open Milestones
                </Link>
              </div>
            </div>
            <div className="hero-card-side project-overview-summary-side flex flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] w-full text-left">Progress</span>
                <div className="progress-orb my-2" style={progressOrbStyle}>
                  <strong>{project.progressPercentage}%</strong>
                  <span>Progress</span>
                </div>
                {project.progressPercentage === 0 && (
                  <p className="text-xs text-[var(--muted)] max-w-[200px] leading-relaxed">No project stage progress yet. Start by opening Project Stages.</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3.5 pt-4 border-t border-[var(--border)] w-full">
                {(() => {
                  const heroStats = [
                    { icon: 'fa-flag', label: 'Current project stage', value: project.currentMilestone, fallback: 'Not started' },
                    { icon: 'fa-calendar-day', label: 'Upcoming deadline', value: project.upcomingDeadline, fallback: 'Not set' },
                    { icon: 'fa-book', label: 'Repository status', value: project.repositoryStatus, fallback: 'Pending', pendingValues: ['pending', 'not yet published'] }
                  ];

                  return heroStats.map((stat) => {
                    const displayValue = stat.value || stat.fallback;
                    // Same dim-italic treatment the Project Details grid below already
                    // uses for empty fields — without this, "Not set"/"Pending" looked
                    // identical in weight to real data, making blanks easy to miss.
                    const isPending = !stat.value || (stat.pendingValues?.includes(displayValue.toLowerCase()) ?? false);

                    return (
                      <div key={stat.label} className="flex justify-between items-center gap-3 text-sm">
                        <span className="flex items-center gap-2 text-[var(--muted)]"><i className={`fas ${stat.icon} text-xs opacity-60`} aria-hidden="true"></i>{stat.label}</span>
                        <strong className={`text-right ${isPending ? 'text-[var(--text-meta)] font-medium italic' : 'text-[var(--text)] font-semibold'}`}>{displayValue}</strong>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </section>

          <section className="content-grid project-overview-info-grid">
            <article id="project-details-section" className="surface-card project-overview-section-card scroll-mt-24">
              <div className="card-heading">
                <div>
                  <span className="section-kicker">Project Details</span>
                  <h3>Academic and implementation information</h3>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-2">
                {details.map((item) => {
                  const isPending = !item.value || item.value === 'Not assigned' || item.value === 'Pending' || item.value === 'None';
                  return (
                    <div key={item.label} className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 shadow-sm transition-colors hover:border-[var(--border)]">
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{item.label}</span>
                      <strong className={`text-sm ${isPending ? 'text-[var(--text-meta)] font-medium italic' : 'text-[var(--text)] font-semibold'}`}>{isPending ? 'Not available' : item.value}</strong>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="surface-card project-overview-section-card">
              <div className="card-heading">
                <div>
                  <span className="section-kicker">Project Team</span>
                  <h3>Student group and faculty panel</h3>
                </div>
              </div>

              <div className="member-roster">
                {group.members.map((member) => (
                  <article key={member.id} className={`member-card project-overview-member-card ${member.isLeader ? 'is-leader' : ''} ${member.isCurrent ? 'is-current' : ''}`}>
                    <span className="member-avatar flex items-center justify-center overflow-hidden">
                      {member.profileImage ? (
                        <img src={member.profileImage} alt={member.fullName} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(member.fullName)
                      )}
                    </span>
                    <div className="member-copy">
                      <div className="member-copy-head">
                        <div className="project-overview-member-identity">
                          <strong>{member.fullName}</strong>
                          <div className="project-overview-member-meta">
                            <span>{member.studentId}</span>
                            <span>{member.email}</span>
                          </div>
                        </div>
                        <div className="chip-row project-overview-member-badges">
                          {member.isLeader ? <Badge label="Team Leader" tone="warning" icon="fa-crown" /> : <Badge label="Member" tone="neutral" icon="fa-user" />}
                          {member.isCurrent ? <Badge label="You" tone="success" icon="fa-user-check" /> : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="stack-list">
                <article className="stack-card project-overview-panel-card rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm p-5">
                  <div className="stack-card-head flex items-center justify-between mb-2">
                    <strong className="text-sm font-semibold text-[var(--text)]">Adviser</strong>
                    <Badge 
                      label={project.adviser && project.adviser !== 'Not assigned' ? 'Assigned' : 'Pending Assignment'} 
                      tone={project.adviser && project.adviser !== 'Not assigned' ? 'success' : 'warning'} 
                    />
                  </div>
                  <p className="text-sm text-[var(--muted)]">{project.adviser && project.adviser !== 'Not assigned' ? project.adviser : 'No adviser assigned yet.'}</p>
                </article>
              </div>
            </article>
          </section>

          <section className="surface-card project-overview-abstract-card">
            <div className="card-heading">
              <div>
                <span className="section-kicker">Abstract</span>
                <h3>Brief project summary</h3>
              </div>
            </div>
            <div className="project-overview-abstract-copy">
              <p className="reading-copy">{project.abstract || 'No abstract provided.'}</p>
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm" aria-label="Academic activities and supporting evidence">
            <div className="flex flex-col gap-5 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="section-kicker">Presentations and Achievements</span>
                  <h2 className="text-xl font-semibold text-[var(--text)]">Academic activities and supporting evidence</h2>
                  <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
                    Track presentations, supporting files, and recognitions in one cleaner section built for thesis monitoring and accreditation support.
                  </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Latest activity</span>
                      <p className="text-sm leading-6 text-[var(--text)]">
                        {latestEvent
                          ? `Latest activity logged: ${latestEvent.eventName} on ${latestEvent.dateLabel}.${latestEvidence ? ` Latest evidence: ${getEvidenceFileLabel(latestEvidence)}.` : ''}`
                          : 'No academic activities recorded yet.'}
                      </p>
                    </div>
                    {latestEvent ? (
                      <div className="flex flex-wrap gap-2">
                        <InfoPill label={latestEvent.eventType} tone="info" icon="fa-presentation-screen" />
                        <InfoPill label={latestEvent.scope} tone={getScopeTone(latestEvent.scope)} icon="fa-globe" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-brand-dark"
                  onClick={openActivityModal}
                >
                  <i className="fas fa-plus" aria-hidden="true" />
                  Log Activity
                </button>
                <Link prefetch={false}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-sm transition duration-200 hover:border-blue-200 hover:text-brand"
                  href="/students/faculty-feedback"
                >
                  <i className="fas fa-comments" aria-hidden="true" />
                  Review Feedback
                  {summary.unreadFeedback ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      {summary.unreadFeedback}
                    </span>
                  ) : null}
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Events</span>
                <strong className="mt-2 block text-2xl font-semibold text-[var(--text)]">{presentations.length}</strong>
                <p className="mt-1 text-xs text-[var(--muted)]">Recorded academic activities</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Certificates</span>
                <strong className="mt-2 block text-2xl font-semibold text-[var(--text)]">{certificateCount}</strong>
                <p className="mt-1 text-xs text-[var(--muted)]">Attached certificate files</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Evidence Photos</span>
                <strong className="mt-2 block text-2xl font-semibold text-[var(--text)]">{presentationPhotoCount}</strong>
                <p className="mt-1 text-xs text-[var(--muted)]">Photos linked to activities</p>
              </article>
              <article className="rounded-xl border border-yellow-100 bg-yellow-50/80 p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Recognitions</span>
                <strong className="mt-2 block text-2xl font-semibold text-[var(--text)]">{recognizedEvents}</strong>
                <p className="mt-1 text-xs text-[var(--muted)]">Awards and distinctions logged</p>
              </article>
              <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Highest Scope</span>
                <strong className="mt-2 block text-lg font-semibold text-[var(--text)]">{highestScope}</strong>
                <p className="mt-1 text-xs text-[var(--muted)]">Most advanced activity reach</p>
              </article>
            </div>

            <div className="border-b border-[var(--border)]">
              <div className="flex gap-6 overflow-x-auto">
                {[
                  { key: 'events' as const, label: 'Events', count: eventRecords.length },
                  { key: 'evidence' as const, label: 'Evidence', count: evidenceRecords.length },
                  { key: 'recognitions' as const, label: 'Recognitions', count: recognitionRecords.length }
                ].map((tab) => {
                  const isActive = activeAcademicActivityTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition ${
                        isActive ? 'border-brand text-brand' : 'border-transparent text-[var(--text-meta)] hover:text-[var(--muted)]'
                      }`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveAcademicActivityTab(tab.key)}
                    >
                      <span>{tab.label}</span>
                      <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-blue-50 text-brand' : 'bg-[var(--surface-alt)] text-[var(--muted)]'}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {activeAcademicActivityTab === 'events' ? (
                eventRecords.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {eventRecords.map((activity) => (
                      <article
                        key={`event-tab-${activity.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedActivity(activity.raw)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedActivity(activity.raw); }}
                        className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 shadow-sm transition duration-200 hover:border-blue-200 hover:bg-[var(--surface)]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <h3 className="text-base font-semibold text-[var(--text)]">{activity.eventName}</h3>
                            <p className="text-sm leading-6 text-[var(--muted)]">
                              {activity.description || 'No event description provided yet.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <InfoPill label={activity.eventType} tone="info" icon="fa-presentation-screen" />
                            <InfoPill label={activity.scope} tone={getScopeTone(activity.scope)} icon="fa-globe" />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-calendar-day text-xs text-[var(--text-meta)]" aria-hidden="true" />
                            {activity.dateLabel}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-location-dot text-xs text-[var(--text-meta)]" aria-hidden="true" />
                            {activity.venue || 'To be announced'}
                          </span>
                          {activity.activityStatus ? (
                            <span className="inline-flex items-center gap-2">
                              <i className="fas fa-circle-check text-xs text-[var(--text-meta)]" aria-hidden="true" />
                              {activity.activityStatus}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-6 py-6 text-left">
                    <strong className="block text-sm font-semibold text-[var(--text)]">No academic activities yet</strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">Presentations, exhibits, and workshops logged from Document Submissions will appear here.</p>
                  </div>
                )
              ) : null}

              {activeAcademicActivityTab === 'evidence' ? (
                evidenceRecords.length ? (
                  <div className="space-y-3">
                    {evidenceRecords.map((activity) => (
                      <article
                        key={`evidence-tab-${activity.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedActivity(activity.raw)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedActivity(activity.raw); }}
                        className="cursor-pointer flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition duration-200 hover:border-blue-200 hover:bg-[var(--surface-alt)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-brand">
                            <i className={`fas ${activity.certificateFile ? 'fa-file-lines' : 'fa-images'}`} aria-hidden="true" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h3 className="truncate text-sm font-semibold text-[var(--text)]">{getEvidenceFileLabel(activity)}</h3>
                            <p className="text-sm text-[var(--muted)]">{activity.eventName}</p>
                            <p className="text-sm leading-6 text-[var(--muted)]">{getEvidenceNote(activity)}</p>
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm text-[var(--muted)] sm:min-w-[220px]">
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-calendar-day text-xs text-[var(--text-meta)]" aria-hidden="true" />
                            {activity.dateLabel}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-camera text-xs text-[var(--text-meta)]" aria-hidden="true" />
                            {activity.photoCount} photo{activity.photoCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <InfoPill
                            label={activity.certificateFile ? 'Certificate' : 'Photo evidence'}
                            tone={activity.certificateFile ? 'info' : 'neutral'}
                            icon={activity.certificateFile ? 'fa-file-circle-check' : 'fa-camera'}
                          />
                          <InfoPill
                            label={getEvidenceStatusLabel(activity)}
                            tone={getEvidenceStatusLabel(activity) === 'Approved' ? 'success' : 'warning'}
                            icon="fa-circle-check"
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-6 py-6 text-left">
                    <strong className="block text-sm font-semibold text-[var(--text)]">Upload your first evidence</strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">Certificates and photo evidence uploaded from Document Submissions will appear here.</p>
                  </div>
                )
              ) : null}

              {activeAcademicActivityTab === 'recognitions' ? (
                recognitionRecords.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {recognitionRecords.map((activity) => (
                      <article
                        key={`recognition-tab-${activity.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedActivity(activity.raw)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedActivity(activity.raw); }}
                        className="cursor-pointer rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 via-white to-blue-50 p-5 shadow-sm transition duration-200 hover:border-amber-200"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Recognition</span>
                            <h3 className="text-base font-semibold text-[var(--text)]">{activity.achievement}</h3>
                            <p className="text-sm leading-6 text-[var(--muted)]">{getRecognitionSummary(activity)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <InfoPill label="Achievement" tone="accent" icon="fa-award" />
                            <InfoPill label={activity.scope} tone={getScopeTone(activity.scope)} icon="fa-globe" />
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-calendar-day text-xs text-[var(--text-meta)]" aria-hidden="true" />
                            {activity.dateLabel}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-presentation-screen text-xs text-[var(--text-meta)]" aria-hidden="true" />
                            {activity.eventName}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <i className="fas fa-location-dot text-xs text-[var(--text-meta)]" aria-hidden="true" />
                            {activity.venue || 'Venue to be announced'}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-6 py-10 text-center">
                    <strong className="block text-base text-[var(--text)]">No recognitions recorded yet.</strong>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Awards and distinctions will appear here after the group logs a recognized or awarded academic activity.
                    </p>
                  </div>
                )
              ) : null}
            </div>


          </section>
        </div>

      </div>

      {isModalPortalMounted ? createPortal(
      <div className={`modal-shell ${isActivityModalOpen ? 'is-open' : ''}`} aria-hidden={isActivityModalOpen ? 'false' : 'true'}>
        <button className="modal-backdrop" type="button" aria-label="Close log activity modal" onClick={closeActivityModal} />
        <div
          className="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-activity-title"
          style={{ width: 'min(46rem, calc(100vw - 2rem))', overflow: 'hidden' }}
        >
          <button className="modal-close" type="button" aria-label="Close log activity modal" onClick={closeActivityModal}>
            <i className="fas fa-times" aria-hidden="true" />
          </button>
          <div className="modal-content" style={{ padding: 0 }}>
            <form onSubmit={handleSaveActivity} className="flex max-h-[calc(100vh-2rem)] flex-col">
              <div className="shrink-0 border-b border-[var(--border)] px-7 pt-7 pb-5">
                <span className="section-kicker">Academic Activities &amp; Evidence</span>
                <h3 id="log-activity-title" className="mt-1.5 text-xl font-black text-[var(--text)]">Log Academic Activity</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">Record what happened, then attach evidence you&apos;ve already uploaded from Submit Documents.</p>
              </div>

              <div className="flex-1 space-y-7 overflow-y-auto px-7 py-6">
                {activityFormError ? (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    <i className="fas fa-circle-exclamation mt-0.5" aria-hidden="true" />
                    <span>{activityFormError}</span>
                  </div>
                ) : null}

                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-meta)]">
                    <i className="fas fa-clipboard-list" aria-hidden="true" /> Activity Details
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="form-field">
                      <label htmlFor="activity-type">Activity Type</label>
                      <select
                        id="activity-type"
                        value={activityForm.activityType}
                        onChange={(event) => updateActivityForm('activityType', event.target.value)}
                      >
                        {ACTIVITY_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="activity-status">Status</label>
                      <select
                        id="activity-status"
                        value={activityForm.status}
                        onChange={(event) => updateActivityForm('status', event.target.value)}
                      >
                        {ACTIVITY_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field sm:col-span-2">
                      <label htmlFor="activity-title">Activity Title</label>
                      <input
                        id="activity-title"
                        type="text"
                        value={activityForm.activityTitle}
                        onChange={(event) => updateActivityForm('activityTitle', event.target.value)}
                        placeholder="Enter the academic activity title"
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="activity-milestone">Related Project Stage</label>
                      <select
                        id="activity-milestone"
                        value={activityForm.relatedMilestone}
                        onChange={(event) => updateActivityForm('relatedMilestone', event.target.value)}
                      >
                        <option value="">Not linked to a project stage</option>
                        {(data.milestones || []).map((milestone) => (
                          <option key={milestone.id} value={milestone.title}>{milestone.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="activity-date">Date</label>
                      <input
                        id="activity-date"
                        type="date"
                        value={activityForm.date}
                        onChange={(event) => updateActivityForm('date', event.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="activity-location">Location / Venue</label>
                      <input
                        id="activity-location"
                        type="text"
                        value={activityForm.location}
                        onChange={(event) => updateActivityForm('location', event.target.value)}
                        placeholder="University auditorium, partner site, online, etc."
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="activity-participants">Participants / Beneficiary</label>
                      <input
                        id="activity-participants"
                        type="text"
                        value={activityForm.participantsOrBeneficiary}
                        onChange={(event) => updateActivityForm('participantsOrBeneficiary', event.target.value)}
                        placeholder="Students, faculty panel, community partner, or beneficiary"
                      />
                    </div>

                    <div className="form-field sm:col-span-2">
                      <label htmlFor="activity-description">Description</label>
                      <textarea
                        id="activity-description"
                        value={activityForm.description}
                        onChange={(event) => updateActivityForm('description', event.target.value)}
                        placeholder="Summarize the activity, outcomes, and relevance to the project."
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-meta)]">
                    <i className="fas fa-paperclip" aria-hidden="true" /> Evidence
                  </h4>
                  {evidenceFiles.length ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {evidenceFiles.map((file) => {
                        const isSelected = activityForm.selectedFileIds.includes(file.id);
                        return (
                          <label
                            key={file.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${
                              isSelected
                                ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-400/30'
                                : 'border-[var(--border)] bg-[var(--surface-alt)] hover:border-blue-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleActivityEvidenceFile(file.id)}
                              className="h-4 w-4 shrink-0 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                            />
                            <i className="fas fa-file-lines shrink-0 text-[var(--text-meta)]" aria-hidden="true" />
                            <span className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">{file.fileName}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
                      Submit an Award/Recognition or Activity Evidence file from Submit Documents first, then attach it here.
                    </p>
                  )}
                </section>

                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-meta)]">
                    <i className="fas fa-sliders" aria-hidden="true" /> Additional Options
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition ${
                        activityForm.addToTimeline
                          ? 'border-blue-400 bg-blue-50/60'
                          : 'border-[var(--border)] bg-[var(--surface-alt)] hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={activityForm.addToTimeline}
                        onChange={(event) => updateActivityForm('addToTimeline', event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex flex-col gap-0.5">
                        <strong className="text-sm font-bold text-[var(--text)]">Add this activity to project timeline</strong>
                        <span className="text-xs text-[var(--muted)]">Keep the activity aligned with the related project stage record.</span>
                      </span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition ${
                        activityForm.markAsAchievement
                          ? 'border-amber-400 bg-amber-50/60'
                          : 'border-[var(--border)] bg-[var(--surface-alt)] hover:border-amber-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={activityForm.markAsAchievement}
                        onChange={(event) => updateActivityForm('markAsAchievement', event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] text-amber-600 focus:ring-amber-500"
                      />
                      <span className="flex flex-col gap-0.5">
                        <strong className="text-sm font-bold text-[var(--text)]">Mark as achievement / recognition</strong>
                        <span className="text-xs text-[var(--muted)]">Use this when the activity should also count as a recognition entry.</span>
                      </span>
                    </label>
                  </div>
                </section>
              </div>

              <div className="form-actions shrink-0 border-t border-[var(--border)] px-7 py-4">
                <button className="btn btn-secondary" type="button" onClick={closeActivityModal}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={isSavingActivity}>
                  <i className="fas fa-floppy-disk" aria-hidden="true" /> {isSavingActivity ? 'Saving...' : 'Save Academic Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>,
      document.body
      ) : null}

      <AcademicActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} onDelete={handleDeleteActivity} />
    </>
  );
}
