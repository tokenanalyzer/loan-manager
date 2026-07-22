import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/document.dart';
import '../../core/riverpod/providers.dart';
import '../../core/utils/friendly_error.dart';
import '../home/home_controller.dart';

/// Upload progress as a fraction (0.0-1.0), or null when nothing is
/// currently uploading — kept separate from the overview `AsyncValue`
/// so a re-upload doesn't blank the existing list while it's in flight.
/// Keyed by `(documentTypeCode, slotIndex)` so two different slots
/// never show each other's progress.
class DocumentsUploadState {
  const DocumentsUploadState({this.slotInProgress, this.progress, this.errorMessage});

  final (String, int)? slotInProgress;
  final double? progress;
  final String? errorMessage;

  bool isUploading(String documentTypeCode, int slotIndex) =>
      slotInProgress == (documentTypeCode, slotIndex);
}

final documentsUploadStateProvider =
    StateProvider.autoDispose<DocumentsUploadState>((ref) => const DocumentsUploadState());

/// [categoryId] scopes the overview to a loan category's documents
/// step (includes that category's loan-specific types); the
/// standalone Documents tab uses the family's default `null` key
/// (general view only).
final documentsOverviewProvider = FutureProvider.autoDispose
    .family<DocumentsOverview, String?>((ref, categoryId) async {
  final repository = ref.read(documentRepositoryProvider);
  final result = await repository.getOverview(categoryId: categoryId);
  return result.when(success: (data) => data, failure: (error) => throw error);
});

/// Orchestrates upload/delete (with progress) + refreshing the
/// overview afterward. A plain class (not a Notifier) since it only
/// performs one-shot actions against other providers.
class DocumentsUploadController {
  DocumentsUploadController(this._ref, this._categoryId);

  final Ref _ref;
  final String? _categoryId;

  Future<void> upload({
    required String documentTypeCode,
    required int slotIndex,
    required String filePath,
  }) async {
    _ref.read(documentsUploadStateProvider.notifier).state =
        DocumentsUploadState(slotInProgress: (documentTypeCode, slotIndex), progress: 0);

    final repository = _ref.read(documentRepositoryProvider);
    final result = await repository.upload(
      documentTypeCode: documentTypeCode,
      slotIndex: slotIndex,
      filePath: filePath,
      onProgress: (sent, total) {
        if (total <= 0) return;
        _ref.read(documentsUploadStateProvider.notifier).state = DocumentsUploadState(
          slotInProgress: (documentTypeCode, slotIndex),
          progress: sent / total,
        );
      },
    );

    result.when(
      success: (_) {
        _ref.read(documentsUploadStateProvider.notifier).state = const DocumentsUploadState();
        _invalidateAfterChange();
      },
      failure: (error) {
        _ref.read(documentsUploadStateProvider.notifier).state =
            DocumentsUploadState(errorMessage: friendlyMessage(error));
      },
    );
  }

  Future<void> delete(String documentId) async {
    final repository = _ref.read(documentRepositoryProvider);
    final result = await repository.deleteDocument(documentId);

    result.when(
      success: (_) => _invalidateAfterChange(),
      failure: (error) {
        _ref.read(documentsUploadStateProvider.notifier).state =
            DocumentsUploadState(errorMessage: friendlyMessage(error));
      },
    );
  }

  /// Home's "Recent documents" section watches the `null`-keyed
  /// overview directly, and its "documents complete" stat comes from
  /// `homeControllerProvider` (a separate, non-family fetch that never
  /// re-runs on its own) — so a wizard-scoped upload/delete
  /// (`_categoryId` non-null) needs both invalidated too, not just
  /// this category's own overview, or Home silently stayed stale.
  void _invalidateAfterChange() {
    _ref.invalidate(documentsOverviewProvider(_categoryId));
    if (_categoryId != null) {
      _ref.invalidate(documentsOverviewProvider(null));
    }
    _ref.invalidate(homeControllerProvider);
  }
}

final documentsUploadControllerProvider = Provider.autoDispose
    .family<DocumentsUploadController, String?>(
        (ref, categoryId) => DocumentsUploadController(ref, categoryId));
