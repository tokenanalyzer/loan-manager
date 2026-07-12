import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/models/document.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/state_views.dart';
import 'documents_controller.dart';

/// Required documents list — upload, replace, and see what's missing.
///
/// Phase 6 scope: photo capture/gallery selection via `image_picker`,
/// uploaded to the backend's own storage endpoint (not the Firebase
/// Storage SDK directly — see `DocumentsService` on the backend for
/// why: local-disk storage by default, Firebase Storage is a clean
/// future swap behind the same interface).
class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

  Future<void> _pickAndUpload(
      BuildContext context, WidgetRef ref, String documentType) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.of(context).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.of(context).pop(ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    final picked =
        await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked == null) return;

    await ref
        .read(documentsUploadControllerProvider)
        .upload(documentType: documentType, filePath: picked.path);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(documentsOverviewProvider);
    final uploadState = ref.watch(documentsUploadStateProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: overviewAsync.when(
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(
          message: 'Could not load documents: $error',
          onRetry: () => ref.invalidate(documentsOverviewProvider),
        ),
        data: (overview) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (uploadState.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  uploadState.errorMessage!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            for (final status in overview.required)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _RequiredDocumentTile(
                  status: status,
                  isUploading: uploadState.isUploading &&
                      uploadState.documentTypeInProgress == status.documentType,
                  uploadProgress: uploadState.progress,
                  onUpload: () =>
                      _pickAndUpload(context, ref, status.documentType),
                  onPreview: status.document != null
                      ? () => context.push('/documents/${status.document!.id}')
                      : null,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _RequiredDocumentTile extends StatelessWidget {
  const _RequiredDocumentTile({
    required this.status,
    required this.isUploading,
    required this.uploadProgress,
    required this.onUpload,
    required this.onPreview,
  });

  final RequiredDocumentStatus status;
  final bool isUploading;
  final double? uploadProgress;
  final VoidCallback onUpload;
  final VoidCallback? onPreview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      onTap: onPreview,
      child: Row(
        children: [
          Icon(
            status.isUploaded ? Icons.check_circle : Icons.error_outline,
            color: status.isUploaded ? Colors.green : theme.colorScheme.error,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(status.label, style: theme.textTheme.titleSmall),
                Text(
                  status.isUploaded
                      ? status.document!.originalFileName
                      : 'Missing — required',
                  style: theme.textTheme.bodySmall,
                ),
                if (isUploading) ...[
                  const SizedBox(height: 6),
                  LinearProgressIndicator(value: uploadProgress),
                ],
              ],
            ),
          ),
          if (!isUploading)
            TextButton(
              onPressed: onUpload,
              child: Text(status.isUploaded ? 'Replace' : 'Upload'),
            ),
        ],
      ),
    );
  }
}
