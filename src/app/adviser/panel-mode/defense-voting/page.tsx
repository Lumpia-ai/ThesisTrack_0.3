import { DefenseVoting } from '@/components/adviser/panel-mode/defense-voting';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Defense Verdict | Panel | ThesisTrack',
};

export default async function DefenseVotingPage() {
  const { data } = await getAdviserDashboardData();
  return <DefenseVoting data={data} />;
}
