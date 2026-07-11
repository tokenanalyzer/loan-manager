import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/document.dart';
import '../../core/riverpod/providers.dart';

/// Upload progress as a fraction (0.0-1.0), or null when nothing is
/// currently uploading — kept separate from the overview `AsyncValue`
/// so a re-upload doesn't blank the existing list while it's in flight.
class DocumentsUploadState {
  const DocumentsUploadState({this.documentTypeInProgress, this.progress, this.errorMessage});

  final String? documentTypeInProgress;
  final double? progress;
  final String? errorMessage;

  bool get isUploading => documentTypeInProgress != null;
}

final documentsUploadStateProvider =
    StateProvider.autoDispose<DocumentsUploadState>((ref) => const DocumentsUploadState());

final documentsOverviewProvider = FutureProvider.autoDispose<DocumentsOverview>((ref) async {
  final repository = ref.read(documentRepositoryProvider);
  final result = await repository.getMyDocuments();
  return result.when(success: (data) => data, failure: (error) => throw error);
});

/// Orchestrates upload (with progress) + refreshing the overview
/// afterward. A plain class (not a Notifier) since it only performs
/// one-shot actions against two other providers — no state of its own
/// beyond what `documentsUploadStateProvider` already tracks.
class DocumentsUploadController {
  DocumentsUploadController(this._ref);

  final Ref _ref;

  Future<void> upload({required String documentType, required String filePath}) async {
    _ref.read(documentsUploadStateProvider.notifier).state =
        DocumentsUploadState(documentTypeInProgress: documentType, progress: 0);

    final repository = _ref.read(documentRepositoryProvider);
    final result = await repository.upload(
      documentType: documentType,
      filePath: filePath,
      onProgress: (sent, total) {
        if (total <= 0) return;
        _ref.read(documentsUploadStateProvider.notifier).state = DocumentsUploadState(
          documentTypeInProgress: documentType,
          progress: sent / total,
        );
      },
    );

    result.when(
      success: (_) {
        _ref.read(documentsUploadStateProvider.notifier).state = const DocumentsUploadState();
        _ref.invalidate(documentsOverviewProvider);
      },
      failure: (error) {
        _ref.read(documentsUploadStateProvider.notifier).state =
            DocumentsUploadState(errorMessage: error.message);
      },
    );
  }
}

final documentsUploadControllerProvider = Provider.autoDispose<DocumentsUploadController>(
  (ref) => DocumentsUploadController(ref),
);
