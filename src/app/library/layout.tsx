import '@/styles/library-portal.css';
import '@/styles/student-workspace.css';
import '@/styles/admin-dashboard.css';
import '@/styles/admin-portal-pages.css';
import '@/styles/admin-repository-approval.css';
import '@/styles/research-head-reports.css';
import '@/styles/research-head-dashboard.css';
import '@/styles/portal-shell-overlay.css';
import { LibraryLayout } from '@/components/layouts/library-layout';

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LibraryLayout>{children}</LibraryLayout>;
}
