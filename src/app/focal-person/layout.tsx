import '@/styles/student-workspace.css';
import '@/styles/admin-dashboard.css';
import '@/styles/admin-portal-pages.css';
import '@/styles/admin-repository-approval.css';
import '@/styles/focal-person.css';
import '@/styles/portal-shell-overlay.css';
import { FocalPersonLayout } from '@/components/layouts/focal-person-layout';

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <FocalPersonLayout>{children}</FocalPersonLayout>;
}
