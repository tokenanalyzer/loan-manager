import 'package:dio/dio.dart';

import 'api_result.dart';
import 'network_exception.dart';

/// API client architecture.
///
/// A thin wrapper around [Dio] shared by the Customer App and Employee
/// App. Base URL/timeouts/interceptor wiring, a generic `request<T>`
/// helper that converts Dio exceptions into [ApiResult], and (as of
/// Phase 4) bearer-token attachment via [setAuthTokenProvider]. No
/// endpoint methods (e.g. `getLoans()`) are defined here — those
/// belong to feature-specific repositories built on top of this
/// client in a later phase.
class ApiClient {
  ApiClient({
    required String baseUrl,
    Duration connectTimeout = const Duration(seconds: 15),
    Duration receiveTimeout = const Duration(seconds: 15),
    List<Interceptor> interceptors = const [],
  }) : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: connectTimeout,
            receiveTimeout: receiveTimeout,
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final provider = _authTokenProvider;
          if (provider != null) {
            final token = await provider();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
      ),
    );
    _dio.interceptors.addAll(interceptors);
  }

  final Dio _dio;
  Future<String?> Function()? _authTokenProvider;

  /// Exposed for feature-specific repositories that need direct Dio
  /// access (e.g. multipart uploads) beyond the generic [request] helper.
  Dio get dio => _dio;

  /// Supplies a callback returning the current bearer token (e.g. a
  /// Firebase ID token) to attach to every subsequent request. Set by
  /// the app's AuthController once a user is signed in.
  void setAuthTokenProvider(Future<String?> Function() provider) {
    _authTokenProvider = provider;
  }

  /// Called on sign-out so no stale token is attached to later requests.
  void clearAuthTokenProvider() {
    _authTokenProvider = null;
  }

  Future<ApiResult<T>> request<T>(
    Future<Response<dynamic>> Function(Dio dio) call, {
    required T Function(dynamic data) mapper,
  }) async {
    try {
      final response = await call(_dio);
      return ApiSuccess(mapper(response.data));
    } on DioException catch (error) {
      return ApiFailure(_mapDioException(error));
    } catch (error) {
      return ApiFailure(NetworkException.unexpected(error));
    }
  }

  /// Multipart file upload (e.g. document upload). Keeps Dio's
  /// `FormData`/`MultipartFile` types encapsulated here rather than
  /// leaking them into feature repositories, which only depend on
  /// this `ApiClient` — not on Dio directly.
  Future<ApiResult<T>> uploadFile<T>(
    String path, {
    required String filePath,
    required String fieldName,
    Map<String, dynamic>? fields,
    required T Function(dynamic data) mapper,
    void Function(int sent, int total)? onSendProgress,
  }) async {
    try {
      final fileName = filePath.split(RegExp(r'[\\/]')).last;
      final formData = FormData.fromMap({
        ...?fields,
        fieldName: await MultipartFile.fromFile(filePath, filename: fileName),
      });
      final response = await _dio.post(path, data: formData, onSendProgress: onSendProgress);
      return ApiSuccess(mapper(response.data));
    } on DioException catch (error) {
      return ApiFailure(_mapDioException(error));
    } catch (error) {
      return ApiFailure(NetworkException.unexpected(error));
    }
  }

  NetworkException _mapDioException(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return NetworkException.timeout();
      case DioExceptionType.connectionError:
        return NetworkException.noConnection();
      case DioExceptionType.badResponse:
        return NetworkException(
          message: _extractMessage(error) ?? 'Request failed.',
          statusCode: error.response?.statusCode,
          cause: error,
        );
      case DioExceptionType.cancel:
        return const NetworkException(message: 'Request was cancelled.');
      case DioExceptionType.badCertificate:
      case DioExceptionType.unknown:
        return NetworkException.unexpected(error);
    }
  }

  String? _extractMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return null;
  }
}
