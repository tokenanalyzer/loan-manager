import 'package:flutter/material.dart';

import 'legal_config.dart';
import 'legal_page_scaffold.dart';

/// Static Privacy Policy content — see `legal_config.dart` for why
/// company-specific facts are centralized rather than hardcoded here.
class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalPageScaffold(
      title: 'Privacy Policy',
      effectiveDate: LegalConfig.effectiveDate,
      sections: [
        LegalSection(
          heading: 'Who we are',
          body: LegalConfig.facilitationStatement,
        ),
        LegalSection(
          heading: 'Information we collect',
          body:
              'To process a loan facilitation request, we collect: your phone number '
              '(used to sign in via OTP); identity and address details you provide, '
              'including PAN and Aadhaar (Aadhaar is stored as a one-way hash plus the '
              'last 4 digits only — we never store the full Aadhaar number); employment '
              'and income details; the documents you upload (e.g. ID proof, income proof, '
              'and other documents a specific loan category requires); and basic device/'
              'usage information needed to operate the app securely.',
        ),
        LegalSection(
          heading: 'How we use your information',
          body:
              'We use your information to create and manage your account, evaluate and '
              'route your loan application, verify the documents you submit, communicate '
              'with you about your application\'s status, and meet our own legal and '
              'record-keeping obligations as a facilitation platform.',
        ),
        LegalSection(
          heading: 'Sharing with partner Banks and NBFCs',
          body:
              'Because ${LegalConfig.companyLegalName} facilitates rather than lends, '
              'your application data and documents are shared with the partner Bank(s) '
              'or NBFC(s) best matched to your request, solely so they can evaluate and '
              'decide on your loan. We do not sell your personal information to third '
              'parties for their own marketing purposes.',
        ),
        LegalSection(
          heading: 'Data security',
          body:
              'Uploaded documents and application data are stored using access-controlled '
              'infrastructure. Staff access to your documents is limited to employees '
              'assigned to your application and administrators, and every access is '
              'recorded in an audit trail.',
        ),
        LegalSection(
          heading: 'Your choices and rights',
          body:
              'You can review and update your profile at any time under Profile > Edit '
              'profile, manage marketing-communication and data-processing consent under '
              'Profile > Privacy settings, and request deletion of your account under '
              'Profile > Privacy settings > Request account deletion. See our Data '
              'Deletion Policy for what happens after a deletion request.',
        ),
        LegalSection(
          heading: 'Data retention',
          body:
              'We retain application, loan, and communication records for as long as your '
              'account is active and for a further period afterward where required to '
              'meet legal, regulatory, or accounting obligations.',
        ),
        LegalSection(
          heading: 'Changes to this policy',
          body:
              'We may update this Privacy Policy from time to time. Material changes will '
              'be reflected by a new effective date above.',
        ),
        LegalSection(
          heading: 'Contact us',
          body: 'Questions about this policy or your data can be sent to '
              '${LegalConfig.supportEmail}, or via Profile > Help Center > Contact support.',
        ),
      ],
    );
  }
}
