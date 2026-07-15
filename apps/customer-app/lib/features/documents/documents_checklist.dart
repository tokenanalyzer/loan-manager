import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/constants/document_category_style.dart';
import '../../core/models/document.dart';
import '../../core/utils/friendly_error.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/section_header.dart';
import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import 'documents_controller.dart';

/// The document manager — fully catalog-driven: every category, type,
/// required/optional flag, and slot count comes from
/// `GET /v1/documents` at request time. Nothing about a specific
/// document type is hardcoded here, so a brand-new catalog type (added
/// server-side, no app release) renders with the same Upload/Replace/
/// Preview/Delete affordances as every existing one, automatically.
///
/// [categoryId] scopes the catalog to a loan category's documents step
/// (adds that category's loan-specific types); omit it for the
/// standalone Documents tab. No `Scaffold`/`AppBar` of its own, so the
/// same widget is used both as the Documents tab (`DocumentsScreen`)
/// and embedded inside the loan-application wizard.
class DocumentsChecklist extends ConsumerWidget {
  const DocumentsChecklist({this.categoryId, super.key});

  final String? categoryId;

  Future<void> _pickAndUpload(
      BuildContext context, WidgetRef ref, String documentTypeCode, int slotIndex) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
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

    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked == null) return;

    await ref.read(documentsUploadControllerProvider(categoryId)).upload(
          documentTypeCode: documentTypeCode,
          slotIndex: slotIndex,
          filePath: picked.path,
        );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, String documentId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this document?'),
        content: const Text("You'll need to upload it again if it's required later."),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Delete', style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(documentsUploadControllerProvider(categoryId)).delete(documentId);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overviewAsync = ref.watch(documentsOverviewProvider(categoryId));
    final uploadState = ref.watch(documentsUploadStateProvider);

    return overviewAsync.when(
      loading: () => ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonCard(lines: 2),
          SizedBox(height: 12),
          SkeletonCard(lines: 2),
          SizedBox(height: 12),
          SkeletonCard(lines: 2),
        ],
      ),
      error: (error, _) => ErrorView(
        message: friendlyMessage(error),
        onRetry: () => ref.invalidate(documentsOverviewProvider(categoryId)),
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
          for (final group in overview.categories) ...[
            SectionHeader(title: group.category.label),
            const SizedBox(height: 8),
            for (var i = 0; i < group.types.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: FadeSlideIn(
                  delay: Duration(milliseconds: 30 * i),
                  child: _DocumentTypeCard(
                    type: group.types[i],
                    style: DocumentCategoryStyle.forCategory(group.category),
                    uploadState: uploadState,
                    onUpload: (slotIndex) =>
                        _pickAndUpload(context, ref, group.types[i].code, slotIndex),
                    onDelete: (documentId) => _confirmDelete(context, ref, documentId),
                    onPreview: (documentId) => context.push('/documents/$documentId'),
                  ),
                ),
              ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _DocumentTypeCard extends StatelessWidget {
  const _DocumentTypeCard({
    required this.type,
    required this.style,
    required this.uploadState,
    required this.onUpload,
    required this.onDelete,
    required this.onPreview,
  });

  final DocumentTypeOverview type;
  final DocumentCategoryStyle style;
  final DocumentsUploadState uploadState;
  final void Function(int slotIndex) onUpload;
  final void Function(String documentId) onDelete;
  final void Function(String documentId) onPreview;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: style.tint, shape: BoxShape.circle),
                child: Icon(style.icon, size: 18, color: style.color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(type.label, style: textTheme.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 8),
              _RequirementBadge(isRequired: type.isRequired),
            ],
          ),
          if (type.isMultiSlot) ...[
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.only(left: 46),
              child: Text('${type.uploadedCount} of ${type.maxUploads} uploaded',
                  style: textTheme.bodySmall),
            ),
          ],
          const SizedBox(height: 12),
          for (var i = 0; i < type.slots.length; i++) ...[
            if (i > 0) const Divider(height: 20),
            _SlotRow(
              slot: type.slots[i],
              slotLabel: type.isMultiSlot ? '${type.label} ${type.slots[i].slotIndex}' : null,
              isUploading: uploadState.isUploading(type.code, type.slots[i].slotIndex),
              uploadProgress: uploadState.progress,
              onUpload: () => onUpload(type.slots[i].slotIndex),
              onDelete: type.slots[i].document != null
                  ? () => onDelete(type.slots[i].document!.id)
                  : null,
              onPreview: type.slots[i].document != null
                  ? () => onPreview(type.slots[i].document!.id)
                  : null,
            ),
          ],
        ],
      ),
    );
  }
}

class _RequirementBadge extends StatelessWidget {
  const _RequirementBadge({required this.isRequired});

  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    final color = isRequired ? AppColors.warning : Theme.of(context).colorScheme.onSurfaceVariant;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        isRequired ? 'Required' : 'Optional',
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _SlotRow extends StatelessWidget {
  const _SlotRow({
    required this.slot,
    required this.isUploading,
    required this.uploadProgress,
    required this.onUpload,
    required this.onDelete,
    required this.onPreview,
    this.slotLabel,
  });

  final DocumentSlot slot;
  final String? slotLabel;
  final bool isUploading;
  final double? uploadProgress;
  final VoidCallback onUpload;
  final VoidCallback? onDelete;
  final VoidCallback? onPreview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onPreview,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            slot.isUploaded ? Icons.check_circle : Icons.error_outline,
            size: 20,
            color: slot.isUploaded ? AppColors.success : theme.colorScheme.error,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (slotLabel != null)
                  Text(slotLabel!, style: theme.textTheme.labelMedium),
                Text(
                  slot.isUploaded ? slot.document!.originalFileName : 'Missing',
                  style: theme.textTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (isUploading) ...[
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: uploadProgress, minHeight: 4),
                  ),
                ],
              ],
            ),
          ),
          if (!isUploading) ...[
            if (onDelete != null)
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20),
                color: theme.colorScheme.error,
                tooltip: 'Delete',
                onPressed: onDelete,
                visualDensity: VisualDensity.compact,
              ),
            TextButton(
              onPressed: onUpload,
              child: Text(slot.isUploaded ? 'Replace' : 'Upload'),
            ),
          ],
        ],
      ),
    );
  }
}
