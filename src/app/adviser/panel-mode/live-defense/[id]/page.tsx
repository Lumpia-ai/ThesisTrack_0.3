import { LiveDefense } from '@/components/adviser/panel-mode/live-defense';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Defense | Panel | ThesisTrack',
};

export default async function LiveDefensePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { data }] = await Promise.all([params, getAdviserDashboardData()]);
  return <LiveDefense data={data} scheduleId={id} />;
}
