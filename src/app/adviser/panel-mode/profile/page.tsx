import { AdviserProfile } from '@/components/adviser/shared/components/adviser-profile';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Profile - Panel Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserProfile data={data} />;
}
