import 'package:flutter/material.dart';

import 'legal_config.dart';
import 'legal_page_scaffold.dart';

/// Static Loan Facilitation Disclaimer — the single most important
/// legal page in this app: making unmistakably clear that
/// [LegalConfig.companyLegalName] is a facilitator, not a lender.
class LoanFacilitationDisclaimerScreen extends StatelessWidget {
  const LoanFacilitationDisclaimerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalPageScaffold(
      title: 'Loan Facilitation Disclaimer',
      effectiveDate: LegalConfig.effectiveDate,
      sections: [
        LegalSection(
          heading: 'We are a facilitator, not a lender',
          body: LegalConfig.facilitationStatement,
        ),
        LegalSection(
          heading: 'No guarantee of approval',
          body:
              'Submitting an application through ${LegalConfig.platformName} does not '
              'guarantee that any partner lender will approve it, or approve it on the '
              'terms you requested. Approval, interest rate, tenure, and all other loan '
              'terms are decided solely by the partner Bank or NBFC that reviews your '
              'application.',
        ),
        LegalSection(
          heading: 'Your agreement is with the lender',
          body:
              'Once a partner lender approves your application, your loan agreement, '
              'repayment obligations, and any dispute about the loan itself are between '
              'you and that lender — not ${LegalConfig.companyLegalName}.',
        ),
        LegalSection(
          heading: 'How we may be compensated',
          body: 'Consistent with standard DSA (Direct Selling Agent) practice, '
              '${LegalConfig.companyLegalName} may receive a referral or facilitation fee '
              'from a partner lender when a loan we facilitated is disbursed. This does '
              'not change the amount you repay to the lender, and does not make us a '
              'party to your loan agreement.',
        ),
        LegalSection(
          heading: 'Data shared for facilitation',
          body:
              'To facilitate your application, we share the details and documents you '
              'submit with the partner lender(s) evaluating it. See our Privacy Policy '
              'for the full picture of how your data is used and shared.',
        ),
        LegalSection(
          heading: 'Questions about this disclaimer',
          body:
              'If anything here is unclear, contact us at ${LegalConfig.supportEmail} '
              'before submitting an application.',
        ),
      ],
    );
  }
}
