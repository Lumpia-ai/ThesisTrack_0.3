import '@/styles/student-workspace.css';
import { StudentHistory } from '@/components/students/student-history';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Student History'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentHistory data={data} />;
}
