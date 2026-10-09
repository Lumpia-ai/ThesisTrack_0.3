export const BRANDING_SETTING_KEY = 'system.themeBranding';
export const BRANDING_VERSION = 1;

export const BRANDING_COLOR_KEYS = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'sidebar',
  'navbar',
  'textPrimary',
  'textSecondary',
  'border',
  'success',
  'warning',
  'error',
  'info'
] as const;

export type BrandingColorKey = (typeof BRANDING_COLOR_KEYS)[number];

export type BrandingColors = Record<BrandingColorKey, string>;

export type BrandingAssets = {
  mainLogo: string;
  lightLogo: string;
  darkLogo: string;
  institutionLogo: string;
  favicon: string;
  loginBackground: string;
  registerBackground: string;
  hallOfExcellence1: string;
  hallOfExcellence2: string;
  hallOfExcellence3: string;
  hallOfExcellence4: string;
  hallOfExcellence5: string;
};

export type BrandingLandingFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
  visible: boolean;
};

export type BrandingLandingStatistic = {
  id: string;
  value: string;
  label: string;
  visible: boolean;
};

export type BrandingLandingSettings = {
  subtitle: string;
  heroTitle: string;
  description: string;
  textAlignment: 'left' | 'center' | 'right';
  showCtaButtons: boolean;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  showHeroImage: boolean;
  heroImage: string;
  aboutTitle: string;
  aboutDescription: string;
  features: BrandingLandingFeature[];
  statistics: BrandingLandingStatistic[];
};

export type BrandingAuthPageSettings = {
  pill: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  alternatePrompt: string;
  alternateLinkLabel: string;
};

export type BrandingAuthSettings = {
  login: BrandingAuthPageSettings & {
    identifierLabel: string;
    identifierPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    googleLabel: string;
  };
  register: BrandingAuthPageSettings & {
    academicNote: string;
    staffNote: string;
  };
};

export type BrandingNavigationLink = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

export type BrandingNavigationSettings = {
  subtitle: string;
  loginLabel: string;
  registerLabel: string;
  showLogin: boolean;
  showRegister: boolean;
  links: BrandingNavigationLink[];
};

export type BrandingShellSettings = {
  navbarTitle: string;
  navbarSubtitle: string;
  sidebarKicker: string;
  sidebarTitle: string;
  sidebarDescription: string;
  sidebarBadge: string;
};

export type BrandingDepartmentSettings = {
  id: string;
  shortName: string;
  name: string;
  label: string;
  description: string;
  mission: string;
  vision: string;
  icon: string;
  color: string;
  secondaryColor?: string;
  logo: string;
  active: boolean;
  keyAreas?: { title: string; description: string; icon: string }[];
  facilities?: string[];
  programHighlights?: string[];
  stats?: { label: string; value: string }[];
  chartData?: { year: string; completed: number; ongoing: number }[];
  profileCard?: {
    heading: string;
    features: string[];
    workflowHeading: string;
    workflowText: string;
  };
  keyAreasHeading?: string;
  keyAreasSubheading?: string;
};

export type BrandingDerivedColors = {
  hover: string;
  lightVariant: string;
  darkVariant: string;
  borderSuggestion: string;
  backgroundSuggestion: string;
};

export type BrandingProgramsSettings = {
  title: string;
  description: string;
  highlights: BrandingLandingStatistic[];
};

export type BrandingSettings = {
  version: number;
  systemName: string;
  systemShortName: string;
  tagline: string;
  institutionName: string;
  institutionTagline: string;
  themePreset: string;
  colors: BrandingColors;
  derivedColors: BrandingDerivedColors;
  assets: BrandingAssets;
  landing: BrandingLandingSettings;
  programsContent: BrandingProgramsSettings;
  auth: BrandingAuthSettings;
  navigation: BrandingNavigationSettings;
  shell: BrandingShellSettings;
  departments: BrandingDepartmentSettings[];
  updatedAt?: string;
};

export const SYSTEM_LOGO_SRC = '/System%20Logo/logo-transparent.png';
export const DEFAULT_INSTITUTION_LOGO_SRC = '/System%20Logo/ustp-logo.png';
export const DEFAULT_AUTH_BACKGROUND_SRC = '/System%20Logo/campus.png';

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  colors: BrandingColors;
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type HslColor = {
  h: number;
  s: number;
  l: number;
};

const DEFAULT_COLORS: BrandingColors = {
  primary: '#003A8F',
  secondary: '#1E40AF',
  accent: '#F6BE00',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  sidebar: '#0F3B82',
  navbar: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#64748B',
  border: '#E5E7EB',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB'
};

const DEFAULT_ASSETS: BrandingAssets = {
  mainLogo: SYSTEM_LOGO_SRC,
  lightLogo: SYSTEM_LOGO_SRC,
  darkLogo: SYSTEM_LOGO_SRC,
  institutionLogo: DEFAULT_INSTITUTION_LOGO_SRC,
  favicon: SYSTEM_LOGO_SRC,
  loginBackground: DEFAULT_AUTH_BACKGROUND_SRC,
  registerBackground: DEFAULT_AUTH_BACKGROUND_SRC,
  hallOfExcellence1: '/images/awards/award_1.png',
  hallOfExcellence2: '/images/awards/award_2.png',
  hallOfExcellence3: '/images/awards/award_3.png',
  hallOfExcellence4: '/images/awards/award_4.png',
  hallOfExcellence5: '/images/awards/award_5.png'
};

