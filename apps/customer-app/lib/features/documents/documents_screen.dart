import 'package:flutter/material.dart';

import 'documents_checklist.dart';

/// Required documents list — upload, replace, and see what's missing.
///
/// The checklist itself lives in [DocumentsChecklist] (no `Scaffold`
/// of its own) so the exact same upload/replace/preview logic can
/// also be embedded as a step inside the loan-application wizard
/// (`_DocumentsStep` in `loan_application_flow_screen.dart`) — this
/// screen is just that checklist plus the standalone tab's app bar.
class DocumentsScreen extends StatelessWidget {
  const DocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: const DocumentsChecklist(),
    );
  }
}
