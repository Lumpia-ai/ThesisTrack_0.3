export const STUDENT_NAV_SECTIONS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'submissions', label: 'Resources' }
] as const;

export const STUDENT_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: '/students/dashboard', icon: 'fa-gauge-high', section: 'workspace' },
  {
    key: 'project-overview',
    label: 'Project Overview',
    href: '/students/project-overview',
    icon: 'fa-folder-open',
    section: 'workspace',
    children: [
      { key: 'title-submission', label: 'My Title', href: '/students/title-submission', icon: 'fa-pen-to-square' },
      { key: 'submit', label: 'Submit Docs', href: '/students/submit', icon: 'fa-paper-plane' },
      { key: 'project-files', label: 'Document Tracker', href: '/students/project-files', icon: 'fa-book-open-reader' }
    ]
  },
  { key: 'milestones', label: 'Project Stages', href: '/students/milestones', icon: 'fa-timeline', section: 'workspace' },
  { key: 'schedule', label: 'Schedule', href: '/students/schedule', icon: 'fa-calendar-check', section: 'workspace' },
  { key: 'compliance', label: 'Defense Compliance', href: '/students/compliance', icon: 'fa-list-check', section: 'workspace' },
  { key: 'repository', label: 'Repository', href: '/students/repository', icon: 'fa-book', section: 'submissions' },
  { key: 'progress-reports', label: 'Progress Reports', href: '/students/progress-reports', icon: 'fa-clipboard-list', section: 'submissions' },
  { key: 'faculty-feedback', label: 'Faculty Feedback', href: '/students/faculty-feedback', icon: 'fa-comments', section: 'submissions' },
  { key: 'history', label: 'History', href: '/students/history', icon: 'fa-clock-rotate-left', section: 'submissions' }
] as const;

export type StudentNavKey = (typeof STUDENT_NAV_ITEMS)[number]['key'];
export type StudentNavSectionKey = (typeof STUDENT_NAV_SECTIONS)[number]['key'];