const DEFAULT_LANDING: BrandingLandingSettings = {
  subtitle: 'Built for Higher Education',
  heroTitle: 'Thesis and Capstone Project Management System',
  description: 'Manage the full lifecycle of thesis and capstone outputs, from title registration and project stage tracking to repository access, deployment, adoption, and accreditation evidence.',
  textAlignment: 'center',
  showCtaButtons: true,
  primaryCtaText: 'Open Portal',
  primaryCtaLink: '/login',
  secondaryCtaText: 'Learn More',
  secondaryCtaLink: '/about',
  showHeroImage: false,
  heroImage: '',
  aboutTitle: 'Connected capstone management in one workspace',
  aboutDescription: 'ThesisTrack centralizes capstone registration, submissions, reviews, evaluations, and archived outputs into one academic workflow.',
  features: [
    {
      id: 'secure',
      icon: 'fa-shield-halved',
      title: 'Secure and Reliable',
      description: 'Protected access for academic users, records, and project files.',
      visible: true
    },
    {
      id: 'workflow',
      icon: 'fa-diagram-project',
      title: 'Integrated Workflow',
      description: 'Connected processes from proposal to repository archive.',
      visible: true
    },
    {
      id: 'collaboration',
      icon: 'fa-users',
      title: 'Collaborative',
      description: 'Shared coordination for students, faculty, and support offices.',
      visible: true
    },
    {
      id: 'accessible',
      icon: 'fa-globe',
      title: 'Accessible Anywhere',
      description: 'Web-based access across role-specific workspaces.',
      visible: true
    }
  ],
  statistics: [
    { id: 'programs', value: '5', label: 'Programs', visible: true },
    { id: 'roles', value: '8+', label: 'User Roles', visible: true },
    { id: 'repository', value: '1', label: 'Repository', visible: true }
  ]
};

const DEFAULT_AUTH: BrandingAuthSettings = {
  login: {
    pill: 'Account Access',
    title: 'Welcome back',
    subtitle: 'Sign in to continue managing thesis submissions, reviews, and academic records.',
    submitLabel: 'Sign in',
    alternatePrompt: 'New to ThesisTrack?',
    alternateLinkLabel: 'Create an account',
    identifierLabel: 'Student ID / Email',
    identifierPlaceholder: 'e.g. 2021-00123 or user@university.edu.ph',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    googleLabel: 'Continue with Google'
  },
  register: {
    pill: 'Account Registration',
    title: 'Create Your Account',
    subtitle: 'Register with your official details. Your account opens once your identity is verified and a role is assigned.',
    submitLabel: 'Submit Registration',
    alternatePrompt: 'Already have an account?',
    alternateLinkLabel: 'Sign in here',
    academicNote: 'Every account is reviewed.',
    staffNote: 'Your identity document is checked before any access is granted.'
  }
};

const DEFAULT_NAVIGATION: BrandingNavigationSettings = {
  subtitle: 'Higher Education Institutions',
  loginLabel: 'Log in',
  registerLabel: 'Sign up',
  showLogin: true,
  showRegister: true,
  links: [
    { id: 'home', href: '/#home', label: 'Home', visible: true },
    { id: 'modules', href: '/#modules', label: 'Modules', visible: true },
    { id: 'workflow', href: '/#workflow', label: 'Workflow', visible: true },
    { id: 'about', href: '/#about', label: 'About', visible: true }
  ]
};

const DEFAULT_SHELL: BrandingShellSettings = {
  navbarTitle: 'Thesis Track',
  navbarSubtitle: 'Higher Education Institutions',
  sidebarKicker: 'Technical Control',
  sidebarTitle: 'System Admin',
  sidebarDescription: 'Platform configuration, security, backups, and access control',
  sidebarBadge: 'Super Admin'
};

