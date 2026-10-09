import { AdviserReports } from '@/components/adviser/shared/components/adviser-reports';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Reports & Analytics - Adviser Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserReports data={data} />;
}

