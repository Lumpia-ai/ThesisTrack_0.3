import { SecretaryMinutesEditor } from '@/components/secretary/secretary-minutes-editor';

export const metadata = {
  title: 'Minutes of Meeting - Defense Secretary'
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SecretaryMinutesEditor meetingId={decodeURIComponent(id)} />;
}
