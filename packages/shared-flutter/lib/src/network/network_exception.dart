/// Normalized network/API failure used across both Flutter apps.
///
/// Phase 2 scope: a generic error shape (status code + message) that
/// the shared repository pattern and future feature repositories can
/// depend on, independent of any specific domain model.
class NetworkException implements Exception {
  const NetworkException({
    required this.message,
    this.statusCode,
    this.cause,
  });

  final String message;
  final int? statusCode;
  final Object? cause;

  factory NetworkException.timeout() => const NetworkException(
      message: 'The request timed out. Please try again.');

  factory NetworkException.noConnection() => const NetworkException(
        message:
            'No internet connection. Please check your network and try again.',
      );

  factory NetworkException.unexpected([Object? cause]) => NetworkException(
        message: 'Something went wrong. Please try again.',
        cause: cause,
      );

  @override
  String toString() =>
      'NetworkException(statusCode: $statusCode, message: $message)';
}
