import { AdviserNotifications } from '@/components/adviser/shared/components/adviser-notifications';
import { getAdviserNotificationRecords } from '@/lib/adviser-notifications';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Notifications - Adviser Portal'
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [{ data }, notifications] = await Promise.all([
    getAdviserDashboardData(),
    getAdviserNotificationRecords('/adviser/adviser-mode')
  ]);

  return <AdviserNotifications data={data} notifications={notifications} />;
}
