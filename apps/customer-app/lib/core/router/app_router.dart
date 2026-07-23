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
import '../../features/legal/about_company_screen.dart';
import '../../features/legal/customer_consent_screen.dart';
import '../../features/legal/data_deletion_policy_screen.dart';
import '../../features/legal/legal_hub_screen.dart';
import '../../features/legal/loan_facilitation_disclaimer_screen.dart';
import '../../features/legal/privacy_policy_screen.dart';
import '../../features/legal/terms_conditions_screen.dart';
import '../../features/loans/application_detail_screen.dart';
import '../../features/loans/loan_application_flow_screen.dart';
import '../../features/loans/loan_application_success_screen.dart';
import '../../features/loans/loan_category_selection_screen.dart';
import '../../features/loans/my_applications_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/account_deletion_screen.dart';
import '../../features/profile/linked_accounts_screen.dart';
import '../../features/profile/privacy_settings_screen.dart';
import '../../features/profile/profile_edit_screen.dart';
import '../../features/profile/profile_view_screen.dart';
import '../../features/rewards/rewards_screen.dart';
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
// Set once `AuthAuthenticated` has been observed at least once this app
// run. `AuthController` now listens to Firebase's `userChanges()` (not
// just `authStateChanges()`) so it can react to account-linking — see
// `AuthController.refreshSession` — which means `AuthSyncing` can now
// recur mid-session (a token refresh, or a just-linked provider), not
// only at cold start. Without this flag, every one of those background
// resyncs would force-navigate an already-authenticated user to
// `/splash` and back, interrupting whatever screen they were on.
bool _hasAuthenticatedOnce = false;

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
      // See `_hasAuthenticatedOnce`'s doc comment: only the true
      // cold-start sync forces the splash screen.
      if (_hasAuthenticatedOnce) {
        return null;
      }
      return isSplash ? null : '/splash';
    }

    // Keeps the branding splash animation on-screen for its full
    // duration even when Firebase auth resolves almost instantly —
    // see `main.dart`'s Timer and `AppBootstrapState.splashMinimumElapsed`.
    if (!AppBootstrapState.splashMinimumElapsed) {
      return isSplash ? null : '/splash';
    }

    if (authState is AuthAuthenticated) {
      _hasAuthenticatedOnce = true;
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
      // `extra` is in-memory only — it doesn't survive an Android
      // process restart (e.g. the OS reclaims memory while the user is
      // on this screen, then restores the saved route later). Without
      // this guard, restoring here with no `extra` would force-cast
      // `null` and crash immediately on build; redirecting back to
      // `/login` instead just asks the user to resend the code.
      redirect: (context, state) => state.extra is (String, String) ? null : '/login',
      builder: (context, state) {
        // `redirect` above only runs when this route is first matched —
        // not on every subsequent rebuild. `refreshListenable` (Firebase
        // auth state changes, e.g. this very screen's own phone
        // verification completing) can force GoRouter to rebuild this
        // already-matched route without replaying that guard, and the
        // recomputed `GoRouterState.extra` comes back null since it
        // wasn't part of a fresh `push`. Observed live: "type 'Null' is
        // not a subtype of type '(String, String)' in type cast" right
        // as auto sign-in completed. The top-level redirect moves the
        // user off this screen on the very next frame in that case
        // (auth is already resolved); render nothing disruptive instead
        // of crashing on an unconditional cast.
        final extra = state.extra;
        if (extra is! (String, String)) {
          return const SizedBox.shrink();
        }
        final (phoneNumber, verificationId) = extra;
        return OtpVerificationScreen(
          phoneNumber: phoneNumber,
          verificationId: verificationId,
        );
      },
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
      // See `/login/verify`'s comment — `extra` doesn't survive a
      // process restart. Falling back to the applications list is safe
      // here: the application was already submitted successfully by
      // the time this route is reached.
      redirect: (context, state) => state.extra is String ? null : '/loans',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child:
            LoanApplicationSuccessScreen(applicationId: state.extra as String),
      ),
    ),
    GoRoute(
      path: '/loans/:id',
      name: 'loan-application-detail',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child:
            ApplicationDetailScreen(applicationId: state.pathParameters['id']!),
      ),
    ),

    // Documents (secondary).
    GoRoute(
      path: '/documents/:id',
      name: 'document-preview',
      // See `/login/verify`'s comment — `extra` doesn't survive a
      // process restart. Falling back to the documents list is safe;
      // this route deliberately has no fetch-by-id path of its own.
      redirect: (context, state) => state.extra is AppDocument ? null : '/documents',
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
      path: '/profile/linked-accounts',
      name: 'linked-accounts',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const LinkedAccountsScreen(),
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

    // Legal & Policies (secondary).
    GoRoute(
      path: '/legal',
      name: 'legal-hub',
      pageBuilder: (context, state) =>
          fadeThroughPage(key: state.pageKey, child: const LegalHubScreen()),
    ),
    GoRoute(
      path: '/legal/privacy-policy',
      name: 'legal-privacy-policy',
      pageBuilder: (context, state) => fadeThroughPage(
          key: state.pageKey, child: const PrivacyPolicyScreen()),
    ),
    GoRoute(
      path: '/legal/terms',
      name: 'legal-terms',
      pageBuilder: (context, state) => fadeThroughPage(
          key: state.pageKey, child: const TermsConditionsScreen()),
    ),
    GoRoute(
      path: '/legal/disclaimer',
      name: 'legal-disclaimer',
      pageBuilder: (context, state) => fadeThroughPage(
        key: state.pageKey,
        child: const LoanFacilitationDisclaimerScreen(),
      ),
    ),
    GoRoute(
      path: '/legal/consent',
      name: 'legal-consent',
      pageBuilder: (context, state) => fadeThroughPage(
          key: state.pageKey, child: const CustomerConsentScreen()),
    ),
    GoRoute(
      path: '/legal/data-deletion',
      name: 'legal-data-deletion',
      pageBuilder: (context, state) => fadeThroughPage(
          key: state.pageKey, child: const DataDeletionPolicyScreen()),
    ),
    GoRoute(
      path: '/legal/about',
      name: 'legal-about',
      pageBuilder: (context, state) => fadeThroughPage(
          key: state.pageKey, child: const AboutCompanyScreen()),
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

    // Rewards (secondary).
    GoRoute(
      path: '/rewards',
      name: 'rewards',
      pageBuilder: (context, state) =>
          fadeThroughPage(key: state.pageKey, child: const RewardsScreen()),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    body: Center(child: Text('Route not found: ${state.uri.path}')),
  ),
);
