import { getAdviserDashboardAnalytics, getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import { AdviserDashboard } from '@/components/adviser/shared/components/adviser-dashboard';

export const metadata = {
  title: 'Dashboard - Adviser Portal'
};

import { requireAuthenticatedUser } from '@/lib/auth';

export default async function Page() {
  await requireAuthenticatedUser();
  const { data } = await getAdviserDashboardData();
  // Not awaited: the page renders right away and the analytics charts stream in behind Suspense.
  const analytics = getAdviserDashboardAnalytics();
  return <AdviserDashboard data={data} analytics={analytics} />;
}
