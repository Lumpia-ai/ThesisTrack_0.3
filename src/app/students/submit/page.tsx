import '@/styles/student-workspace.css';
import { StudentSubmission } from '@/components/students/student-submission';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Submit Documents'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentSubmission data={data} />;
}
