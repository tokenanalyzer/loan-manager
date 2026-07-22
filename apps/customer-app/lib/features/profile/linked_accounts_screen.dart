import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/auth/customer_auth_repository.dart';
import '../../core/di/injection.dart';
import '../../core/widgets/app_card.dart';
import 'profile_providers.dart';

/// Lets an already signed-in customer link their *other* sign-in
/// method (phone or Google) to the current account, instead of it
/// silently becoming a second, disconnected backend user the next time
/// they happen to pick that method on the login screen — see
/// `AuthService.syncFromFirebaseToken`'s identity-backfill and
/// `CustomerAuthRepository.linkGoogleAccount`/`linkPhoneNumber`.
class LinkedAccountsScreen extends ConsumerStatefulWidget {
  const LinkedAccountsScreen({super.key});

  @override
  ConsumerState<LinkedAccountsScreen> createState() =>
      _LinkedAccountsScreenState();
}

class _LinkedAccountsScreenState extends ConsumerState<LinkedAccountsScreen> {
  bool _isLinkingGoogle = false;
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  String? _errorMessage;

  bool _showPhoneEntry = false;
  final _phoneFormKey = GlobalKey<FormState>();
  final _otpFormKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  String? _verificationId;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  List<String> get _linkedProviders =>
      getIt<CustomerAuthRepository>().linkedProviderIds;
  bool get _hasPhone => _linkedProviders.contains('phone');
  bool get _hasGoogle => _linkedProviders.contains('google.com');

  // Linking updates the current Firebase user in place (same uid) —
  // AuthController.refreshSession deterministically re-syncs the
  // backend and its own `state` before this screen refetches profile
  // data, rather than racing the underlying `userChanges` stream.
  Future<void> _afterLinkSucceeded(String message) async {
    await getIt<AuthController>().refreshSession();
    if (!mounted) return;
    ref.invalidate(profileOverviewProvider);
    setState(() {
      _showPhoneEntry = false;
      _verificationId = null;
      _phoneController.clear();
      _codeController.clear();
    });
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _messageFor(Object error) {
    if (error is FirebaseAuthException) {
      switch (error.code) {
        case 'credential-already-in-use':
        case 'account-exists-with-different-credential':
          return 'That account is already linked to a different profile. '
              'Contact support if you believe these should be merged.';
        case 'provider-already-linked':
          return 'That sign-in method is already linked to your account.';
        case 'invalid-verification-code':
          return 'Incorrect code. Please try again.';
        case 'requires-recent-login':
          return 'For your security, please sign out and sign in again '
              'before linking a new account.';
        default:
          return error.message ?? 'Could not link that account. Please try again.';
      }
    }
    return 'Could not link that account. Please try again.';
  }

  Future<void> _linkGoogle() async {
    setState(() {
      _isLinkingGoogle = true;
      _errorMessage = null;
    });
    try {
      final linked = await getIt<CustomerAuthRepository>().linkGoogleAccount();
      if (!linked) {
        if (mounted) setState(() => _isLinkingGoogle = false);
        return;
      }
      await _afterLinkSucceeded('Google account linked.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = _messageFor(error));
    } finally {
      if (mounted) setState(() => _isLinkingGoogle = false);
    }
  }

  Future<void> _sendOtpToLink() async {
    if (!(_phoneFormKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isSendingOtp = true;
      _errorMessage = null;
    });
    final phoneNumber = '+91${_phoneController.text.trim()}';
    try {
      await getIt<CustomerAuthRepository>().sendOtpToLink(
        phoneNumber: phoneNumber,
        onCodeSent: (verificationId) {
          if (!mounted) return;
          setState(() {
            _verificationId = verificationId;
            _isSendingOtp = false;
          });
        },
        onVerificationFailed: (message) {
          if (!mounted) return;
          setState(() {
            _isSendingOtp = false;
            _errorMessage = message;
          });
        },
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isSendingOtp = false;
        _errorMessage = _messageFor(error);
      });
    }
  }

  Future<void> _verifyOtpToLink() async {
    if (!(_otpFormKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isVerifyingOtp = true;
      _errorMessage = null;
    });
    try {
      await getIt<CustomerAuthRepository>().linkPhoneNumber(
        verificationId: _verificationId!,
        smsCode: _codeController.text.trim(),
      );
      await _afterLinkSucceeded('Phone number linked.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = _messageFor(error));
    } finally {
      if (mounted) setState(() => _isVerifyingOtp = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Linked sign-in methods')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Link both sign-in methods so you always land in the same '
            'account, however you choose to sign in.',
            style: textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          AppCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.phone_iphone_outlined),
              title: const Text('Phone number'),
              subtitle: Text(_hasPhone ? 'Linked' : 'Not linked'),
              trailing: _hasPhone
                  ? const Icon(Icons.check_circle, color: AppColors.success)
                  : TextButton(
                      onPressed: _showPhoneEntry
                          ? null
                          : () => setState(() => _showPhoneEntry = true),
                      child: const Text('Link'),
                    ),
            ),
          ),
          if (_showPhoneEntry && !_hasPhone) ...[
            const SizedBox(height: 12),
            AppCard(
              child: _verificationId == null ? _phoneEntryForm() : _otpForm(),
            ),
          ],
          const SizedBox(height: 12),
          AppCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.g_mobiledata, size: 32),
              title: const Text('Google account'),
              subtitle: Text(_hasGoogle ? 'Linked' : 'Not linked'),
              trailing: _hasGoogle
                  ? const Icon(Icons.check_circle, color: AppColors.success)
                  : TextButton(
                      onPressed: _isLinkingGoogle ? null : _linkGoogle,
                      child: _isLinkingGoogle
                          ? const SizedBox(
                              height: 16,
                              width: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Link'),
                    ),
            ),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              _errorMessage!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
        ],
      ),
    );
  }

  Widget _phoneEntryForm() {
    return Form(
      key: _phoneFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            maxLength: 10,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
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
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _isSendingOtp ? null : _sendOtpToLink,
            child: _isSendingOtp
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Send code'),
          ),
        ],
      ),
    );
  }

  Widget _otpForm() {
    return Form(
      key: _otpFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _codeController,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: 'Verification code'),
            validator: (value) {
              if (value == null || value.trim().length != 6) {
                return 'Enter the 6-digit code.';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _isVerifyingOtp ? null : _verifyOtpToLink,
            child: _isVerifyingOtp
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Verify & link'),
          ),
        ],
      ),
    );
  }
}
