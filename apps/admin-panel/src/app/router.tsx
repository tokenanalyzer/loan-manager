import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoginPage } from '../features/auth/LoginPage';
import { LeadsPage } from '../features/leads/LeadsPage';
import { AppLayout } from '../layouts/AppLayout';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';
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
        path: 'leads',
        element: (
          <ProtectedRoute roles={['admin']}>
            <LeadsPage />
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
