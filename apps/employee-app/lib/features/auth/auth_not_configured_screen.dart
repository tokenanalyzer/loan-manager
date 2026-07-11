import 'package:flutter/material.dart';

/// Shown instead of the real sign-in flow when
/// `EnvConfig.firebaseEnabled` is false (the default without a real
/// Firebase project configured) — keeps the app compiling and running
/// end-to-end without crashing on an uninitialized Firebase SDK.
class AuthNotConfiguredScreen extends StatelessWidget {
  const AuthNotConfiguredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Text(
            'Authentication is not configured for this environment.\n'
            '(FIREBASE_ENABLED=false)',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ),
    );
  }
}
