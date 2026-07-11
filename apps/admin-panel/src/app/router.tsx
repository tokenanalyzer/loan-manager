import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { StatusPage } from './StatusPage';

/**
 * App routing.
 *
 * Phase 4 scope: adds the /login route and gates the existing
 * placeholder route behind ProtectedRoute. Real admin routes/screens
 * are added once admin features are implemented.
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
    path: '/login',
    element: <LoginPage />,
  },
]);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
