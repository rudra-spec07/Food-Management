import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AdminDashboardView } from '../../modules/dashboard/components/AdminDashboardView';
import { WorkerDashboardView } from '../../modules/dashboard/components/WorkerDashboardView';
import { DonorDashboardView } from '../../modules/dashboard/components/DonorDashboardView';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboardView />;
    case 'WORKER':
      return <WorkerDashboardView />;
    case 'DONOR':
      return <DonorDashboardView />;
    default:
      return <DonorDashboardView />;
  }
};
