import 'network_exception.dart';

/// Result of a repository/API call: either [ApiSuccess] or [ApiFailure].
///
/// A small sealed-class Result type (rather than throwing) so callers
/// are forced to handle failures explicitly. Phase 2 scope: generic
/// plumbing only — no domain-specific result types are defined yet.
sealed class ApiResult<T> {
  const ApiResult();

  R when<R>({
    required R Function(T data) success,
    required R Function(NetworkException error) failure,
  }) {
    final self = this;
    if (self is ApiSuccess<T>) return success(self.data);
    if (self is ApiFailure<T>) return failure(self.error);
    throw StateError('Unreachable: unknown ApiResult subtype');
  }

  bool get isSuccess => this is ApiSuccess<T>;
}

final class ApiSuccess<T> extends ApiResult<T> {
  const ApiSuccess(this.data);
  final T data;
}

final class ApiFailure<T> extends ApiResult<T> {
  const ApiFailure(this.error);
  final NetworkException error;
}
