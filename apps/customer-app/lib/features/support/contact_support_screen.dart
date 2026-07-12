import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/widgets/primary_button.dart';

/// "Raise a support ticket" implemented as a real `mailto:` composer
/// opening the device's own email client, pre-filled with the
/// customer's message — not a fake "ticket submitted" screen with no
/// backend behind it. See docs/architecture.md for why this was
/// chosen over building a full ticketing backend module.
class ContactSupportScreen extends StatefulWidget {
  const ContactSupportScreen({super.key});

  @override
  State<ContactSupportScreen> createState() => _ContactSupportScreenState();
}

class _ContactSupportScreenState extends State<ContactSupportScreen> {
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String? _errorMessage;

  static const _supportEmail = 'support@loanmanager.example.com';

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_subjectController.text.trim().isEmpty ||
        _messageController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Enter a subject and a message.');
      return;
    }

    final uri = Uri(
      scheme: 'mailto',
      path: _supportEmail,
      queryParameters: {
        'subject': _subjectController.text.trim(),
        'body': _messageController.text.trim(),
      },
    );

    final launched = await launchUrl(uri);
    if (!launched && mounted) {
      setState(() => _errorMessage =
          'Could not open your email app. Please email $_supportEmail directly.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Contact support')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            Text('Raise a support request', style: textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              "We'll open your email app with your message pre-filled, addressed to our support team.",
              style: textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _subjectController,
              decoration: const InputDecoration(
                  labelText: 'Subject', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _messageController,
              maxLines: 6,
              decoration: const InputDecoration(
                  labelText: 'Message', border: OutlineInputBorder()),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(_errorMessage!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 20),
            PrimaryButton(
                label: 'Send via email',
                icon: Icons.email_outlined,
                onPressed: _send),
          ],
        ),
      ),
    );
  }
}
