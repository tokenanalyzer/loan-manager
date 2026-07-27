import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { ApplicationsPage } from '../features/applications/ApplicationsPage';
import { PendingApprovalsPage } from '../features/approvals/PendingApprovalsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage';
import { AdminDashboardPage } from '../features/dashboard/AdminDashboardPage';
import { LeadsPage } from '../features/leads/LeadsPage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { StaffListPage } from '../features/settings/StaffListPage';
import { EmployeeStatusPage } from '../features/work-status/EmployeeStatusPage';
import { LeadDetailPage } from '../features/workspace/LeadDetailPage';
import { MyLeadsPage } from '../features/workspace/MyLeadsPage';
import { AppLayout } from '../layouts/AppLayout';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { DashboardPlaceholderPage } from '../pages/DashboardPlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SessionExpiredPage } from '../pages/SessionExpiredPage';

import { ProtectedRoute } from './ProtectedRoute';

/**
 * App routing — role-based, shared by the Employee Portal, CRM, and
 * Super Admin (all one web app; role decides what's reachable, not a
 * separate build). Business routes nest under `AppLayout` (the
 * Sidebar/Topbar/Breadcrumbs shell); auth and full-page error states
 * render standalone.
 *
 * `roles` on a route's `ProtectedRoute` is the role-based-routing
 * mechanism itself — omit it for "any authenticated role," pass e.g.
 * `['admin']` to restrict a route to Super Admin only.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPlaceholderPage /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'leads',
        element: (
          <ProtectedRoute roles={['admin']}>
            <LeadsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'leads/:id',
        element: (
          <ProtectedRoute roles={['admin']}>
            <LeadDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'employee-status',
        element: (
          <ProtectedRoute roles={['admin']}>
            <EmployeeStatusPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/team',
        element: (
          <ProtectedRoute roles={['admin', 'org_admin']}>
            <StaffListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/approvals',
        element: (
          <ProtectedRoute roles={['admin']}>
            <PendingApprovalsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'applications',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ApplicationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'applications/:id',
        element: (
          <ProtectedRoute roles={['admin']}>
            <LeadDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        // Customer 360. Reachable by employees too (same document/audit
        // access the backend already grants them) even though the
        // customers *list* at `/customers` is still a placeholder below —
        // this route is reached via links from Applications/Dashboard/
        // notifications, not by browsing a list yet.
        path: 'customers/:id',
        element: (
          <ProtectedRoute roles={['admin', 'employee']}>
            <CustomerDetailPage />
          </ProtectedRoute>
        ),
      },
      // Design System Foundation, Phase 1 — "Coming Soon" placeholders for
      // nav items that ship in the shell for visual completeness but have
      // no real screen yet. See navigation.config.ts's `comingSoon` flag.
      {
        path: 'documents',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ComingSoonPage title="Documents" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tasks',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ComingSoonPage title="Tasks" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customers',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ComingSoonPage title="Customers" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ComingSoonPage title="Reports" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ComingSoonPage title="Settings" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-leads',
        element: (
          <ProtectedRoute roles={['employee']}>
            <MyLeadsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-leads/:id',
        element: (
          <ProtectedRoute roles={['employee']}>
            <LeadDetailPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/403',
    element: <AccessDeniedPage />,
  },
  {
    path: '/session-expired',
    element: <SessionExpiredPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
