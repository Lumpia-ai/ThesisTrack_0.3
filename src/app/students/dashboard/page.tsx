import '@/styles/student-workspace.css';
import { StudentDashboard } from '@/components/students/student-dashboard';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Student Dashboard'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentDashboard data={data} />;
}
