import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

import 'router/app_router.dart';

/// Root application widget.
///
/// Phase 2 scope: wires up the shared theme and router. No global
/// state/providers beyond dependency injection (configured separately
/// in `core/di/injection.dart`) are set up yet.
class EmployeeApp extends StatelessWidget {
  const EmployeeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Loan Manager — Employee',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: appRouter,
    );
  }
}
