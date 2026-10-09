'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent
} from 'react';
import { useSearchParams } from 'next/navigation';
import {
  clearBrandingPreview,
  publishBrandingPreview,
  publishBrandingUpdate,
  useBranding
} from '@/components/branding/branding-provider';
import {
  DEFAULT_BRANDING,
  NAMED_COLORS,
  THEME_PRESETS,
  adjustColor,
  cloneBranding,
  createBrandingFromPreset,
  generateThemeFromPrimary,
  getContrastRatio,
  getContrastStatus,
  getHslInputValue,
  getRgbInputValue,
  mixColors,
  normalizeHexColor,
  parseColorValue,
  sanitizeBrandingSettings,
  type BrandingAuthSettings,
  type BrandingAssets,
  type BrandingColorKey,
  type BrandingDepartmentSettings,
  type BrandingLandingFeature,
  type BrandingLandingSettings,
  type BrandingLandingStatistic,
  type BrandingNavigationLink,
  type BrandingNavigationSettings,
  type BrandingShellSettings,
  type BrandingSettings
} from '@/lib/branding';
import { SystemAdminShell } from '@/components/system-admin/system-admin-shell';

type BrandingApiResponse = {
  success?: boolean;
  message?: string;
  branding?: unknown;
};

type BannerState = {
  tone: 'success' | 'warning' | 'info';
  title: string;
  body: string;
};

type BrandingAssetKey = keyof BrandingAssets;
type BrandingPreviewMode = 'dashboard' | 'login' | 'landing' | 'portal' | 'programs';
type BrandingSectionKey = 'overview' | 'logos' | 'colors' | 'auth' | 'landing' | 'programs' | 'backup';

const COLOR_FIELDS: Array<{
  key: BrandingColorKey;
  label: string;
  description: string;
}> = [
  { key: 'primary', label: 'Primary Color', description: 'Main actions, active states, and key emphasis.' },
  { key: 'secondary', label: 'Secondary Color', description: 'Supporting actions and secondary navigation states.' },
  { key: 'accent', label: 'Accent Color', description: 'Highlights, focus details, and institution marks.' },
  { key: 'background', label: 'Background Color', description: 'Application page background.' },
  { key: 'surface', label: 'Surface/Card Color', description: 'Cards, panels, modals, and raised surfaces.' },
  { key: 'sidebar', label: 'Sidebar Color', description: 'Main role navigation background.' },
  { key: 'navbar', label: 'Navbar/Header Color', description: 'Top navigation and header surfaces.' },
  { key: 'textPrimary', label: 'Text Primary Color', description: 'Main text and headings.' },
  { key: 'textSecondary', label: 'Text Secondary Color', description: 'Muted copy, descriptions, and metadata.' },
  { key: 'border', label: 'Border Color', description: 'Dividers, input outlines, and table lines.' },
  { key: 'success', label: 'Success Color', description: 'Approved, saved, and completed states.' },
  { key: 'warning', label: 'Warning Color', description: 'Pending, due soon, and caution states.' },
  { key: 'error', label: 'Error/Danger Color', description: 'Rejected, failed, and destructive states.' },
  { key: 'info', label: 'Info Color', description: 'Informational notices and neutral status hints.' }
];

const ASSET_FIELDS: Array<{
  key: BrandingAssetKey;
  label: string;
  description: string;
  accept: string;
  maxBytes: number;
}> = [
  {
    key: 'mainLogo',
    label: 'Main Logo',
    description: 'Used in headers and standard light interfaces.',
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    maxBytes: 5_000_000
  },
  {
    key: 'lightLogo',
    label: 'Light Logo',
    description: 'Used over dark backgrounds such as the sidebar.',
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    maxBytes: 5_000_000
  },
  {
    key: 'darkLogo',
    label: 'Dark Logo',
    description: 'Used over white and pale surfaces.',
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    maxBytes: 5_000_000
  },
  {
    key: 'institutionLogo',
    label: 'School Logo',
    description: 'Shown beside the ThesisTrack logo on login and registration forms.',
    accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    maxBytes: 5_000_000
  },
  {
    key: 'favicon',
    label: 'Favicon',
    description: 'Browser tab icon, preferably square.',
    accept: 'image/png,image/x-icon,image/svg+xml',
    maxBytes: 1_000_000
  },
  {
    key: 'loginBackground',
    label: 'Login Page Background',
    description: 'Authentication background image or video (max 20MB).',
    accept: 'image/png,image/jpeg,image/webp,video/mp4,video/webm',
    maxBytes: 20_000_000
  },
  {
    key: 'registerBackground',
    label: 'Register Page Background',
    description: 'Registration background image or video (max 20MB).',
    accept: 'image/png,image/jpeg,image/webp,video/mp4,video/webm',
    maxBytes: 20_000_000
  },
  {
    key: 'hallOfExcellence1',
    label: 'Award Showcase Image 1',
    description: 'Cover photo for the first Hall of Excellence project.',
    accept: 'image/png,image/jpeg,image/webp',
    maxBytes: 10_000_000
  },
  {
    key: 'hallOfExcellence2',
    label: 'Award Showcase Image 2',
    description: 'Cover photo for the second Hall of Excellence project.',
    accept: 'image/png,image/jpeg,image/webp',
    maxBytes: 10_000_000
  },
  {
    key: 'hallOfExcellence3',
    label: 'Award Showcase Image 3',
    description: 'Cover photo for the third Hall of Excellence project.',
    accept: 'image/png,image/jpeg,image/webp',
    maxBytes: 10_000_000
  },
  {
    key: 'hallOfExcellence4',
    label: 'Award Showcase Image 4',
    description: 'Cover photo for the fourth Hall of Excellence project.',
    accept: 'image/png,image/jpeg,image/webp',
    maxBytes: 10_000_000
  },
  {
    key: 'hallOfExcellence5',
    label: 'Award Showcase Image 5',
    description: 'Cover photo for the fifth Hall of Excellence project.',
    accept: 'image/png,image/jpeg,image/webp',
    maxBytes: 10_000_000
  }
];

const NAMED_COLOR_OPTIONS = Object.keys(NAMED_COLORS).sort((first, second) => first.localeCompare(second));
const SAVE_CONFIRMATION = 'Are you sure you want to apply this branding to the whole system?';
const PREVIEW_MODES: Array<{
  key: BrandingPreviewMode;
  label: string;
  icon: string;
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'fa-table-columns' },
  { key: 'login', label: 'Login', icon: 'fa-right-to-bracket' },
  { key: 'landing', label: 'Landing', icon: 'fa-globe' },
  { key: 'programs', label: 'Programs', icon: 'fa-layer-group' },
  { key: 'portal', label: 'Role Portal', icon: 'fa-users-gear' }
];

const BRANDING_SECTION_PREVIEW: Record<BrandingSectionKey, BrandingPreviewMode> = {
  overview: 'portal',
  logos: 'login',
  colors: 'portal',
  auth: 'login',
  landing: 'landing',
  programs: 'programs',
  backup: 'dashboard'
};

const PREVIEW_ROUTES: Record<BrandingPreviewMode, string> = {
  portal: '/system-admin/dashboard?brandingPreview=1',
  dashboard: '/system-admin/dashboard?brandingPreview=1',
  login: '/login?brandingPreview=1',
  landing: '/?brandingPreview=1',
  programs: '/about?brandingPreview=1#about-departments'
};

const BRANDING_SECTION_PREVIEW_COPY: Record<BrandingSectionKey, { title: string; body: string }> = {
  overview: {
    title: 'Brand Overview Preview',
    body: 'Live enterprise portal preview for ThesisTrack identity, shell copy, and academic navigation context.'
  },
  logos: {
    title: 'Login Header Logo Preview',
    body: 'Preview the login header treatment for main, school, light, dark, favicon, and background assets.'
  },
  colors: {
    title: 'Color Theme Preview',
    body: 'Preview buttons, sidebar, cards, status badges, forms, and shared UI colors.'
  },
  auth: {
    title: 'Authentication Preview',
    body: 'Preview login and registration page copy, labels, logos, and background image.'
  },
  landing: {
    title: 'Landing Page Preview',
    body: 'Preview the public hero, navigation, call-to-action buttons, feature row, and sections.'
  },
  programs: {
    title: 'Programs Content Preview',
    body: 'Preview the About Departments section title, description, and dynamic statistics.'
  },
  backup: {
    title: 'Branding Backup Preview',
    body: 'Preview the currently staged branding while exporting, importing, saving, or restoring.'
  }
};

function getBrandingSection(value: string | null): BrandingSectionKey {
  if (
    value === 'logos' ||
    value === 'colors' ||
    value === 'auth' ||
    value === 'landing' ||
    value === 'programs' ||
    value === 'backup'
  ) {
    return value;
  }

  return 'overview';
}

const DEFAULT_DEPARTMENT_IDS = new Set(DEFAULT_BRANDING.departments.map((department) => department.id.toUpperCase()));

