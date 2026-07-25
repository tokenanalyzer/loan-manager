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
    // 20s rather than a shorter default: BSNL and congested-cell
    // connections are often legitimately slow rather than broken (e.g.
    // carrier DNS-over-TLS validation alone was observed taking ~30s
    // before falling back on one live trace) — this only affects how
    // long a *failing* request takes to give up, not the common case.
    Duration connectTimeout = const Duration(seconds: 20),
    Duration receiveTimeout = const Duration(seconds: 20),
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
  void Function()? _onUnauthorized;

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

  /// Invoked whenever any request comes back `401` — a real expired/
  /// invalid session, not a config issue. Deliberately doesn't know
  /// *how* to sign out (this package has no Firebase dependency) — the
  /// app wires this to its own auth repository's `signOut()` so an
  /// expired session cleanly drops the user back to the login screen
  /// instead of leaving every open screen stuck on a dead error state.
  void setUnauthorizedHandler(void Function() handler) {
    _onUnauthorized = handler;
  }

  Future<ApiResult<T>> request<T>(
    Future<Response<dynamic>> Function(Dio dio) call, {
    required T Function(dynamic data) mapper,
  }) =>
      _executeWithRetry(() => call(_dio), mapper: mapper);

  /// Multipart file upload (e.g. document upload). Keeps Dio's
  /// `FormData`/`MultipartFile` types encapsulated here rather than
  /// leaking them into feature repositories, which only depend on
  /// this `ApiClient` — not on Dio directly.
  ///
  /// Builds `FormData` fresh on every call — including on a retry —
  /// rather than once up front: Dio's multipart file streams can only
  /// be read once, so reusing the same `FormData` across attempts would
  /// silently send an empty/truncated body on the second try.
  Future<ApiResult<T>> uploadFile<T>(
    String path, {
    required String filePath,
    required String fieldName,
    Map<String, dynamic>? fields,
    required T Function(dynamic data) mapper,
    void Function(int sent, int total)? onSendProgress,
  }) {
    final fileName = filePath.split(RegExp(r'[\\/]')).last;
    return _executeWithRetry(
      () async {
        final formData = FormData.fromMap({
          ...?fields,
          fieldName: await MultipartFile.fromFile(filePath, filename: fileName),
        });
        return _dio.post<dynamic>(
          path,
          data: formData,
          onSendProgress: onSendProgress,
        );
      },
      mapper: mapper,
    );
  }

  /// Retry delays for transient failures — short and few (2 retries,
  /// ~1.1s total backoff) so a genuine outage still fails promptly, but
  /// the single dropped packet / tower handover / momentary carrier DNS
  /// hiccup that's normal on cellular networks doesn't surface as a
  /// hard error on the first unlucky attempt.
  static const _retryDelays = [
    Duration(milliseconds: 300),
    Duration(milliseconds: 800),
  ];

  Future<ApiResult<T>> _executeWithRetry<T>(
    Future<Response<dynamic>> Function() call, {
    required T Function(dynamic data) mapper,
  }) async {
    var attempt = 0;
    while (true) {
      try {
        final response = await call();
        return ApiSuccess(mapper(_normalizeEmptyBody(response.data)));
      } on DioException catch (error) {
        if (attempt < _retryDelays.length && _isRetryable(error)) {
          await Future<void>.delayed(_retryDelays[attempt]);
          attempt++;
          continue;
        }
        return ApiFailure(_mapDioException(error));
      } catch (error) {
        return ApiFailure(NetworkException.unexpected(error));
      }
    }
  }

  /// Only retries failures where we can be confident the request never
  /// reached the server (nothing to duplicate): a connection that never
  /// established at all. `sendTimeout`/`receiveTimeout` mean a
  /// connection *was* made and the request may already be mid-flight or
  /// fully processed server-side — retrying those blind on a write
  /// (loan application submission, document upload, KYC review) risks a
  /// duplicate side effect, so they're only retried for side-effect-free
  /// `GET` requests.
  bool _isRetryable(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.connectionError:
        return true;
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return error.requestOptions.method == 'GET';
      case DioExceptionType.badResponse:
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
      case DioExceptionType.unknown:
        return false;
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
        final statusCode = error.response?.statusCode;
        if (statusCode == 401) {
          _onUnauthorized?.call();
        }
        return NetworkException(
          message: _extractMessage(error) ?? 'Request failed.',
          statusCode: statusCode,
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
    if (data is! Map) return null;
    final message = data['message'];
    if (message is String) return message;
    // NestJS's ValidationPipe reports multiple failures as
    // `message: string[]` (e.g. class-validator errors) rather than a
    // single string — without this, every validation error silently
    // fell back to the generic "Request failed." and hid the actual
    // reason from both the user and whoever's debugging their report.
    if (message is List && message.isNotEmpty) {
      return message.whereType<String>().join(' ');
    }
    return null;
  }

  /// NestJS handlers that return `null` (e.g. "no profile yet") send an
  /// **empty** response body, not the literal JSON `null` — Dio then
  /// has nothing to parse and hands back `''` (an empty string), not
  /// Dart `null`. Every nullable-response repository mapper in both
  /// apps is written as `data == null ? null : X.fromJson(data as
  /// Map<...>)`, which silently never matched and threw a type-cast
  /// exception on the `as Map` instead. Normalizing here fixes it once
  /// for every current and future nullable endpoint, rather than
  /// requiring each call site to defensively re-check for an empty
  /// string.
  dynamic _normalizeEmptyBody(dynamic data) {
    if (data is String && data.isEmpty) {
      return null;
    }
    return data;
  }
}
