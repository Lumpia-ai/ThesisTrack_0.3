import '@/styles/student-workspace.css';
import { StudentProfile } from '@/components/students/student-profile';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Profile'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentProfile data={data} />;
}
