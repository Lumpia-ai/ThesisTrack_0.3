import { ComplianceReview } from '@/components/adviser/panel-mode/compliance-review';
import { getAdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compliance Review | Panel | ThesisTrack',
};

export default async function ComplianceReviewPage() {
  const { data } = await getAdviserDashboardData();
  return <ComplianceReview data={data} />;
}
