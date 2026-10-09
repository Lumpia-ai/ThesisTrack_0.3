import '@/styles/student-workspace.css';
import { StudentNotifications } from '@/components/students/student-notifications';
import { getStudentDashboardData } from '@/lib/services/student-workspace';

export const metadata = {
  title: 'ThesisTrack | Notifications'
};

export default async function Page() {
  const { data } = await getStudentDashboardData();

  return <StudentNotifications data={data} />;
}
