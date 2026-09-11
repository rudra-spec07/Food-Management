import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { DonorDashboardPage } from './modules/donors/pages/DonorDashboardPage';
import { AdminDonationReviewPage } from './modules/admin/pages/AdminDonationReviewPage';
import { AdminWorkerProvisioningPage } from './modules/admin/pages/AdminWorkerProvisioningPage';
import { AdminAssignmentQueuePage } from './modules/admin/pages/AdminAssignmentQueuePage';
import { WorkerAssignmentsPage } from './modules/worker/pages/WorkerAssignmentsPage';
import { AvailableFoodPage } from './pages/collection/AvailableFoodPage';
import { CollectionHistoryPage } from './pages/collection/CollectionHistoryPage';
import { CollectionDetailPage } from './pages/collection/CollectionDetailPage';
import { DistributionListPage } from './pages/distributions/DistributionListPage';
import { CreateDistributionPage } from './pages/distributions/CreateDistributionPage';
import { DistributionDetailPage } from './pages/distributions/DistributionDetailPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ChangePasswordPage } from './pages/profile/ChangePasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useAuth } from './hooks/useAuth';

const RootRoute: React.FC = () => {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
        <div className="spinner" style={{ width: '36px', height: '36px', borderTopColor: 'var(--foodshare-green-dark)' }} />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root Route: Shows Landing Page when unauthenticated, redirects to /dashboard when authenticated */}
          <Route path="/" element={<RootRoute />} />

          {/* Public Auth Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected General Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/donations" element={<DonorDashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/donations/review" element={<AdminDonationReviewPage />} />
              <Route path="/admin/workers" element={<AdminWorkerProvisioningPage />} />
              <Route path="/admin/donations/assignments" element={<AdminAssignmentQueuePage />} />
            </Route>
          </Route>

          {/* Protected Worker Routes */}
          <Route element={<ProtectedRoute allowedRoles={['WORKER']} />}>
            <Route element={<AppLayout />}>
              <Route path="/worker/assignments" element={<WorkerAssignmentsPage />} />
            </Route>
          </Route>

          {/* Protected Operational Routes (Worker & Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['WORKER', 'ADMIN']} />}>
            <Route element={<AppLayout />}>
              <Route path="/collection/available" element={<AvailableFoodPage />} />
              <Route path="/collection" element={<CollectionHistoryPage />} />
              <Route path="/collection/:collectionId" element={<CollectionDetailPage />} />
              <Route path="/distributions" element={<DistributionListPage />} />
              <Route path="/distributions/new" element={<CreateDistributionPage />} />
              <Route path="/distributions/:distributionId" element={<DistributionDetailPage />} />
            </Route>
          </Route>

          {/* Fallback 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
