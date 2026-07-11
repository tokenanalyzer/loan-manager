import 'package:shared_flutter/shared_flutter.dart';

import '../models/document.dart';

/// Repository for the Customer App's document upload/preview feature.
///
/// Extends the shared `BaseRepository`. Upload uses `ApiClient.uploadFile`
/// (Phase 6 addition to the shared client) so Dio's multipart types
/// never leak into this repository.
class DocumentRepository extends BaseRepository {
  DocumentRepository(super.apiClient);

  Future<ApiResult<DocumentsOverview>> getMyDocuments() {
    return get<DocumentsOverview>(
      '/v1/documents',
      mapper: (data) => DocumentsOverview.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Uploads (or replaces — same endpoint handles both) a document.
  Future<ApiResult<AppDocument>> upload({
    required String documentType,
    required String filePath,
    void Function(int sent, int total)? onProgress,
  }) {
    return apiClient.uploadFile<AppDocument>(
      '/v1/documents',
      filePath: filePath,
      fieldName: 'file',
      fields: {'documentType': documentType},
      mapper: (data) => AppDocument.fromJson(data as Map<String, dynamic>),
      onSendProgress: onProgress,
    );
  }

  /// URL for previewing/downloading a document's content — used
  /// directly by an `Image.network`/webview-style preview widget.
  String contentUrl(String documentId) =>
      '${apiClient.dio.options.baseUrl}/v1/documents/$documentId/content';
}
