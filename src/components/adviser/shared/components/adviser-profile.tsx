'use client';

import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

const PROFILE_STORAGE_PREFIX = 'adviserProfileDraft';
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;
const BIO_MAX_LENGTH = 300;

// Extending the base profile for local editing
type EditableProfile = AdviserDashboardData['profile'] & {
  email?: string;
  contactNumber?: string;
  office?: string;
  accountSummary?: string;
  profileImage?: string;
  displayName?: string;
};

type ToastTone = 'success' | 'danger' | 'warning';
type ToastState = {
  tone: ToastTone;
  message: string;
} | null;

function deriveProfileDisplayName(value: string) {
  const parts = value.trim().split(' ').filter(Boolean);
  if (!parts.length) return 'Adviser';
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
    fullName: compactText(profile.fullName) || 'Adviser',
    email: compactText(profile.email),
    contactNumber: compactText(profile.contactNumber),
    office: compactText(profile.office),
    department: compactText(profile.department),
    accountSummary: compactText(profile.accountSummary),
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

export function AdviserProfile({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, basePath } = useWorkspaceMode();

  const initialProfile = useMemo(() => sanitizeProfile(data.profile as EditableProfile), [data.profile]);
  const storageKey = useMemo(() => buildProfileStorageKey(data.profile.id), [data.profile.id]);
  const defaultUpdatedLabel = 'Profile synced in the current session';

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
          email: dbUser.email || initialProfile.email,
          contactNumber: dbUser.contactNumber || initialProfile.contactNumber,
          office: dbUser.office || initialProfile.office,
          profileImage: dbUser.profileImage || initialProfile.profileImage,
          accountSummary: dbUser.accountSummary || initialProfile.accountSummary,
          displayName: dbUser.displayName || initialProfile.displayName,
          department: dbUser.department || initialProfile.department,
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
    document.body.style.overflow = isEditModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isEditModalOpen]);

  useEffect(() => {
    if (!isEditModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDraft(profile);
        setIsEditModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen, profile]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const unreadNotifications = data.profile.notificationCount;
  const advisoryCount = data.groups?.length || 0;
  const panelCount = data.panelProjects?.length || 0;
  const displayName = deriveProfileDisplayName(profile.fullName);
  const departmentBadge = deriveDepartmentBadge(profile.department || 'Department');
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

    if (!selectedFile) return;

    try {
      const imageData = await getProfileImageData(selectedFile);
      updateDraftField('profileImage', imageData);
      setToast({ tone: 'success', message: `${selectedFile.name} is ready to save as your profile photo.` });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to upload the selected image.' });
    }
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextProfile = sanitizeProfile({
      ...draft,
      updated_at: new Date().toISOString()
    });

    if (!nextProfile.fullName) {
      setToast({ tone: 'danger', message: 'Full name is required.' });
      return;
    }

    if (nextProfile.email && !nextProfile.email.includes('@')) {
      setToast({ tone: 'danger', message: 'Enter a valid email address.' });
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
          displayName: nextProfile.displayName || '',
          contactNumber: nextProfile.contactNumber || '',
          office: nextProfile.office || '',
          profileImage: nextProfile.profileImage || '',
          accountSummary: nextProfile.accountSummary || '',
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
      setToast({ tone: 'success', message: 'Profile saved and synced to the database.' });
    } catch (error) {
      // Save locally as fallback
      setProfile(nextProfile);
      setDraft(nextProfile);
      persistProfile(nextProfile);
      setUpdatedLabel(formatLastUpdatedLabel(new Date()));
      setIsEditModalOpen(false);
      setToast({ tone: 'warning', message: 'Profile saved locally. Database sync will retry later.' });
    } finally {
      setIsSaving(false);
    }
  };

  const toastIcon = toast?.tone === 'success' ? 'fa-circle-check' : toast?.tone === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation';

  return (
    <>
      <AdviserPageHeader
        title="User Profile"
        description="Manage account settings and academic qualifications."
        actions={
          <AdviserShellActions
            basePath={basePath}
            fullName={profile.fullName}
            notificationCount={profile.notificationCount}
            workspaceMode={workspaceMode}
            onSwitchWorkspace={switchWorkspace}
          />
        }
      />

      <section className="adviser-profile-page">
        <div className="profile-grid">
              <article className="relative bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group">
                {/* Cover Image */}
                <div className="h-36 w-full bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  
                  {/* Quick action floating on cover */}
                  <button 
                    onClick={openEditModal}
                    className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 p-2.5 rounded-full transition-all flex items-center justify-center shadow-lg hover:scale-105"
                    title="Edit Profile"
                  >
                    <i className="fas fa-pen-to-square"></i>
                  </button>
                </div>

                {/* Avatar */}
                <div className="relative -mt-16 flex justify-center z-10 px-6">
                  <div className="relative group/avatar">
                    <div className="h-32 w-32 rounded-full border-[5px] border-white shadow-xl flex items-center justify-center bg-white overflow-hidden relative">
                      {profile.profileImage ? (
                        <img className="h-full w-full object-cover transition-transform duration-500 group-hover/avatar:scale-105" src={profile.profileImage} alt={profile.fullName} />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400">
                           <i className="fas fa-user-tie text-5xl"></i>
                        </div>
                      )}
                    </div>
                    
                    {/* Online/Status Badge */}
                    <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-[3px] border-white bg-emerald-500 shadow-sm" title="Active"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 pt-5 text-center">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{profile.displayName || displayName}</h2>
                  
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold tracking-wide border border-indigo-100/50">
                      <i className="fas fa-building-columns opacity-70"></i> {departmentBadge}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-bold tracking-wide border border-slate-200/50">
                      <i className="fas fa-chalkboard-user opacity-70"></i> Faculty Adviser
                    </span>
                  </div>

                  {profile.office && (
                    <p className="mt-4 text-sm font-medium text-slate-500 flex items-center justify-center gap-2 bg-slate-50/50 py-2 rounded-lg border border-slate-100/50">
                      <i className="fas fa-location-dot text-indigo-400"></i> {profile.office}
                    </p>
                  )}

                  {/* Stats Grid */}
                  <div className="mt-6 grid grid-cols-3 gap-4 border-t border-b border-slate-100 py-5 bg-gradient-to-b from-transparent to-slate-50/30">
                    <div className="flex flex-col transition-transform hover:-translate-y-1">
                      <span className="text-2xl font-black text-indigo-600 tracking-tight">{advisoryCount}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Advisory</span>
                    </div>
                    <div className="flex flex-col border-l border-r border-slate-100 transition-transform hover:-translate-y-1">
                      <span className="text-2xl font-black text-indigo-600 tracking-tight">{panelCount}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Panels</span>
                    </div>
                    <div className="flex flex-col transition-transform hover:-translate-y-1">
                      <span className="text-2xl font-black text-amber-500 tracking-tight">{unreadNotifications}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Alerts</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={openEditModal}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-all hover:-translate-y-0.5 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-user-edit"></i> Edit Details
                    </button>
                    <Link 
                      href={`${basePath}/dashboard`}
                      prefetch={false}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-chart-line"></i> Dashboard
                    </Link>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 py-2 rounded-lg">
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
                        <i className="fas fa-envelope" aria-hidden="true" /> Email
                      </span>
                      <span className="info-value">{profile.email || 'Not provided'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">
                        <i className="fas fa-phone" aria-hidden="true" /> Contact Number
                      </span>
                      <span className="info-value">{profile.contactNumber || 'Not provided'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">
                        <i className="fas fa-building" aria-hidden="true" /> Office
                      </span>
                      <span className="info-value">{profile.office || 'Not set'}</span>
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
                      <i className="fas fa-chalkboard-user" aria-hidden="true" /> Faculty
                    </span>
                  </div>
                  <div className="info-body">
                    <div className="info-row">
                      <span className="info-label">
                        <i className="fas fa-building-columns" aria-hidden="true" /> Department
                      </span>
                      <span className="info-value">{profile.department || 'Not set'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">
                        <i className="fas fa-user-tag" aria-hidden="true" /> Role
                      </span>
                      <span className="info-value">{profile.roleLabel || 'Faculty'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">
                        <i className="fas fa-circle-check" aria-hidden="true" /> Account Status
                      </span>
                      <span className="info-value capitalize">{profile.status}</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
      </section>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Edit Profile</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Update your adviser profile</h3>
                <p className="text-sm text-slate-500 mt-1">Save changes to your personal details and profile photo.</p>
              </div>
              <button 
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100" 
                type="button" 
                onClick={closeEditModal}
              >
                <i className="fas fa-xmark fa-lg" />
              </button>
            </div>

            <form className="flex-1 overflow-y-auto" onSubmit={handleSaveProfile}>
              <div className="p-6 space-y-8">
                <section>
                  <div className="flex items-start gap-4 mb-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <i className="fas fa-camera" />
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">Profile photo</h4>
                      <p className="text-sm text-slate-500">Upload a clear image for your workspace identity.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm ml-14">
                    <div className="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md bg-slate-100 items-center justify-center">
                      {draft.profileImage ? (
                        <img className="h-full w-full object-cover" src={draft.profileImage} alt={draft.fullName} />
                      ) : (
                        <i className="fas fa-user-tie text-4xl text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <div>
                        <strong className="block text-slate-800 text-sm">{draft.profileImage ? 'Profile photo is ready' : 'No photo uploaded yet'}</strong>
                        <span className="text-xs text-slate-500">JPG, PNG, or WEBP up to 2MB.</span>
                      </div>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-3 items-center">
                        <label className="btn !border !border-slate-300 !bg-white !text-slate-700 hover:!bg-blue-50 hover:!text-blue-700 hover:!border-blue-300 cursor-pointer !m-0 !px-4 !py-2 transition-all !shadow-sm rounded-lg text-sm font-medium">
                          <i className="fas fa-upload mr-1.5" /> {draft.profileImage ? 'Change Photo' : 'Choose Photo'}
                          <input type="file" className="hidden" accept="image/*" onChange={handleDraftPhotoChange} />
                        </label>
                        {draft.profileImage && (
                          <button className="btn !border !border-transparent hover:!border-red-200 !bg-transparent !m-0 !px-4 !py-2 !text-red-600 hover:!bg-red-50 transition-all rounded-lg text-sm font-medium" type="button" onClick={() => updateDraftField('profileImage', '')}>
                            <i className="fas fa-trash mr-1.5" /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-start gap-4 mb-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <i className="fas fa-address-card" />
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">Personal details</h4>
                      <p className="text-sm text-slate-500">Edit your visible contact information.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 ml-14">
                    <div className="form-group !mb-0 md:col-span-2">
                      <label htmlFor="profile-display-name" className="!mb-1.5 !text-sm !font-semibold !text-slate-700">Display Name</label>
                      <input id="profile-display-name" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.displayName || ''} onChange={(event) => updateDraftField('displayName', event.target.value)} placeholder="e.g. Dr. Cruz" />
                      <p className="text-xs text-slate-400 mt-1.5">This name will be displayed on your profile card.</p>
                    </div>
                    <div className="form-group !mb-0 md:col-span-2">
                      <label htmlFor="profile-full-name" className="!mb-1.5 !text-sm !font-semibold !text-slate-700">Full Name</label>
                      <input id="profile-full-name" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.fullName} onChange={(event) => updateDraftField('fullName', event.target.value)} />
                    </div>
                    <div className="form-group !mb-0">
                      <label htmlFor="profile-email" className="!mb-1.5 !text-sm !font-semibold !text-slate-700">Email</label>
                      <input id="profile-email" type="email" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 shadow-sm cursor-not-allowed" value={draft.email || ''} readOnly title="Your email address is set during registration." />
                      <p className="text-xs text-slate-400 mt-1.5"><i className="fas fa-circle-info mr-1"></i> Your email address is set during registration.</p>
                    </div>
                    <div className="form-group !mb-0">
                      <label htmlFor="profile-contact" className="!mb-1.5 !text-sm !font-semibold !text-slate-700">Contact Number</label>
                      <input id="profile-contact" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.contactNumber || ''} onChange={(event) => updateDraftField('contactNumber', event.target.value)} />
                    </div>
                    <div className="form-group !mb-0">
                      <label htmlFor="profile-office" className="!mb-1.5 !text-sm !font-semibold !text-slate-700">Office</label>
                      <input id="profile-office" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={draft.office || ''} onChange={(event) => updateDraftField('office', event.target.value)} />
                    </div>
                    <div className="form-group !mb-0 md:col-span-2">
                      <label htmlFor="profile-summary" className="!mb-1.5 !text-sm !font-semibold !text-slate-700">Account Summary</label>
                      <textarea
                        id="profile-summary"
                        rows={3}
                        maxLength={BIO_MAX_LENGTH}
                        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={draft.accountSummary || ''}
                        onChange={(event) => updateDraftField('accountSummary', event.target.value.slice(0, BIO_MAX_LENGTH))}
                        placeholder="Write a short summary about your academic goals..."
                      />
                      <span className="mt-1.5 block text-right text-xs font-semibold text-slate-400">{(draft.accountSummary || '').length}/{BIO_MAX_LENGTH}</span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 mt-4">
                <button className="btn !border !border-slate-300 !bg-white !text-slate-700 hover:!bg-slate-50 !shadow-sm !px-5" type="button" onClick={closeEditModal}>
                  Cancel
                </button>
                <button className="btn btn-primary !px-6" type="submit" disabled={!hasDraftChanges || isSaving}>
                  <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} mr-2`} /> {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[2100] flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${toast.tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : toast.tone === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <i className={`fas ${toastIcon} text-lg`} />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
