import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../models/document.dart';

/// Repository for the Customer App's document upload/preview feature.
///
/// Phase 2 (production sprint): the whole catalog — which types
/// exist, which are required, how many upload slots, which loan
/// category they apply to — is server-driven (`GET /v1/documents`).
/// This repository is a thin, generic pass-through; it doesn't know
/// about any specific document type any more than the backend's
/// `DocumentsService` does.
class DocumentRepository extends BaseRepository {
  DocumentRepository(super.apiClient);

  /// [categoryId] (a loan-application category id, e.g. `home`)
  /// additionally includes that category's loan-specific document
  /// types; omit it for the general Documents tab view.
  Future<ApiResult<DocumentsOverview>> getOverview({String? categoryId}) {
    return get<DocumentsOverview>(
      '/v1/documents',
      queryParameters: categoryId != null ? {'categoryId': categoryId} : null,
      mapper: (data) => DocumentsOverview.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Uploads into [slotIndex] (or the next free slot if omitted) —
  /// uploading into an already-occupied slot replaces it.
  Future<ApiResult<AppDocument>> upload({
    required String documentTypeCode,
    required String filePath,
    int? slotIndex,
    void Function(int sent, int total)? onProgress,
  }) {
    return apiClient.uploadFile<AppDocument>(
      '/v1/documents',
      filePath: filePath,
      fieldName: 'file',
      fields: {
        'documentTypeCode': documentTypeCode,
        if (slotIndex != null) 'slotIndex': slotIndex,
      },
      mapper: (data) => AppDocument.fromJson(data as Map<String, dynamic>),
      onSendProgress: onProgress,
    );
  }

  Future<ApiResult<void>> deleteDocument(String documentId) {
    return delete<void>('/v1/documents/$documentId', mapper: (_) {});
  }

  /// URL for previewing/downloading a document's content — used
  /// directly by an `Image.network`/webview-style preview widget.
  String contentUrl(String documentId) =>
      '${apiClient.dio.options.baseUrl}/v1/documents/$documentId/content';

  /// Fetches a document's raw bytes for in-app preview (image or PDF)
  /// — goes through `ApiClient.request` (not a raw `Image.network`
  /// call) so the shared auth interceptor attaches the bearer token
  /// automatically, the same way every other authenticated request
  /// does, instead of the preview screen manually fetching a Firebase
  /// ID token itself.
  Future<ApiResult<Uint8List>> fetchContent(String documentId) {
    return apiClient.request<Uint8List>(
      (dio) => dio.get<List<int>>(
        '/v1/documents/$documentId/content',
        options: Options(responseType: ResponseType.bytes),
      ),
      mapper: (data) => Uint8List.fromList(data as List<int>),
    );
  }
}
