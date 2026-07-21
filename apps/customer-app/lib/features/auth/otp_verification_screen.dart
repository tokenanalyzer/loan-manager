import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/auth/customer_auth_repository.dart';
import '../../core/di/injection.dart';

const _resendCooldown = Duration(seconds: 30);

/// Second step of the Customer App's phone/OTP sign-in flow: collects
/// the SMS code and completes Firebase sign-in.
///
/// Once `verifyOtp` succeeds, Firebase's own auth-state stream fires
/// and the shared `AuthController` takes over (backend session sync +
/// router redirect to the authenticated home screen) — this screen
/// doesn't navigate on success itself.
class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({
    required this.phoneNumber,
    required this.verificationId,
    super.key,
  });

  final String phoneNumber;
  final String verificationId;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _isVerifying = false;
  bool _isResending = false;
  String? _errorMessage;

  // Tracks the *current* verification id — a resend gets a new one from
  // Firebase, and verifying must use whichever one is current.
  late String _verificationId = widget.verificationId;

  Timer? _cooldownTimer;
  int _cooldownSecondsLeft = _resendCooldown.inSeconds;

  @override
  void initState() {
    super.initState();
    _startCooldown();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _cooldownSecondsLeft = _resendCooldown.inSeconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_cooldownSecondsLeft <= 1) {
        timer.cancel();
        setState(() => _cooldownSecondsLeft = 0);
        return;
      }
      setState(() => _cooldownSecondsLeft -= 1);
    });
  }

  Future<void> _resend() async {
    setState(() {
      _isResending = true;
      _errorMessage = null;
    });

    await getIt<CustomerAuthRepository>().sendOtp(
      phoneNumber: widget.phoneNumber,
      onCodeSent: (verificationId) {
        if (!mounted) return;
        setState(() {
          _verificationId = verificationId;
          _isResending = false;
        });
        _startCooldown();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('A new code has been sent.')),
        );
      },
      onVerificationFailed: (message) {
        if (!mounted) return;
        setState(() {
          _isResending = false;
          _errorMessage = message;
        });
      },
    );
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
        verificationId: _verificationId,
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
              const SizedBox(height: 16),
              Center(
                child: _isResending
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : TextButton(
                        onPressed: _cooldownSecondsLeft > 0 ? null : _resend,
                        child: Text(
                          _cooldownSecondsLeft > 0
                              ? "Didn't get the code? Resend in ${_cooldownSecondsLeft}s"
                              : "Didn't get the code? Resend",
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
