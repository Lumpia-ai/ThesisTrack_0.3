export const ADVISER_NAV_SECTIONS = {
  adviser: [
    { key: 'workspace', label: 'Workspace' },
    { key: 'supervision', label: 'Supervision' },
    { key: 'tools', label: 'Tools' }
  ],
  panel: [
    { key: 'workspace', label: 'Workspace' },
    { key: 'evaluation', label: 'Evaluation' }
  ]
} as const;

export const ADVISER_NAV_ITEMS = {
  adviser: [
    { key: 'dashboard', label: 'Dashboard', href: '/adviser/adviser-mode/dashboard', icon: 'fa-gauge-high', section: 'workspace' },
    { key: 'groups', label: 'My Groups', href: '/adviser/adviser-mode/groups', icon: 'fa-users', section: 'workspace' },
    { key: 'titles', label: 'Title & Evidence Approval', href: '/adviser/adviser-mode/title-approvals', icon: 'fa-file-signature', section: 'supervision' },
    { key: 'submissions', label: 'Document Submissions', href: '/adviser/adviser-mode/submissions', icon: 'fa-check-double', section: 'supervision' },
    { key: 'progress', label: 'Progress Monitoring', href: '/adviser/adviser-mode/progress', icon: 'fa-chart-line', section: 'supervision' },
    { key: 'evaluations', label: 'Evaluations', href: '/adviser/adviser-mode/evaluations', icon: 'fa-star', section: 'supervision' },
    { key: 'schedule', label: 'Schedule', href: '/adviser/adviser-mode/schedule', icon: 'fa-calendar', section: 'tools' },
    { key: 'reports', label: 'Reports & Analytics', href: '/adviser/adviser-mode/reports', icon: 'fa-chart-bar', section: 'tools' }
  ],
  panel: [
    { key: 'dashboard', label: 'Dashboard', href: '/adviser/panel-mode/dashboard', icon: 'fa-gauge-high', section: 'workspace' },
    { key: 'evaluation-queue', label: 'Evaluation Queue', href: '/adviser/panel-mode/evaluation-queue', icon: 'fa-clipboard-check', section: 'evaluation' },
    { key: 'defense-schedule', label: 'Defense Schedule', href: '/adviser/panel-mode/defense-schedule', icon: 'fa-calendar-days', section: 'evaluation' },
    { key: 'defense-voting', label: 'Defense Verdict', href: '/adviser/panel-mode/defense-voting', icon: 'fa-check-to-slot', section: 'evaluation' },
    { key: 'compliance-review', label: 'Compliance Review', href: '/adviser/panel-mode/compliance-review', icon: 'fa-list-check', section: 'evaluation' },
    { key: 'review-history', label: 'Review History', href: '/adviser/panel-mode/review-history', icon: 'fa-folder-open', section: 'evaluation' }
  ]
} as const;

export type AdviserNavKey = (typeof ADVISER_NAV_ITEMS)['adviser'][number]['key'] | (typeof ADVISER_NAV_ITEMS)['panel'][number]['key'];
