import '@/styles/student-workspace.css';
import '@/styles/admin-dashboard.css';
import '@/styles/admin-portal-pages.css';
import '@/styles/system-admin-dark.css';
import '@/styles/portal-shell-overlay.css';
import { SystemAdminLayout } from '@/components/layouts/system-admin-layout';

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SystemAdminLayout>{children}</SystemAdminLayout>;
}
