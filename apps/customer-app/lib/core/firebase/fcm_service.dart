import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../features/notifications/notifications_controller.dart';
import '../config/env_config.dart';
import '../di/injection.dart';
import '../network/user_repository.dart';
import '../notifications/notification_deep_link.dart';
import '../router/app_router.dart';

/// Push notification wiring for an already-bootstrapped app —
/// permission request, token registration/refresh, and what happens
/// when a push arrives while foregrounded or is tapped open. See the
/// Customer App Backend Integration plan's Phase 4 scope decisions:
/// no `flutter_local_notifications` dependency — Android already
/// renders the system-tray notification for a backgrounded/terminated
/// app from FCM's own `notification` payload (native SDK behavior,
/// `fcm_background_handler.dart` just satisfies the registration
/// contract for it); this only covers what that can't: registering
/// the token, refreshing the in-app list while foregrounded, and
/// deep-linking on tap.
///
/// Token registration is deliberately tied to `AuthController`'s state
/// (via GetIt, not Riverpod — the token itself has nothing to do with
/// reactive UI state) rather than called unconditionally at startup:
/// `POST /v1/auth/me/device-token` requires an authenticated session,
/// so this only fires once one exists, and again on every future
/// sign-in.
class FcmService {
  FcmService({required this.logger, required this.container});

  final AppLogger logger;
  final ProviderContainer container;

  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized || !EnvConfig.firebaseEnabled) {
      return;
    }
    _initialized = true;

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpenedApp);
    FirebaseMessaging.instance.onTokenRefresh.listen(_registerToken);

    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      _navigate(initialMessage);
    }

    getIt<AuthController>().addListener(_onAuthStateChanged);
    _onAuthStateChanged();
  }

  void _onAuthStateChanged() {
    if (getIt<AuthController>().state is AuthAuthenticated) {
      unawaited(_requestPermissionAndRegister());
    }
  }

  Future<void> _requestPermissionAndRegister() async {
    try {
      final settings = await FirebaseMessaging.instance.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        logger.info('Push notification permission denied.');
        return;
      }
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await _registerToken(token);
      }
    } catch (error, stackTrace) {
      logger.error('Push notification setup failed.', error, stackTrace);
    }
  }

  Future<void> _registerToken(String token) async {
    final result = await getIt<UserRepository>().updateDeviceToken(token);
    result.when(
      success: (_) => logger.info('FCM token registered.'),
      failure: (error) => logger.warning('FCM token registration failed.', error),
    );
  }

  void _onForegroundMessage(RemoteMessage message) {
    container.invalidate(notificationsProvider);
  }

  void _onMessageOpenedApp(RemoteMessage message) => _navigate(message);

  void _navigate(RemoteMessage message) {
    navigateToNotificationTarget(
      appRouter,
      relatedEntityType: message.data['relatedEntityType'] as String?,
      relatedEntityId: message.data['relatedEntityId'] as String?,
    );
  }
}
