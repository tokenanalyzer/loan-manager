import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:shared_flutter/shared_flutter.dart';

import '../../core/constants/category_style.dart';
import '../../core/di/injection.dart';
import '../../core/models/loan_application.dart';
import '../../core/network/loan_application_repository.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import 'status_timeline.dart';

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
              return ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  SkeletonCard(lines: 3),
                  SizedBox(height: 12),
                  SkeletonCard(lines: 3),
                ],
              );
            }
            if (snapshot.hasError) {
              return ErrorView(
                message: friendlyMessage(snapshot.error!),
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
                final category = application.categoryId != null
                    ? findLoanCategory(application.categoryId!)
                    : null;
                final style = CategoryStyle.forId(application.categoryId ?? '');
                final steps = buildApplicationTimeline(
                  status: application.status,
                  submittedAt: application.submittedAt,
                  reviewedAt: application.reviewedAt,
                );
                final progress =
                    steps.where((s) => s.isComplete).length / steps.length;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: FadeSlideIn(
                    delay: Duration(milliseconds: 40 * index),
                    child: AppCard(
                      onTap: () => context.push('/loans/${application.id}'),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                    color: style.tint, shape: BoxShape.circle),
                                child: Icon(style.icon, size: 18, color: style.color),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (category != null)
                                      Text(category.title,
                                          style: Theme.of(context).textTheme.labelSmall),
                                    Hero(
                                      tag: 'application-amount-${application.id}',
                                      child: Material(
                                        color: Colors.transparent,
                                        child: Text(
                                          Formatters.currency(
                                              application.requestedAmount),
                                          style:
                                              Theme.of(context).textTheme.titleMedium,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '${application.requestedTermMonths} months · '
                                      '${Formatters.date(application.submittedAt)}',
                                      style: Theme.of(context).textTheme.bodySmall,
                                    ),
                                    if (application.loan != null)
                                      Text(
                                        '${Formatters.currency(application.loan!.monthlyInstallment.toStringAsFixed(2))} / month',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium
                                            ?.copyWith(fontWeight: FontWeight.w600),
                                      ),
                                  ],
                                ),
                              ),
                              StatusBadge.forApplicationStatus(application.status),
                            ],
                          ),
                          const SizedBox(height: 10),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: TweenAnimationBuilder<double>(
                              tween: Tween(begin: 0, end: progress),
                              duration: const Duration(milliseconds: 700),
                              curve: Curves.easeOutCubic,
                              builder: (context, animated, _) =>
                                  LinearProgressIndicator(value: animated, minHeight: 6),
                            ),
                          ),
                        ],
                      ),
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
