import '@/styles/student-workspace.css';
import { StudentRepository } from '@/components/students/student-repository';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Repository'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentRepository data={data} />;
}