export const DEFAULT_DEPARTMENTS: BrandingDepartmentSettings[] = [
  {
    id: 'IT',
    shortName: 'IT',
    name: 'Bachelor of Science in Information Technology',
    label: 'BSIT - Information Technology',
    description: 'Computing solutions, systems development, network administration, databases, and applied innovation.',
    mission: 'To produce globally competitive IT professionals equipped with technical skills, ethical values, and innovative mindsets.',
    vision: 'A nationally recognized center of excellence in Information Technology education.',
    icon: 'fas fa-laptop-code',
    color: '#FACC15',
    logo: '/department-logo/IT.png',
    active: true
  },
  {
    id: 'MET',
    shortName: 'MET',
    name: 'Bachelor of Science in Manufacturing Engineering Technology',
    label: 'BSMET - Manufacturing Eng. Tech.',
    description: 'Manufacturing engineering, mechanical design, fabrication, and digital precision manufacturing.',
    mission: 'To develop competent manufacturing engineering technologists with industry-ready skills.',
    vision: 'A leading manufacturing engineering technology program recognized for practical innovation.',
    icon: 'fas fa-industry',
    color: '#EF4444',
    logo: '/department-logo/met.png',
    active: true
  },
  {
    id: 'TCM',
    shortName: 'TCM',
    name: 'Bachelor of Science in Technology Communication Management',
    label: 'BSTCM - Technology Communication Mgmt.',
    description: 'Technology-driven communication systems, information systems, and organizational communication.',
    mission: 'To develop competent technology communication managers for modern organizations.',
    vision: 'A premier program bridging technology and communication for innovation and community development.',
    icon: 'fas fa-broadcast-tower',
    color: '#10B981',
    logo: '/department-logo/tcm.png',
    active: true
  },
  {
    id: 'ESM',
    shortName: 'ESM',
    name: 'Bachelor of Science in Energy Systems and Management',
    label: 'BSESM - Energy Systems & Mgmt.',
    description: 'Electrical machinery, industrial automation, energy systems, and preventive maintenance.',
    mission: 'To produce highly skilled energy systems professionals for sustainable energy management.',
    vision: 'A recognized program leading innovation in electrical machinery and industrial automation.',
    icon: 'fas fa-bolt',
    color: '#8B5CF6',
    logo: '/department-logo/esm.png',
    active: true
  },
  {
    id: 'NAME',
    shortName: 'NAME',
    name: 'Bachelor of Science in Naval Architecture and Marine Engineering',
    label: 'BSNAME - Naval Architecture & Marine Eng.',
    description: 'Ship design, marine systems, systems engineering, and vessel operation.',
    mission: 'To educate and train naval architects and marine engineers with comprehensive systems knowledge.',
    vision: 'A premier engineering program for marine design, construction, and maritime systems.',
    icon: 'fas fa-ship',
    color: '#003A8F',
    logo: '/department-logo/name.png',
    active: true
  }
];

const FALLBACK_DERIVED_COLORS: BrandingDerivedColors = {
  hover: '#002C6B',
  lightVariant: '#DBEAFE',
  darkVariant: '#1A1851',
  borderSuggestion: '#BFDBFE',
  backgroundSuggestion: '#EFF6FF'
};

export const DEFAULT_BRANDING: BrandingSettings = {
  version: BRANDING_VERSION,
  systemName: 'Thesis Track',
  systemShortName: 'TT',
  tagline: 'Higher Education Institutions',
  institutionName: 'University of Science and Technology of Southern Philippines (USTP)',
  institutionTagline: 'Empowering Research, Innovation, and Academic Excellence',
  themePreset: 'academic-blue',
  colors: DEFAULT_COLORS,
  derivedColors: FALLBACK_DERIVED_COLORS,
  assets: DEFAULT_ASSETS,
  landing: DEFAULT_LANDING,
  programsContent: {
    title: 'Built for multi-program coordination',
    description: 'Each department keeps its own program identity, research focus, and capstone records while ThesisTrack gives research leaders one connected view of institutional progress.',
    highlights: [
      { id: 'prog1', value: '5', label: 'Academic programs', visible: true },
      { id: 'prog2', value: '1', label: 'Shared capstone workflow', visible: true },
      { id: 'prog3', value: 'Role-based', label: 'Department visibility', visible: true }
    ]
  },
  auth: DEFAULT_AUTH,
  navigation: DEFAULT_NAVIGATION,
  shell: DEFAULT_SHELL,
  departments: DEFAULT_DEPARTMENTS
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'academic-blue',
    name: 'Academic Blue',
    description: 'Formal blue identity for university research offices.',
    colors: DEFAULT_COLORS
  },
  {
    id: 'university-gold',
    name: 'University Gold',
    description: 'Warm gold-led palette with high-contrast institutional accents.',
    colors: {
      primary: '#7C4A00',
      secondary: '#A16207',
      accent: '#F6BE00',
      background: '#FFFBEB',
      surface: '#FFFFFF',
      sidebar: '#3F2A00',
      navbar: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B5B28',
      border: '#FDE68A',
      success: '#15803D',
      warning: '#D97706',
      error: '#DC2626',
      info: '#2563EB'
    }
  },
  {
    id: 'maroon-institution',
    name: 'Maroon Institution',
    description: 'Deep maroon theme for traditional institutional branding.',
    colors: {
      primary: '#7F1D1D',
      secondary: '#991B1B',
      accent: '#F59E0B',
      background: '#FFF7ED',
      surface: '#FFFFFF',
      sidebar: '#450A0A',
      navbar: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B5560',
      border: '#FECACA',
      success: '#15803D',
      warning: '#D97706',
      error: '#B91C1C',
      info: '#1D4ED8'
    }
  },
  {
    id: 'green-research',
    name: 'Green Research',
    description: 'Research and innovation palette with calm green foundations.',
    colors: {
      primary: '#047857',
      secondary: '#065F46',
      accent: '#14B8A6',
      background: '#F0FDFA',
      surface: '#FFFFFF',
      sidebar: '#064E3B',
      navbar: '#FFFFFF',
      textPrimary: '#10231E',
      textSecondary: '#4B635B',
      border: '#99F6E4',
      success: '#16A34A',
      warning: '#D97706',
      error: '#DC2626',
      info: '#2563EB'
    }
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Quiet white interface with restrained blue actions.',
    colors: {
      primary: '#111827',
      secondary: '#475569',
      accent: '#2563EB',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      sidebar: '#111827',
      navbar: '#FFFFFF',
      textPrimary: '#111827',
      textSecondary: '#64748B',
      border: '#E5E7EB',
      success: '#16A34A',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#2563EB'
    }
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Dark operational dashboard with readable surfaces.',
    colors: {
      primary: '#2563EB',
      secondary: '#38BDF8',
      accent: '#FACC15',
      background: '#0F172A',
      surface: '#111827',
      sidebar: '#020617',
      navbar: '#111827',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      border: '#334155',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#F87171',
      info: '#60A5FA'
    }
  }
];

