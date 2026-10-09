import { FocalPersonProjectDetails } from '@/components/focal-person/focal-person-project-details';

export const metadata = {
  title: 'Project Details - Research Focal Person'
};

export default async function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  return (
    <FocalPersonProjectDetails
      key={`${id}-${tab ?? ''}`}
      projectId={decodeURIComponent(id)}
      initialTab={tab}
    />
  );
}
