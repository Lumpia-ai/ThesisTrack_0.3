import { AdviserGroups } from '@/components/adviser/adviser-mode/adviser-groups';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'My Groups - Adviser Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserGroups data={data} />;
}