export const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  slate: '#334155',
  navy: '#0F172A',
  blue: '#2563EB',
  'academic blue': '#003A8F',
  'royal blue': '#1D4ED8',
  sky: '#0284C7',
  teal: '#0F766E',
  green: '#16A34A',
  emerald: '#047857',
  'research green': '#047857',
  gold: '#F6BE00',
  amber: '#F59E0B',
  orange: '#EA580C',
  maroon: '#7F1D1D',
  crimson: '#DC2626',
  red: '#DC2626',
  danger: '#DC2626',
  purple: '#7C3AED',
  violet: '#6D28D9',
  indigo: '#4338CA',
  gray: '#6B7280',
  zinc: '#71717A',
  border: '#E5E7EB',
  background: '#F8FAFC',
  surface: '#FFFFFF'
};

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function normalizeHue(value: number) {
  return ((value % 360) + 360) % 360;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringValue(value: unknown, fallback: string) {
  return String(value ?? fallback);
}

function readBooleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeDepartmentId(value: unknown, fallback: string) {
  const normalized = String(value ?? fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

  return normalized;
}

function sanitizeTextAlignment(value: unknown, fallback: BrandingLandingSettings['textAlignment']) {
  return value === 'left' || value === 'center' || value === 'right' ? value : fallback;
}

function sanitizeLandingFeatures(value: unknown, fallback: BrandingLandingFeature[]) {
  const source = Array.isArray(value) && value.length ? value : fallback;

  return source.map((item, index) => {
    const fallbackItem = fallback[index] ?? fallback[0];
    const record = isRecord(item) ? item : {};

    return {
      id: readStringValue(record.id, fallbackItem.id),
      icon: readStringValue(record.icon, fallbackItem.icon),
      title: readStringValue(record.title, fallbackItem.title),
      description: readStringValue(record.description, fallbackItem.description),
      visible: readBooleanValue(record.visible, fallbackItem.visible)
    };
  });
}

function sanitizeLandingStatistics(value: unknown, fallback: BrandingLandingStatistic[]) {
  const source = Array.isArray(value) && value.length ? value : fallback;

  return source.map((item, index) => {
    const fallbackItem = fallback[index] ?? fallback[0];
    const record = isRecord(item) ? item : {};

    return {
      id: readStringValue(record.id, fallbackItem.id),
      value: readStringValue(record.value, fallbackItem.value),
      label: readStringValue(record.label, fallbackItem.label),
      visible: readBooleanValue(record.visible, fallbackItem.visible)
    };
  });
}

function sanitizeLandingSettings(value: unknown): BrandingLandingSettings {
  const record = isRecord(value) ? value : {};

  return {
    subtitle: readStringValue(record.subtitle, DEFAULT_LANDING.subtitle),
    heroTitle: readStringValue(record.heroTitle, DEFAULT_LANDING.heroTitle),
    description: readStringValue(record.description, DEFAULT_LANDING.description),
    textAlignment: sanitizeTextAlignment(record.textAlignment, DEFAULT_LANDING.textAlignment),
    showCtaButtons: readBooleanValue(record.showCtaButtons, DEFAULT_LANDING.showCtaButtons),
    primaryCtaText: readStringValue(record.primaryCtaText, DEFAULT_LANDING.primaryCtaText),
    primaryCtaLink: readStringValue(record.primaryCtaLink, DEFAULT_LANDING.primaryCtaLink),
    secondaryCtaText: readStringValue(record.secondaryCtaText, DEFAULT_LANDING.secondaryCtaText),
    secondaryCtaLink: readStringValue(record.secondaryCtaLink, DEFAULT_LANDING.secondaryCtaLink),
    showHeroImage: readBooleanValue(record.showHeroImage, DEFAULT_LANDING.showHeroImage),
    heroImage: readStringValue(record.heroImage, DEFAULT_LANDING.heroImage),
    aboutTitle: readStringValue(record.aboutTitle, DEFAULT_LANDING.aboutTitle),
    aboutDescription: readStringValue(record.aboutDescription, DEFAULT_LANDING.aboutDescription),
    features: sanitizeLandingFeatures(record.features, DEFAULT_LANDING.features),
    statistics: sanitizeLandingStatistics(record.statistics, DEFAULT_LANDING.statistics)
  };
}

function sanitizeAuthPageSettings<T extends BrandingAuthPageSettings>(
  value: unknown,
  fallback: T
) {
  const record = isRecord(value) ? value : {};

  return {
    ...fallback,
    pill: readStringValue(record.pill, fallback.pill),
    title: readStringValue(record.title, fallback.title),
    subtitle: readStringValue(record.subtitle, fallback.subtitle),
    submitLabel: readStringValue(record.submitLabel, fallback.submitLabel),
    alternatePrompt: readStringValue(record.alternatePrompt, fallback.alternatePrompt),
    alternateLinkLabel: readStringValue(record.alternateLinkLabel, fallback.alternateLinkLabel)
  };
}

// Former student-only defaults. Saving the Branding page stores every default as a value, so these
// exact strings mean "never customised" and fall back to the current defaults; edited wording is kept.
const RETIRED_DEFAULTS: Record<'navigation' | 'login' | 'register', Record<string, string[]>> = {
  navigation: {
    registerLabel: ['Student sign up']
  },
  login: {
    alternatePrompt: ['New student account?'],
    alternateLinkLabel: ['Student sign up']
  },
  register: {
    pill: ['Student Account Setup'],
    title: ['Student Registration'],
    subtitle: ['Use your official academic details so the research office can prepare your ThesisTrack workspace.'],
    submitLabel: ['Register Student Account'],
    academicNote: ['Student access only.'],
    staffNote: ['Faculty, staff, and office accounts are issued by the school.']
  }
};

function dropRetiredDefaults(value: unknown, retired: Record<string, string[]>): Record<string, unknown> {
  const record = isRecord(value) ? value : {};

  return Object.fromEntries(
    Object.entries(record).filter(([key, item]) => !(typeof item === 'string' && retired[key]?.includes(item)))
  );
}

function sanitizeAuthSettings(value: unknown): BrandingAuthSettings {
  const record = isRecord(value) ? value : {};
  const loginRecord = dropRetiredDefaults(record.login, RETIRED_DEFAULTS.login);
  const registerRecord = dropRetiredDefaults(record.register, RETIRED_DEFAULTS.register);
  const loginBase = sanitizeAuthPageSettings(loginRecord, DEFAULT_AUTH.login);
  const registerBase = sanitizeAuthPageSettings(registerRecord, DEFAULT_AUTH.register);

  return {
    login: {
      ...loginBase,
      identifierLabel: readStringValue(loginRecord.identifierLabel, DEFAULT_AUTH.login.identifierLabel),
      identifierPlaceholder: readStringValue(loginRecord.identifierPlaceholder, DEFAULT_AUTH.login.identifierPlaceholder),
      passwordLabel: readStringValue(loginRecord.passwordLabel, DEFAULT_AUTH.login.passwordLabel),
      passwordPlaceholder: readStringValue(loginRecord.passwordPlaceholder, DEFAULT_AUTH.login.passwordPlaceholder),
      googleLabel: readStringValue(loginRecord.googleLabel, DEFAULT_AUTH.login.googleLabel)
    },
    register: {
      ...registerBase,
      academicNote: readStringValue(registerRecord.academicNote, DEFAULT_AUTH.register.academicNote),
      staffNote: readStringValue(registerRecord.staffNote, DEFAULT_AUTH.register.staffNote)
    }
  };
}

function sanitizeNavigationLinks(value: unknown, fallback: BrandingNavigationLink[]) {
  const source = Array.isArray(value) && value.length ? value : fallback;

  return source.map((item, index) => {
    const fallbackItem = fallback[index] ?? fallback[0];
    const record = isRecord(item) ? item : {};

    return {
      id: readStringValue(record.id, fallbackItem.id),
      href: readStringValue(record.href, fallbackItem.href),
      label: readStringValue(record.label, fallbackItem.label),
      visible: readBooleanValue(record.visible, fallbackItem.visible)
    };
  });
}

function sanitizeNavigationSettings(value: unknown): BrandingNavigationSettings {
  const record = dropRetiredDefaults(value, RETIRED_DEFAULTS.navigation);

  return {
    subtitle: readStringValue(record.subtitle, DEFAULT_NAVIGATION.subtitle),
    loginLabel: readStringValue(record.loginLabel, DEFAULT_NAVIGATION.loginLabel),
    registerLabel: readStringValue(record.registerLabel, DEFAULT_NAVIGATION.registerLabel),
    showLogin: readBooleanValue(record.showLogin, DEFAULT_NAVIGATION.showLogin),
    showRegister: readBooleanValue(record.showRegister, DEFAULT_NAVIGATION.showRegister),
    links: sanitizeNavigationLinks(record.links, DEFAULT_NAVIGATION.links)
  };
}

function sanitizeShellSettings(value: unknown): BrandingShellSettings {
  const record = isRecord(value) ? value : {};

  return {
    navbarTitle: readStringValue(record.navbarTitle, DEFAULT_SHELL.navbarTitle),
    navbarSubtitle: DEFAULT_SHELL.navbarSubtitle,
    sidebarKicker: readStringValue(record.sidebarKicker, DEFAULT_SHELL.sidebarKicker),
    sidebarTitle: readStringValue(record.sidebarTitle, DEFAULT_SHELL.sidebarTitle),
    sidebarDescription: readStringValue(record.sidebarDescription, DEFAULT_SHELL.sidebarDescription),
    sidebarBadge: readStringValue(record.sidebarBadge, DEFAULT_SHELL.sidebarBadge)
  };
}

function sanitizeDepartmentSettings(value: unknown, fallback: BrandingDepartmentSettings[]) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  const fallbackById = new Map(fallback.map((item) => [item.id.toUpperCase(), item]));
  const usedIds = new Set<string>();

  return source.map((item, index) => {
    const record = isRecord(item) ? item : {};
    const baseId = sanitizeDepartmentId(record.id, fallback[index]?.id ?? `DEPT-${index + 1}`);
    let id = baseId;
    let duplicateIndex = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${duplicateIndex}`;
      duplicateIndex += 1;
    }

    usedIds.add(id);

    const fallbackItem = fallbackById.get(id) ?? fallback[index] ?? fallback[0];
    const color = normalizeHexColor(record.color, fallbackItem.color);
    const secondaryColor = record.secondaryColor ? normalizeHexColor(record.secondaryColor, undefined) : undefined;

    return {
      id,
      shortName: readStringValue(record.shortName, fallbackItem.shortName),
      name: readStringValue(record.name, fallbackItem.name),
      label: readStringValue(record.label, fallbackItem.label),
      description: readStringValue(record.description, fallbackItem.description),
      mission: readStringValue(record.mission, fallbackItem.mission),
      vision: readStringValue(record.vision, fallbackItem.vision),
      icon: readStringValue(record.icon, fallbackItem.icon),
      color,
      secondaryColor,
      logo: readStringValue(record.logo, fallbackItem.logo),
      active: readBooleanValue(record.active, fallbackItem.active),
      keyAreas: Array.isArray(record.keyAreas) ? record.keyAreas.map((k: any) => ({
        title: readStringValue(k.title, ''),
        description: readStringValue(k.description, ''),
        icon: readStringValue(k.icon, '')
      })) : fallbackItem.keyAreas,
      facilities: Array.isArray(record.facilities) ? record.facilities.map((f: any) => readStringValue(f, '')) : fallbackItem.facilities,
      programHighlights: Array.isArray(record.programHighlights) ? record.programHighlights.map((h: any) => readStringValue(h, '')) : fallbackItem.programHighlights,
      stats: Array.isArray(record.stats) ? record.stats.map((s: any) => ({
        label: String(s.label || '').trim(),
        value: String(s.value || '').trim()
      })) : (fallbackItem.stats || []),
      chartData: Array.isArray(record.chartData) ? record.chartData.map((c: any) => ({
        year: String(c.year || '').trim(),
        completed: Number(c.completed || 0),
        ongoing: Number(c.ongoing || 0)
      })) : (fallbackItem.chartData || []),
      profileCard: (() => {
        const pc = isRecord(record.profileCard) ? record.profileCard : {};
        return {
          heading: readStringValue(pc.heading, fallbackItem.profileCard?.heading || 'PROGRAM PROFILE'),
          features: Array.isArray(pc.features) ? pc.features.map((f: any) => readStringValue(f, '')) : (fallbackItem.profileCard?.features || []),
          workflowHeading: readStringValue(pc.workflowHeading, fallbackItem.profileCard?.workflowHeading || 'WORKFLOW COVERAGE'),
          workflowText: readStringValue(pc.workflowText, fallbackItem.profileCard?.workflowText || 'Register, review, defend, archive')
        };
      })(),
      keyAreasHeading: readStringValue(record.keyAreasHeading, fallbackItem.keyAreasHeading || 'Key Research & Focus Areas'),
      keyAreasSubheading: readStringValue(record.keyAreasSubheading, fallbackItem.keyAreasSubheading || 'Areas of Excellence')
    };
  });
}

export function normalizeHexColor(value: unknown, fallback = '#000000') {
  const raw = String(value ?? '').trim();
  const shortMatch = raw.match(/^#?([0-9a-fA-F]{3})$/);
  const longMatch = raw.match(/^#?([0-9a-fA-F]{6})$/);

  if (longMatch) {
    return `#${longMatch[1].toUpperCase()}`;
  }

  if (shortMatch) {
    return `#${shortMatch[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
      .toUpperCase()}`;
  }

  return fallback;
}

function hexToRgb(value: string): RgbColor {
  const normalized = normalizeHexColor(value, '#000000').slice(1);
  const numberValue = Number.parseInt(normalized, 16);

  return {
    r: (numberValue >> 16) & 255,
    g: (numberValue >> 8) & 255,
    b: numberValue & 255
  };
}

export function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b]
    .map((part) => clamp(Math.round(part)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100
  };
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const hue = normalizeHue(h) / 360;
  const saturation = clampPercent(s) / 100;
  const lightness = clampPercent(l) / 100;

  if (saturation === 0) {
    const channel = lightness * 255;
    return { r: channel, g: channel, b: channel };
  }

  const hueToRgb = (p: number, q: number, tValue: number) => {
    let t = tValue;

    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    r: hueToRgb(p, q, hue + 1 / 3) * 255,
    g: hueToRgb(p, q, hue) * 255,
    b: hueToRgb(p, q, hue - 1 / 3) * 255
  };
}

export function getRgbInputValue(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

export function getHslInputValue(hex: string) {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;
}

export function parseColorValue(value: unknown, fallback?: string) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return fallback;
  }

  const namedColor = NAMED_COLORS[raw.toLowerCase()];

  if (namedColor) {
    return namedColor;
  }

  const normalizedHex = normalizeHexColor(raw, '');

  if (normalizedHex) {
    return normalizedHex;
  }

  const rgbMatch = raw.match(/^rgba?\(([^)]+)\)$/i) || raw.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);

  if (rgbMatch) {
    const parts = (rgbMatch[1] ?? raw)
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()));

    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      return rgbToHex({ r: parts[0], g: parts[1], b: parts[2] });
    }
  }

  const hslMatch = raw.match(/^hsla?\(([^)]+)\)$/i) || raw.match(/^(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%$/);

  if (hslMatch) {
    const parts = (hslMatch[1] ?? raw)
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim().replace('%', '')));

    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      return rgbToHex(hslToRgb({ h: parts[0], s: parts[1], l: parts[2] }));
    }
  }

  return fallback;
}

