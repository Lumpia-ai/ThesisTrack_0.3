import { AdviserProgress } from '@/components/adviser/adviser-mode/adviser-progress';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Progress Monitoring - Adviser Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserProgress data={data} />;
}

