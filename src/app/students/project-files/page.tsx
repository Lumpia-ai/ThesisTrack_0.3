import '@/styles/student-workspace.css';
import { StudentProjectFiles } from '@/components/students/student-project-files';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Document Tracker'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentProjectFiles data={data} />;
}
