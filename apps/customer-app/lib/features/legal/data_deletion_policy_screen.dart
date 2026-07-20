import 'package:flutter/material.dart';

import 'legal_config.dart';
import 'legal_page_scaffold.dart';

/// Static Data Deletion Policy. Deliberately consistent with the copy
/// in `account_deletion_screen.dart` (the actual request flow) rather
/// than describing different behavior — this page explains the policy
/// behind that screen, it doesn't restate a different process.
class DataDeletionPolicyScreen extends StatelessWidget {
  const DataDeletionPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalPageScaffold(
      title: 'Data Deletion Policy',
      effectiveDate: LegalConfig.effectiveDate,
      sections: [
        LegalSection(
          heading: 'How to request deletion',
          body:
              'Go to Profile > Privacy settings > Request account deletion. This records '
              'a deletion request — it does not delete anything immediately.',
        ),
        LegalSection(
          heading: 'What happens after you request deletion',
          body:
              'Our team reviews and follows up on every deletion request before anything '
              'is removed, since active loan applications or loans may need to be '
              'resolved first. This can take some time if you have an active application '
              'or loan in progress.',
        ),
        LegalSection(
          heading: 'What we retain even after deletion',
          body:
              'Some records — for example, completed loan and payment history, and audit '
              'logs of staff access to your documents — may be retained after your '
              'account is deleted where we are legally or regulatorily required to keep '
              'them, for the period required by that obligation.',
        ),
        LegalSection(
          heading: 'Documents shared with a partner lender',
          body:
              'If your application was already shared with a partner Bank/NBFC before '
              'your deletion request, that lender\'s own retention of the data they '
              'received is governed by their policy, not ours — contact them directly if '
              'your loan was disbursed through them.',
        ),
        LegalSection(
          heading: 'Questions',
          body:
              'Contact ${LegalConfig.supportEmail} with any questions about a deletion '
              'request already in progress.',
        ),
      ],
    );
  }
}
