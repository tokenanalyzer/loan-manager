import 'package:flutter/material.dart';

import '../../core/auth/customer_auth_repository.dart';
import '../../core/di/injection.dart';

/// Second step of the Customer App's phone/OTP sign-in flow: collects
/// the SMS code and completes Firebase sign-in.
///
/// Once `verifyOtp` succeeds, Firebase's own auth-state stream fires
/// and the shared `AuthController` takes over (backend session sync +
/// router redirect to the authenticated home screen) — this screen
/// doesn't navigate on success itself.
class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({required this.verificationId, super.key});

  final String verificationId;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _isVerifying = false;
  String? _errorMessage;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      await getIt<CustomerAuthRepository>().verifyOtp(
        verificationId: widget.verificationId,
        smsCode: _codeController.text.trim(),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isVerifying = false;
        _errorMessage = 'Incorrect or expired code. Please try again.';
      });
      return;
    }

    if (mounted) {
      setState(() => _isVerifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Enter code')),
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
                  child: const Icon(Icons.sms_outlined, size: 32, color: Colors.white),
                ),
              ),
              const SizedBox(height: 24),
              Text('Enter the 6-digit code', style: textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text('We sent a verification code by text message.',
                  style: textTheme.bodyMedium),
              const SizedBox(height: 24),
              TextFormField(
                controller: _codeController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(
                  labelText: 'Verification code',
                ),
                validator: (value) {
                  if (value == null || value.trim().length != 6) {
                    return 'Enter the 6-digit code.';
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
                onPressed: _isVerifying ? null : _submit,
                child: _isVerifying
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Verify'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
