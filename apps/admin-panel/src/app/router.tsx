import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoginPage } from '../features/auth/LoginPage';
import { LeadsPage } from '../features/leads/LeadsPage';
import { ProtectedRoute } from './ProtectedRoute';
import { StatusPage } from './StatusPage';

/**
 * App routing.
 *
 * Phase 4 scope: adds the /login route and gates the existing
 * placeholder route behind ProtectedRoute. The Lead Assignment module
 * adds /leads — the CRM/Super Admin Unassigned/Assigned Leads screen.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <StatusPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/leads',
    element: (
      <ProtectedRoute>
        <LeadsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
]);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
