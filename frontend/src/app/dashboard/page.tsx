'use client';

import { useStore } from '@/store/useStore';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import ManagerDashboard from '@/components/ManagerDashboard';
import HRDashboard from '@/components/HRDashboard';
import AdminDashboard from '@/components/AdminDashboard';

export default function DashboardPage() {
  const { user } = useStore();

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Dispatch dashboard view based on user role
  switch (user.role) {
    case 'Employee':
      return <EmployeeDashboard />;
    case 'Manager':
      return <ManagerDashboard />;
    case 'HR':
      return <HRDashboard />;
    case 'Admin':
      return <AdminDashboard />;
    default:
      return <EmployeeDashboard />;
  }
}
