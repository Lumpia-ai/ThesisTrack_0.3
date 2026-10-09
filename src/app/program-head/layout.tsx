import '@/styles/admin-dashboard.css';
import '@/styles/program-head-portal.css';
import '@/styles/student-workspace.css';
import '@/styles/adviser-dashboard.css';
import '@/styles/portal-shell-overlay.css';
import { ProgramHeadLayout } from '@/components/layouts/program-head-layout';

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProgramHeadLayout>{children}</ProgramHeadLayout>;
}
