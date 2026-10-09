// Shared between Document Submissions (where an activity is logged, alongside
// its evidence file) and Project Overview (which only displays the resulting
// log) — kept in one place so the two pages can't drift on the shape of an
// activity or the option lists offered when creating one.

export type ApiAcademicActivityFile = {
  id: string;
  fileName: string;
  fileType: string;
  size: number | null;
  documentCategory: string;
  url: string;
  previewUrl: string;
};

export type ApiAcademicActivity = {
  id: string;
  projectId: string;
  activityType: string;
  eventName: string;
  eventDate: string | null;
  venue: string | null;
  description: string | null;
  scope: string;
  achievement: string | null;
  status: string;
  relatedMilestone: string | null;
  participantsOrBeneficiary: string | null;
  addToTimeline: boolean;
  markAsAchievement: boolean;
  createdAt: string;
  createdByName: string | null;
  files: ApiAcademicActivityFile[];
};

export type AcademicActivityFormState = {
  activityType: string;
  activityTitle: string;
  relatedMilestone: string;
  date: string;
  location: string;
  description: string;
  status: string;
  participantsOrBeneficiary: string;
  addToTimeline: boolean;
  markAsAchievement: boolean;
  selectedFileIds: string[];
};

export const ACTIVITY_TYPE_OPTIONS = [
  'Presentation',
  'Research Colloquium',
  'Project Defense',
  'Academic Exhibit',
  'Workshop',
  'Seminar',
  'Community Extension'
];

export const ACTIVITY_STATUS_OPTIONS = ['Planned', 'Ongoing', 'Completed', 'Submitted', 'Recognized'];

export function createAcademicActivityForm(defaultMilestone: string): AcademicActivityFormState {
  return {
    activityType: 'Presentation',
    activityTitle: '',
    relatedMilestone: defaultMilestone,
    date: '',
    location: '',
    description: '',
    status: 'Completed',
    participantsOrBeneficiary: '',
    addToTimeline: true,
    markAsAchievement: false,
    selectedFileIds: []
  };
}

// The form's date input is a plain YYYY-MM-DD string, but the server returns
// a full ISO datetime — this handles that shape rather than splitting it like
// a plain date-only formatter would.
export function formatIsoDateLabel(value?: string | null) {
  if (!value) {
    return 'Date to be confirmed';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Date to be confirmed';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(parsed);
}

export function isImageFileByName(fileName: string, fileType?: string) {
  return Boolean(fileType?.startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
}

export async function saveAcademicActivity(projectId: string, form: AcademicActivityFormState) {
  const response = await fetch('/api/academic-activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      activityType: form.activityType,
      eventName: form.activityTitle.trim(),
      eventDate: form.date || null,
      venue: form.location.trim(),
      description: form.description.trim(),
      status: form.status,
      relatedMilestone: form.relatedMilestone.trim(),
      participantsOrBeneficiary: form.participantsOrBeneficiary.trim(),
      addToTimeline: form.addToTimeline,
      markAsAchievement: form.markAsAchievement,
      fileIds: form.selectedFileIds
    })
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Unable to save the academic activity.');
  }

  return payload?.activity as ApiAcademicActivity | undefined;
}

export async function deleteAcademicActivity(activityId: string) {
  const response = await fetch(`/api/academic-activities/${activityId}`, { method: 'DELETE' });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Unable to remove this activity.');
  }
}

export async function fetchAcademicActivities(projectId: string): Promise<ApiAcademicActivity[]> {
  if (!projectId) {
    return [];
  }

  const response = await fetch(`/api/academic-activities?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Unable to load academic activities.');
  }

  return payload?.activities || [];
}
