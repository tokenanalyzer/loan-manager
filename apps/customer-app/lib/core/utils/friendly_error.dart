import 'package:shared_flutter/shared_flutter.dart';

/// Converts any error into copy a customer should actually see.
///
/// Screens must never interpolate a raw error into a message string
/// (`'Could not load X: $error'`) — that calls `.toString()`, and for
/// a [NetworkException] that produces literal
/// `NetworkException(statusCode: 401, message: ...)` text. Every
/// `ErrorView` call site should use `friendlyMessage(error)` instead.
String friendlyMessage(Object error) {
  if (error is NetworkException) {
    switch (error.statusCode) {
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return "That couldn't be found.";
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
        return 'Something went wrong on our end. Please try again shortly.';
      default:
        // NetworkException.message is already human-written (timeout,
        // no-connection, or the backend's own validation message).
        return error.message;
    }
  }

  return 'Something went wrong. Please try again.';
}
