import '@/styles/student-workspace.css';
import '@/styles/adviser-dashboard.css';
import '@/styles/portal-shell-overlay.css';
import { AdviserLayout } from '@/components/layouts/adviser-layout';
import { AdviserLayoutShell } from '@/components/adviser/shared/components/adviser-layout-shell';
import { getAdviserNotificationRecords } from '@/lib/adviser-notifications';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const dynamic = 'force-dynamic';

export default async function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ data }, notifications] = await Promise.all([
    getAdviserDashboardData(),
    getAdviserNotificationRecords('/adviser/adviser-mode', 5)
  ]);

  return (
    <AdviserLayout>
      <AdviserLayoutShell data={data} notifications={notifications}>
        {children}
      </AdviserLayoutShell>
    </AdviserLayout>
  );
}
