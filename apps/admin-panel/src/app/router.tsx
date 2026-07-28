import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoadingState } from '../components/states/LoadingState';
import fullPageStyles from '../components/states/States.module.css';
import { LoginPage } from '../features/auth/LoginPage';
import { AppLayout } from '../layouts/AppLayout';

import { ProtectedRoute } from './ProtectedRoute';

const ApplicationsPage = lazy(() =>
  import('../features/applications/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })),
);
const PendingApprovalsPage = lazy(() =>
  import('../features/approvals/PendingApprovalsPage').then((m) => ({ default: m.PendingApprovalsPage })),
);
const CustomerDetailPage = lazy(() =>
  import('../features/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })),
);
const AdminDashboardPage = lazy(() =>
  import('../features/dashboard/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const DocumentCenterPage = lazy(() =>
  import('../features/documents/DocumentCenterPage').then((m) => ({ default: m.DocumentCenterPage })),
);
const LeadsPage = lazy(() => import('../features/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const DocumentTypesPage = lazy(() =>
  import('../features/settings/DocumentTypesPage').then((m) => ({ default: m.DocumentTypesPage })),
);
const ProfilePage = lazy(() =>
  import('../features/settings/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const SettingsHubPage = lazy(() =>
  import('../features/settings/SettingsHubPage').then((m) => ({ default: m.SettingsHubPage })),
);
const StaffListPage = lazy(() =>
  import('../features/settings/StaffListPage').then((m) => ({ default: m.StaffListPage })),
);
const EmployeeStatusPage = lazy(() =>
  import('../features/work-status/EmployeeStatusPage').then((m) => ({ default: m.EmployeeStatusPage })),
);
const LeadDetailPage = lazy(() =>
  import('../features/workspace/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })),
);
const MyLeadsPage = lazy(() =>
  import('../features/workspace/MyLeadsPage').then((m) => ({ default: m.MyLeadsPage })),
);
const AccessDeniedPage = lazy(() =>
  import('../pages/AccessDeniedPage').then((m) => ({ default: m.AccessDeniedPage })),
);
const ComingSoonPage = lazy(() => import('../pages/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage })));
const DashboardPlaceholderPage = lazy(() =>
  import('../pages/DashboardPlaceholderPage').then((m) => ({ default: m.DashboardPlaceholderPage })),
);
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const SessionExpiredPage = lazy(() =>
  import('../pages/SessionExpiredPage').then((m) => ({ default: m.SessionExpiredPage })),
);

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
 *
 * Design System Phase 3-4, sub-phase 11: every route element below
 * `AppLayout` (~20 feature pages) is `React.lazy`-loaded — confirmed
 * by the audit to be a real contributor to the single ~700KB eager
 * chunk Vite already warned about. `AppLayout`/`ProtectedRoute`/
 * `LoginPage` stay eager: the shell and the auth guard are structural
 * (needed for every route regardless), and `LoginPage` is the actual
 * first paint for a fresh unauthenticated visit — lazy-loading it
 * would add a network round-trip before the very first thing most
 * visitors see. One `<Suspense>` at the router root (not one per
 * route) catches every lazy page; `RouterProvider` has no children
 * slot, so wrapping it here — rather than each `element` individually
 * — is both simpler and sufficient, since Suspense catches a suspended
 * lazy import anywhere in its subtree.
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
        // Phase 8 — Document Types catalog CRUD. `DocumentTypesController`
        // already existed fully built on the backend; this is the first
        // screen wired to it.
        path: 'settings/document-types',
        element: (
          <ProtectedRoute roles={['admin']}>
            <DocumentTypesPage />
          </ProtectedRoute>
        ),
      },
      {
        // Phase 8 — self-service profile edit, any authenticated staff role.
        path: 'settings/profile',
        element: <ProfilePage />,
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
      {
        // Enterprise Document Center — platform-wide, unlike Customer
        // 360's embedded per-customer view. Employees see it scoped to
        // their assigned customers (same backend rule as everywhere
        // else); Admin sees everything.
        path: 'documents',
        element: (
          <ProtectedRoute roles={['admin', 'employee']}>
            <DocumentCenterPage />
          </ProtectedRoute>
        ),
      },
      {
        // Phase 7 — Reports & Analytics, five real-data widgets
        // aggregated client-side from already-existing endpoints. See
        // reports-data.ts.
        path: 'reports',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      // Design System Foundation, Phase 1 — "Coming Soon" placeholders for
      // nav items that ship in the shell for visual completeness but have
      // no real screen yet. See navigation.config.ts's `comingSoon` flag.
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
        // Phase 8 — Settings hub, replacing the Phase 1 "Coming Soon"
        // placeholder with real links to Profile/Team/Approvals/Document
        // Types.
        path: 'settings',
        element: (
          <ProtectedRoute roles={['admin']}>
            <SettingsHubPage />
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
  return (
    <Suspense
      fallback={
        <div className={fullPageStyles.fullPage}>
          <LoadingState message="Loading…" />
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
}
