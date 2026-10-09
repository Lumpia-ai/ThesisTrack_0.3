import { AdviserSubmissions } from '@/components/adviser/adviser-mode/adviser-submissions';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Submissions - Adviser Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserSubmissions data={data} />;
}

