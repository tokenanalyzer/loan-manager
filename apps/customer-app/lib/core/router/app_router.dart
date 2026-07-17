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
import '../models/document.dart';
import '../navigation/app_shell.dart';
import '../widgets/page_transitions.dart';

/// App routing.
///
/// The four primary sections (Home, Loans, Documents, Profile) live
/// inside one `StatefulShellRoute.indexedStack` — see `AppShell` — so
/// they share a persistent bottom nav and each keeps its own
/// scroll/local state alive while switching tabs. Every other screen
/// (loan application, document preview, profile edit, notifications,
/// support, EMI calculator, ...) stays a top-level `GoRoute` pushed
/// *above* the shell, exactly as before this pass — same paths, same
/// `context.push(...)` call sites, same deep links (e.g. a
/// notification linking to `/loans/:id`) — only how the four tab
/// roots are declared changed, not the route table's shape.
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

    // Keeps the branding splash animation on-screen for its full
    // duration even when Firebase auth resolves almost instantly —
    // see `main.dart`'s Timer and `AppBootstrapState.splashMinimumElapsed`.
    if (!AppBootstrapState.splashMinimumElapsed) {
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
      pageBuilder: (context, state) =>
          fadeThroughPage(key: state.pageKey, child: const SplashScreen()),
    ),
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

    // Persistent bottom-nav shell: Home / Loans / Documents / Profile.
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
            path: '/loans',
            name: 'my-loans',
            builder: (context, state) => const MyApplicationsScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/documents',
            name: 'documents',
            builder: (context, state) => const DocumentsScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfileViewScreen(),
          ),
        ]),
      ],
    ),

    // Loan journey (secondary screens — pushed above the shell, no bottom nav).
    GoRoute(
      path: '/loans/categories',
      name: 'loan-categories',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const LoanCategorySelectionScreen(),
      ),
    ),
    GoRoute(
      path: '/loans/categories/:categoryId',
      name: 'loan-category-details',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: LoanDetailsScreen(categoryId: state.pathParameters['categoryId']!),
      ),
    ),
    GoRoute(
      path: '/loans/apply',
      name: 'loan-application-flow',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: LoanApplicationFlowScreen(
            categoryId: state.uri.queryParameters['categoryId']),
      ),
    ),
    GoRoute(
      path: '/loans/apply/success',
      name: 'loan-application-success',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: LoanApplicationSuccessScreen(applicationId: state.extra as String),
      ),
    ),
    GoRoute(
      path: '/loans/:id',
      name: 'loan-application-detail',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: ApplicationDetailScreen(applicationId: state.pathParameters['id']!),
      ),
    ),

    // Documents (secondary).
    GoRoute(
      path: '/documents/:id',
      name: 'document-preview',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: DocumentPreviewScreen(document: state.extra as AppDocument),
      ),
    ),

    // Profile (secondary).
    GoRoute(
      path: '/profile/edit',
      name: 'profile-edit',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const ProfileEditScreen(),
      ),
    ),
    GoRoute(
      path: '/profile/privacy',
      name: 'privacy-settings',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const PrivacySettingsScreen(),
      ),
    ),
    GoRoute(
      path: '/profile/delete-account',
      name: 'account-deletion',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const AccountDeletionScreen(),
      ),
    ),

    // Support (secondary).
    GoRoute(
      path: '/support',
      name: 'help-center',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const HelpCenterScreen(),
      ),
    ),
    GoRoute(
      path: '/support/faq',
      name: 'faq',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const FaqScreen(),
      ),
    ),
    GoRoute(
      path: '/support/contact',
      name: 'contact-support',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const ContactSupportScreen(),
      ),
    ),

    // Notifications (secondary).
    GoRoute(
      path: '/notifications',
      name: 'notifications',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const NotificationsScreen(),
      ),
    ),

    // Tools (secondary).
    GoRoute(
      path: '/tools/emi-calculator',
      name: 'emi-calculator',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const EmiCalculatorScreen(),
      ),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(child: Text('Route not found: ${state.uri.path}')),
  ),
);
