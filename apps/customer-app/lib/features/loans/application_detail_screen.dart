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
import '../../core/widgets/loan_cost_breakdown_card.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/skeleton_loader.dart';
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
            return ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                SkeletonCard(lines: 3),
                SizedBox(height: 20),
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

          final application = snapshot.data!;
          final style = CategoryStyle.forId(application.categoryId ?? '');

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              AppCard(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: style.tint, shape: BoxShape.circle),
                      child: Icon(style.icon, color: style.color),
                    ),
                    const SizedBox(width: 14),
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
                          Hero(
                            tag: 'application-amount-${application.id}',
                            child: Material(
                              color: Colors.transparent,
                              child: Text(
                                Formatters.currency(application.requestedAmount),
                                style: textTheme.headlineMedium,
                              ),
                            ),
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
                    StatusBadge.forApplicationAndLoanStatus(
                      application.status,
                      application.loan?.status,
                    ),
                  ],
                ),
              ),
              if (application.status == 'query_raised') ...[
                const SizedBox(height: 20),
                FadeSlideIn(
                  child: AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.info_outline, color: AppColors.accentGold),
                            const SizedBox(width: 8),
                            Text('Action needed', style: textTheme.titleMedium),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          application.queryMessage ??
                              'Please re-upload the requested documents.',
                          style: textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 16),
                        PrimaryButton(
                          label: 'Re-upload documents',
                          onPressed: () => context.go('/documents'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              Text('Status', style: textTheme.titleMedium),
              const SizedBox(height: 12),
              FadeSlideIn(
                child: AppCard(
                  child: StatusTimeline(
                    steps: buildApplicationTimeline(
                      status: application.status,
                      submittedAt: application.submittedAt,
                      reviewedAt: application.reviewedAt,
                      queryMessage: application.queryMessage,
                      queryRaisedAt: application.queryRaisedAt,
                      queryRespondedAt: application.queryRespondedAt,
                      loanStatus: application.loan?.status,
                      disbursedAt: application.loan?.disbursedAt,
                    ),
                  ),
                ),
              ),
              if (application.loan != null) ...[
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Icon(Icons.celebration_outlined, color: AppColors.success),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your loan · ${application.loan!.loanNumber}',
                        style: textTheme.titleMedium,
                      ),
                    ),
                  ],
                ),
                if (application.loan!.isDisbursed) ...[
                  const SizedBox(height: 12),
                  FadeSlideIn(
                    child: AppCard(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.account_balance_outlined,
                              color: AppColors.success),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Loan disbursed', style: textTheme.titleSmall),
                                const SizedBox(height: 4),
                                Text(
                                  application.loan!.disbursedAt != null
                                      ? 'Credited to your bank account on '
                                          '${Formatters.date(application.loan!.disbursedAt!)}.'
                                      : 'Credited to your bank account.',
                                  style: textTheme.bodyMedium,
                                ),
                                if (application.loan!.disbursementReference != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Ref: ${application.loan!.disbursementReference}',
                                    style: textTheme.bodySmall,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                FadeSlideIn(
                  delay: const Duration(milliseconds: 60),
                  child: Builder(builder: (context) {
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
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
