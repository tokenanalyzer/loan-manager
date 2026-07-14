import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../features/auth/onboarding_screen.dart';
import '../../features/auth/otp_verification_screen.dart';
import '../../features/auth/phone_entry_screen.dart';
import '../../features/auth/splash_screen.dart';
import '../../features/documents/document_preview_screen.dart';
import '../../features/documents/documents_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/loans/application_detail_screen.dart';
import '../../features/loans/loan_application_flow_screen.dart';
import '../../features/loans/loan_application_success_screen.dart';
import '../../features/loans/loan_category_selection_screen.dart';
import '../../features/loans/loan_details_screen.dart';
import '../../features/loans/my_applications_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/account_deletion_screen.dart';
import '../../features/profile/privacy_settings_screen.dart';
import '../../features/profile/profile_edit_screen.dart';
import '../../features/profile/profile_view_screen.dart';
import '../../features/support/contact_support_screen.dart';
import '../../features/support/faq_screen.dart';
import '../../features/support/help_center_screen.dart';
import '../../features/tools/emi_calculator_screen.dart';
import '../bootstrap/app_bootstrap_state.dart';
import '../config/env_config.dart';
import '../di/injection.dart';

/// App routing.
///
/// Phase 6 rewrites the redirect gate to include Splash (session
/// restoration — see `SplashScreen`) and Onboarding (shown once,
/// tracked via `AppBootstrapState.hasSeenOnboarding`), and adds every
/// route for the loan journey, documents, profile, support, and
/// notifications features. When `EnvConfig.firebaseEnabled` is false,
/// gating is skipped entirely (same "stays optional" behavior as
/// every prior phase).
final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  refreshListenable: EnvConfig.firebaseEnabled ? getIt<AuthController>() : null,
  redirect: (context, state) {
    if (!EnvConfig.firebaseEnabled) {
      return null;
    }

    final authState = getIt<AuthController>().state;
    final location = state.matchedLocation;
    final isSplash = location == '/splash';
    final isOnboarding = location == '/onboarding';
    final isAuthRoute = location.startsWith('/login');

    if (authState is AuthInitial || authState is AuthSyncing) {
      return isSplash ? null : '/splash';
    }

    if (authState is AuthAuthenticated) {
      return (isSplash || isOnboarding || isAuthRoute) ? '/' : null;
    }

    // AuthUnauthenticated or AuthError.
    if (!AppBootstrapState.hasSeenOnboarding) {
      return isOnboarding ? null : '/onboarding';
    }
    return isAuthRoute ? null : '/login';
  },
  routes: [
    GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashScreen()),
    GoRoute(
      path: '/onboarding',
      name: 'onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => const PhoneEntryScreen(),
    ),
    GoRoute(
      path: '/login/verify',
      name: 'login-verify',
      builder: (context, state) =>
          OtpVerificationScreen(verificationId: state.extra as String),
    ),
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),

    // Loan journey.
    GoRoute(
      path: '/loans',
      name: 'my-loans',
      builder: (context, state) => const MyApplicationsScreen(),
    ),
    GoRoute(
      path: '/loans/categories',
      name: 'loan-categories',
      builder: (context, state) => const LoanCategorySelectionScreen(),
    ),
    GoRoute(
      path: '/loans/categories/:categoryId',
      name: 'loan-category-details',
      builder: (context, state) =>
          LoanDetailsScreen(categoryId: state.pathParameters['categoryId']!),
    ),
    GoRoute(
      path: '/loans/apply',
      name: 'loan-application-flow',
      builder: (context, state) => LoanApplicationFlowScreen(
          categoryId: state.uri.queryParameters['categoryId']),
    ),
    GoRoute(
      path: '/loans/apply/success',
      name: 'loan-application-success',
      builder: (context, state) =>
          LoanApplicationSuccessScreen(applicationId: state.extra as String),
    ),
    GoRoute(
      path: '/loans/:id',
      name: 'loan-application-detail',
      builder: (context, state) =>
          ApplicationDetailScreen(applicationId: state.pathParameters['id']!),
    ),

    // Documents.
    GoRoute(
      path: '/documents',
      name: 'documents',
      builder: (context, state) => const DocumentsScreen(),
    ),
    GoRoute(
      path: '/documents/:id',
      name: 'document-preview',
      builder: (context, state) =>
          DocumentPreviewScreen(documentId: state.pathParameters['id']!),
    ),

    // Profile.
    GoRoute(
      path: '/profile',
      name: 'profile',
      builder: (context, state) => const ProfileViewScreen(),
    ),
    GoRoute(
      path: '/profile/edit',
      name: 'profile-edit',
      builder: (context, state) => const ProfileEditScreen(),
    ),
    GoRoute(
      path: '/profile/privacy',
      name: 'privacy-settings',
      builder: (context, state) => const PrivacySettingsScreen(),
    ),
    GoRoute(
      path: '/profile/delete-account',
      name: 'account-deletion',
      builder: (context, state) => const AccountDeletionScreen(),
    ),

    // Support.
    GoRoute(
      path: '/support',
      name: 'help-center',
      builder: (context, state) => const HelpCenterScreen(),
    ),
    GoRoute(
        path: '/support/faq',
        name: 'faq',
        builder: (context, state) => const FaqScreen()),
    GoRoute(
      path: '/support/contact',
      name: 'contact-support',
      builder: (context, state) => const ContactSupportScreen(),
    ),

    // Notifications.
    GoRoute(
      path: '/notifications',
      name: 'notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),

    // Tools.
    GoRoute(
      path: '/tools/emi-calculator',
      name: 'emi-calculator',
      builder: (context, state) => const EmiCalculatorScreen(),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(child: Text('Route not found: ${state.uri.path}')),
  ),
);
