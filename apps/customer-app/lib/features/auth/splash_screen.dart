import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

/// Shown while the app is resolving whether a Firebase session can be
/// restored (`AuthState.AuthInitial`/`AuthSyncing` — see the router's
/// `redirect`). This is what makes "Session restoration" a real,
/// visible flow rather than an invisible implementation detail: the
/// user sees a branded loading moment, then lands on Home (session
/// restored) or the login flow (no session), never a flash of the
/// wrong screen.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.account_balance,
                  size: 44, color: AppColors.primary),
            ),
            const SizedBox(height: 24),
            Text(
              'Loan Manager',
              style: theme.textTheme.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 32),
            const SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                  strokeWidth: 2.5, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
