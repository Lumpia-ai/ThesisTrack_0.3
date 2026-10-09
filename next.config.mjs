const legacyRoutes = [
  ['/', '/index.html'],
  ['/login', '/login.html'],
  ['/register', '/register.html'],
  ['/admin/dashboard', '/admin/dashboard.html'],
  ['/admin/announcements', '/admin/announcements.html'],
  ['/admin/maintenance', '/admin/maintenance.html'],
  ['/admin/notifications', '/admin/notifications.html'],
  ['/admin/projects', '/admin/projects.html'],
  ['/admin/reports', '/admin/reports.html'],
  ['/admin/repository', '/admin/repository.html'],
  ['/admin/settings', '/admin/settings.html'],
  ['/admin/title-checker', '/admin/title-checker.html'],
  ['/admin/users', '/admin/users.html'],
  ['/adviser/dashboard', '/adviser/dashboard.html'],
  ['/adviser/evaluations', '/adviser/evaluations.html'],
  ['/adviser/groups', '/adviser/groups.html'],
  ['/adviser/notifications', '/adviser/notifications.html'],
  ['/adviser/profile', '/adviser/profile.html'],
  ['/adviser/progress', '/adviser/progress.html'],
  ['/adviser/reports', '/adviser/reports.html'],
  ['/adviser/schedule', '/adviser/schedule.html'],
  ['/adviser/submissions', '/adviser/submissions.html'],
  ['/adviser/title-approval', '/adviser/title-approval.html'],
  ['/library/dashboard', '/library/library-dashboard.html'],
  ['/library/browse', '/library/library-browse.html'],
  ['/library/insights', '/library/library-insights.html'],
  ['/library/notifications', '/library/library-notifications.html'],
  ['/library/profile', '/library/library-profile.html'],
  ['/library/project-details', '/library/library-project-details.html'],
  ['/library/repository', '/library/library-repository.html'],
  ['/library/saved', '/library/library-saved.html'],
  ['/partner/dashboard', '/partner/dashboard.html'],
  ['/partner/details', '/partner/details.html'],
  ['/partner/feedback', '/partner/feedback.html'],
  ['/partner/implementations', '/partner/implementations.html'],
  ['/partner/notifications', '/partner/notifications.html'],
  ['/partner/profile', '/partner/profile.html'],
  ['/partner/project', '/partner/projects.html'],
  ['/partner/request', '/partner/request.html'],
  ['/partner/requests', '/partner/requests.html'],
  ['/program-head/dashboard', '/program-head/dashboard.html'],
  ['/program-head/evidence', '/program-head/evidence.html'],
  ['/program-head/notifications', '/program-head/notifications.html'],
  ['/program-head/performance', '/program-head/performance.html'],
  ['/program-head/profile', '/program-head/profile.html'],
  ['/program-head/progress', '/program-head/progress.html'],
  ['/program-head/projects', '/program-head/projects.html'],
  ['/program-head/reports', '/program-head/reports.html'],
  ['/program-head/transfer', '/program-head/transfer.html'],
  ['/students/dashboard', '/students/dashboard.html'],
  ['/students/evidence', '/students/evidence.html'],
  ['/students/feedback', '/students/feedback.html'],
  ['/students/notifications', '/students/notifications.html'],
  ['/students/profile', '/students/profile.html'],
  ['/students/progress-reports', '/students/progress-reports.html'],
  ['/students/progress', '/students/progress.html'],
  ['/students/project', '/students/project.html'],
  ['/students/presentations-achievements', '/students/presentations-achievements.html'],
  ['/students/register-title', '/students/register-title.html'],
  ['/students/reports', '/students/reports.html'],
  ['/students/repository', '/students/repository.html'],
  ['/students/schedule', '/students/schedule.html'],
  ['/students/submissions', '/students/submissions.html'],
  ['/students/project', '/students/technology-transfer.html'],
  ['/students/timeline', '/students/timeline.html'],
  ['/students/upload-documents', '/students/upload-documents.html'],
  ['/tech-transfer/dashboard', '/tech-transfer/dashboard.html'],
  ['/tech-transfer/deployment', '/tech-transfer/deployment.html'],
  ['/tech-transfer/documents', '/tech-transfer/documents.html'],
  ['/tech-transfer/impact', '/tech-transfer/impact.html'],
  ['/tech-transfer/matching', '/tech-transfer/matching.html'],
  ['/tech-transfer/notifications', '/tech-transfer/notifications.html'],
  ['/tech-transfer/profile', '/tech-transfer/profile.html'],
  ['/tech-transfer/projects', '/tech-transfer/projects.html'],
  ['/tech-transfer/reports', '/tech-transfer/reports.html']
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Hostnames only (no port): lets other devices on the network use the dev server's live reload.
  allowedDevOrigins: ['localhost', '192.168.1.2'],
  // The Research Head portal moved from /admin to /research-head; keep old bookmarks and any
  // /admin links already stored (e.g. in notifications) working.
  async redirects() {
    return [
      { source: '/admin', destination: '/research-head/dashboard', permanent: false },
      { source: '/admin/:path*', destination: '/research-head/:path*', permanent: false }
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '192.168.1.2:3000']
    }
  }
};

export default nextConfig;
