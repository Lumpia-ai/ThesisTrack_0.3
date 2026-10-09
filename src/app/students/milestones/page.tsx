import '@/styles/student-workspace.css';
import { StudentTimeline } from '@/components/students/student-timeline';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Project Stages'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentTimeline data={data} />;
}
