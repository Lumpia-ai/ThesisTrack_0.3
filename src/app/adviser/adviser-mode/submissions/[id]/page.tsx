import { AdviserSubmissionReviewWorkspace } from '@/components/adviser/adviser-mode/adviser-submission-review-workspace';

export const metadata = {
  title: 'Review Workspace - Adviser Portal'
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  return <AdviserSubmissionReviewWorkspace fileId={params.id} />;
}
