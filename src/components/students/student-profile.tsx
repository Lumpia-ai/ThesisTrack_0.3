'use client';

import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';

const PROFILE_STORAGE_PREFIX = 'studentProfileDraft';
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

type EditableProfile = StudentDashboardData['profile'] & { displayName?: string };
type ToastTone = 'success' | 'danger' | 'warning';
type ToastState = {
  tone: ToastTone;
  message: string;
} | null;

function deriveProfileDisplayName(value: string) {
  const parts = value.trim().split(' ').filter(Boolean);
  if (!parts.length) return 'Student';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function deriveDepartmentBadge(value: string) {
  const normalized = value.trim();
  if (!normalized) return 'Department';
  const match = normalized.match(/\(([^)]+)\)/);
  if (match) return `${match[1].trim()} Department`;
  if (/department|dept/i.test(normalized)) return normalized;
  if (normalized.length <= 4) return `${normalized.toUpperCase()} Department`;
  const acronym = normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return acronym ? `${acronym} Department` : normalized;
}

function extractYearMetric(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/\d+/);
  return match ? match[0] : (normalized || '-');
}

function formatProfileDateLabel(value?: string) {
  if (!value) return 'Not provided';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function compactText(value?: string) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildProfileStorageKey(profileId: string) {
  return `${PROFILE_STORAGE_PREFIX}:${profileId}`;
}

function formatLastUpdatedLabel(date = new Date()) {
  return `Last updated ${date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })}`;
}

function sanitizeProfile(profile: EditableProfile): EditableProfile {
  return {
    ...profile,
    fullName: compactText(profile.fullName) || 'Student',
    email: compactText(profile.email),
    contactNumber: compactText(profile.contactNumber),
    address: compactText(profile.address),
    program: compactText(profile.program),
    department: compactText(profile.department),
    yearLevel: compactText(profile.yearLevel),
    section: compactText(profile.section),
    adviser: compactText(profile.adviser),
    accountSummary: compactText(profile.accountSummary),
    birthDate: profile.birthDate || '',
    profileImage: profile.profileImage || '',
    displayName: compactText(profile.displayName) || deriveProfileDisplayName(profile.fullName)
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

async function getProfileImageData(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Select a valid image file.');
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error('Select an image smaller than 2 MB.');
  }

  return readFileAsDataUrl(file);
}

export function StudentProfile({ data }: { data: StudentDashboardData }) {
  const initialProfile = useMemo(() => sanitizeProfile(data.profile), [data.profile]);
  const profileNotification = useMemo(
    () => data.notifications.find((item) => item.type === 'profile') || null,
    [data.notifications]
  );
  const storageKey = useMemo(() => buildProfileStorageKey(data.profile.id), [data.profile.id]);
  const defaultUpdatedLabel = profileNotification
    ? `Last updated ${profileNotification.dateLabel}`
    : 'Profile synced in the current session';

  const [profile, setProfile] = useState<EditableProfile>(initialProfile);
  const [draft, setDraft] = useState<EditableProfile>(initialProfile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState(defaultUpdatedLabel);
  const [toast, setToast] = useState<ToastState>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load profile from database on mount
  useEffect(() => {
    let cancelled = false;

    async function loadFromDatabase() {
      try {
        const response = await fetch('/api/profile', { credentials: 'same-origin' });
        if (!response.ok) return;

        const result = await response.json();
        if (cancelled || !result?.success || !result.user) return;

        const dbUser = result.user;
        const merged = sanitizeProfile({
          ...initialProfile,
          fullName: dbUser.name || initialProfile.fullName,
          studentId: dbUser.studentId || initialProfile.studentId,
          email: dbUser.email || initialProfile.email,
          contactNumber: dbUser.contactNumber || initialProfile.contactNumber,
          address: dbUser.address || initialProfile.address,
          birthDate: dbUser.birthDate || initialProfile.birthDate,
          profileImage: dbUser.profileImage || initialProfile.profileImage,
          section: dbUser.section || initialProfile.section,
          accountSummary: dbUser.accountSummary || initialProfile.accountSummary,
          displayName: dbUser.displayName || initialProfile.displayName,
          department: dbUser.department || initialProfile.department,
          yearLevel: dbUser.yearLevel || initialProfile.yearLevel,
        });

        setProfile(merged);
        setDraft(merged);
        setUpdatedLabel('Profile loaded from server');
      } catch {
        // Fall back to localStorage
        if (typeof window === 'undefined') return;
        const storedProfile = window.localStorage.getItem(storageKey);
        if (!storedProfile) return;

        try {
          const parsed = JSON.parse(storedProfile) as Partial<EditableProfile>;
          const restoredProfile = sanitizeProfile({ ...initialProfile, ...parsed });
          if (!cancelled) {
            setProfile(restoredProfile);
            setDraft(restoredProfile);
            setUpdatedLabel('Profile restored from saved browser data');
          }
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
    }

    loadFromDatabase();
    return () => { cancelled = true; };
  }, [initialProfile, storageKey]);

  useEffect(() => {
    document.body.classList.toggle('is-modal-open', isEditModalOpen);
    return () => document.body.classList.remove('is-modal-open');
  }, [isEditModalOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const unreadNotifications = data.notifications.filter((item) => !item.read).length;
  const totalUploads = data.documents.length;
  const displayName = deriveProfileDisplayName(profile.fullName);
  const departmentBadge = deriveDepartmentBadge(profile.department || 'Department');
  const yearMetric = extractYearMetric(profile.yearLevel || '1');
  const hasDraftChanges = JSON.stringify(profile) !== JSON.stringify(draft);

  const persistProfile = (nextProfile: EditableProfile) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(nextProfile));
  };

  const updateDraftField = <Key extends keyof EditableProfile>(field: Key, value: EditableProfile[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const openEditModal = () => {
    setDraft(profile);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setDraft(profile);
    setIsEditModalOpen(false);
  };

  const handleDraftPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    try {
      const imageData = await getProfileImageData(selectedFile);
      updateDraftField('profileImage', imageData);
      setToast({
        tone: 'success',
        message: `${selectedFile.name} is ready to save as your profile photo.`
      });
    } catch (error) {
      setToast({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Unable to upload the selected image.'
      });
    }
  };

  const handleRemovePhoto = () => {
    if (!profile.profileImage) {
      setToast({
        tone: 'warning',
        message: 'No profile photo is currently set.'
      });
      return;
    }

    const nextProfile = sanitizeProfile({
      ...profile,
      profileImage: '',
      updated_at: new Date().toISOString()
    });

    setProfile(nextProfile);
    setDraft(nextProfile);
    persistProfile(nextProfile);
    setUpdatedLabel(formatLastUpdatedLabel(new Date()));
    setToast({
      tone: 'warning',
      message: 'Profile photo removed.'
    });

    // Sync photo removal to database
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ profileImage: '' })
    }).catch(() => {});
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextProfile = sanitizeProfile({
      ...draft,
      updated_at: new Date().toISOString()
    });

    if (!nextProfile.fullName) {
      setToast({
        tone: 'danger',
        message: 'Full name is required.'
      });
      return;
    }

    if (!nextProfile.email || !nextProfile.email.includes('@')) {
      setToast({
        tone: 'danger',
        message: 'Enter a valid email address.'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Sync to database
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: nextProfile.fullName || '',
          email: nextProfile.email || '',
          displayName: nextProfile.displayName || '',
          contactNumber: nextProfile.contactNumber || '',
          address: nextProfile.address || '',
          birthDate: nextProfile.birthDate || '',
          profileImage: nextProfile.profileImage || '',
          section: nextProfile.section || '',
          accountSummary: nextProfile.accountSummary || '',
          yearLevel: nextProfile.yearLevel || ''
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to save profile.');
      }

      setProfile(nextProfile);
      setDraft(nextProfile);
      persistProfile(nextProfile);
      setUpdatedLabel(formatLastUpdatedLabel(new Date()));
      setIsEditModalOpen(false);
      setToast({
        tone: 'success',
        message: 'Profile saved and synced to the database.'
      });
    } catch (error) {
      // Save locally as fallback
      setProfile(nextProfile);
      setDraft(nextProfile);
      persistProfile(nextProfile);
      setUpdatedLabel(formatLastUpdatedLabel(new Date()));
      setIsEditModalOpen(false);
      setToast({
        tone: 'warning',
        message: 'Profile saved locally. Database sync will retry later.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toastIcon =
    toast?.tone === 'success'
      ? 'fa-circle-check'
      : toast?.tone === 'warning'
        ? 'fa-triangle-exclamation'
        : 'fa-circle-exclamation';

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Student Profile</span>
              </span>
            </div>
            <h1>Student Profile</h1>
            <p>Manage your individual details, group membership, and workspace settings.</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        <section className="student-profile-page">
          <div className="profile-grid">
            <article className="relative bg-[var(--surface)] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--border)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group">
              {/* Cover Image */}
              <div className="h-36 w-full bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                
                {/* Quick action floating on cover */}
                <button 
                  onClick={openEditModal}
                  className="absolute top-4 right-4 bg-[var(--surface)] hover:bg-[var(--surface)] backdrop-blur-md text-white border border-[var(--border)] p-2.5 rounded-full transition-all flex items-center justify-center shadow-lg hover:scale-105"
                  title="Edit Profile"
                >
                  <i className="fas fa-pen-to-square"></i>
                </button>
              </div>

              {/* Avatar */}
              <div className="relative -mt-16 flex justify-center z-10 px-6">
                <div className="relative group/avatar">
                  <div className="h-32 w-32 rounded-full border-[5px] border-[var(--border)] shadow-xl flex items-center justify-center bg-[var(--surface)] overflow-hidden relative">
                    {profile.profileImage ? (
                      <img className="h-full w-full object-cover transition-transform duration-500 group-hover/avatar:scale-105" src={profile.profileImage} alt={profile.fullName} />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[var(--text-meta)]">
                         <i className="fas fa-user-circle text-5xl"></i>
                      </div>
                    )}
                  </div>
                  
                  {/* Online/Status Badge */}
                  <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-[3px] border-[var(--border)] bg-emerald-500 shadow-sm" title="Active"></div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 pt-5 text-center">
                <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">{profile.displayName || displayName}</h2>
                
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wide border border-blue-100/50">
                    <i className="fas fa-building-columns opacity-70"></i> {departmentBadge}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-alt)] text-[var(--muted)] text-xs font-bold tracking-wide border border-[var(--border)]">
                    <i className="fas fa-user-graduate opacity-70"></i> {profile.yearLevel || 'Student'}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-[var(--muted)] flex items-center justify-center gap-2 bg-[var(--surface-alt)] py-2 rounded-lg border border-[var(--border)]/50">
                  <i className="fas fa-users text-blue-400"></i> Section {profile.section || 'Unassigned'}
                </p>

                {/* Stats Grid */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-b border-[var(--border)] py-5 bg-gradient-to-b from-transparent to-slate-50/30">
                  <div className="flex flex-col transition-transform hover:-translate-y-1">
                    <span className="text-2xl font-black text-blue-600 tracking-tight">{yearMetric}</span>
                    <span className="text-[10px] font-bold text-[var(--text-meta)] uppercase tracking-widest mt-1">Year</span>
                  </div>
                  <div className="flex flex-col border-l border-r border-[var(--border)] transition-transform hover:-translate-y-1">
                    <span className="text-2xl font-black text-blue-600 tracking-tight">{totalUploads}</span>
                    <span className="text-[10px] font-bold text-[var(--text-meta)] uppercase tracking-widest mt-1">Uploads</span>
                  </div>
                  <div className="flex flex-col transition-transform hover:-translate-y-1">
                    <span className="text-2xl font-black text-amber-500 tracking-tight">{unreadNotifications}</span>
                    <span className="text-[10px] font-bold text-[var(--text-meta)] uppercase tracking-widest mt-1">Alerts</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={openEditModal}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all hover:-translate-y-0.5 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-user-edit"></i> Edit Details
                  </button>
                  <Link prefetch={false} 
                    href="/students/project-overview"
                    className="flex-1 bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)] shadow-sm transition-all hover:-translate-y-0.5 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-folder-open"></i> Open Project
                  </Link>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-meta)] bg-[var(--surface-alt)] py-2 rounded-lg">
                  <i className="fas fa-clock"></i>
                  <span>{updatedLabel}</span>
                </div>
              </div>
            </article>

            <div className="profile-content-column">
              <article className="info-card">
                <div className="info-header">
                  <h3>
                    <i className="fas fa-user-circle" aria-hidden="true" /> Personal Information
                  </h3>
                </div>
                <div className="info-body">
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-user" aria-hidden="true" /> Full Name
                    </span>
                    <span className="info-value">{profile.fullName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-id-card" aria-hidden="true" /> Student ID
                    </span>
                    <span className="info-value">{profile.studentId}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-envelope" aria-hidden="true" /> Email
                    </span>
                    <span className="info-value">{profile.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-phone" aria-hidden="true" /> Contact Number
                    </span>
                    <span className="info-value">{profile.contactNumber || 'Not provided'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-cake-candles" aria-hidden="true" /> Birth Date
                    </span>
                    <span className="info-value">{formatProfileDateLabel(profile.birthDate)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-location-dot" aria-hidden="true" /> Address
                    </span>
                    <span className="info-value">{compactText(profile.address) || 'No address recorded.'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-note-sticky" aria-hidden="true" /> Profile Summary
                    </span>
                    <span className="info-value">{profile.accountSummary || 'No summary recorded.'}</span>
                  </div>
                </div>
              </article>

              <article className="info-card">
                <div className="info-header">
                  <h3>
                    <i className="fas fa-graduation-cap" aria-hidden="true" /> Academic Information
                  </h3>
                  <span className="info-badge">
                    <i className="fas fa-user-graduate" aria-hidden="true" /> Student
                  </span>
                </div>
                <div className="info-body">
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-book-open" aria-hidden="true" /> Program
                    </span>
                    <span className="info-value">{profile.program || 'Not set'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-building-columns" aria-hidden="true" /> Department
                    </span>
                    <span className="info-value">{profile.department || 'Not set'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-layer-group" aria-hidden="true" /> Year Level
                    </span>
                    <span className="info-value">{profile.yearLevel || 'Not set'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-users" aria-hidden="true" /> Section
                    </span>
                    <span className="info-value">{profile.section || 'Unassigned'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-user-tie" aria-hidden="true" /> Assigned Adviser
                    </span>
                    <span className="info-value">{profile.adviser || 'Not assigned'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">
                      <i className="fas fa-circle-check" aria-hidden="true" /> Account Status
                    </span>
                    <span className="info-value">Active Student Account</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>

      <div className={`modal-shell ${isEditModalOpen ? 'is-open' : ''}`} aria-hidden={isEditModalOpen ? 'false' : 'true'}>
        <button className="modal-backdrop" type="button" aria-label="Close profile editor" onClick={closeEditModal} />
        {isEditModalOpen ? (
          <div className="modal-card student-profile-modal-panel" role="dialog" aria-modal="true" aria-labelledby="student-profile-edit-title">
            <div className="modal-content">
              <div className="student-profile-modal-head !pr-6">
                <div className="student-profile-modal-copy">
                  <span className="page-kicker">Edit Profile</span>
                  <h3 id="student-profile-edit-title">Update your student profile</h3>
                  <p>Save changes to your personal details and profile photo. Updates stay stored in this browser for your student workspace.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="student-profile-modal-badges !mt-0 !flex !flex-col !items-end !gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap shadow-sm">
                      <i className="fas fa-user text-indigo-500" aria-hidden="true" /> {profile.groupRole}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] ring-1 ring-inset ring-slate-600/10 whitespace-nowrap shadow-sm">
                      <i className="fas fa-id-card text-[var(--text-meta)]" aria-hidden="true" /> {profile.studentId}
                    </span>
                  </div>
                  <button 
                    className="text-[var(--text-meta)] hover:text-[var(--muted)] transition-colors p-1 -mt-1 -mr-2" 
                    type="button" 
                    aria-label="Close profile editor" 
                    onClick={closeEditModal}
                  >
                    <i className="fas fa-xmark fa-lg" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <form className="student-profile-modal-form" onSubmit={handleSaveProfile}>
                <section className="student-profile-modal-section">
                  <div className="student-profile-modal-section-head">
                    <span className="student-profile-modal-icon">
                      <i className="fas fa-camera" aria-hidden="true" />
                    </span>
                    <div>
                      <h4>Profile photo</h4>
                      <p>Upload a clear image for your student workspace identity card.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm mt-4">
                    <div className="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[var(--border)] shadow-md bg-[var(--surface-alt)] items-center justify-center">
                      {draft.profileImage ? (
                        <img className="h-full w-full object-cover" src={draft.profileImage} alt={draft.fullName} />
                      ) : (
                        <i className="fas fa-user text-4xl text-[var(--muted)]" aria-hidden="true" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <div>
                        <strong className="block text-[var(--text)] text-sm">{draft.profileImage ? 'Profile photo is ready' : 'No photo uploaded yet'}</strong>
                        <span className="text-xs text-[var(--muted)]">JPG, PNG, or WEBP up to 2MB.</span>
                      </div>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-3 items-center">
                        <label className="btn !border !border-[var(--border-strong)] !bg-[var(--surface)] !text-[var(--text)] hover:!bg-blue-50 hover:!text-blue-700 hover:!border-blue-300 cursor-pointer !m-0 !px-4 !py-2 transition-all !shadow-sm rounded-lg text-sm font-medium">
                          <i className="fas fa-upload mr-1.5" aria-hidden="true" /> {draft.profileImage ? 'Change Photo' : 'Choose Photo'}
                          <input type="file" className="hidden" accept="image/*" onChange={handleDraftPhotoChange} />
                        </label>
                        {draft.profileImage ? (
                          <button className="btn !border !border-transparent hover:!border-red-200 !bg-transparent !m-0 !px-4 !py-2 !text-red-600 hover:!bg-red-50 transition-all rounded-lg text-sm font-medium" type="button" onClick={() => updateDraftField('profileImage', '')}>
                            <i className="fas fa-trash mr-1.5" aria-hidden="true" /> Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>


                <section className="student-profile-modal-section">
                  <div className="student-profile-modal-section-head">
                    <span className="student-profile-modal-icon">
                      <i className="fas fa-address-card" aria-hidden="true" />
                    </span>
                    <div>
                      <h4>Personal details</h4>
                      <p>Edit your visible student information and contact details.</p>
                    </div>
                  </div>

                  <div className="form-grid student-profile-modal-grid !gap-y-5 !gap-x-6">
                  <div className="form-field full">
                    <label htmlFor="student-profile-display-name" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Display Name</label>
                    <input id="student-profile-display-name" className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.displayName || ''} onChange={(event) => updateDraftField('displayName', event.target.value)} placeholder="e.g. Full Name" />
                    <p className="text-xs text-[var(--text-meta)] mt-1.5">This name will be displayed on your profile card.</p>
                  </div>
                  <div className="form-field full">
                    <label htmlFor="student-profile-full-name" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Full Name</label>
                    <input id="student-profile-full-name" className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.fullName} onChange={(event) => updateDraftField('fullName', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="student-profile-email" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Email</label>
                    <input id="student-profile-email" type="email" className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.email || ''} onChange={(event) => updateDraftField('email', event.target.value)} title="Your academic email address." />
                    <p className="text-xs text-[var(--text-meta)] mt-1.5"><i className="fas fa-circle-info mr-1"></i> Your email address is set during registration.</p>
                  </div>
                  <div className="form-field">
                    <label htmlFor="student-profile-contact" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Contact Number</label>
                    <input id="student-profile-contact" className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.contactNumber || ''} onChange={(event) => updateDraftField('contactNumber', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="student-profile-birth-date" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Birth Date</label>
                    <input id="student-profile-birth-date" type="date" className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.birthDate || ''} onChange={(event) => updateDraftField('birthDate', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="student-profile-year-level" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Year Level</label>
                    <select id="student-profile-year-level" className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.yearLevel || ''} onChange={(event) => updateDraftField('yearLevel', event.target.value)}>
                      <option value="">Select Year Level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                      <option value="Irregular">Irregular</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="student-profile-section" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Section</label>
                    <input id="student-profile-section" className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.section || ''} onChange={(event) => updateDraftField('section', event.target.value)} placeholder="e.g. A, B, C, or Block 1" />
                  </div>
                  <div className="form-field full mt-2">
                    <label htmlFor="student-profile-address" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Address</label>
                    <textarea id="student-profile-address" rows={3} className="w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.address || ''} onChange={(event) => updateDraftField('address', event.target.value)} />
                  </div>
                  <div className="form-field full mt-2">
                    <label htmlFor="student-profile-summary" className="!mb-1.5 !text-sm !font-semibold !text-[var(--text)]">Account Summary</label>
                    <textarea id="student-profile-summary" rows={3} className="w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.accountSummary || ''} onChange={(event) => updateDraftField('accountSummary', event.target.value)} placeholder="Write a short summary about your academic goals..." />
                  </div>
                </div>
              </section>
                <div className="form-actions !flex !items-center !justify-end !gap-3 !border-t !border-[var(--border)] !p-6 !bg-[var(--surface-alt)]">
                  <button className="btn !border !border-[var(--border-strong)] !bg-[var(--surface)] !text-[var(--text)] hover:!bg-[var(--surface-alt)] !shadow-sm !px-5" type="button" onClick={closeEditModal}>
                    Cancel
                  </button>
                  <button className="btn btn-primary !px-6" type="submit" disabled={!hasDraftChanges || isSaving}>
                    <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} aria-hidden="true" /> {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div className="toast-stack" aria-live="polite">
          <div className={`toast-item is-${toast.tone}`}>
            <i className={`fas ${toastIcon}`} aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
