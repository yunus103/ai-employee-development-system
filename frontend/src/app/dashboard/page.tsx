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
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-card-border/20 border border-card-border rounded-3xl"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 border border-card-border h-36"></div>
          ))}
        </div>
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
