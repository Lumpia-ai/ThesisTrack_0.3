import { AdviserEvaluations } from '@/components/adviser/shared/components/adviser-evaluations';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export const metadata = {
  title: 'Evaluations - Adviser Portal'
};

export default async function Page() {
  const { data } = await getAdviserDashboardData();
  return <AdviserEvaluations data={data} />;
}

