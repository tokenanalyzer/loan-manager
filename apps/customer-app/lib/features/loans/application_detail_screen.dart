import 'package:flutter/material.dart';

import 'package:shared_flutter/shared_flutter.dart';

import '../../core/di/injection.dart';
import '../../core/models/loan_application.dart';
import '../../core/network/loan_application_repository.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/loan_cost_breakdown_card.dart';
import '../../core/widgets/state_views.dart';
import 'status_timeline.dart';

/// Detail view for a single loan application — now with a
/// customer-visible status timeline (Phase 6) instead of just the raw
/// status string.
class ApplicationDetailScreen extends StatefulWidget {
  const ApplicationDetailScreen({required this.applicationId, super.key});

  final String applicationId;

  @override
  State<ApplicationDetailScreen> createState() =>
      _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  late Future<LoanApplication> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<LoanApplication> _load() async {
    final result = await getIt<LoanApplicationRepository>()
        .getApplication(widget.applicationId);
    return result.when(
        success: (data) => data, failure: (error) => throw error);
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Application details')),
      body: FutureBuilder<LoanApplication>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const LoadingView();
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: friendlyMessage(snapshot.error!),
              onRetry: () => setState(() => _future = _load()),
            );
          }

          final application = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              AppCard(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (application.categoryId != null)
                            Text(
                              findLoanCategory(application.categoryId!)
                                      ?.title ??
                                  'Loan application',
                              style: textTheme.labelMedium,
                            ),
                          Text(
                            Formatters.currency(application.requestedAmount),
                            style: textTheme.headlineMedium,
                          ),
                          Text(
                            '${application.requestedTermMonths} months',
                            style: textTheme.bodyMedium,
                          ),
                          if (application.purpose != null)
                            Text(application.purpose!,
                                style: textTheme.bodySmall),
                        ],
                      ),
                    ),
                    StatusBadge.forApplicationStatus(application.status),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text('Status', style: textTheme.titleMedium),
              const SizedBox(height: 12),
              AppCard(
                child: StatusTimeline(
                  steps: buildApplicationTimeline(
                    status: application.status,
                    submittedAt: application.submittedAt,
                    reviewedAt: application.reviewedAt,
                  ),
                ),
              ),
              if (application.loan != null) ...[
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Icon(Icons.celebration_outlined, color: Colors.green),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your loan · ${application.loan!.loanNumber}',
                        style: textTheme.titleMedium,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Builder(builder: (context) {
                  final loan = application.loan!;
                  final category = application.categoryId != null
                      ? findLoanCategory(application.categoryId!)
                      : null;
                  final principal = double.parse(loan.principalAmount);
                  final feePercent = category?.processingFeePercent ?? 0.02;
                  final processingFee = principal * feePercent;
                  final gst = processingFee * kProcessingFeeGstRate;

                  return LoanCostBreakdownCard(
                    title: 'Your EMI',
                    isIndicative: false,
                    footnote: loan.maturityDate != null
                        ? 'Matures on ${Formatters.date(DateTime.parse(loan.maturityDate!))}.'
                        : null,
                    breakdown: LoanCostBreakdown(
                      principal: principal,
                      monthlyInstallment: loan.monthlyInstallment,
                      totalInterest: loan.totalInterest,
                      totalPayable: loan.totalPayable,
                      processingFee: processingFee,
                      gstOnFee: gst,
                      netDisbursed: principal - processingFee - gst,
                    ),
                    tenureMonths: loan.termMonths,
                    rateLabel: '${loan.interestRate}% p.a.',
                  );
                }),
              ],
            ],
          );
        },
      ),
    );
  }
}
