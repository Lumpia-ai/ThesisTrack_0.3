import { AdviserTitleApproval } from '@/components/adviser/adviser-mode/adviser-title-approval';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Titles - Adviser Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserTitleApproval data={data} />;
}

