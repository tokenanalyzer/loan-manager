import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/customer_auth_repository.dart';
import '../../core/config/env_config.dart';
import '../../core/di/injection.dart';
import 'auth_not_configured_screen.dart';

/// First step of the Customer App's phone/OTP sign-in flow: collects a
/// phone number and requests an OTP SMS.
class PhoneEntryScreen extends StatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  State<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends State<PhoneEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  bool _isSending = false;
  bool _isGoogleSigningIn = false;
  String? _errorMessage;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _isSending = true;
      _errorMessage = null;
    });

    final phoneNumber = '+91${_phoneController.text.trim()}';
    await getIt<CustomerAuthRepository>().sendOtp(
      phoneNumber: phoneNumber,
      onCodeSent: (verificationId) {
        if (!mounted) return;
        setState(() => _isSending = false);
        context.push('/login/verify', extra: (phoneNumber, verificationId));
      },
      onVerificationFailed: (message) {
        if (!mounted) return;
        setState(() {
          _isSending = false;
          _errorMessage = message;
        });
      },
    );
  }

  Future<void> _signInWithGoogle() async {
    setState(() {
      _isGoogleSigningIn = true;
      _errorMessage = null;
    });

    try {
      await getIt<CustomerAuthRepository>().signInWithGoogle();
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Google sign-in failed. Please try again.');
    }

    if (mounted) {
      setState(() => _isGoogleSigningIn = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!EnvConfig.firebaseEnabled) {
      return const AuthNotConfiguredScreen();
    }

    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.account_balance, size: 32, color: Colors.white),
                ),
              ),
              const SizedBox(height: 24),
              Text('Enter your phone number', style: textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text("We'll text you a code to verify it's you.",
                  style: textTheme.bodyMedium),
              const SizedBox(height: 24),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                ],
                decoration: const InputDecoration(
                  labelText: 'Mobile number',
                  hintText: '98765 43210',
                  prefixText: '+91 ',
                  counterText: '',
                ),
                validator: (value) {
                  if (value == null || !RegExp(r'^[6-9][0-9]{9}$').hasMatch(value)) {
                    return 'Enter a valid 10-digit Indian mobile number.';
                  }
                  return null;
                },
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isSending ? null : _submit,
                child: _isSending
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Send code'),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  const Expanded(child: Divider()),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text('OR', style: textTheme.bodySmall),
                  ),
                  const Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: _isGoogleSigningIn ? null : _signInWithGoogle,
                icon: _isGoogleSigningIn
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.g_mobiledata, size: 28),
                label: const Text('Continue with Google'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
