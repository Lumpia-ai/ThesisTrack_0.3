import '@/styles/student-workspace.css';
import { StudentProgressReports } from '@/components/students/student-progress-reports';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Progress Reports'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentProgressReports data={data} />;
}
