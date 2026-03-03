import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import StudentHome from './dashboard/StudentHome';
import TeacherHome from './dashboard/TeacherHome';
import ParentHome from './dashboard/ParentHome';
import AdminHome from './dashboard/AdminHome';

export default function Dashboard() {
  const { role } = useAuth();

  const HomeComponent = {
    student: StudentHome,
    teacher: TeacherHome,
    parent: ParentHome,
    admin: AdminHome,
  }[role ?? 'student'] ?? StudentHome;

  return (
    <DashboardLayout>
      <HomeComponent />
    </DashboardLayout>
  );
}
