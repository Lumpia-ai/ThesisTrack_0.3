import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import { AdviserDashboard } from '@/components/adviser/shared/components/adviser-dashboard';

export const metadata = {
  title: 'Dashboard - Panel Portal'
};

import { requireAuthenticatedUser } from '@/lib/auth';

export default async function Page() {
  await requireAuthenticatedUser();
  const { data } = await getAdviserDashboardData();
  return <AdviserDashboard data={data} />;
}

