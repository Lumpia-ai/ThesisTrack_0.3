'use client';

import { useEffect, useMemo, useState } from 'react';

type SettingsSectionId = 'account' | 'security' | 'appearance' | 'notifications' | 'privacy' | 'workspace';
type ThemeMode = 'light' | 'dark';
const STUDENT_THEME_STORAGE_KEY = 'studentWorkspaceTheme';

const settingsSections: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'account',
    label: 'Account Settings',
    description: 'Profile identity and student access',
    icon: 'fa-user-graduate'
  },
  {
    id: 'security',
    label: 'Security Settings',
    description: 'Password and session protection',
    icon: 'fa-shield-halved'
  },
  {
    id: 'appearance',
    label: 'Appearance Settings',
    description: 'Theme and interface preference',
    icon: 'fa-palette'
  },
  {
    id: 'notifications',
    label: 'Notification Settings',
    description: 'Email and workspace alerts',
    icon: 'fa-bell'
  },
  {
    id: 'privacy',
    label: 'Privacy Settings',
    description: 'Visibility and archive access',
    icon: 'fa-user-lock'
  },
  {
    id: 'workspace',
    label: 'Workspace Preferences',
    description: 'Project tools and dashboard defaults',
    icon: 'fa-sliders'
  }
];

const passwordChecks = [
  { id: 'length', label: '8+ characters', test: (value: string) => value.length >= 8 },
  { id: 'case', label: 'Upper and lower case', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { id: 'number', label: 'Number included', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'Symbol included', test: (value: string) => /[^A-Za-z0-9]/.test(value) }
];

function ModernSwitch({
  checked,
  label,
  description,
  icon,
  onChange
}: {
  checked: boolean;
  label: string;
  description: string;
  icon: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-switch-row">
      <span className="settings-switch-icon">
        <i className={`fas ${icon}`} aria-hidden="true" />
      </span>
      <span className="settings-switch-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span className="settings-switch-control" aria-hidden="true" />
    </label>
  );
}

function PasswordField({
  id,
  label,
  value,
  visible,
  onChange,
  onToggle
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="settings-field" htmlFor={id}>
      <span>{label}</span>
      <span className="settings-password-control">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter password"
        />
        <button aria-label={visible ? 'Hide password' : 'Show password'} type="button" onClick={onToggle}>
          <i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
        </button>
      </span>
    </label>
  );
}

export function StudentSettings() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('account');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const storedTheme = window.localStorage.getItem(STUDENT_THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    if (storedTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: ''
  });
  const [toggles, setToggles] = useState({
    submissionUpdates: true,
    feedbackAlerts: true,
    scheduleReminders: false,
    profileVisibility: false,
    archiveAccess: true,
    workspaceDigest: true,
    compactWorkspace: false,
    autoSave: true
  });

  const passwordScore = useMemo(
    () => passwordChecks.filter((check) => check.test(passwords.next)).length,
    [passwords.next]
  );
  const passwordStrength = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore] || 'Weak';
  const passwordsMatch = passwords.confirm.length === 0 || passwords.next === passwords.confirm;

  useEffect(() => {
    document.documentElement.dataset.studentTheme = themeMode;
    window.localStorage.setItem(STUDENT_THEME_STORAGE_KEY, themeMode);
    window.dispatchEvent(new Event('thesistrack:student-theme-changed'));
  }, [themeMode]);

  const setToggle = (key: keyof typeof toggles, value: boolean) => {
    setToggles((current) => ({ ...current, [key]: value }));
  };

  const goToSection = (sectionId: SettingsSectionId) => {
    setActiveSection(sectionId);
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  };

  const currentSection = settingsSections.find((section) => section.id === activeSection) || settingsSections[0];

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Settings Center</span>
              </span>
            </div>
            <h1>Settings Center</h1>
            <p>Manage account security, interface preferences, privacy, and academic workspace behavior.</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        <section className="student-settings-page">
          <div className="settings-mobile-tabs">
            <label htmlFor="settings-section-select">Settings section</label>
            <select
              id="settings-section-select"
              value={activeSection}
              onChange={(event) => goToSection(event.target.value as SettingsSectionId)}
            >
              {settingsSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-shell">
            <aside className="settings-nav-panel" aria-label="Student settings navigation">
              <div className="settings-nav-header">
                <span className="settings-nav-mark">
                  <i className="fas fa-gear" aria-hidden="true" />
                </span>
                <div>
                  <strong>Settings</strong>
                  <span>Academic account controls</span>
                </div>
              </div>
              <nav className="settings-nav-list">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    className={activeSection === section.id ? 'is-active' : ''}
                    type="button"
                    onClick={() => goToSection(section.id)}
                  >
                    <i className={`fas ${section.icon}`} aria-hidden="true" />
                    <span>
                      <strong>{section.label}</strong>
                      <small>{section.description}</small>
                    </span>
                  </button>
                ))}
              </nav>
            </aside>

            <div className="settings-content">
              <section className="settings-hero-card">
                <div>
                  <span className="settings-hero-kicker">ThesisTrack Preferences</span>
                  <h2>{currentSection.label}</h2>
                  <p>{currentSection.description}. Changes preview immediately and keep the student workspace clean.</p>
                </div>
                <span className="settings-hero-icon">
                  <i className={`fas ${currentSection.icon}`} aria-hidden="true" />
                </span>
              </section>

              <section className="settings-section-card" id="account">
                <div className="settings-card-heading">
                  <span>
                    <i className="fas fa-user-graduate" aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Account Settings</h3>
                    <p>Keep your profile identity consistent across submissions, adviser reviews, and repository records.</p>
                  </div>
                </div>
                <div className="settings-summary-grid">
                  <article>
                    <small>Account type</small>
                    <strong>Student Workspace</strong>
                    <span>Academic project access</span>
                  </article>
                  <article>
                    <small>Status</small>
                    <strong>Verified</strong>
                    <span>Ready for submissions</span>
                  </article>
                  <article>
                    <small>Sync</small>
                    <strong>Institution managed</strong>
                    <span>Profile data follows campus records</span>
                  </article>
                </div>
              </section>

              <section className="settings-section-card" id="security">
                <div className="settings-card-heading">
                  <span>
                    <i className="fas fa-shield-halved" aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Security Settings</h3>
                    <p>Update your password with a stronger credential for project and repository access.</p>
                  </div>
                </div>
                <div className="settings-password-grid">
                  <PasswordField
                    id="current-password"
                    label="Current password"
                    value={passwords.current}
                    visible={showPasswords}
                    onChange={(value) => setPasswords((current) => ({ ...current, current: value }))}
                    onToggle={() => setShowPasswords((current) => !current)}
                  />
                  <PasswordField
                    id="new-password"
                    label="New password"
                    value={passwords.next}
                    visible={showPasswords}
                    onChange={(value) => setPasswords((current) => ({ ...current, next: value }))}
                    onToggle={() => setShowPasswords((current) => !current)}
                  />
                  <PasswordField
                    id="confirm-password"
                    label="Confirm password"
                    value={passwords.confirm}
                    visible={showPasswords}
                    onChange={(value) => setPasswords((current) => ({ ...current, confirm: value }))}
                    onToggle={() => setShowPasswords((current) => !current)}
                  />
                </div>
                <div className="settings-strength-panel">
                  <div className="settings-strength-head">
                    <strong>Password strength</strong>
                    <span data-strength={passwordScore}>{passwordStrength}</span>
                  </div>
                  <div className="settings-strength-meter" aria-hidden="true">
                    {passwordChecks.map((check, index) => (
                      <span key={check.id} className={index < passwordScore ? 'is-filled' : ''} />
                    ))}
                  </div>
                  <div className="settings-password-checks">
                    {passwordChecks.map((check) => (
                      <span key={check.id} className={check.test(passwords.next) ? 'is-met' : ''}>
                        <i className={`fas ${check.test(passwords.next) ? 'fa-circle-check' : 'fa-circle'}`} aria-hidden="true" />
                        {check.label}
                      </span>
                    ))}
                  </div>
                  {!passwordsMatch ? <p className="settings-field-error">New password and confirmation do not match.</p> : null}
                </div>
                <button className="settings-primary-action" type="button">
                  <i className="fas fa-key" aria-hidden="true" />
                  Update Password
                </button>
              </section>

              <section className="settings-section-card" id="appearance">
                <div className="settings-card-heading">
                  <span>
                    <i className="fas fa-palette" aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Appearance Settings</h3>
                    <p>Preview your preferred workspace theme with smooth transitions across the settings interface.</p>
                  </div>
                </div>
                <div className="settings-theme-options" role="radiogroup" aria-label="Theme preference">
                  {[
                    { id: 'light', label: 'Light Mode', icon: 'fa-sun', copy: 'Clean daytime workspace' },
                    { id: 'dark', label: 'Dark Mode', icon: 'fa-moon', copy: 'Low-glare academic review' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      className={themeMode === option.id ? 'is-selected' : ''}
                      role="radio"
                      aria-checked={themeMode === option.id}
                      type="button"
                      onClick={() => setThemeMode(option.id as ThemeMode)}
                    >
                      <i className={`fas ${option.icon}`} aria-hidden="true" />
                      <strong>{option.label}</strong>
                      <span>{option.copy}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="settings-section-card" id="notifications">
                <div className="settings-card-heading">
                  <span>
                    <i className="fas fa-bell" aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Notification Settings</h3>
                    <p>Choose which academic workflow updates should reach your email and workspace alerts.</p>
                  </div>
                </div>
                <div className="settings-toggle-list">
                  <ModernSwitch
                    checked={toggles.submissionUpdates}
                    description="Reviewed, approved, and returned submission alerts."
                    icon="fa-file-circle-check"
                    label="Submission updates"
                    onChange={(value) => setToggle('submissionUpdates', value)}
                  />
                  <ModernSwitch
                    checked={toggles.feedbackAlerts}
                    description="Adviser and panel comments on your capstone workspace."
                    icon="fa-comments"
                    label="Feedback alerts"
                    onChange={(value) => setToggle('feedbackAlerts', value)}
                  />
                  <ModernSwitch
                    checked={toggles.scheduleReminders}
                    description="Consultation, deadline, and defense reminders."
                    icon="fa-calendar-check"
                    label="Schedule reminders"
                    onChange={(value) => setToggle('scheduleReminders', value)}
                  />
                  <ModernSwitch
                    checked={toggles.workspaceDigest}
                    description="Weekly summary of pending tasks and recent activity."
                    icon="fa-envelope-open-text"
                    label="Workspace digest"
                    onChange={(value) => setToggle('workspaceDigest', value)}
                  />
                </div>
              </section>

              <section className="settings-section-card" id="privacy">
                <div className="settings-card-heading">
                  <span>
                    <i className="fas fa-user-lock" aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Privacy Settings</h3>
                    <p>Control visibility for your student profile, archive access, and academic repository references.</p>
                  </div>
                </div>
                <div className="settings-toggle-list">
                  <ModernSwitch
                    checked={toggles.profileVisibility}
                    description="Allow approved campus users to view your basic student profile."
                    icon="fa-id-card"
                    label="Show student profile"
                    onChange={(value) => setToggle('profileVisibility', value)}
                  />
                  <ModernSwitch
                    checked={toggles.archiveAccess}
                    description="Permit authorized units to reference your approved academic records."
                    icon="fa-box-archive"
                    label="Archive-ready access"
                    onChange={(value) => setToggle('archiveAccess', value)}
                  />
                </div>
              </section>

              <section className="settings-section-card" id="workspace">
                <div className="settings-card-heading">
                  <span>
                    <i className="fas fa-sliders" aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Workspace Preferences</h3>
                    <p>Fine tune the student dashboard for repeated academic project work.</p>
                  </div>
                </div>
                <div className="settings-toggle-list">
                  <ModernSwitch
                    checked={toggles.compactWorkspace}
                    description="Use denser cards and tables for scanning more project data."
                    icon="fa-table-cells-large"
                    label="Compact workspace"
                    onChange={(value) => setToggle('compactWorkspace', value)}
                  />
                  <ModernSwitch
                    checked={toggles.autoSave}
                    description="Preserve draft text while editing submissions and workspace notes."
                    icon="fa-floppy-disk"
                    label="Auto-save drafts"
                    onChange={(value) => setToggle('autoSave', value)}
                  />
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
