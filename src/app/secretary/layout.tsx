import '@/styles/student-workspace.css';
import '@/styles/admin-dashboard.css';
import '@/styles/admin-portal-pages.css';
import '@/styles/admin-repository-approval.css';
import '@/styles/secretary.css';
import '@/styles/portal-shell-overlay.css';
import { SecretaryLayout } from '@/components/layouts/secretary-layout';

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SecretaryLayout>{children}</SecretaryLayout>;
}
