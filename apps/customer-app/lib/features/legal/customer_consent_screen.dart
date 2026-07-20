import 'package:flutter/material.dart';

import 'legal_config.dart';
import 'legal_page_scaffold.dart';

/// Static Customer Consent explainer. This describes what the consent
/// mechanisms in the app actually mean — the mechanisms themselves
/// (the marketing-communications toggle and the data-processing
/// accept action) already exist and function under Profile > Privacy
/// settings; this page explains them, it doesn't duplicate them.
class CustomerConsentScreen extends StatelessWidget {
  const CustomerConsentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalPageScaffold(
      title: 'Customer Consent',
      effectiveDate: LegalConfig.effectiveDate,
      sections: [
        LegalSection(
          heading: 'Consent to process your application',
          body: 'By submitting a loan application, you consent to '
              '${LegalConfig.companyLegalName} collecting, processing, and sharing your '
              'application details and documents with the partner Bank(s)/NBFC(s) we '
              'route your application to, solely for the purpose of evaluating that '
              'application. See our Privacy Policy and Loan Facilitation Disclaimer for '
              'the full detail on how this works.',
        ),
        LegalSection(
          heading: 'Consent to be contacted about your application',
          body:
              'You consent to being contacted by phone call, SMS, WhatsApp, or email '
              'regarding your account and any active application — for example, a '
              'document re-upload request, a status update, or a question from the '
              'partner lender. This service-related contact is necessary to process your '
              'application and is not something you can opt out of while an application '
              'is active.',
        ),
        LegalSection(
          heading: 'Marketing communications are separate and optional',
          body:
              'Promotional messages about new offers or products are governed by a '
              'separate, opt-in "Marketing communications" toggle under Profile > Privacy '
              'settings. Turning it off stops promotional messages without affecting '
              'service-related contact about an active application.',
        ),
        LegalSection(
          heading: 'Data processing consent',
          body:
              'Profile > Privacy settings also records your acceptance of our data '
              'processing policy (described in full in our Privacy Policy) with a '
              'timestamp. You can review that acceptance record at any time in the same '
              'place.',
        ),
        LegalSection(
          heading: 'Withdrawing consent',
          body:
              'You can turn off marketing communications at any time under Profile > '
              'Privacy settings. Because service-related contact and data sharing with a '
              'partner lender are necessary to process an active application, withdrawing '
              'that consent generally means withdrawing the application itself — contact '
              '${LegalConfig.supportEmail} if you want to do this.',
        ),
      ],
    );
  }
}
