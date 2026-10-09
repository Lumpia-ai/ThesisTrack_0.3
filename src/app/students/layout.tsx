import '@/styles/student-workspace.css';
import '@/styles/portal-shell-overlay.css';
import { StudentLayout } from '@/components/layouts/student-layout';
import { StudentLayoutShell } from '@/components/students/student-layout-shell';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export default async function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data } = await getStudentDashboardData();

  return (
    <StudentLayout>
      <StudentLayoutShell data={data}>
        {children}
      </StudentLayoutShell>
    </StudentLayout>
  );
}
