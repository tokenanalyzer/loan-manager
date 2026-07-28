import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/models/document.dart';
import '../../core/riverpod/providers.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';

/// Shows every immutable upload for one of the customer's own
/// documents, newest first — mirrors the Admin Panel's Version History
/// feature (`VersionHistoryModal.tsx`) as a full mobile screen rather
/// than a modal, backed by the same underlying data through the new
/// customer-facing `GET /v1/documents/:id/versions` endpoint.
class DocumentVersionHistoryScreen extends ConsumerStatefulWidget {
  const DocumentVersionHistoryScreen({required this.document, super.key});

  final AppDocument document;

  @override
  ConsumerState<DocumentVersionHistoryScreen> createState() =>
      _DocumentVersionHistoryScreenState();
}

class _DocumentVersionHistoryScreenState
    extends ConsumerState<DocumentVersionHistoryScreen> {
  late Future<List<DocumentVersion>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<DocumentVersion>> _load() async {
    final result = await ref
        .read(documentRepositoryProvider)
        .getVersions(widget.document.id);
    return result.when(success: (data) => data, failure: (error) => throw error);
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Version history')),
      body: FutureBuilder<List<DocumentVersion>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                SkeletonCard(lines: 2),
                SizedBox(height: 12),
                SkeletonCard(lines: 2),
              ],
            );
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: friendlyMessage(snapshot.error!),
              onRetry: () => setState(() => _future = _load()),
            );
          }

          final versions = snapshot.data ?? [];
          if (versions.isEmpty) {
            return const EmptyView(
              message: 'No upload history for this document yet.',
              icon: Icons.history_outlined,
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: versions.length,
            itemBuilder: (context, index) {
              final version = versions[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: FadeSlideIn(
                  delay: Duration(milliseconds: 40 * index),
                  child: AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Version ${version.versionNumber}'
                                '${version.isCurrent ? ' · Current' : ''}',
                                style: textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            StatusBadge.forDocumentVerificationStatus(
                              version.verificationStatus,
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(version.originalFileName, style: textTheme.bodyMedium),
                        const SizedBox(height: 2),
                        Text(
                          'Uploaded ${Formatters.dateTime(version.uploadedAt)}',
                          style: textTheme.bodySmall,
                        ),
                        if (version.verificationNote != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            version.verificationNote!,
                            style: textTheme.bodySmall,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
