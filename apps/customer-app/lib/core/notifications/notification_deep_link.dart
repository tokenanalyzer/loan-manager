import 'package:go_router/go_router.dart';

/// Navigates to wherever a notification points, given its backend-
/// supplied `relatedEntityType`/`relatedEntityId` — the single place
/// that translates that routing hint into an actual navigation,
/// shared by the in-app notification list (`notifications_screen.dart`)
/// and FCM's tap-to-open handlers (`FcmService`) so the two paths can
/// never drift apart. `document`/`customer_profile` land on the root
/// paths of persistent bottom-nav tabs — `router.go` (not `push`)
/// reactivates that shell branch instead of pushing a competing page
/// on top of it; `loan_application` is a genuinely separate top-level
/// route, so `push` there is correct. See `notifications_screen.dart`'s
/// original comment for the live-reproduced crash this distinction
/// fixes.
void navigateToNotificationTarget(
  GoRouter router, {
  required String? relatedEntityType,
  required String? relatedEntityId,
}) {
  switch (relatedEntityType) {
    case 'loan_application':
      if (relatedEntityId != null) {
        router.push('/loans/$relatedEntityId');
      }
    case 'document':
      router.go('/documents');
    case 'customer_profile':
      router.go('/profile');
  }
}
