import '../network/api_client.dart';
import '../network/api_result.dart';

/// Repository pattern — base class for feature repositories.
///
/// Phase 2 scope: a generic abstraction over [ApiClient] that future
/// feature repositories (e.g. a `LoanRepository` in a later phase)
/// will extend. It intentionally knows nothing about any specific
/// domain model — no business logic or API endpoints are defined here.
abstract class BaseRepository {
  BaseRepository(this.apiClient);

  final ApiClient apiClient;

  /// Convenience wrapper so subclasses can write:
  ///   Future<ApiResult<Loan>> getLoan(String id) =>
  ///     get('/loans/$id', mapper: Loan.fromJson);
  Future<ApiResult<T>> get<T>(
    String path, {
    required T Function(dynamic data) mapper,
    Map<String, dynamic>? queryParameters,
  }) {
    return apiClient.request<T>(
      (dio) => dio.get(path, queryParameters: queryParameters),
      mapper: mapper,
    );
  }

  Future<ApiResult<T>> post<T>(
    String path, {
    required T Function(dynamic data) mapper,
    Object? body,
  }) {
    return apiClient.request<T>(
      (dio) => dio.post(path, data: body),
      mapper: mapper,
    );
  }

  Future<ApiResult<T>> patch<T>(
    String path, {
    required T Function(dynamic data) mapper,
    Object? body,
  }) {
    return apiClient.request<T>(
      (dio) => dio.patch(path, data: body),
      mapper: mapper,
    );
  }
}
