import 'package:flutter/material.dart';

import 'legal_config.dart';
import 'legal_page_scaffold.dart';

/// Static Terms & Conditions content.
class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalPageScaffold(
      title: 'Terms & Conditions',
      effectiveDate: LegalConfig.effectiveDate,
      sections: [
        LegalSection(
          heading: 'Acceptance of these terms',
          body:
              'By creating an account or submitting a loan application through '
              '${LegalConfig.platformName}, you agree to these Terms & Conditions, our '
              'Privacy Policy, and our Loan Facilitation Disclaimer.',
        ),
        LegalSection(
          heading: 'What this service is',
          body: LegalConfig.facilitationStatement,
        ),
        LegalSection(
          heading: 'Eligibility',
          body:
              'You must be at least 18 years old and legally capable of entering into a '
              'binding agreement to use this service.',
        ),
        LegalSection(
          heading: 'Your account',
          body:
              'You are responsible for the accuracy of the information and documents you '
              'submit, and for keeping access to your account secure. Providing false or '
              'misleading information may result in your application being rejected or '
              'your account being suspended.',
        ),
        LegalSection(
          heading: 'The facilitation process',
          body:
              'When you submit a loan application, we route it to one or more partner '
              'Banks/NBFCs for evaluation. We do not guarantee that any partner lender '
              'will approve your application, and we do not control the interest rate, '
              'tenure, fees, or other terms a partner lender offers — those are set by '
              'the lender and form an agreement directly between you and them.',
        ),
        LegalSection(
          heading: 'Fees',
          body:
              'Any facilitation fee charged by ${LegalConfig.companyLegalName}, or any fee '
              'charged separately by a partner lender, will be disclosed to you before you '
              'proceed with that lender\'s offer.',
        ),
        LegalSection(
          heading: 'Prohibited use',
          body:
              'You agree not to use this service to submit fraudulent applications or '
              'documents, impersonate another person, or interfere with the platform\'s '
              'normal operation.',
        ),
        LegalSection(
          heading: 'Limitation of liability',
          body:
              'As a facilitator, ${LegalConfig.companyLegalName} is not responsible for a '
              'partner lender\'s decision to approve, reject, or set terms for your loan, '
              'or for that lender\'s own conduct once you are dealing with them directly.',
        ),
        LegalSection(
          heading: 'Termination',
          body:
              'You may stop using the service at any time and request account deletion '
              'under Profile > Privacy settings. We may suspend or terminate access for '
              'violation of these terms.',
        ),
        LegalSection(
          heading: 'Governing law',
          body:
              'These terms are governed by the laws of India, without regard to conflict-'
              'of-law principles.',
        ),
        LegalSection(
          heading: 'Changes to these terms',
          body:
              'We may update these terms from time to time. Material changes will be '
              'reflected by a new effective date above.',
        ),
        LegalSection(
          heading: 'Contact us',
          body:
              'Questions about these terms can be sent to ${LegalConfig.supportEmail}.',
        ),
      ],
    );
  }
}
