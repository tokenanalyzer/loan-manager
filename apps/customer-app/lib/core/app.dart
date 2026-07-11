import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'router/app_router.dart';

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
      routerConfig: appRouter,
    );
  }
}