export function mixColors(fromHex: string, toHex: string, weight = 0.5) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const normalizedWeight = Math.min(1, Math.max(0, weight));

  return rgbToHex({
    r: from.r * (1 - normalizedWeight) + to.r * normalizedWeight,
    g: from.g * (1 - normalizedWeight) + to.g * normalizedWeight,
    b: from.b * (1 - normalizedWeight) + to.b * normalizedWeight
  });
}

export function adjustColor(
  hex: string,
  adjustment: Partial<{
    hue: number;
    saturation: number;
    lightness: number;
  }>
) {
  const hsl = rgbToHsl(hexToRgb(hex));

  return rgbToHex(
    hslToRgb({
      h: normalizeHue(hsl.h + (adjustment.hue ?? 0)),
      s: clampPercent(hsl.s + (adjustment.saturation ?? 0)),
      l: clampPercent(hsl.l + (adjustment.lightness ?? 0))
    })
  );
}

export function deriveColorsFromPrimary(primaryInput: string): BrandingDerivedColors {
  const primary = normalizeHexColor(primaryInput, DEFAULT_COLORS.primary);

  return {
    hover: adjustColor(primary, { lightness: -8 }),
    lightVariant: mixColors(primary, '#FFFFFF', 0.82),
    darkVariant: adjustColor(primary, { lightness: -22 }),
    borderSuggestion: mixColors(primary, '#FFFFFF', 0.72),
    backgroundSuggestion: mixColors(primary, '#FFFFFF', 0.93)
  };
}

