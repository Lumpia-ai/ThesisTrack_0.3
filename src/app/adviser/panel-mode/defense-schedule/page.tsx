import { AdviserSchedule } from '@/components/adviser/shared/components/adviser-schedule';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Defense Schedule - Panel Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserSchedule data={data} />;
}

