import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/injection.dart';
import '../../core/models/loan_application.dart';
import '../../core/network/loan_application_repository.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/status_badge.dart';

/// Lists the signed-in customer's own loan applications.
class MyApplicationsScreen extends StatefulWidget {
  const MyApplicationsScreen({super.key});

  @override
  State<MyApplicationsScreen> createState() => _MyApplicationsScreenState();
}

class _MyApplicationsScreenState extends State<MyApplicationsScreen> {
  late Future<List<LoanApplication>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<LoanApplication>> _load() async {
    final result = await getIt<LoanApplicationRepository>().getMyApplications();
    return result.when(
        success: (data) => data, failure: (error) => throw error);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My loan applications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Apply for a loan',
            onPressed: () => context.push('/loans/categories'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _load()),
        child: FutureBuilder<List<LoanApplication>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const LoadingView();
            }
            if (snapshot.hasError) {
              return ErrorView(
                message: 'Could not load applications: ${snapshot.error}',
                onRetry: () => setState(() => _future = _load()),
              );
            }

            final applications = snapshot.data ?? [];
            if (applications.isEmpty) {
              return EmptyView(
                message: 'No loan applications yet.',
                icon: Icons.request_page_outlined,
                actionLabel: 'Apply now',
                onAction: () => context.push('/loans/categories'),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: applications.length,
              itemBuilder: (context, index) {
                final application = applications[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: AppCard(
                    onTap: () => context.push('/loans/${application.id}'),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                Formatters.currency(
                                    application.requestedAmount),
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Text(
                                '${application.requestedTermMonths} months · '
                                '${Formatters.date(application.submittedAt)}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        StatusBadge.forApplicationStatus(application.status),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
