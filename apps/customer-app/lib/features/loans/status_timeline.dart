import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

class TimelineStep {
  const TimelineStep({
    required this.label,
    required this.message,
    required this.isComplete,
    this.timestamp,
    this.isNegative = false,
  });

  final String label;
  final String message;
  final bool isComplete;
  final DateTime? timestamp;

  /// True for a completed step that represents a rejection/decline —
  /// rendered in the error color instead of the usual "done" primary,
  /// so a rejected application doesn't read as if everything went well.
  final bool isNegative;
}

/// Reusable vertical status timeline — used by Application Detail to
/// show customer-visible status messages at each stage, not just the
/// raw backend status enum value. Each completed marker scales in on
/// first build, staggered by step index, so the timeline feels like it
/// arrived rather than snapping into place.
class StatusTimeline extends StatelessWidget {
  const StatusTimeline({required this.steps, super.key});

  final List<TimelineStep> steps;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: List.generate(steps.length, (index) {
        final step = steps[index];
        final isLast = index == steps.length - 1;
        final color = !step.isComplete
            ? theme.colorScheme.outlineVariant
            : step.isNegative
                ? AppColors.error
                : theme.colorScheme.primary;

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: step.isComplete ? 0 : 1, end: 1),
                    duration: const Duration(milliseconds: 350),
                    curve: Curves.easeOutBack,
                    builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                      child: step.isComplete
                          ? Icon(step.isNegative ? Icons.close : Icons.check,
                              size: 14, color: Colors.white)
                          : null,
                    ),
                  ),
                  if (!isLast)
                    Expanded(child: Container(width: 2, color: color)),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        step.label,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: step.isComplete
                              ? null
                              : theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(step.message, style: theme.textTheme.bodySmall),
                      if (step.timestamp != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            Formatters.dateTime(step.timestamp!),
                            style: theme.textTheme.labelSmall,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

/// Builds the customer-visible timeline steps for a given application
/// status/timestamps — the single place that translates backend enum
/// values into human-readable, reassuring copy.
List<TimelineStep> buildApplicationTimeline({
  required String status,
  required DateTime submittedAt,
  DateTime? reviewedAt,
  String? queryMessage,
  DateTime? queryRaisedAt,
  DateTime? queryRespondedAt,
}) {
  final isDecided = status == 'approved' || status == 'rejected';
  final isRejected = status == 'rejected';
  final hasQuery = status == 'query_raised' || queryRaisedAt != null;

  return [
    TimelineStep(
      label: 'Submitted',
      message: 'Your application was received.',
      isComplete: true,
      timestamp: submittedAt,
    ),
    TimelineStep(
      label: 'Under review',
      message: isDecided || status == 'under_review' || hasQuery
          ? 'Our team reviewed your application.'
          : "We'll start reviewing shortly.",
      isComplete: isDecided || status == 'under_review' || hasQuery,
    ),
    if (hasQuery)
      TimelineStep(
        label: status == 'query_raised' ? 'Action needed' : 'Query resolved',
        message: status == 'query_raised'
            ? (queryMessage ?? 'Please re-upload the requested documents.')
            : 'You responded — thanks! Your application is back under review.',
        isComplete: true,
        timestamp: queryRespondedAt ?? queryRaisedAt,
      ),
    TimelineStep(
      label: switch (status) {
        'approved' => 'Approved',
        'rejected' => 'Decision made',
        _ => 'Decision',
      },
      message: switch (status) {
        'approved' => 'Congratulations — your loan has been created.',
        'rejected' => 'Your application was not approved this time.',
        _ => "We'll notify you as soon as a decision is made.",
      },
      isComplete: isDecided,
      isNegative: isRejected,
      timestamp: reviewedAt,
    ),
  ];
}
