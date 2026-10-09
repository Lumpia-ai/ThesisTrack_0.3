import { FocalPersonProjects } from '@/components/focal-person/focal-person-projects';

export const metadata = {
  title: 'Pending Validation - Research Focal Person'
};

export default function Page() {
  return <FocalPersonProjects mode="pending" />;
}
