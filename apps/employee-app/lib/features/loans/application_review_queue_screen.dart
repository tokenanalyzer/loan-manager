import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/models/loan_application.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import 'applications_controller.dart';

const _pendingStatuses = {'submitted', 'under_review'};

enum _QueueFilter { pending, all }

/// Lists loan applications for staff review, with a Pending/All filter
/// — pending review is the default so the queue opens on actionable
/// work, not the full history.
class ApplicationReviewQueueScreen extends ConsumerStatefulWidget {
  const ApplicationReviewQueueScreen({super.key});

  @override
  ConsumerState<ApplicationReviewQueueScreen> createState() =>
      _ApplicationReviewQueueScreenState();
}

class _ApplicationReviewQueueScreenState
    extends ConsumerState<ApplicationReviewQueueScreen> {
  _QueueFilter _filter = _QueueFilter.pending;
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final applicationsAsync = ref.watch(applicationsControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan applications'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(112),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              children: [
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search purpose or loan type',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onChanged: (value) =>
                      setState(() => _query = value.trim().toLowerCase()),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: SegmentedButton<_QueueFilter>(
                    segments: const [
                      ButtonSegment(value: _QueueFilter.pending, label: Text('Pending')),
                      ButtonSegment(value: _QueueFilter.all, label: Text('All')),
                    ],
                    selected: {_filter},
                    onSelectionChanged: (selection) =>
                        setState(() => _filter = selection.first),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(applicationsControllerProvider.notifier).refresh(),
        child: applicationsAsync.when(
          loading: () => ListView(
            padding: const EdgeInsets.all(16),
            children: const [
              SkeletonCard(lines: 2),
              SizedBox(height: 12),
              SkeletonCard(lines: 2),
            ],
          ),
          error: (error, _) => ErrorView(
            message: 'Could not load applications: $error',
            onRetry: () => ref.read(applicationsControllerProvider.notifier).refresh(),
          ),
          data: (applications) {
            var filtered = _filter == _QueueFilter.pending
                ? applications.where((app) => _pendingStatuses.contains(app.status)).toList()
                : applications;

            if (_query.isNotEmpty) {
              filtered = filtered.where((app) {
                final category =
                    app.categoryId != null ? findLoanCategory(app.categoryId!) : null;
                final haystack = [app.purpose, category?.title]
                    .whereType<String>()
                    .join(' ')
                    .toLowerCase();
                return haystack.contains(_query);
              }).toList();
            }

            if (filtered.isEmpty) {
              return EmptyView(
                icon: Icons.request_page_outlined,
                message: _query.isNotEmpty
                    ? 'No applications match "$_query".'
                    : _filter == _QueueFilter.pending
                        ? 'Nothing pending review.'
                        : 'No loan applications yet.',
              );
            }

            return ListView.separated(
              itemCount: filtered.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) =>
                  _ApplicationTile(application: filtered[index]),
            );
          },
        ),
      ),
    );
  }
}

class _ApplicationTile extends ConsumerWidget {
  const _ApplicationTile({required this.application});

  final LoanApplication application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      title: Text(
          '${Formatters.currency(application.requestedAmount)} · ${application.requestedTermMonths} mo'),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: StatusBadge.forApplicationStatus(application.status),
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () async {
        await context.push('/applications/${application.id}');
        ref.read(applicationsControllerProvider.notifier).refresh();
      },
    );
  }
}
