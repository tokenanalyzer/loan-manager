import 'package:flutter/material.dart';

import 'legal_config.dart';
import 'legal_page_scaffold.dart';

/// Static About Company content.
class AboutCompanyScreen extends StatelessWidget {
  const AboutCompanyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalPageScaffold(
      title: 'About Company',
      effectiveDate: LegalConfig.effectiveDate,
      sections: [
        LegalSection(
          heading: 'Who we are',
          body: LegalConfig.facilitationStatement,
        ),
        LegalSection(
          heading: 'What we do',
          body:
              '${LegalConfig.platformName} helps you find and apply for a loan without '
              'visiting multiple banks or NBFCs yourself. You submit one application, we '
              'route it to the partner lender(s) best suited to your request, and you '
              'work directly with whichever lender approves it through to disbursement.',
        ),
        LegalSection(
          heading: 'Registered office',
          body: LegalConfig.registeredOffice,
        ),
        LegalSection(
          heading: 'Grievance officer',
          body: LegalConfig.grievanceOfficerContact,
        ),
        LegalSection(
          heading: 'Get in touch',
          body:
              'Email ${LegalConfig.supportEmail} or call ${LegalConfig.supportPhone}, or '
              'use Profile > Help Center > Contact support from within the app.',
        ),
      ],
    );
  }
}
