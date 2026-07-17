import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../models/document.dart';

/// Repository for the Employee App's read-only document review —
/// backed by the backend's staff-only routes
/// (`staff/customer/:customerId`, `staff/:id/content`), distinct from
/// the Customer App's self-service upload/delete routes.
class DocumentRepository extends BaseRepository {
  DocumentRepository(super.apiClient);

  Future<ApiResult<DocumentsOverview>> getOverviewForCustomer(String customerId) {
    return get<DocumentsOverview>(
      '/v1/documents/staff/customer/$customerId',
      mapper: (data) => DocumentsOverview.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Fetches a document's raw bytes for in-app preview (image or PDF)
  /// — goes through `ApiClient.request` so the shared auth interceptor
  /// attaches the staff bearer token automatically.
  Future<ApiResult<Uint8List>> fetchContent(String documentId) {
    return apiClient.request<Uint8List>(
      (dio) => dio.get<List<int>>(
        '/v1/documents/staff/$documentId/content',
        options: Options(responseType: ResponseType.bytes),
      ),
      mapper: (data) => Uint8List.fromList(data as List<int>),
    );
  }
}
