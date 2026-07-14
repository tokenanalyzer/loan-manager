import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

class TimelineStep {
  const TimelineStep({
    required this.label,
    required this.message,
    required this.isComplete,
    this.timestamp,
  });

  final String label;
  final String message;
  final bool isComplete;
  final DateTime? timestamp;
}

/// Reusable vertical status timeline — used by Application Detail to
/// show customer-visible status messages at each stage, not just the
/// raw backend status enum value.
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
        final color = step.isComplete
            ? theme.colorScheme.primary
            : theme.colorScheme.outlineVariant;

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 20,
                    height: 20,
                    decoration:
                        BoxDecoration(color: color, shape: BoxShape.circle),
                    child: step.isComplete
                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                        : null,
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
}) {
  final isDecided = status == 'approved' || status == 'rejected';

  return [
    TimelineStep(
      label: 'Submitted',
      message: 'Your application was received.',
      isComplete: true,
      timestamp: submittedAt,
    ),
    TimelineStep(
      label: 'Under review',
      message: isDecided || status == 'under_review'
          ? 'Our team reviewed your application.'
          : "We'll start reviewing shortly.",
      isComplete: isDecided || status == 'under_review',
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
      timestamp: reviewedAt,
    ),
  ];
}