function normalizeDepartmentDraftId(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function createDepartmentDraft(existingDepartments: BrandingDepartmentSettings[]): BrandingDepartmentSettings {
  let index = existingDepartments.length + 1;
  let id = `NEW-${index}`;
  const existingIds = new Set(existingDepartments.map((department) => department.id.toUpperCase()));

  while (existingIds.has(id)) {
    index += 1;
    id = `NEW-${index}`;
  }

  const shortName = `NEW${index}`;

  return {
    id,
    shortName,
    name: 'New Department Program',
    label: `${shortName} - New Department Program`,
    description: 'Describe the new department, its academic scope, and the projects it supports.',
    mission: 'Define the department mission for research, capstone development, and student outcomes.',
    vision: 'Define the long-term department vision and academic impact.',
    icon: 'fas fa-building-columns',
    color: '#2563EB',
    logo: '',
    active: true
  };
}

function getSuggestedColors(value: string) {
  const normalized = normalizeHexColor(value, DEFAULT_BRANDING.colors.primary);
  const suggestions = [
    adjustColor(normalized, { lightness: 12 }),
    adjustColor(normalized, { lightness: -10 }),
    adjustColor(normalized, { hue: 28, saturation: 10, lightness: 8 }),
    mixColors(normalized, '#FFFFFF', 0.72),
    mixColors(normalized, '#000000', 0.18)
  ];

  return Array.from(new Set(suggestions));
}

function getAssetPreviewLabel(key: string) {
  if (key === 'favicon') return 'Icon';
  if (key === 'loginBackground' || key === 'registerBackground') return 'Background';
  return 'Logo';
}

function formatBrandingTimestamp(value?: string) {
  if (!value) {
    return 'Not saved yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getPresetLabel(presetId: string) {
  if (presetId === 'auto-generated') {
    return 'Auto Generated';
  }

  if (presetId === 'custom') {
    return 'Custom Theme';
  }

  return THEME_PRESETS.find((preset) => preset.id === presetId)?.name ?? 'Custom Theme';
}

async function parseApiPayload<T>(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return null;
}

function ColorControl({
  colorKey,
  description,
  label,
  value,
  onChange
}: {
  colorKey: BrandingColorKey;
  description: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [hexInput, setHexInput] = useState(value);
  const [formatInput, setFormatInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const datalistId = `branding-color-names-${colorKey}`;

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const commitColor = (input: string) => {
    const parsed = parseColorValue(input);

    if (parsed) {
      onChange(parsed);
      setHexInput(parsed);
    }
  };

  const handleNamedColor = (input: string) => {
    setNameInput(input);
    const parsed = parseColorValue(input);

    if (parsed) {
      onChange(parsed);
      setNameInput('');
    }
  };

  const suggestions = getSuggestedColors(value);

  return (
    <div className="branding-color-control">
      <div className="branding-color-control-head">
        <div>
          <label htmlFor={`branding-${colorKey}-hex`}>{label}</label>
          <p>{description}</p>
        </div>
        <input
          aria-label={`${label} color picker`}
          className="branding-color-picker"
          type="color"
          value={value}
          onChange={(event) => onChange(normalizeHexColor(event.target.value, value))}
        />
      </div>

      <div className="branding-color-input-grid">
        <div className="form-field">
          <label htmlFor={`branding-${colorKey}-hex`}>HEX</label>
          <input
            id={`branding-${colorKey}-hex`}
            value={hexInput}
            onBlur={() => setHexInput(value)}
            onChange={(event) => {
              setHexInput(event.target.value);
              commitColor(event.target.value);
            }}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`branding-${colorKey}-format`}>RGB/HSL Input</label>
          <input
            id={`branding-${colorKey}-format`}
            placeholder={`${getRgbInputValue(value)} or ${getHslInputValue(value)}`}
            value={formatInput}
            onBlur={() => setFormatInput('')}
            onChange={(event) => {
              setFormatInput(event.target.value);
              commitColor(event.target.value);
            }}
          />
        </div>
        <div className="form-field branding-color-name-field">
          <label htmlFor={`branding-${colorKey}-name`}>Search Color Name</label>
          <input
            id={`branding-${colorKey}-name`}
            list={datalistId}
            placeholder="blue, gold, maroon..."
            value={nameInput}
            onChange={(event) => handleNamedColor(event.target.value)}
          />
          <datalist id={datalistId}>
            {NAMED_COLOR_OPTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="branding-color-suggestions" aria-label={`${label} suggested matching colors`}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            aria-label={`Use ${suggestion}`}
            className="branding-color-swatch"
            title={suggestion}
            type="button"
            style={{ backgroundColor: suggestion }}
            onClick={() => onChange(suggestion)}
          >
            <span>{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AssetUploadControl({
  assetKey,
  description,
  label,
  accept,
  maxBytes,
  pendingFile,
  value,
  onChange,
  onFile,
  onReset,
  onWarning,
  onSave,
  isSaving,
  hideUrlInput
}: {
  assetKey: string | BrandingAssetKey;
  description: string;
  label: string;
  accept: string;
  maxBytes: number;
  pendingFile?: File;
  value: string;
  onChange: (value: string) => void;
  onFile: (file: File, previewUrl: string) => void;
  onReset: () => void;
  onWarning: (message: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  hideUrlInput?: boolean;
}) {
  const inputId = `branding-asset-${assetKey}`;
  const isBackground = assetKey === 'loginBackground' || assetKey === 'registerBackground';

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      onWarning('Only image or video files can be used for branding assets.');
      event.target.value = '';
      return;
    }

    if (file.size > maxBytes) {
      onWarning(`${label} must be ${Math.round(maxBytes / 1_000_000)} MB or smaller.`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onFile(file, reader.result);
      }
    };

    reader.readAsDataURL(file);
  };

  const isVideo = value && (value.startsWith('data:video/') || value.match(/\.(mp4|webm)$/i) || value.includes('/video/upload/'));

  return (
    <div className={`branding-asset-control ${isBackground ? 'is-wide' : ''}`}>
      <div className={`branding-asset-preview ${isBackground ? 'is-background' : ''}`}>
        {value ? (
          isVideo ? (
            <video autoPlay loop muted playsInline src={value} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          ) : (
            <img alt={`${label} preview`} src={value} />
          )
        ) : (
          <span>
            <i className={`fas ${isBackground ? 'fa-image' : 'fa-building-columns'}`}></i>
            {getAssetPreviewLabel(assetKey)}
          </span>
        )}
      </div>
      <div className="branding-asset-copy">
        <strong>{label}</strong>
        <p>{description}</p>
        {pendingFile ? <small>Pending upload: {pendingFile.name}</small> : null}
      </div>
      <div className="branding-asset-actions">
        <label className="btn btn-outline small" htmlFor={inputId}>
          <i className="fas fa-upload"></i>
          Upload
        </label>
        <input id={inputId} accept={accept} hidden type="file" onChange={handleFileChange} />
        <button className="btn btn-outline small" type="button" disabled={isSaving} onClick={onReset}>
          <i className="fas fa-rotate-left"></i>
          Reset
        </button>
        {pendingFile && onSave && (
          <button 
            className="btn btn-primary small" 
            type="button" 
            disabled={isSaving} 
            onClick={onSave}
          >
            <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
            Save
          </button>
        )}
      </div>
      {!hideUrlInput && (
        <div className="form-field branding-asset-url">
          <label htmlFor={`${inputId}-url`}>Asset URL</label>
          <input
            id={`${inputId}-url`}
            placeholder="/logo.png or https://..."
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function BrandMark({ branding, onDark = false }: { branding: BrandingSettings; onDark?: boolean }) {
  const logo = onDark
    ? branding.assets.lightLogo || branding.assets.mainLogo || branding.assets.darkLogo
    : branding.assets.mainLogo || branding.assets.darkLogo || branding.assets.lightLogo;

  return (
    <div className="branding-preview-brand">
      <span className="branding-preview-logo" aria-hidden="true">
        {logo ? <img alt="" src={logo} /> : branding.systemShortName.slice(0, 2).toUpperCase()}
      </span>
      <div>
        <strong>{branding.systemName}</strong>
        <small>{branding.tagline}</small>
      </div>
    </div>
  );
}

function LoginBrandingPreview({ branding }: { branding: BrandingSettings }) {
  const backgroundStyle = branding.assets.loginBackground ? {
    backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.58), rgba(0, 58, 143, 0.28)), url("${branding.assets.loginBackground.replace(/"/g, '\\"')}")`
  } as CSSProperties : undefined;

  return (
    <div className="branding-preview-auth-screen" style={backgroundStyle}>
      <div className="branding-preview-auth-card">
        <BrandMark branding={branding} />
        <span className="branding-preview-auth-pill">
          <i className="fas fa-right-to-bracket"></i>
          {branding.auth.login.pill}
        </span>
        <h2>{branding.auth.login.title}</h2>
        <p>{branding.auth.login.subtitle}</p>
        <label>
          {branding.auth.login.identifierLabel}
          <input readOnly value="user@university.edu.ph" />
        </label>
        <label>
          {branding.auth.login.passwordLabel}
          <input readOnly type="password" value="password" />
        </label>
        <button type="button">{branding.auth.login.submitLabel}</button>
      </div>
    </div>
  );
}

function LandingBrandingPreview({ branding }: { branding: BrandingSettings }) {
  const visibleLinks = branding.navigation.links.filter((link) => link.visible);

  return (
    <div className="branding-preview-landing-screen">
      <nav className="branding-preview-landing-nav">
        <BrandMark branding={branding} />
        <div>
          {visibleLinks.slice(0, 4).map((link) => (
            <span key={link.id}>{link.label}</span>
          ))}
        </div>
        {branding.navigation.showLogin ? <button type="button">{branding.navigation.loginLabel}</button> : null}
      </nav>
      <section className="branding-preview-landing-hero">
        <span>{branding.landing.subtitle}</span>
        <h2>{branding.landing.heroTitle}</h2>
        <p>{branding.landing.description}</p>
        {branding.landing.showCtaButtons ? (
          <div>
            <button type="button">{branding.landing.primaryCtaText}</button>
            <button className="is-outline" type="button">{branding.landing.secondaryCtaText}</button>
          </div>
        ) : null}
      </section>
      <section className="branding-preview-landing-modules">
        {branding.landing.features.filter((feature) => feature.visible).slice(0, 3).map((feature) => (
          <article key={feature.id}>
            <i className={`fas ${feature.icon}`}></i>
            <strong>{feature.title}</strong>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function RolePortalBrandingPreview({ branding }: { branding: BrandingSettings }) {
  return (
    <div className="branding-preview-portal-screen">
      <aside>
        <BrandMark branding={branding} onDark />
        {['Workspace', 'Submissions', 'Schedule', 'Feedback'].map((item, index) => (
          <span key={item} className={index === 0 ? 'is-active' : ''}>
            <i className={`fas ${index === 0 ? 'fa-gauge-high' : 'fa-circle'}`}></i>
            {item}
          </span>
        ))}
      </aside>
      <main>
        <header>
          <div>
            <strong>Student Workspace</strong>
            <p>{branding.systemName}</p>
          </div>
          <button type="button">Submit Progress</button>
        </header>
        <section>
          <article>
            <span>Current Project Stage</span>
            <strong>Chapter 3 Review</strong>
            <p>Role portal preview for cards, badges, alerts, and forms.</p>
          </article>
          <article>
            <span>Status</span>
            <strong>On Track</strong>
            <p>Theme tokens are shared across every role workspace.</p>
          </article>
        </section>
        <div className="branding-preview-portal-alert">
          <i className="fas fa-circle-check"></i>
          Branding applies to role portal components after saving.
        </div>
      </main>
    </div>
  );
}

function ActualRouteBrandingPreview({ mode }: { mode: Exclude<BrandingPreviewMode, 'portal'> }) {
  return (
    <iframe
      key={mode}
      className="branding-preview-route-frame"
      src={PREVIEW_ROUTES[mode]}
      title={`${mode} actual branding preview`}
    />
  );
}

function LiveSystemPreview({ branding, mode }: { branding: BrandingSettings; mode: BrandingPreviewMode }) {
  const { colors } = branding;
  const logoItems = [
    ['Main', branding.assets.mainLogo],
    ['Light', branding.assets.lightLogo],
    ['Dark', branding.assets.darkLogo],
    ['Favicon', branding.assets.favicon]
  ].filter(([, value]) => Boolean(value));
  const previewStyle = {
    '--preview-primary': colors.primary,
    '--preview-secondary': colors.secondary,
    '--preview-accent': colors.accent,
    '--preview-background': colors.background,
    '--preview-surface': colors.surface,
    '--preview-sidebar': colors.sidebar,
    '--preview-navbar': colors.navbar,
    '--preview-text-primary': colors.textPrimary,
    '--preview-text-secondary': colors.textSecondary,
    '--preview-border': colors.border,
    '--preview-success': colors.success,
    '--preview-warning': colors.warning,
    '--preview-error': colors.error,
    '--preview-info': colors.info
  } as CSSProperties;

  if (mode === 'portal') {
    return (
      <div className="branding-preview-frame is-single" style={previewStyle}>
        <RolePortalBrandingPreview branding={branding} />
      </div>
    );
  }

  if (mode === 'dashboard' || mode === 'login' || mode === 'landing' || mode === 'programs') {
    return (
      <div className="branding-preview-frame is-route" style={previewStyle}>
        <ActualRouteBrandingPreview mode={mode} />
      </div>
    );
  }

  return (
    <div className="branding-preview-frame" style={previewStyle}>
      <aside className="branding-preview-sidebar">
        <BrandMark branding={branding} onDark />
        <nav>
          {[
            ['fa-gauge-high', 'Dashboard'],
            ['fa-folder-open', 'Projects'],
            ['fa-calendar-days', 'Schedule'],
            ['fa-file-shield', 'Reports']
          ].map(([icon, label], index) => (
            <span key={label} className={index === 0 ? 'is-active' : ''}>
              <i className={`fas ${icon}`}></i>
              {label}
            </span>
          ))}
        </nav>
      </aside>

      <main className="branding-preview-main">
        <header className="branding-preview-navbar">
          <BrandMark branding={branding} />
          <div className="branding-preview-user">
            <span>Super Admin</span>
            <i className="fas fa-user-shield"></i>
          </div>
        </header>

        <section className="branding-preview-content">
          <div className="branding-preview-alert">
            <i className="fas fa-circle-info"></i>
            <span>System branding preview is updating live.</span>
          </div>

          <section className="branding-preview-live-brand" aria-label="Live brand preview">
            <div className="branding-preview-live-brand-main">
              <span className="branding-preview-live-logo" aria-hidden="true">
                {branding.assets.mainLogo ? (
                  <img alt="" src={branding.assets.mainLogo} />
                ) : (
                  branding.systemShortName.slice(0, 2).toUpperCase()
                )}
              </span>
              <div>
                <span>Live Brand Preview</span>
                <strong>{branding.systemName}</strong>
                <p>{branding.tagline}</p>
              </div>
            </div>
            <div className="branding-preview-live-meta">
              <span>{branding.systemShortName}</span>
              {logoItems.length ? (
                <div className="branding-preview-logo-strip">
                  {logoItems.map(([label, value]) => (
                    <i key={label} title={`${label} logo`}>
                      <img alt="" src={value} />
                    </i>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <div className="branding-preview-toolbar">
            <button type="button">Primary Button</button>
            <button className="is-secondary" type="button">Secondary</button>
            <span className="branding-preview-badge">Active</span>
            <span className="branding-preview-badge is-warning">Pending</span>
          </div>

          <div className="branding-preview-grid">
            <article>
              <small>Total Projects</small>
              <strong>128</strong>
              <span className="branding-preview-status is-success">Approved</span>
            </article>
            <article>
              <small>For Review</small>
              <strong>24</strong>
              <span className="branding-preview-status is-info">In progress</span>
            </article>
          </div>

          <div className="branding-preview-form-card">
            <label>
              System Form
              <input readOnly value={branding.systemName} />
            </label>
            <label>
              Select Theme
              <select value={branding.themePreset} onChange={() => undefined}>
                <option>{branding.themePreset}</option>
              </select>
            </label>
          </div>

          <div className="branding-preview-table">
            <div className="branding-preview-table-row is-head">
              <span>User</span>
              <span>Status</span>
              <span>Role</span>
            </div>
            <div className="branding-preview-table-row">
              <span>Research Head</span>
              <span><b className="is-success">Active</b></span>
              <span>Oversight</span>
            </div>
            <div className="branding-preview-table-row">
              <span>Program Head</span>
              <span><b className="is-warning">Pending</b></span>
              <span>Academic</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function SystemAdminBranding() {
  const searchParams = useSearchParams();
  const { branding: activeBranding, setBranding } = useBranding();
  const [savedBranding, setSavedBranding] = useState<BrandingSettings>(() => sanitizeBrandingSettings(activeBranding));
  const [draft, setDraft] = useState<BrandingSettings>(() => sanitizeBrandingSettings(activeBranding));
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<BrandingAssetKey, File>>>({});
  const [pendingDepartmentFiles, setPendingDepartmentFiles] = useState<Record<string, File>>({});
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDepartmentIndex, setEditingDepartmentIndex] = useState<number | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const savedBrandingRef = useRef(savedBranding);
  const activeSection = getBrandingSection(searchParams.get('section'));
  const previewMode = BRANDING_SECTION_PREVIEW[activeSection];
  const previewCopy = BRANDING_SECTION_PREVIEW_COPY[activeSection];
  const isSectionActive = (section: BrandingSectionKey) => activeSection === section;

  useEffect(() => {
    savedBrandingRef.current = savedBranding;
  }, [savedBranding]);

  useEffect(() => {
    setBranding(draft);
    publishBrandingPreview(draft);
  }, [draft, setBranding]);

  useEffect(() => () => {
    clearBrandingPreview();
    setBranding(savedBrandingRef.current);
  }, [setBranding]);

  const loadBranding = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/branding', {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const payload = await parseApiPayload<BrandingApiResponse>(response);

      if (!response.ok || !payload?.success || !payload.branding) {
        throw new Error(payload?.message || 'Unable to load branding settings.');
      }

      const loadedBranding = sanitizeBrandingSettings(payload.branding);

      setSavedBranding(loadedBranding);
      setDraft(loadedBranding);
      setBranding(loadedBranding);
      setBanner(null);
    } catch (error) {
      const fallbackBranding = sanitizeBrandingSettings(DEFAULT_BRANDING);

      setSavedBranding(fallbackBranding);
      setDraft(fallbackBranding);
      setBranding(fallbackBranding);
      setBanner({
        tone: 'warning',
        title: 'Using default branding',
        body: error instanceof Error && error.message ? error.message : 'Branding settings could not be loaded.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [setBranding]);

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  const updateDraft = (updater: (current: BrandingSettings) => BrandingSettings) => {
    setDraft((current) => sanitizeBrandingSettings(updater(cloneBranding(current))));
  };

  const updateIdentityField = (
    field: 'systemName' | 'systemShortName' | 'tagline' | 'institutionName' | 'institutionTagline',
    value: string
  ) => {
    updateDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateColor = (key: BrandingColorKey, value: string) => {
    updateDraft((current) => ({
      ...current,
      themePreset: key === 'primary' ? 'custom' : current.themePreset,
      colors: key === 'primary' ? generateThemeFromPrimary(value, current.colors).colors : {
        ...current.colors,
        [key]: normalizeHexColor(value, current.colors[key])
      },
      derivedColors: key === 'primary' ? generateThemeFromPrimary(value, current.colors).derivedColors : current.derivedColors
    }));
  };

  const resetAsset = (key: BrandingAssetKey) => {
    if (!window.confirm('Reset this asset to the system default?')) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      assets: {
        ...current.assets,
        [key]: DEFAULT_BRANDING.assets[key]
      }
    }));
    setPendingFiles((current) => {
      if (!current[key]) return current;
      const nextFiles = { ...current };
      delete nextFiles[key];
      return nextFiles;
    });
  };

  const updateAsset = (key: BrandingAssetKey, value: string) => {
    updateDraft((current) => ({
      ...current,
      assets: {
        ...current.assets,
        [key]: value
      }
    }));
    setPendingFiles((current) => {
      if (!current[key]) {
        return current;
      }

      const nextFiles = { ...current };
      delete nextFiles[key];
      return nextFiles;
    });
  };

  const handleAssetFile = (key: BrandingAssetKey, file: File, previewUrl: string) => {
    setPendingFiles((current) => ({
      ...current,
      [key]: file
    }));
    updateDraft((current) => ({
      ...current,
      assets: {
        ...current.assets,
        [key]: previewUrl
      }
    }));
  };



  const updateLandingField = <K extends keyof BrandingLandingSettings>(
    field: K,
    value: BrandingLandingSettings[K]
  ) => {
    updateDraft((current) => ({
      ...current,
      landing: {
        ...current.landing,
        [field]: value
      }
    }));
  };

  const updateLandingFeature = <K extends keyof BrandingLandingFeature>(
    index: number,
    field: K,
    value: BrandingLandingFeature[K]
  ) => {
    updateDraft((current) => ({
      ...current,
      landing: {
        ...current.landing,
        features: current.landing.features.map((feature, featureIndex) => (
          featureIndex === index ? { ...feature, [field]: value } : feature
        ))
      }
    }));
  };

  const updateLandingStatistic = <K extends keyof BrandingLandingStatistic>(
    index: number,
    field: K,
    value: BrandingLandingStatistic[K]
  ) => {
    updateDraft((current) => ({
      ...current,
      landing: {
        ...current.landing,
        statistics: current.landing.statistics.map((statistic, statisticIndex) => (
          statisticIndex === index ? { ...statistic, [field]: value } : statistic
        ))
      }
    }));
  };

  const updateAuthLoginField = <K extends keyof BrandingAuthSettings['login']>(
    field: K,
    value: BrandingAuthSettings['login'][K]
  ) => {
    updateDraft((current) => ({
      ...current,
      auth: {
        ...current.auth,
        login: {
          ...current.auth.login,
          [field]: value
        }
      }
    }));
  };

  const updateAuthRegisterField = <K extends keyof BrandingAuthSettings['register']>(
    field: K,
    value: BrandingAuthSettings['register'][K]
  ) => {
    updateDraft((current) => ({
      ...current,
      auth: {
        ...current.auth,
        register: {
          ...current.auth.register,
          [field]: value
        }
      }
    }));
  };

  const updateNavigationField = <K extends keyof Omit<BrandingNavigationSettings, 'links'>>(
    field: K,
    value: BrandingNavigationSettings[K]
  ) => {
    updateDraft((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        [field]: value
      }
    }));
  };

  const updateNavigationLink = <K extends keyof BrandingNavigationLink>(
    index: number,
    field: K,
    value: BrandingNavigationLink[K]
  ) => {
    updateDraft((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        links: current.navigation.links.map((link, linkIndex) => (
          linkIndex === index ? { ...link, [field]: value } : link
        ))
      }
    }));
  };

  const updateShellField = <K extends keyof BrandingShellSettings>(
    field: K,
    value: BrandingShellSettings[K]
  ) => {
    updateDraft((current) => ({
      ...current,
      shell: {
        ...current.shell,
        [field]: value
      }
    }));
  };

  const updateDepartmentField = <K extends keyof BrandingDepartmentSettings>(
    index: number,
    field: K,
    value: BrandingDepartmentSettings[K]
  ) => {
    updateDraft((current) => ({
      ...current,
      departments: current.departments.map((department, departmentIndex) => (
        departmentIndex === index ? { ...department, [field]: value } : department
      ))
    }));

  };

  const handleDepartmentFile = (index: number, departmentId: string, file: File, previewUrl: string, type: 'logo' | 'keyArea' = 'logo', areaIndex?: number) => {
    const fileKey = type === 'logo' ? `${departmentId}|logo` : `${departmentId}|keyArea|${areaIndex}`;
    setPendingDepartmentFiles((current) => ({
      ...current,
      [fileKey]: file
    }));
    
    if (type === 'logo') {
      updateDepartmentField(index, 'logo', previewUrl);
    } else if (type === 'keyArea' && typeof areaIndex === 'number') {
      const areas = [...(draft.departments[index].keyAreas || [])];
      if (areas[areaIndex]) {
        areas[areaIndex] = { ...areas[areaIndex], icon: previewUrl };
        updateDepartmentField(index, 'keyAreas', areas);
      }
    }
  };

  const addDepartment = () => {
    const nextIndex = draft.departments.length;
    updateDraft((current) => ({
      ...current,
      departments: [
        ...current.departments,
        createDepartmentDraft(current.departments)
      ]
    }));
    setEditingDepartmentIndex(nextIndex);
    setBanner({
      tone: 'info',
      title: 'Department added',
      body: 'Fill in the new department details, then save branding to publish it in registration and public department pages.'
    });
  };

  const removeDepartment = (index: number) => {
    const department = draft.departments[index];

    if (!department) {
      return;
    }

    if (DEFAULT_DEPARTMENT_IDS.has(department.id.toUpperCase())) {
      setBanner({
        tone: 'info',
        title: 'Default department retained',
        body: 'Default departments stay in the list for data compatibility. Turn Active off if you need to hide one.'
      });
      return;
    }

    if (!window.confirm(`Remove ${department.shortName || department.id} from managed departments?`)) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      departments: current.departments.filter((_, departmentIndex) => departmentIndex !== index)
    }));
  };

  const applyPreset = (presetId: string) => {
    updateDraft((current) => createBrandingFromPreset(presetId, current));
  };

  const autoGenerateTheme = () => {
    updateDraft((current) => {
      const generated = generateThemeFromPrimary(current.colors.primary, current.colors);

      return {
        ...current,
        themePreset: 'auto-generated',
        colors: generated.colors,
        derivedColors: generated.derivedColors
      };
    });
    setBanner({
      tone: 'info',
      title: 'Theme generated',
      body: 'Secondary, accent, hover, variants, border, and background suggestions were generated from the primary color.'
    });
  };

  const resetColorsOnly = () => {
    updateDraft((current) => ({
      ...current,
      themePreset: DEFAULT_BRANDING.themePreset,
      colors: { ...DEFAULT_BRANDING.colors },
      derivedColors: { ...DEFAULT_BRANDING.derivedColors }
    }));
    setBanner({
      tone: 'info',
      title: 'Colors reset',
      body: 'Default colors are in the preview. Save Branding to apply them system-wide.'
    });
  };

  const resetLogosOnly = () => {
    updateDraft((current) => ({
      ...current,
      assets: { ...DEFAULT_BRANDING.assets }
    }));
    setPendingFiles({});
    setBanner({
      tone: 'info',
      title: 'Logo assets reset',
      body: 'Logo and image fields are cleared in the preview. Save Branding to apply the reset.'
    });
  };

  const uploadPendingFiles = async (brandingInput: BrandingSettings) => {
    const nextBranding = cloneBranding(brandingInput);
    let usedInlineAssets = false;

    for (const key of Object.keys(pendingFiles) as BrandingAssetKey[]) {
      const file = pendingFiles[key];

      if (!file) {
        continue;
      }

      try {
        const formData = new FormData();
        formData.set('file', file);
        
        // Map BrandingAssetKey to BrandingAssetType if needed, or pass the key
        let type = 'OTHER';
        if (key === 'mainLogo') type = 'SYSTEM_LOGO';
        else if (key === 'institutionLogo') type = 'SCHOOL_LOGO';
        else if (key === 'loginBackground') type = 'LANDING_IMAGE';
        
        formData.set('type', type);
        formData.set('label', key);

        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        });
        const payload = await response.json();

        if (!response.ok || !payload?.success || !payload.data?.secure_url) {
          throw new Error(payload?.error || payload?.message || 'Upload failed.');
        }

        nextBranding.assets[key] = payload.data.secure_url;
      } catch (err: any) {
        console.error(`Upload failed for ${key}:`, err);
        throw err; // Stop upload and propagate error to saveBranding
      }
    }

    for (const [fileKey, file] of Object.entries(pendingDepartmentFiles)) {
      if (!file) {
        continue;
      }

      // fileKey format: "deptId|logo" or "deptId|keyArea|0" or just "deptId" for legacy
      const parts = fileKey.split('|');
      const deptId = parts[0];
      const type = parts[1] || 'logo';
      const areaIndex = parts[2] ? parseInt(parts[2], 10) : 0;

      try {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('type', type === 'logo' ? 'SCHOOL_LOGO' : 'OTHER');
        formData.set('label', fileKey);

        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        });
        const payload = await response.json();

        if (!response.ok || !payload?.success || !payload.data?.secure_url) {
          throw new Error(payload?.error || payload?.message || 'Upload failed.');
        }

        const deptIndex = nextBranding.departments.findIndex(d => d.id === deptId);
        if (deptIndex !== -1) {
          if (type === 'logo') {
            nextBranding.departments[deptIndex].logo = payload.data.secure_url;
          } else if (type === 'keyArea' && nextBranding.departments[deptIndex].keyAreas?.[areaIndex]) {
            nextBranding.departments[deptIndex].keyAreas[areaIndex].icon = payload.data.secure_url;
          }
        }
      } catch (err: any) {
        console.error(`Upload failed for department ${deptId} (${type}):`, err);
        throw err;
      }
    }

    return {
      branding: nextBranding,
      usedInlineAssets
    };
  };

  const saveBranding = async (brandingToSave = draft, successTitle = 'Branding saved') => {
    if (!window.confirm(SAVE_CONFIRMATION)) {
      return;
    }

    setIsSaving(true);

    try {
      const uploadResult = await uploadPendingFiles(brandingToSave);
      const response = await fetch('/api/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          branding: uploadResult.branding
        })
      });
      const payload = await parseApiPayload<BrandingApiResponse>(response);

      if (!response.ok || !payload?.success || !payload.branding) {
        throw new Error(payload?.message || 'Unable to save branding settings.');
      }

      const saved = sanitizeBrandingSettings(payload.branding);

      setPendingFiles({});
      setPendingDepartmentFiles({});
      setSavedBranding(saved);
      setDraft(saved);
      setBranding(saved);
      publishBrandingUpdate(saved);
      setBanner({
        tone: uploadResult.usedInlineAssets ? 'warning' : 'success',
        title: successTitle,
        body: uploadResult.usedInlineAssets
          ? 'Branding was saved. Some selected images were stored inline because the upload service was unavailable.'
          : 'The selected branding is now stored in the database and applied through global CSS variables.'
      });
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: 'Unable to save branding',
        body: error instanceof Error && error.message ? error.message : 'The server rejected this branding update.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const restoreDefaultBranding = async () => {
    if (!window.confirm(SAVE_CONFIRMATION)) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/branding', {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      const payload = await parseApiPayload<BrandingApiResponse>(response);

      if (!response.ok || !payload?.success || !payload.branding) {
        throw new Error(payload?.message || 'Unable to restore default branding.');
      }

      const restoredBranding = sanitizeBrandingSettings(payload.branding);

      setPendingFiles({});
      setPendingDepartmentFiles({});
      setSavedBranding(restoredBranding);
      setDraft(restoredBranding);
      setBranding(restoredBranding);
      publishBrandingUpdate(restoredBranding);
      setBanner({
        tone: 'success',
        title: 'Default branding restored',
        body: 'The default institutional theme has been restored and saved.'
      });
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: 'Unable to restore defaults',
        body: error instanceof Error && error.message ? error.message : 'The default branding could not be restored.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportThemeJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${draft.systemShortName || 'theme'}-branding.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const updateProgramsContentField = (key: keyof BrandingSettings['programsContent'], value: string) => {
    setDraft((current) => ({
      ...current,
      programsContent: {
        ...current.programsContent,
        [key]: value
      }
    }));
  };

  const updateProgramsContentHighlight = (index: number, key: 'value' | 'label' | 'visible', value: string | boolean) => {
    setDraft((current) => {
      const next = { ...current };
      next.programsContent = { ...next.programsContent };
      next.programsContent.highlights = [...next.programsContent.highlights];
      next.programsContent.highlights[index] = {
        ...next.programsContent.highlights[index],
        [key]: value
      };
      return next;
    });
  };

  const importThemeJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as {
          branding?: unknown;
        };
        const importedBranding = sanitizeBrandingSettings(parsed.branding ?? parsed);

        setPendingFiles({});
        setDraft(importedBranding);
        setBanner({
          tone: 'success',
          title: 'Theme imported',
          body: 'Imported settings are loaded into the preview. Save Branding to apply them system-wide.'
        });
      } catch {
        setBanner({
          tone: 'warning',
          title: 'Invalid theme JSON',
          body: 'Choose a valid exported branding JSON file.'
        });
      }
    };

    reader.readAsText(file);
  };

  const contrastChecks = useMemo(() => {
    const { colors } = draft;
    const checks = [
      {
        label: 'Page text on background',
        ratio: getContrastRatio(colors.textPrimary, colors.background),
        detail: 'Main page content readability.'
      },
      {
        label: 'Card text on surface',
        ratio: getContrastRatio(colors.textPrimary, colors.surface),
        detail: 'Cards, forms, and table content.'
      },
      {
        label: 'Muted text on surface',
        ratio: getContrastRatio(colors.textSecondary, colors.surface),
        detail: 'Descriptions, metadata, and helper text.'
      },
      {
        label: 'Button text on primary',
        ratio: getContrastRatio('#FFFFFF', colors.primary),
        detail: 'Primary action button readability.'
      },
      {
        label: 'Sidebar text on sidebar',
        ratio: getContrastRatio('#FFFFFF', colors.sidebar),
        detail: 'Navigation readability.'
      },
      {
        label: 'Navbar text on navbar',
        ratio: getContrastRatio(colors.textPrimary, colors.navbar),
        detail: 'Top navigation readability.'
      }
    ];

    return checks.map((check) => ({
      ...check,
      status: getContrastStatus(check.ratio)
    }));
  }, [draft]);

  const accessibilityWarnings = contrastChecks.filter((check) => check.status !== 'Good Contrast');
  const pendingFileCount = Object.values(pendingFiles).filter(Boolean).length;
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedBranding) || pendingFileCount > 0,
    [draft, pendingFileCount, savedBranding]
  );

  const primaryGenerated = generateThemeFromPrimary(draft.colors.primary, draft.colors);
  const configuredAssetCount = Object.values(draft.assets).filter(Boolean).length;
  const contrastPassCount = contrastChecks.length - accessibilityWarnings.length;
  const selectedPresetLabel = getPresetLabel(draft.themePreset);
  const savedAtLabel = formatBrandingTimestamp(savedBranding.updatedAt);
  const heroLogo = draft.assets.mainLogo || draft.assets.darkLogo || draft.assets.lightLogo;
  const brandInitials = (draft.systemShortName || draft.systemName)
    .slice(0, 3)
    .toUpperCase();
  const heroPalette = [
    ['Primary', draft.colors.primary],
    ['Secondary', draft.colors.secondary],
    ['Accent', draft.colors.accent],
    ['Surface', draft.colors.surface],
    ['Sidebar', draft.colors.sidebar]
  ];
  const heroStyle = {
    '--brand-hero-primary': draft.colors.primary,
    '--brand-hero-secondary': draft.colors.secondary,
    '--brand-hero-accent': draft.colors.accent,
    '--brand-hero-surface': draft.colors.surface,
    '--brand-hero-background': draft.colors.background,
    '--brand-hero-text': draft.colors.textPrimary,
    '--brand-hero-muted': draft.colors.textSecondary,
    '--brand-hero-border': draft.colors.border
  } as CSSProperties;

  return (
    <SystemAdminShell
      activeNav="branding"
      title="Theme and Branding"
      description="Customize the system identity, institutional colors, logos, and global interface theme."
    >
      <div className="admin-page-stack branding-page">
        {banner ? (
          <section className={`admin-result-banner is-${banner.tone}`}>
            <div>
              <strong>{banner.title}</strong>
              <p>{banner.body}</p>
            </div>
            <button className="btn btn-outline small" type="button" onClick={() => setBanner(null)}>
              Dismiss
            </button>
          </section>
        ) : null}

        <section className="branding-summary" style={heroStyle}>
          <div className="branding-summary-identity">
            <span className="branding-summary-logo" aria-hidden="true">
              {heroLogo ? <img alt="" src={heroLogo} /> : brandInitials}
            </span>
            <div>
              <h2>{draft.systemName}</h2>
              <p>{draft.tagline}</p>
            </div>
          </div>

          <div className="branding-summary-palette" aria-label="Current theme palette">
            {heroPalette.map(([label, color]) => (
              <i key={label} title={`${label}: ${color}`} style={{ backgroundColor: color }}></i>
            ))}
          </div>

          <dl className="branding-summary-stats">
            <div>
              <dt>Preset</dt>
              <dd>{selectedPresetLabel}</dd>
            </div>
            <div className={accessibilityWarnings.length ? 'is-warning' : ''}>
              <dt>Contrast</dt>
              <dd>{contrastPassCount}/{contrastChecks.length}</dd>
            </div>
            <div>
              <dt>Assets</dt>
              <dd>
                {configuredAssetCount}/{ASSET_FIELDS.length}
                {pendingFileCount ? <small> · {pendingFileCount} pending</small> : null}
              </dd>
            </div>
            <div className={isDirty ? 'is-warning' : 'is-success'} aria-live="polite">
              <dt>Status</dt>
              <dd>{isDirty ? 'Unsaved changes' : `Saved · ${savedAtLabel}`}</dd>
            </div>
          </dl>

          <button className="btn btn-outline small" disabled={isLoading} type="button" onClick={() => void loadBranding()}>
            <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
            Refresh
          </button>
        </section>

        <div className="branding-layout">
          <div className="branding-controls-column">
            <section className={`admin-section-card ${isSectionActive('overview') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>System Name Settings</h3>
                  <p>Shown in the navbar, login context, browser title, and preview.</p>
                </div>
              </div>
              <div className="admin-section-body">
                <div className="admin-form-grid">
                  <div className="form-field">
                    <label htmlFor="branding-system-name">System Name</label>
                    <input
                      id="branding-system-name"
                      value={draft.systemName}
                      onChange={(event) => updateIdentityField('systemName', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-system-short-name">System Short Name</label>
                    <input
                      id="branding-system-short-name"
                      maxLength={12}
                      value={draft.systemShortName}
                      onChange={(event) => updateIdentityField('systemShortName', event.target.value)}
                    />
                  </div>
                  <div className="form-field branding-span-full">
                    <label htmlFor="branding-tagline">Tagline or Description</label>
                    <textarea
                      id="branding-tagline"
                      value={draft.tagline}
                      onChange={(event) => updateIdentityField('tagline', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-institution-name">School Name</label>
                    <input
                      id="branding-institution-name"
                      value={draft.institutionName}
                      onChange={(event) => updateIdentityField('institutionName', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-institution-tagline">School Tagline</label>
                    <input
                      id="branding-institution-tagline"
                      value={draft.institutionTagline}
                      onChange={(event) => updateIdentityField('institutionTagline', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={`admin-section-card ${isSectionActive('landing') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>Landing Page Content</h3>
                  <p>Manage the public hero, call-to-action buttons, feature row, and about metrics.</p>
                </div>
              </div>
              <div className="admin-section-body">
                <div className="admin-form-grid">
                  <div className="form-field">
                    <label htmlFor="branding-landing-subtitle">Hero Badge</label>
                    <input
                      id="branding-landing-subtitle"
                      value={draft.landing.subtitle}
                      onChange={(event) => updateLandingField('subtitle', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-landing-alignment">Hero Text Alignment</label>
                    <select
                      id="branding-landing-alignment"
                      value={draft.landing.textAlignment}
                      onChange={(event) => updateLandingField('textAlignment', event.target.value as BrandingLandingSettings['textAlignment'])}
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="form-field branding-span-full">
                    <label htmlFor="branding-landing-title">Hero Title</label>
                    <input
                      id="branding-landing-title"
                      value={draft.landing.heroTitle}
                      onChange={(event) => updateLandingField('heroTitle', event.target.value)}
                    />
                  </div>
                  <div className="form-field branding-span-full">
                    <label htmlFor="branding-landing-description">Hero Description</label>
                    <textarea
                      id="branding-landing-description"
                      value={draft.landing.description}
                      onChange={(event) => updateLandingField('description', event.target.value)}
                    />
                  </div>
                  <label className="branding-toggle-line branding-span-full">
                    <input
                      checked={draft.landing.showCtaButtons}
                      type="checkbox"
                      onChange={(event) => updateLandingField('showCtaButtons', event.target.checked)}
                    />
                    Show landing call-to-action buttons
                  </label>
                  <div className="form-field">
                    <label htmlFor="branding-landing-primary-cta">Primary CTA Text</label>
                    <input
                      id="branding-landing-primary-cta"
                      value={draft.landing.primaryCtaText}
                      onChange={(event) => updateLandingField('primaryCtaText', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-landing-primary-link">Primary CTA Link</label>
                    <input
                      id="branding-landing-primary-link"
                      value={draft.landing.primaryCtaLink}
                      onChange={(event) => updateLandingField('primaryCtaLink', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-landing-secondary-cta">Secondary CTA Text</label>
                    <input
                      id="branding-landing-secondary-cta"
                      value={draft.landing.secondaryCtaText}
                      onChange={(event) => updateLandingField('secondaryCtaText', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-landing-secondary-link">Secondary CTA Link</label>
                    <input
                      id="branding-landing-secondary-link"
                      value={draft.landing.secondaryCtaLink}
                      onChange={(event) => updateLandingField('secondaryCtaLink', event.target.value)}
                    />
                  </div>
                  <label className="branding-toggle-line branding-span-full">
                    <input
                      checked={draft.landing.showHeroImage}
                      type="checkbox"
                      onChange={(event) => updateLandingField('showHeroImage', event.target.checked)}
                    />
                    Show hero image
                  </label>
                  <div className="form-field branding-span-full">
                    <label htmlFor="branding-landing-hero-image">Hero Image URL</label>
                    <input
                      id="branding-landing-hero-image"
                      value={draft.landing.heroImage}
                      onChange={(event) => updateLandingField('heroImage', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-landing-about-title">About Title</label>
                    <input
                      id="branding-landing-about-title"
                      value={draft.landing.aboutTitle}
                      onChange={(event) => updateLandingField('aboutTitle', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-landing-about-description">About Description</label>
                    <textarea
                      id="branding-landing-about-description"
                      value={draft.landing.aboutDescription}
                      onChange={(event) => updateLandingField('aboutDescription', event.target.value)}
                    />
                  </div>
                </div>

                <div className="branding-management-list">
                  <div className="branding-management-heading">
                    <strong>Feature Row</strong>
                    <span>Controls the four public highlight items.</span>
                  </div>
                  {draft.landing.features.map((feature, index) => (
                    <div key={feature.id} className="branding-repeater-card">
                      <label className="branding-toggle-line">
                        <input
                          checked={feature.visible}
                          type="checkbox"
                          onChange={(event) => updateLandingFeature(index, 'visible', event.target.checked)}
                        />
                        Visible
                      </label>
                      <div className="branding-mini-editor-grid">
                        <div className="form-field">
                          <label htmlFor={`branding-feature-title-${feature.id}`}>Title</label>
                          <input
                            id={`branding-feature-title-${feature.id}`}
                            value={feature.title}
                            onChange={(event) => updateLandingFeature(index, 'title', event.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`branding-feature-icon-${feature.id}`}>Icon Class</label>
                          <input
                            id={`branding-feature-icon-${feature.id}`}
                            value={feature.icon}
                            onChange={(event) => updateLandingFeature(index, 'icon', event.target.value)}
                          />
                        </div>
                        <div className="form-field branding-span-full">
                          <label htmlFor={`branding-feature-description-${feature.id}`}>Description</label>
                          <input
                            id={`branding-feature-description-${feature.id}`}
                            value={feature.description}
                            onChange={(event) => updateLandingFeature(index, 'description', event.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="branding-management-list">
                  <div className="branding-management-heading">
                    <strong>About Metrics</strong>
                    <span>Shown in the public about summary card.</span>
                  </div>
                  {draft.landing.statistics.map((statistic, index) => (
                    <div key={statistic.id} className="branding-repeater-card">
                      <label className="branding-toggle-line">
                        <input
                          checked={statistic.visible}
                          type="checkbox"
                          onChange={(event) => updateLandingStatistic(index, 'visible', event.target.checked)}
                        />
                        Visible
                      </label>
                      <div className="branding-mini-editor-grid">
                        <div className="form-field">
                          <label htmlFor={`branding-stat-value-${statistic.id}`}>Value</label>
                          <input
                            id={`branding-stat-value-${statistic.id}`}
                            value={statistic.value}
                            onChange={(event) => updateLandingStatistic(index, 'value', event.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`branding-stat-label-${statistic.id}`}>Label</label>
                          <input
                            id={`branding-stat-label-${statistic.id}`}
                            value={statistic.label}
                            onChange={(event) => updateLandingStatistic(index, 'label', event.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={`admin-section-card ${isSectionActive('auth') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>Login and Register Pages</h3>
                  <p>Manage authentication page headings, instructions, labels, and footer prompts.</p>
                </div>
              </div>
              <div className="admin-section-body">
                <div className="branding-two-panel-grid">
                  <div className="branding-subsection-panel">
                    <div className="branding-management-heading">
                      <strong>Login Page</strong>
                      <span>Account access screen copy.</span>
                    </div>
                    <div className="admin-form-grid">
                      <div className="form-field">
                        <label htmlFor="branding-login-pill">Pill Label</label>
                        <input id="branding-login-pill" value={draft.auth.login.pill} onChange={(event) => updateAuthLoginField('pill', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-login-title">Title</label>
                        <input id="branding-login-title" value={draft.auth.login.title} onChange={(event) => updateAuthLoginField('title', event.target.value)} />
                      </div>
                      <div className="form-field branding-span-full">
                        <label htmlFor="branding-login-subtitle">Subtitle</label>
                        <textarea id="branding-login-subtitle" value={draft.auth.login.subtitle} onChange={(event) => updateAuthLoginField('subtitle', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-login-identifier-label">Identifier Label</label>
                        <input id="branding-login-identifier-label" value={draft.auth.login.identifierLabel} onChange={(event) => updateAuthLoginField('identifierLabel', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-login-identifier-placeholder">Identifier Placeholder</label>
                        <input id="branding-login-identifier-placeholder" value={draft.auth.login.identifierPlaceholder} onChange={(event) => updateAuthLoginField('identifierPlaceholder', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-login-submit">Submit Label</label>
                        <input id="branding-login-submit" value={draft.auth.login.submitLabel} onChange={(event) => updateAuthLoginField('submitLabel', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-login-google">Google Button Label</label>
                        <input id="branding-login-google" value={draft.auth.login.googleLabel} onChange={(event) => updateAuthLoginField('googleLabel', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-login-prompt">Footer Prompt</label>
                        <input id="branding-login-prompt" value={draft.auth.login.alternatePrompt} onChange={(event) => updateAuthLoginField('alternatePrompt', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-login-link">Footer Link Label</label>
                        <input id="branding-login-link" value={draft.auth.login.alternateLinkLabel} onChange={(event) => updateAuthLoginField('alternateLinkLabel', event.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="branding-subsection-panel">
                    <div className="branding-management-heading">
                      <strong>Register Page</strong>
                      <span>Student registration screen copy.</span>
                    </div>
                    <div className="admin-form-grid">
                      <div className="form-field">
                        <label htmlFor="branding-register-pill">Pill Label</label>
                        <input id="branding-register-pill" value={draft.auth.register.pill} onChange={(event) => updateAuthRegisterField('pill', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-register-title">Title</label>
                        <input id="branding-register-title" value={draft.auth.register.title} onChange={(event) => updateAuthRegisterField('title', event.target.value)} />
                      </div>
                      <div className="form-field branding-span-full">
                        <label htmlFor="branding-register-subtitle">Subtitle</label>
                        <textarea id="branding-register-subtitle" value={draft.auth.register.subtitle} onChange={(event) => updateAuthRegisterField('subtitle', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-register-submit">Submit Label</label>
                        <input id="branding-register-submit" value={draft.auth.register.submitLabel} onChange={(event) => updateAuthRegisterField('submitLabel', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-register-prompt">Footer Prompt</label>
                        <input id="branding-register-prompt" value={draft.auth.register.alternatePrompt} onChange={(event) => updateAuthRegisterField('alternatePrompt', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-register-link">Footer Link Label</label>
                        <input id="branding-register-link" value={draft.auth.register.alternateLinkLabel} onChange={(event) => updateAuthRegisterField('alternateLinkLabel', event.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="branding-register-note-strong">Access Note Lead</label>
                        <input id="branding-register-note-strong" value={draft.auth.register.academicNote} onChange={(event) => updateAuthRegisterField('academicNote', event.target.value)} />
                      </div>
                      <div className="form-field branding-span-full">
                        <label htmlFor="branding-register-note">Access Note Body</label>
                        <input id="branding-register-note" value={draft.auth.register.staffNote} onChange={(event) => updateAuthRegisterField('staffNote', event.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={`admin-section-card ${isSectionActive('overview') || isSectionActive('landing') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>Navbar and Sidebar</h3>
                  <p>Manage public navigation labels and System Admin shell sidebar copy.</p>
                </div>
              </div>
              <div className="admin-section-body">
                <div className="admin-form-grid">
                  <div className="form-field">
                    <label htmlFor="branding-nav-subtitle">Public Navbar Subtitle</label>
                    <input id="branding-nav-subtitle" value={draft.navigation.subtitle} onChange={(event) => updateNavigationField('subtitle', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-nav-login">Login Button Label</label>
                    <input id="branding-nav-login" value={draft.navigation.loginLabel} onChange={(event) => updateNavigationField('loginLabel', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-nav-register">Register Button Label</label>
                    <input id="branding-nav-register" value={draft.navigation.registerLabel} onChange={(event) => updateNavigationField('registerLabel', event.target.value)} />
                  </div>
                  <div className="branding-toggle-stack">
                    <label className="branding-toggle-line">
                      <input checked={draft.navigation.showLogin} type="checkbox" onChange={(event) => updateNavigationField('showLogin', event.target.checked)} />
                      Show Login Button
                    </label>
                    <label className="branding-toggle-line">
                      <input checked={draft.navigation.showRegister} type="checkbox" onChange={(event) => updateNavigationField('showRegister', event.target.checked)} />
                      Show Register Button
                    </label>
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-shell-navbar-title">Portal Navbar Title</label>
                    <input id="branding-shell-navbar-title" value={draft.shell.navbarTitle} onChange={(event) => updateShellField('navbarTitle', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-shell-navbar-subtitle">Portal Navbar Subtitle</label>
                    <input id="branding-shell-navbar-subtitle" value={draft.shell.navbarSubtitle} onChange={(event) => updateShellField('navbarSubtitle', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-shell-sidebar-kicker">Sidebar Kicker</label>
                    <input id="branding-shell-sidebar-kicker" value={draft.shell.sidebarKicker} onChange={(event) => updateShellField('sidebarKicker', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-shell-sidebar-title">Sidebar Title</label>
                    <input id="branding-shell-sidebar-title" value={draft.shell.sidebarTitle} onChange={(event) => updateShellField('sidebarTitle', event.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="branding-shell-sidebar-badge">Sidebar Badge</label>
                    <input id="branding-shell-sidebar-badge" value={draft.shell.sidebarBadge} onChange={(event) => updateShellField('sidebarBadge', event.target.value)} />
                  </div>
                  <div className="form-field branding-span-full">
                    <label htmlFor="branding-shell-sidebar-description">Sidebar Description</label>
                    <textarea id="branding-shell-sidebar-description" value={draft.shell.sidebarDescription} onChange={(event) => updateShellField('sidebarDescription', event.target.value)} />
                  </div>
                </div>

                <div className="branding-management-list">
                  <div className="branding-management-heading">
                    <strong>Public Navigation Links</strong>
                    <span>Visible in the public landing navbar.</span>
                  </div>
                  {draft.navigation.links.map((link, index) => (
                    <div key={link.id} className="branding-repeater-card">
                      <label className="branding-toggle-line">
                        <input checked={link.visible} type="checkbox" onChange={(event) => updateNavigationLink(index, 'visible', event.target.checked)} />
                        Visible
                      </label>
                      <div className="branding-mini-editor-grid">
                        <div className="form-field">
                          <label htmlFor={`branding-nav-link-label-${link.id}`}>Label</label>
                          <input id={`branding-nav-link-label-${link.id}`} value={link.label} onChange={(event) => updateNavigationLink(index, 'label', event.target.value)} />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`branding-nav-link-href-${link.id}`}>Href</label>
                          <input id={`branding-nav-link-href-${link.id}`} value={link.href} onChange={(event) => updateNavigationLink(index, 'href', event.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={`admin-section-card ${isSectionActive('programs') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>Departments</h3>
                  <p>Add new departments and manage names, register dropdown labels, logos, colors, and public descriptions.</p>
                </div>
                <button className="btn btn-primary small" type="button" onClick={addDepartment}>
                  <i className="fas fa-plus"></i>
                  Add Department
                </button>
              </div>
              <div className="admin-section-body">
                <div className="branding-department-grid">
                  {draft.departments.map((department, index) => {
                    const isDefaultDepartment = DEFAULT_DEPARTMENT_IDS.has(department.id.toUpperCase());

                    return (
                      <div key={`${department.id || 'department'}-${index}`} className="branding-department-editor">
                        <div className="branding-department-editor-head">
                          <span style={{ backgroundColor: department.color }}></span>
                          <div>
                            <strong>{department.shortName}</strong>
                            <small>{department.id}</small>
                          </div>
                          <div className="branding-department-editor-actions">
                            {isDefaultDepartment ? (
                              <span className="admin-inline-badge">Default</span>
                            ) : (
                              <button className="btn btn-outline small" title="Remove" type="button" onClick={() => removeDepartment(index)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                            <button className="btn btn-outline small" type="button" onClick={() => setEditingDepartmentIndex(index)}>
                              <i className="fas fa-pen"></i>
                              Edit
                            </button>
                            <label className="branding-toggle-line">
                              <input checked={department.active} type="checkbox" onChange={(event) => updateDepartmentField(index, 'active', event.target.checked)} />
                              Active
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {editingDepartmentIndex !== null && draft.departments[editingDepartmentIndex] && (
              <div className="modal show" style={{ padding: 0, background: '#f8fafc' }}>
                <div className="modal-content" style={{ width: '100%', height: '100%', maxHeight: '100%', borderRadius: 0, border: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'none' }}>
                  <div className="modal-header" style={{ flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button className="btn btn-outline small" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }} onClick={() => setEditingDepartmentIndex(null)} type="button">
                        <i className="fas fa-arrow-left"></i> Back
                      </button>
                      <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)' }}></div>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1 }}>{draft.departments[editingDepartmentIndex].name || draft.departments[editingDepartmentIndex].shortName || 'New Program'}</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>Program Configuration & Identity</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-outline" type="button" onClick={() => window.open(`/departments/${savedBranding.departments[editingDepartmentIndex]?.id || 'PREVIEW'}?brandingPreview=1&previewIndex=${editingDepartmentIndex}`, '_blank', 'noopener,noreferrer')}>
                        <i className="fas fa-arrow-up-right-from-square"></i> Pop Out Preview
                      </button>
                      <button className="btn btn-primary" type="button" onClick={() => setEditingDepartmentIndex(null)} style={{ background: draft.departments[editingDepartmentIndex].color || 'var(--primary)', borderColor: draft.departments[editingDepartmentIndex].color || 'var(--primary)' }}>
                        <i className="fas fa-check"></i> Save & Close
                      </button>
                    </div>
                  </div>
                  
                  <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0', flex: '1 1 auto', minHeight: 0, padding: 0, background: '#f8fafc' }}>
                    <div style={{ overflowY: 'auto', padding: '2.5rem', minHeight: 0 }}>
                      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        
                        <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', borderTop: `4px solid ${draft.departments[editingDepartmentIndex].color || 'var(--border)'}` }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             <i className="fas fa-id-card" style={{ color: draft.departments[editingDepartmentIndex].color || 'var(--primary)' }}></i> Core Identity
                          </h4>
                          <div className="branding-mini-editor-grid">
                            <div className="form-field">
                              <label htmlFor={`branding-dept-id-${editingDepartmentIndex}`}>Department Code</label>
                              <input
                                disabled={DEFAULT_DEPARTMENT_IDS.has(draft.departments[editingDepartmentIndex].id.toUpperCase())}
                                id={`branding-dept-id-${editingDepartmentIndex}`}
                                value={draft.departments[editingDepartmentIndex].id}
                                onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'id', normalizeDepartmentDraftId(event.target.value))}
                              />
                              <span className="branding-field-note">
                                {DEFAULT_DEPARTMENT_IDS.has(draft.departments[editingDepartmentIndex].id.toUpperCase()) ? 'Default department code is locked.' : 'Used in URL: /departments/CODE'}
                              </span>
                            </div>
                            <div className="form-field">
                              <label htmlFor={`branding-dept-short-${editingDepartmentIndex}`}>Short Name</label>
                              <input id={`branding-dept-short-${editingDepartmentIndex}`} value={draft.departments[editingDepartmentIndex].shortName} onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'shortName', event.target.value)} />
                            </div>
                            <div className="form-field branding-span-full">
                              <label htmlFor={`branding-dept-name-${editingDepartmentIndex}`}>Full Name</label>
                              <input id={`branding-dept-name-${editingDepartmentIndex}`} value={draft.departments[editingDepartmentIndex].name} onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'name', event.target.value)} />
                            </div>
                            <div className="form-field branding-span-full">
                              <label htmlFor={`branding-dept-label-${editingDepartmentIndex}`}>Register Dropdown Label</label>
                              <input id={`branding-dept-label-${editingDepartmentIndex}`} value={draft.departments[editingDepartmentIndex].label} onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'label', event.target.value)} />
                            </div>
                            <div className="form-field">
                              <label htmlFor={`branding-dept-color-${editingDepartmentIndex}`}>Primary Color</label>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <div style={{ position: 'relative', width: '3rem', height: '3rem', borderRadius: '0.95rem', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                  <input 
                                    type="color" 
                                    id={`branding-dept-color-picker-${editingDepartmentIndex}`} 
                                    value={draft.departments[editingDepartmentIndex].color.startsWith('#') ? draft.departments[editingDepartmentIndex].color : '#003A8F'} 
                                    onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'color', event.target.value)}
                                    style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', cursor: 'pointer', border: 'none', padding: 0, background: 'none' }}
                                  />
                                </div>
                                <input 
                                  id={`branding-dept-color-${editingDepartmentIndex}`} 
                                  value={draft.departments[editingDepartmentIndex].color} 
                                  onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'color', event.target.value)} 
                                  placeholder="#000000"
                                  style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: 600 }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                {[
                                  { label: 'IT', color: '#262626' },
                                  { label: 'MET', color: '#B91C1C' },
                                  { label: 'TCM', color: '#7E22CE' },
                                  { label: 'ESM', color: '#15803D' },
                                  { label: 'NAME', color: '#0369A1' },
                                  { label: 'Orange', color: '#EA580C' },
                                  { label: 'Teal', color: '#0F766E' },
                                  { label: 'Rose', color: '#BE123C' }
                                ].map(preset => (
                                  <button
                                    key={preset.color}
                                    type="button"
                                    onClick={() => updateDepartmentField(editingDepartmentIndex, 'color', preset.color)}
                                    title={preset.label}
                                    style={{
                                      width: '1.8rem',
                                      height: '1.8rem',
                                      borderRadius: '0.5rem',
                                      background: preset.color,
                                      border: draft.departments[editingDepartmentIndex].color.toUpperCase() === preset.color.toUpperCase() ? '2px solid var(--primary-dark)' : '2px solid transparent',
                                      cursor: 'pointer',
                                      boxShadow: draft.departments[editingDepartmentIndex].color.toUpperCase() === preset.color.toUpperCase() ? '0 0 0 2px #fff inset' : '0 2px 4px rgba(0,0,0,0.1)',
                                      padding: 0,
                                      transition: 'all 0.2s'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="form-field">
                              <label htmlFor={`branding-dept-color-secondary-${editingDepartmentIndex}`}>Secondary Color (Optional)</label>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <div style={{ position: 'relative', width: '3rem', height: '3rem', borderRadius: '0.95rem', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                  <input 
                                    type="color" 
                                    id={`branding-dept-color-secondary-picker-${editingDepartmentIndex}`} 
                                    value={draft.departments[editingDepartmentIndex].secondaryColor?.startsWith('#') ? draft.departments[editingDepartmentIndex].secondaryColor : '#000000'} 
                                    onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'secondaryColor', event.target.value)}
                                    style={{ position: 'absolute', top: '-10px', left: '-10px', width: '200%', height: '200%', cursor: 'pointer', border: 'none', padding: 0, background: 'none' }}
                                  />
                                </div>
                                <input 
                                  id={`branding-dept-color-secondary-${editingDepartmentIndex}`} 
                                  value={draft.departments[editingDepartmentIndex].secondaryColor || ''} 
                                  onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'secondaryColor', event.target.value)} 
                                  placeholder="Auto-generated"
                                  style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: 600 }}
                                />
                                {draft.departments[editingDepartmentIndex].secondaryColor && (
                                  <button type="button" onClick={() => updateDepartmentField(editingDepartmentIndex, 'secondaryColor', '')} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Reset to auto-generated">
                                    <i className="fas fa-xmark text-lg"></i>
                                  </button>
                                )}
                              </div>
                              <span className="branding-field-note" style={{ marginTop: '0.75rem' }}>Leave blank to automatically calculate the secondary gradient based on the primary color.</span>
                            </div>
                            <div className="form-field">
                              <label htmlFor={`branding-dept-icon-${editingDepartmentIndex}`}>Icon Class</label>
                              <input id={`branding-dept-icon-${editingDepartmentIndex}`} value={draft.departments[editingDepartmentIndex].icon} onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'icon', event.target.value)} />
                            </div>
                            <div className="form-field branding-span-full" style={{ marginTop: '1rem' }}>
                              <label htmlFor={`branding-dept-description-${editingDepartmentIndex}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <i className="fas fa-quote-left text-brand-primary"></i> Public Description
                              </label>
                              <textarea 
                                id={`branding-dept-description-${editingDepartmentIndex}`} 
                                value={draft.departments[editingDepartmentIndex].description} 
                                onChange={(event) => updateDepartmentField(editingDepartmentIndex, 'description', event.target.value)} 
                                style={{ minHeight: '120px', lineHeight: 1.6, border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.5rem', padding: '1rem', width: '100%' }} 
                                placeholder="Describe the vision, mission, and scope of this department..."
                              />
                            </div>
                          </div>

                          <div className="branding-form-section branding-form-section-highlighted" style={{ marginTop: '2.5rem' }}>
                            <div className="branding-section-header-compact">
                              <h4><i className="fas fa-address-card"></i> Program Profile Card</h4>
                            </div>
                            <div className="branding-mini-editor-grid">
                              <div className="form-field">
                                <label>Card Heading (e.g. PROGRAM PROFILE)</label>
                                <input 
                                  value={draft.departments[editingDepartmentIndex].profileCard?.heading || 'PROGRAM PROFILE'} 
                                  onChange={(e) => updateDepartmentField(editingDepartmentIndex, 'profileCard', { heading: e.target.value, features: draft.departments[editingDepartmentIndex].profileCard?.features || [], workflowHeading: draft.departments[editingDepartmentIndex].profileCard?.workflowHeading || 'WORKFLOW COVERAGE', workflowText: draft.departments[editingDepartmentIndex].profileCard?.workflowText || 'Register, review, defend, archive' })} 
                                />
                              </div>
                              <div className="form-field branding-span-full">
                                <label>Custom Bullet Points (Optional)</label>
                                
                                <div className="branding-repeater-container" style={{ background: '#fafafa', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                  <div className="branding-repeater-actions" style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Points List</span>
                                    <button 
                                      type="button" 
                                      className="btn btn-outline"
                                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '0.5rem', background: '#fff' }}
                                      onClick={() => {
                                        const currentCard = draft.departments[editingDepartmentIndex].profileCard || { heading: 'PROGRAM PROFILE', features: [], workflowHeading: 'WORKFLOW COVERAGE', workflowText: 'Register, review, defend, archive' };
                                        const features = [...(currentCard.features || [])];
                                        features.push('New Bullet Point');
                                        updateDepartmentField(editingDepartmentIndex, 'profileCard', { ...currentCard, features });
                                      }}
                                    >
                                      <i className="fas fa-plus text-brand-primary"></i> Add Bullet Point
                                    </button>
                                  </div>
                                  
                                  {(!draft.departments[editingDepartmentIndex].profileCard?.features || draft.departments[editingDepartmentIndex].profileCard.features.length === 0) && (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', background: '#fff', margin: '1rem', borderRadius: '0.5rem', border: '1px dashed rgba(0,0,0,0.1)' }}>
                                      <i className="fas fa-list-ul" style={{ display: 'block', fontSize: '1.25rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
                                      No custom bullet points. Falling back to Key Research Areas.
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem' }}>
                                    {(draft.departments[editingDepartmentIndex].profileCard?.features || []).map((feature, i) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.04)' }}>
                                        <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '0.35rem', color: 'var(--muted)', fontSize: '0.7rem', flexShrink: 0, border: '1px solid rgba(0,0,0,0.05)' }}>
                                          {i + 1}
                                        </div>
                                        <input 
                                          placeholder="e.g. Network Administration"
                                          value={feature}
                                          onChange={(e) => {
                                            const currentCard = draft.departments[editingDepartmentIndex].profileCard || { heading: 'PROGRAM PROFILE', features: [], workflowHeading: 'WORKFLOW COVERAGE', workflowText: 'Register, review, defend, archive' };
                                            const features = [...(currentCard.features || [])];
                                            features[i] = e.target.value;
                                            updateDepartmentField(editingDepartmentIndex, 'profileCard', { ...currentCard, features });
                                          }}
                                          style={{ flex: 1, border: 'none', background: 'transparent', boxShadow: 'none', padding: '0.25rem' }}
                                        />
                                        <button 
                                          type="button"
                                          style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.4rem', opacity: 0.6, transition: 'opacity 0.2s' }}
                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                          onClick={() => {
                                            const currentCard = draft.departments[editingDepartmentIndex].profileCard || { heading: 'PROGRAM PROFILE', features: [], workflowHeading: 'WORKFLOW COVERAGE', workflowText: 'Register, review, defend, archive' };
                                            const features = [...(currentCard.features || [])];
                                            features.splice(i, 1);
                                            updateDepartmentField(editingDepartmentIndex, 'profileCard', { ...currentCard, features });
                                          }}
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="form-field">
                                <label>Workflow Heading (e.g. WORKFLOW COVERAGE)</label>
                                <input 
                                  value={draft.departments[editingDepartmentIndex].profileCard?.workflowHeading || 'WORKFLOW COVERAGE'} 
                                  onChange={(e) => updateDepartmentField(editingDepartmentIndex, 'profileCard', { heading: draft.departments[editingDepartmentIndex].profileCard?.heading || 'PROGRAM PROFILE', features: draft.departments[editingDepartmentIndex].profileCard?.features || [], workflowHeading: e.target.value, workflowText: draft.departments[editingDepartmentIndex].profileCard?.workflowText || 'Register, review, defend, archive' })} 
                                />
                              </div>
                              <div className="form-field">
                                <label>Workflow Text</label>
                                <input 
                                  value={draft.departments[editingDepartmentIndex].profileCard?.workflowText || 'Register, review, defend, archive'} 
                                  onChange={(e) => updateDepartmentField(editingDepartmentIndex, 'profileCard', { heading: draft.departments[editingDepartmentIndex].profileCard?.heading || 'PROGRAM PROFILE', features: draft.departments[editingDepartmentIndex].profileCard?.features || [], workflowHeading: draft.departments[editingDepartmentIndex].profileCard?.workflowHeading || 'WORKFLOW COVERAGE', workflowText: e.target.value })} 
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', borderTop: `4px solid ${draft.departments[editingDepartmentIndex].color || 'var(--border)'}` }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             <i className="fas fa-image" style={{ color: draft.departments[editingDepartmentIndex].color || 'var(--primary)' }}></i> Brand Assets
                          </h4>
                          <AssetUploadControl
                            accept="image/png,image/jpeg,image/svg+xml"
                            assetKey={`department-logo-${draft.departments[editingDepartmentIndex].id}`}
                            description={`Upload a specific logo for ${draft.departments[editingDepartmentIndex].shortName || 'this department'}.`}
                            label={`${draft.departments[editingDepartmentIndex].shortName || 'Department'} Logo`}
                            maxBytes={5_000_000}
                            pendingFile={pendingDepartmentFiles[`${draft.departments[editingDepartmentIndex].id}|logo`] || pendingDepartmentFiles[draft.departments[editingDepartmentIndex].id]}
                            value={draft.departments[editingDepartmentIndex].logo}
                            onChange={(value) => updateDepartmentField(editingDepartmentIndex, 'logo', value)}
                            onFile={(file, previewUrl) => handleDepartmentFile(editingDepartmentIndex, draft.departments[editingDepartmentIndex].id, file, previewUrl)}
                            onReset={() => updateDepartmentField(editingDepartmentIndex, 'logo', '')}
                            onWarning={(message) => setBanner({ tone: 'warning', title: 'Asset not accepted', body: message })}
                            isSaving={isSaving}
                          />
                        </div>

                        <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', borderTop: `4px solid ${draft.departments[editingDepartmentIndex].color || 'var(--border)'}` }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             <i className="fas fa-graduation-cap" style={{ color: draft.departments[editingDepartmentIndex].color || 'var(--primary)' }}></i> Academic Configuration
                          </h4>
                          
                          <div className="branding-form-section branding-form-section-highlighted" style={{ marginBottom: '2rem' }}>
                            <div className="branding-section-header-compact">
                              <h4><i className="fas fa-flask"></i> Facilities & Labs</h4>
                            </div>
                            <div className="form-field">
                              <textarea 
                                value={(draft.departments[editingDepartmentIndex].facilities || []).join('\n')} 
                                onChange={(e) => updateDepartmentField(editingDepartmentIndex, 'facilities', e.target.value.split('\n'))} 
                                style={{ minHeight: '120px', lineHeight: 1.6, border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.5rem', padding: '1rem' }} 
                                placeholder="Advanced Computer Laboratories...&#10;Networking & Cybersecurity Laboratory...&#10;Software Development Hub..."
                              />
                            </div>
                          </div>

                          <div className="branding-form-section branding-form-section-highlighted" style={{ marginBottom: '2.5rem' }}>
                            <div className="branding-section-header-compact">
                              <h4><i className="fas fa-star"></i> Program Highlights</h4>
                            </div>
                            <div className="form-field">
                              <textarea 
                                value={(draft.departments[editingDepartmentIndex].programHighlights || []).join('\n')} 
                                onChange={(e) => updateDepartmentField(editingDepartmentIndex, 'programHighlights', e.target.value.split('\n'))} 
                                style={{ minHeight: '120px', lineHeight: 1.6, border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.5rem', padding: '1rem' }} 
                                placeholder="Three specialized tracks...&#10;Industry certification programs...&#10;Hands-on training..."
                              />
                            </div>
                          </div>
                          
                          <div className="branding-form-section branding-form-section-highlighted">
                            <div className="branding-section-header-compact">
                              <h4><i className="fas fa-microscope"></i> Key Research & Focus Areas</h4>
                            </div>
                            
                            <div className="branding-mini-editor-grid" style={{ marginBottom: '1.25rem' }}>
                              <div className="form-field">
                                <label>Section Heading</label>
                                <input 
                                  value={draft.departments[editingDepartmentIndex].keyAreasHeading || 'Key Research & Focus Areas'} 
                                  onChange={(e) => updateDepartmentField(editingDepartmentIndex, 'keyAreasHeading', e.target.value)} 
                                />
                              </div>
                              <div className="form-field">
                                <label>Section Subheading</label>
                                <input 
                                  value={draft.departments[editingDepartmentIndex].keyAreasSubheading || 'Areas of Excellence'} 
                                  onChange={(e) => updateDepartmentField(editingDepartmentIndex, 'keyAreasSubheading', e.target.value)} 
                                />
                              </div>
                            </div>
                            
                            <div className="branding-repeater-container" style={{ background: '#fafafa', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                              <div className="branding-repeater-actions" style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Research Areas List</span>
                                <button 
                                  type="button" 
                                  className="btn btn-outline"
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '0.5rem', background: '#fff' }}
                                  onClick={() => {
                                    const areas = [...(draft.departments[editingDepartmentIndex].keyAreas || [])];
                                    areas.push({ title: 'New Focus Area', description: '', icon: 'fas fa-star' });
                                    updateDepartmentField(editingDepartmentIndex, 'keyAreas', areas);
                                  }}
                                >
                                  <i className="fas fa-plus text-brand-primary"></i> Add Area
                                </button>
                              </div>
                              
                              {(draft.departments[editingDepartmentIndex].keyAreas || []).length === 0 && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', background: '#fff', margin: '1rem', borderRadius: '0.5rem', border: '1px dashed rgba(0,0,0,0.1)' }}>
                                  <i className="fas fa-microscope" style={{ display: 'block', fontSize: '1.25rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
                                  No focus areas added yet.
                                </div>
                              )}
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {(draft.departments[editingDepartmentIndex].keyAreas || []).map((area, areaIdx) => (
                                  <div key={areaIdx} className="branding-repeater-card" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '0.85rem', padding: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.75rem' }}>
                                      <strong style={{ fontSize: '0.85rem', color: 'var(--brand-primary)' }}>Focus Area {areaIdx + 1}</strong>
                                      <button 
                                        type="button" 
                                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        onClick={() => {
                                          const areas = [...(draft.departments[editingDepartmentIndex].keyAreas || [])];
                                          areas.splice(areaIdx, 1);
                                          updateDepartmentField(editingDepartmentIndex, 'keyAreas', areas);
                                        }}
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </div>
                                    <div className="branding-mini-editor-grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                                      <div className="form-field">
                                        <label>Area Title</label>
                                        <input 
                                          value={area.title} 
                                          onChange={(e) => {
                                            const areas = [...(draft.departments[editingDepartmentIndex].keyAreas || [])];
                                            areas[areaIdx] = { ...area, title: e.target.value };
                                            updateDepartmentField(editingDepartmentIndex, 'keyAreas', areas);
                                          }} 
                                          style={{ fontWeight: 'bold' }}
                                        />
                                      </div>
                                      <div className="form-field">
                                        <label>Icon (Class, URL, or Upload)</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                          <div>
                                            <input 
                                              placeholder="Class (fas fa-star) or https://..."
                                              value={area.icon} 
                                              onChange={(e) => {
                                                const areas = [...(draft.departments[editingDepartmentIndex].keyAreas || [])];
                                                areas[areaIdx] = { ...area, icon: e.target.value };
                                                updateDepartmentField(editingDepartmentIndex, 'keyAreas', areas);
                                              }} 
                                            />
                                          </div>
                                          <div>
                                            <AssetUploadControl
                                              accept="image/png,image/jpeg,image/svg+xml"
                                              assetKey={`dept-${draft.departments[editingDepartmentIndex].id}-keyarea-${areaIdx}`}
                                              label="Upload Icon Image"
                                              description=""
                                              maxBytes={2_000_000}
                                              pendingFile={pendingDepartmentFiles[`${draft.departments[editingDepartmentIndex].id}|keyArea|${areaIdx}`]}
                                              value={area.icon.startsWith('http') || area.icon.startsWith('data:') ? area.icon : ''}
                                              onChange={(value) => {
                                                const areas = [...(draft.departments[editingDepartmentIndex].keyAreas || [])];
                                                areas[areaIdx] = { ...area, icon: value };
                                                updateDepartmentField(editingDepartmentIndex, 'keyAreas', areas);
                                              }}
                                              onFile={(file, previewUrl) => handleDepartmentFile(editingDepartmentIndex, draft.departments[editingDepartmentIndex].id, file, previewUrl, 'keyArea', areaIdx)}
                                              onReset={() => {
                                                const areas = [...(draft.departments[editingDepartmentIndex].keyAreas || [])];
                                                areas[areaIdx] = { ...area, icon: 'fas fa-star' };
                                                updateDepartmentField(editingDepartmentIndex, 'keyAreas', areas);
                                              }}
                                              isSaving={isSaving}
                                              hideUrlInput={true}
                                              onWarning={(message) => setBanner({ tone: 'warning', title: 'Asset not accepted', body: message })}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="form-field">
                                        <label>Description</label>
                                        <textarea 
                                          value={area.description} 
                                          onChange={(e) => {
                                            const areas = [...(draft.departments[editingDepartmentIndex].keyAreas || [])];
                                            areas[areaIdx] = { ...area, description: e.target.value };
                                            updateDepartmentField(editingDepartmentIndex, 'keyAreas', areas);
                                          }} 
                                          style={{ minHeight: '90px', lineHeight: 1.5 }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div style={{ padding: '2.5rem 2.5rem 2.5rem 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ borderRadius: '0.85rem', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 24px 48px rgba(15,23,42,0.12)' }}>
                        <div style={{ height: '2.4rem', background: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '0.45rem' }}>
                          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }}></div>
                          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }}></div>
                          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981' }}></div>
                          <div style={{ margin: '0 auto', background: '#fff', padding: '0.15rem 1.8rem', borderRadius: '0.4rem', fontSize: '0.7rem', color: '#94a3b8', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <i className="fas fa-lock" style={{ marginRight: '0.4rem', fontSize: '0.6rem' }}></i>
                            thesistrack.edu/departments/{savedBranding.departments[editingDepartmentIndex]?.id?.toLowerCase() || 'preview'}
                          </div>
                          <div style={{ width: '42px' }}></div>
                        </div>
                        <div style={{ position: 'relative', flex: 1, background: '#f8fafc', overflow: 'hidden' }}>
                          <div style={{ width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                            <iframe
                              key={`dept-preview-${editingDepartmentIndex}`}
                              src={`/departments/${savedBranding.departments[editingDepartmentIndex]?.id || 'PREVIEW'}?brandingPreview=1&previewIndex=${editingDepartmentIndex}`}
                              title={`Department preview`}
                              style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className={`admin-section-card ${isSectionActive('programs') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3><i className="fas fa-layer-group" style={{ marginRight: '0.75rem', color: 'var(--brand-primary)' }}></i> Programs Content</h3>
                </div>
              </div>
              <div className="admin-section-body">
                <div className="branding-form-section">
                  <div className="branding-section-header-compact" style={{ marginBottom: '1.25rem' }}>
                    <h4><i className="fas fa-heading"></i> Global Header</h4>
                  </div>
                  <div className="branding-mini-editor-grid">
                    <div className="form-field branding-span-full">
                      <label htmlFor="branding-programs-title">Section Title</label>
                      <input
                        id="branding-programs-title"
                        value={draft.programsContent.title}
                        onChange={(event) => updateProgramsContentField('title', event.target.value)}
                        placeholder="e.g. Academic Departments & Programs"
                        style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                      />
                    </div>
                    <div className="form-field branding-span-full">
                      <label htmlFor="branding-programs-description">Section Description</label>
                      <textarea
                        id="branding-programs-description"
                        value={draft.programsContent.description}
                        onChange={(event) => updateProgramsContentField('description', event.target.value)}
                        placeholder="Provide a short description of the programs offered..."
                        style={{ minHeight: '100px', lineHeight: '1.6' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="branding-form-section branding-form-section-highlighted" style={{ marginTop: '2rem' }}>
                  <div className="branding-section-header-compact" style={{ marginBottom: '1.25rem' }}>
                    <h4><i className="fas fa-star"></i> Global Highlights</h4>
                  </div>
                  
                  <div className="branding-repeater-container">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                      {draft.programsContent.highlights.map((highlight, index) => (
                        <div key={highlight.id} className="branding-repeater-card" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '0.85rem', padding: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.75rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--brand-primary)' }}>Highlight {index + 1}</strong>
                            <label className="branding-toggle-line" style={{ margin: 0 }}>
                              <input
                                checked={highlight.visible}
                                type="checkbox"
                                onChange={(event) => updateProgramsContentHighlight(index, 'visible', event.target.checked)}
                              />
                              <span style={{ fontSize: '0.8rem' }}>Visible</span>
                            </label>
                          </div>
                          <div className="branding-mini-editor-grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div className="form-field">
                              <label htmlFor={`branding-programs-highlight-value-${highlight.id}`}>Value (e.g. 50+)</label>
                              <input
                                id={`branding-programs-highlight-value-${highlight.id}`}
                                value={highlight.value}
                                onChange={(event) => updateProgramsContentHighlight(index, 'value', event.target.value)}
                                style={{ fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center', color: 'var(--brand-primary)' }}
                              />
                            </div>
                            <div className="form-field">
                              <label htmlFor={`branding-programs-highlight-label-${highlight.id}`}>Label (e.g. Certified Programs)</label>
                              <input
                                id={`branding-programs-highlight-label-${highlight.id}`}
                                value={highlight.label}
                                onChange={(event) => updateProgramsContentHighlight(index, 'label', event.target.value)}
                                style={{ textAlign: 'center' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={`admin-section-card ${isSectionActive('logos') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>Logo Upload</h3>
                  <p>Main, light, dark, school logo, favicon, and login background assets.</p>
                </div>
              </div>
              <div className="admin-section-body">
                <div className="branding-asset-grid">
                  {ASSET_FIELDS.map((asset) => (
                    <AssetUploadControl
                      key={asset.key}
                      accept={asset.accept}
                      assetKey={asset.key}
                      description={asset.description}
                      label={asset.label}
                      maxBytes={asset.maxBytes}
                      pendingFile={pendingFiles[asset.key]}
                      value={draft.assets[asset.key]}
                      onChange={(value) => updateAsset(asset.key, value)}
                      onFile={(file, previewUrl) => handleAssetFile(asset.key, file, previewUrl)}
                      onReset={() => resetAsset(asset.key)}
                      onSave={() => saveBranding()}
                      isSaving={isSaving}
                      onWarning={(message) => setBanner({
                        tone: 'warning',
                        title: 'Asset not accepted',
                        body: message
                      })}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className={`admin-section-card ${isSectionActive('colors') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>Preset Themes</h3>
                  <p>Institution-ready palettes that can be customized after selection.</p>
                </div>
                <button className="btn btn-primary small" type="button" onClick={autoGenerateTheme}>
                  <i className="fas fa-wand-magic-sparkles"></i>
                  Auto Generate Theme
                </button>
              </div>
              <div className="admin-section-body">
                <div className="branding-preset-grid">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={`branding-preset-option ${draft.themePreset === preset.id ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                    >
                      <span className="branding-preset-swatches" aria-hidden="true">
                        <i style={{ backgroundColor: preset.colors.primary }}></i>
                        <i style={{ backgroundColor: preset.colors.secondary }}></i>
                        <i style={{ backgroundColor: preset.colors.accent }}></i>
                        <i style={{ backgroundColor: preset.colors.background }}></i>
                      </span>
                      <strong>{preset.name}</strong>
                      <small>{preset.description}</small>
                      {draft.themePreset === preset.id ? (
                        <span className="branding-preset-active">
                          <i className="fas fa-circle-check"></i>
                          Active
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className={`admin-section-card ${isSectionActive('colors') ? '' : 'branding-section-hidden'}`}>
              <div className="admin-section-head">
                <div>
                  <h3>Color Settings</h3>
                  <p>Each color supports picker, HEX, RGB/HSL, named search, and suggestions.</p>
                </div>
              </div>
              <div className="admin-section-body">
                <div className="branding-generated-row">
                  {[
                    ['Secondary', primaryGenerated.colors.secondary],
                    ['Accent', primaryGenerated.colors.accent],
                    ['Hover', primaryGenerated.derivedColors.hover],
                    ['Light', primaryGenerated.derivedColors.lightVariant],
                    ['Dark', primaryGenerated.derivedColors.darkVariant],
                    ['Border', primaryGenerated.derivedColors.borderSuggestion],
                    ['Background', primaryGenerated.derivedColors.backgroundSuggestion]
                  ].map(([label, color]) => (
                    <button
                      key={`${label}-${color}`}
                      className="branding-generated-chip"
                      type="button"
                      style={{ '--chip-color': color } as CSSProperties}
                      onClick={() => {
                        if (label === 'Secondary') updateColor('secondary', color);
                        if (label === 'Accent') updateColor('accent', color);
                        if (label === 'Border') updateColor('border', color);
                        if (label === 'Background') updateColor('background', color);
                      }}
                    >
                      <span></span>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="branding-color-grid">
                  {COLOR_FIELDS.map((field) => (
                    <ColorControl
                      key={field.key}
                      colorKey={field.key}
                      description={field.description}
                      label={field.label}
                      value={draft.colors[field.key]}
                      onChange={(value) => updateColor(field.key, value)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="branding-command-bar">
              <div>
                <strong>Branding Actions</strong>
                <span>{pendingFileCount ? `${pendingFileCount} asset upload pending` : 'Ready to save when changes are reviewed'}</span>
              </div>
              <div className="branding-command-actions">
                <button className="btn btn-primary" disabled={isSaving || isLoading} type="button" onClick={() => saveBranding()}>
                  {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                  Save Changes
                </button>
                <button className="btn btn-outline" disabled={isSaving} type="button" onClick={() => void restoreDefaultBranding()}>
                  <i className="fas fa-rotate-left"></i>
                  Restore Default Branding
                </button>
                <button className="btn btn-outline" disabled={isSaving} type="button" onClick={resetColorsOnly}>
                  <i className="fas fa-droplet"></i>
                  Reset Colors Only
                </button>
                <button className="btn btn-outline" disabled={isSaving} type="button" onClick={resetLogosOnly}>
                  <i className="fas fa-image"></i>
                  Reset Logo Only
                </button>
                <button className="btn btn-outline" disabled={isSaving} type="button" onClick={() => importInputRef.current?.click()}>
                  <i className="fas fa-file-import"></i>
                  Import Theme JSON
                </button>
                <input ref={importInputRef} accept="application/json" hidden type="file" onChange={importThemeJson} />
                <button className="btn btn-outline" type="button" onClick={exportThemeJson}>
                  <i className="fas fa-file-export"></i>
                  Export Theme JSON
                </button>
              </div>
            </section>
          </div>

          <aside className="branding-preview-column">
            <section className="admin-section-card branding-preview-card">
              <div className="admin-section-head">
                <div>
                  <h3>{previewCopy.title}</h3>
                  <p>{previewCopy.body}</p>
                </div>
                <div className="branding-preview-head-actions">
                  <button
                    className="btn btn-outline small branding-preview-expand-btn"
                    type="button"
                    onClick={() => window.open(PREVIEW_ROUTES[previewMode], '_blank', 'noopener,noreferrer')}
                  >
                    <i className="fas fa-arrow-up-right-from-square"></i>
                    Pop Out Preview
                  </button>
                </div>
              </div>
              <div className="admin-section-body">
                <LiveSystemPreview branding={draft} mode={previewMode} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </SystemAdminShell>
  );
}
