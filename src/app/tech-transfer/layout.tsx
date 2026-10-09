import '@/styles/role-portal-shared.css';
import '@/styles/student-workspace.css';
import '@/styles/portal-shell-overlay.css';
import { TechTransferLayout } from '@/components/layouts/tech-transfer-layout';

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <TechTransferLayout>{children}</TechTransferLayout>;
}
