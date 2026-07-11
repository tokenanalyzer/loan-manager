import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/injection.dart';
import '../../core/models/loan_application.dart';
import '../../core/network/loan_application_repository.dart';

/// Lists every loan application for staff review.
///
/// Phase 5 scope: a flat list, no filtering/sorting by status yet
/// (already-decided applications remain visible for reference).
class ApplicationReviewQueueScreen extends StatefulWidget {
  const ApplicationReviewQueueScreen({super.key});

  @override
  State<ApplicationReviewQueueScreen> createState() => _ApplicationReviewQueueScreenState();
}

class _ApplicationReviewQueueScreenState extends State<ApplicationReviewQueueScreen> {
  late Future<List<LoanApplication>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<LoanApplication>> _load() async {
    final result = await getIt<LoanApplicationRepository>().getAllApplications();
    return result.when(success: (data) => data, failure: (error) => throw error);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Loan applications')),
      body: FutureBuilder<List<LoanApplication>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load applications: ${snapshot.error}'));
          }

          final applications = snapshot.data ?? [];
          if (applications.isEmpty) {
            return const Center(child: Text('No loan applications yet.'));
          }

          return ListView.separated(
            itemCount: applications.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final application = applications[index];
              return ListTile(
                title: Text('\$${application.requestedAmount} · ${application.requestedTermMonths} mo'),
                subtitle: Text(application.status),
                onTap: () async {
                  await context.push('/applications/${application.id}');
                  setState(() => _future = _load());
                },
              );
            },
          );
        },
      ),
    );
  }
}