export function generateThemeFromPrimary(primaryInput: string, currentColors: BrandingColors = DEFAULT_COLORS): {
  colors: BrandingColors;
  derivedColors: BrandingDerivedColors;
} {
  const primary = normalizeHexColor(primaryInput, DEFAULT_COLORS.primary);
  const derivedColors = deriveColorsFromPrimary(primary);

  return {
    colors: {
      ...currentColors,
      primary,
      secondary: adjustColor(primary, { hue: 8, saturation: 4, lightness: 12 }),
      accent: adjustColor(primary, { hue: 42, saturation: 18, lightness: 22 }),
      background: derivedColors.backgroundSuggestion,
      surface: '#FFFFFF',
      sidebar: derivedColors.darkVariant,
      navbar: '#FFFFFF',
      border: derivedColors.borderSuggestion
    },
    derivedColors
  };
}

export function createBrandingFromPreset(presetId: string, current: BrandingSettings = DEFAULT_BRANDING) {
  const preset = THEME_PRESETS.find((item) => item.id === presetId) ?? THEME_PRESETS[0];

  return {
    ...current,
    themePreset: preset.id,
    colors: { ...preset.colors },
    derivedColors: deriveColorsFromPrimary(preset.colors.primary)
  };
}

function sanitizeProgramsSettings(value: any): BrandingProgramsSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_BRANDING.programsContent;
  }

  const defaultStats = DEFAULT_BRANDING.programsContent.highlights;

  return {
    title: String(value.title ?? DEFAULT_BRANDING.programsContent.title).trim() || DEFAULT_BRANDING.programsContent.title,
    description: String(value.description ?? DEFAULT_BRANDING.programsContent.description).trim() || DEFAULT_BRANDING.programsContent.description,
    highlights: Array.isArray(value.highlights)
      ? value.highlights.map((stat: any, index: number) => {
          const defaultStat = defaultStats[index] || { id: `prog${index}`, value: '', label: '', visible: false };
          return {
            id: String(stat?.id ?? defaultStat.id),
            value: String(stat?.value ?? defaultStat.value).trim(),
            label: String(stat?.label ?? defaultStat.label).trim(),
            visible: stat?.visible !== undefined ? Boolean(stat.visible) : defaultStat.visible
          };
        })
      : defaultStats
  };
}

