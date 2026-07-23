import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'router/app_router.dart';

/// The Android hardware/gesture back button reaches go_router via a
/// completely separate path from `PopScope` — the platform channel
/// calls `WidgetsBinding.handlePopRoute` -> the app's
/// `BackButtonDispatcher` -> `GoRouterDelegate.popRoute()` directly,
/// bypassing any `PopScope` in the widget tree entirely.
///
/// Reproduced repeatedly on a physical device: a back gesture at a
/// shell tab's root (nothing left for go_router to actually pop)
/// crashes go_router's own internals no matter which of its APIs is
/// used to ask it to pop — `GoRouterDelegate.popRoute()`'s
/// `_findCurrentNavigator()` throws a null-check failure, and calling
/// `NavigatorState.maybePop()` on its root navigator instead still
/// routes into go_router's own `_CustomNavigatorState._handlePopPage`
/// (package:go_router/src/builder.dart), which *also* null-check-fails
/// when there's nothing meaningful to pop. Both are genuine upstream
/// bugs in this go_router version's "pop with nothing to pop" path —
/// independent of Android's Predictive Back gesture setting.
///
/// The fix: never call into go_router's Navigator pop machinery
/// (`popRoute`/`maybePop`/`pop`) at all when there's nothing to pop.
/// `canPop()` and `go()` are separate, well-tested top-level APIs that
/// don't touch that broken internal path — popping a *real* pushed
/// route (Profile Edit, a document viewer, ...) still goes through
/// `appRouter.pop()` exactly as before (that path has been exercised
/// throughout this app via AppBar back buttons with no issue); only
/// the "nothing to pop" case is now handled by navigating Home or
/// exiting directly.
class _SafeBackButtonDispatcher extends RootBackButtonDispatcher {
  @override
  Future<bool> didPopRoute() async {
    if (appRouter.canPop()) {
      appRouter.pop();
      return true;
    }

    final isHome = appRouter.routerDelegate.currentConfiguration.uri.path == '/';
    if (isHome) {
      SystemNavigator.pop();
    } else {
      appRouter.go('/');
    }
    return true;
  }
}

/// Root application widget.
///
/// Wires up the shared theme and router. `ProviderScope` (Riverpod)
/// wraps this widget in `main.dart` — `CustomerApp` itself doesn't
/// consume any providers directly, so it stays a plain
/// `StatelessWidget`; screens further down the tree use
/// `ConsumerWidget`/`ref.watch` as needed.
class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Loan Manager — Customer',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      // `routerConfig` can't be combined with `backButtonDispatcher`
      // (MaterialApp.router asserts they're mutually exclusive) — GoRouter
      // exposes these three pieces publicly for exactly this case, so
      // wiring them individually is the supported way to also supply a
      // custom dispatcher, not a workaround.
      routeInformationProvider: appRouter.routeInformationProvider,
      routeInformationParser: appRouter.routeInformationParser,
      routerDelegate: appRouter.routerDelegate,
      backButtonDispatcher: _SafeBackButtonDispatcher(),
    );
  }
}
