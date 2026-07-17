import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../features/auth/login_screen.dart';
import '../../features/crm/customer_detail_screen.dart';
import '../../features/crm/customer_list_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/loans/application_review_detail_screen.dart';
import '../../features/loans/application_review_queue_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../config/env_config.dart';
import '../di/injection.dart';
import '../navigation/app_shell.dart';

/// App routing.
///
/// Phase 4 added the email/password sign-in screen and auth-gated
/// `/`. Phase 5 added the CRM (customer list/detail) and loan
/// application review routes. This revision wraps the four primary
/// sections (Home/Customers/Applications/Profile) in a persistent
/// bottom-tab shell (`AppShell`) — detail screens (customer detail,
/// application review) stay top-level pushed routes above the shell,
/// matching the Customer App's navigation pattern.
final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  refreshListenable: EnvConfig.firebaseEnabled ? getIt<AuthController>() : null,
  redirect: (context, state) {
    if (!EnvConfig.firebaseEnabled) {
      return null;
    }

    final authState = getIt<AuthController>().state;
    final isOnAuthRoute = state.matchedLocation.startsWith('/login');

    return switch (authState) {
      AuthAuthenticated() => isOnAuthRoute ? '/' : null,
      AuthUnauthenticated() || AuthError() => isOnAuthRoute ? null : '/login',
      AuthInitial() || AuthSyncing() => null,
    };
  },
  routes: [
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/customers/:id',
      name: 'customer-detail',
      builder: (context, state) =>
          CustomerDetailScreen(customerId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/applications/:id',
      name: 'application-review-detail',
      builder: (context, state) => ApplicationReviewDetailScreen(
          applicationId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/notifications',
      name: 'notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          AppShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/',
            name: 'home',
            builder: (context, state) => const HomeScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/customers',
            name: 'customers',
            builder: (context, state) => const CustomerListScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/applications',
            name: 'applications',
            builder: (context, state) => const ApplicationReviewQueueScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ]),
      ],
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(child: Text('Route not found: ${state.uri.path}')),
  ),
);