export function sanitizeBrandingSettings(value: unknown): BrandingSettings {
  if (!isRecord(value)) {
    return cloneBranding(DEFAULT_BRANDING);
  }

  const colorValue = isRecord(value.colors) ? value.colors : {};
  const assetValue = isRecord(value.assets) ? value.assets : {};
  const derivedValue = isRecord(value.derivedColors) ? value.derivedColors : {};
  const colors = BRANDING_COLOR_KEYS.reduce((nextColors, key) => {
    nextColors[key] = normalizeHexColor(colorValue[key], DEFAULT_BRANDING.colors[key]);
    return nextColors;
  }, {} as BrandingColors);
  const generatedDerived = deriveColorsFromPrimary(colors.primary);
  const derivedColors: BrandingDerivedColors = {
    hover: normalizeHexColor(derivedValue.hover, generatedDerived.hover),
    lightVariant: normalizeHexColor(derivedValue.lightVariant, generatedDerived.lightVariant),
    darkVariant: normalizeHexColor(derivedValue.darkVariant, generatedDerived.darkVariant),
    borderSuggestion: normalizeHexColor(derivedValue.borderSuggestion, generatedDerived.borderSuggestion),
    backgroundSuggestion: normalizeHexColor(derivedValue.backgroundSuggestion, generatedDerived.backgroundSuggestion)
  };
  const assets: BrandingAssets = {
    mainLogo: String(assetValue.mainLogo ?? ''),
    lightLogo: String(assetValue.lightLogo ?? ''),
    darkLogo: String(assetValue.darkLogo ?? ''),
    institutionLogo: readStringValue(assetValue.institutionLogo, DEFAULT_ASSETS.institutionLogo),
    favicon: String(assetValue.favicon ?? ''),
    loginBackground: readStringValue(assetValue.loginBackground, DEFAULT_ASSETS.loginBackground),
    registerBackground: readStringValue(assetValue.registerBackground, DEFAULT_ASSETS.registerBackground),
    hallOfExcellence1: readStringValue(assetValue.hallOfExcellence1, DEFAULT_ASSETS.hallOfExcellence1),
    hallOfExcellence2: readStringValue(assetValue.hallOfExcellence2, DEFAULT_ASSETS.hallOfExcellence2),
    hallOfExcellence3: readStringValue(assetValue.hallOfExcellence3, DEFAULT_ASSETS.hallOfExcellence3),
    hallOfExcellence4: readStringValue(assetValue.hallOfExcellence4, DEFAULT_ASSETS.hallOfExcellence4),
    hallOfExcellence5: readStringValue(assetValue.hallOfExcellence5, DEFAULT_ASSETS.hallOfExcellence5)
  };

  return {
    version: BRANDING_VERSION,
    systemName: String(value.systemName ?? DEFAULT_BRANDING.systemName),
    systemShortName: String(value.systemShortName ?? DEFAULT_BRANDING.systemShortName),
    tagline: value.tagline !== undefined ? String(value.tagline) : DEFAULT_BRANDING.tagline,
    institutionName: String(value.institutionName ?? DEFAULT_BRANDING.institutionName),
    institutionTagline: value.institutionTagline !== undefined ? String(value.institutionTagline) : DEFAULT_BRANDING.institutionTagline,
    themePreset: String(value.themePreset ?? DEFAULT_BRANDING.themePreset),
    colors,
    derivedColors,
    assets,
    landing: sanitizeLandingSettings(value.landing),
    programsContent: sanitizeProgramsSettings(value.programsContent),
    auth: sanitizeAuthSettings(value.auth),
    navigation: sanitizeNavigationSettings(value.navigation),
    shell: sanitizeShellSettings(value.shell),
    departments: sanitizeDepartmentSettings(value.departments, DEFAULT_DEPARTMENTS),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined
  };
}

