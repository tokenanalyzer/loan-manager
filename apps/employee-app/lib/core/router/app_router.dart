import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../features/auth/login_screen.dart';
import '../../features/crm/customer_detail_screen.dart';
import '../../features/crm/customer_list_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/loans/application_review_detail_screen.dart';
import '../../features/loans/application_review_queue_screen.dart';
import '../config/env_config.dart';
import '../di/injection.dart';

/// App routing.
///
/// Phase 4 added the email/password sign-in screen and auth-gated
/// `/`. Phase 5 adds the CRM (customer list/detail) and loan
/// application review routes — all reachable only once authenticated.
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
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/customers',
      name: 'customers',
      builder: (context, state) => const CustomerListScreen(),
    ),
    GoRoute(
      path: '/customers/:id',
      name: 'customer-detail',
      builder: (context, state) =>
          CustomerDetailScreen(customerId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/applications',
      name: 'applications',
      builder: (context, state) => const ApplicationReviewQueueScreen(),
    ),
    GoRoute(
      path: '/applications/:id',
      name: 'application-review-detail',
      builder: (context, state) =>
          ApplicationReviewDetailScreen(applicationId: state.pathParameters['id']!),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(child: Text('Route not found: ${state.uri.path}')),
  ),
);
