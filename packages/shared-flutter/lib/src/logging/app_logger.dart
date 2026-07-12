import 'package:logger/logger.dart' as logger_pkg;

/// Shared client-side logger used by both Flutter apps.
///
/// Phase 2 scope: a thin, consistently-configured wrapper around the
/// `logger` package. No remote log shipping is wired up yet.
class AppLogger {
  AppLogger({bool verbose = false})
      : _logger = logger_pkg.Logger(
          level: verbose ? logger_pkg.Level.trace : logger_pkg.Level.info,
          printer: logger_pkg.PrettyPrinter(
            methodCount: 0,
            colors: true,
            printEmojis: true,
            dateTimeFormat: logger_pkg.DateTimeFormat.onlyTimeAndSinceStart,
          ),
        );

  final logger_pkg.Logger _logger;

  void debug(String message, [Object? error, StackTrace? stackTrace]) =>
      _logger.d(message, error: error, stackTrace: stackTrace);

  void info(String message) => _logger.i(message);

  void warning(String message, [Object? error]) =>
      _logger.w(message, error: error);

  void error(String message, [Object? error, StackTrace? stackTrace]) =>
      _logger.e(message, error: error, stackTrace: stackTrace);
}