export function cloneBranding(value: BrandingSettings) {
  return {
    ...value,
    colors: { ...value.colors },
    derivedColors: { ...value.derivedColors },
    assets: { ...value.assets },
    landing: {
      ...value.landing,
      features: value.landing.features.map((feature) => ({ ...feature })),
      statistics: value.landing.statistics.map((statistic) => ({ ...statistic }))
    },
    programsContent: {
      ...value.programsContent,
      highlights: value.programsContent.highlights.map((statistic) => ({ ...statistic }))
    },
    auth: {
      login: { ...value.auth.login },
      register: { ...value.auth.register }
    },
    navigation: {
      ...value.navigation,
      links: value.navigation.links.map((link) => ({ ...link }))
    },
    shell: { ...value.shell },
    departments: value.departments.map((department) => ({ ...department }))
  };
}

export function getCssVariableMap(brandingInput: BrandingSettings) {
  const branding = sanitizeBrandingSettings(brandingInput);
  const { colors, derivedColors } = branding;

  return {
    '--color-primary': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-background': colors.background,
    '--color-surface': colors.surface,
    '--color-sidebar': colors.sidebar,
    '--color-navbar': colors.navbar,
    '--color-text-primary': colors.textPrimary,
    '--color-text-secondary': colors.textSecondary,
    '--color-border': colors.border,
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-error': colors.error,
    '--color-info': colors.info,
    '--color-primary-hover': derivedColors.hover,
    '--color-primary-light': derivedColors.lightVariant,
    '--color-primary-dark': derivedColors.darkVariant,
    '--color-border-suggestion': derivedColors.borderSuggestion,
    '--color-background-suggestion': derivedColors.backgroundSuggestion,
    '--primary': colors.primary,
    '--secondary': colors.secondary,
    '--accent': colors.accent,
    '--bg': colors.background,
    '--panel': colors.surface,
    '--text': colors.textPrimary,
    '--muted': colors.textSecondary,
    '--border': colors.border,
    '--success': colors.success,
    '--warning': colors.warning,
    '--danger': colors.error,
    '--info': colors.info,
    '--primary-light': derivedColors.lightVariant,
    '--primary-dark': derivedColors.darkVariant,
    '--hover': derivedColors.hover,
    '--surface-sunken': derivedColors.backgroundSuggestion
  };
}

function getLinearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);

  return (0.2126 * getLinearChannel(r)) + (0.7152 * getLinearChannel(g)) + (0.0722 * getLinearChannel(b));
}

export function getContrastRatio(foreground: string, background: string) {
  const first = getRelativeLuminance(foreground);
  const second = getRelativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastStatus(ratio: number) {
  if (ratio >= 4.5) {
    return 'Good Contrast';
  }

  if (ratio >= 3) {
    return 'Low Contrast';
  }

  return 'Needs Improvement';
}
