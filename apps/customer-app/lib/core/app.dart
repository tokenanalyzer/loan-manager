import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'router/app_router.dart';

/// The Android hardware/gesture back button reaches go_router via
/// `WidgetsBinding.handlePopRoute` -> the app's `BackButtonDispatcher`
/// -> `GoRouterDelegate.popRoute()`.
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
/// PREVIOUS VERSION OF THIS FIX WAS WRONG: it called `appRouter.pop()`
/// directly whenever `canPop()` was true, on the assumption that was
/// just "the same well-tested pop path as an AppBar back button."
/// That assumption was false — an AppBar back button calls
/// `Navigator.pop`/a widget's own callback directly on its
/// `BuildContext`, a completely different path from the hardware
/// button's `didPopRoute()`. Routing every hardware-back press through
/// `appRouter.pop()` bypassed *every* in-route `PopScope` in the app —
/// reproduced live: pressing back mid-way through the loan application
/// wizard exited the entire wizard instead of stepping back one page
/// (`LoanApplicationFlowScreen`'s own `PopScope`, `canPop:
/// state.isFirstStep`, never got a chance to intercept it), silently
/// discarding whatever the customer had entered — this is the exact
/// class of bug `TODO_NEXT_SESSION.md` already documents as fixed via
/// that PopScope, undone by this dispatcher.
///
/// The correct fix only special-cases the scenario that actually
/// crashes: falls through to the default `super.didPopRoute()` (which
/// runs the standard `routerDelegate.popRoute()` path and correctly
/// consults every in-route `PopScope` — including the wizard's and
/// `AppShell`'s) whenever there's a real route to pop, and only takes
/// over with `go('/')`/`SystemNavigator.pop()` for the "nothing to
/// pop" case that crashes go_router's own internals.
class _SafeBackButtonDispatcher extends RootBackButtonDispatcher {
  @override
  Future<bool> didPopRoute() async {
    if (appRouter.canPop()) {
      return super.didPopRoute();
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
