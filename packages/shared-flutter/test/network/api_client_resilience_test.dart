import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_flutter/shared_flutter.dart';

/// Validates the retry/timeout/failure-classification behavior added for
/// production network resilience (unreliable Indian mobile networks —
/// see the network compatibility audit). Runs against a real local
/// `HttpServer`, not a mocked Dio adapter, so this exercises the actual
/// socket-level failure paths (`connectionError`, `receiveTimeout`) the
/// same way a flaky carrier connection would trigger them.
///
/// `connectTimeout`/`connectionError` share one `_isRetryable` bucket in
/// `ApiClient` (see its source) — a "backend unavailable" test and a
/// "DNS failure" test both land in `connectionError` and are
/// representative of that whole bucket, so a separate forced-hang
/// `connectionTimeout` case would be redundant, not additional coverage.
void main() {
  group('ApiClient resilience', () {
    test('backend unavailable (connection refused) retries and then fails, bounded attempts', () async {
      // Nothing is listening on this port.
      final port = await _unusedPort();
      var attempts = 0;
      final client = ApiClient(
        baseUrl: 'http://127.0.0.1:$port',
        connectTimeout: const Duration(milliseconds: 300),
        receiveTimeout: const Duration(milliseconds: 300),
        interceptors: [
          InterceptorsWrapper(onRequest: (options, handler) {
            attempts++;
            handler.next(options);
          }),
        ],
      );

      final stopwatch = Stopwatch()..start();
      final result = await client.request<void>(
        (dio) => dio.get('/v1/whatever'),
        mapper: (_) {},
      );
      stopwatch.stop();

      expect(result, isA<ApiFailure<void>>());
      expect(attempts, 3, reason: 'exactly 1 initial attempt + 2 retries — proves the loop terminates and is bounded, not infinite');
      // Backoff between retries is 300ms + 800ms — total wall time should
      // reflect that both delays actually happened, not that retries were
      // skipped or looped indefinitely.
      expect(stopwatch.elapsedMilliseconds, greaterThanOrEqualTo(1100));
    });

    test('DNS failure (unresolvable host) is treated the same as connection-refused', () async {
      var attempts = 0;
      final client = ApiClient(
        baseUrl: 'http://this-host-does-not-exist.invalid',
        connectTimeout: const Duration(milliseconds: 500),
        receiveTimeout: const Duration(milliseconds: 500),
        interceptors: [
          InterceptorsWrapper(onRequest: (options, handler) {
            attempts++;
            handler.next(options);
          }),
        ],
      );

      final result = await client.request<void>(
        (dio) => dio.get('/v1/whatever'),
        mapper: (_) {},
      );

      expect(result, isA<ApiFailure<void>>());
      expect(attempts, 3, reason: 'DNS failure surfaces as connectionError, same retry bucket as connection-refused');
    });

    test('socket/receive timeout on a GET is retried (safe — no side effects)', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final requestsReceived = <DateTime>[];
      unawaited(server.forEach((request) {
        requestsReceived.add(DateTime.now());
        // Deliberately never respond — every attempt hangs until
        // receiveTimeout fires.
      }));

      final client = ApiClient(
        baseUrl: 'http://127.0.0.1:${server.port}',
        connectTimeout: const Duration(milliseconds: 300),
        receiveTimeout: const Duration(milliseconds: 300),
      );

      final result = await client.request<void>(
        (dio) => dio.get('/v1/whatever'),
        mapper: (_) {},
      );

      expect(result, isA<ApiFailure<void>>());
      expect(requestsReceived.length, 3, reason: 'GET has no side effects, so retrying on receiveTimeout is safe and expected');
      await server.close(force: true);
    });

    test('socket/receive timeout on a POST is NOT retried — proves no duplicate server-side writes', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      var serverSideProcessedCount = 0;
      unawaited(server.forEach((request) async {
        // Simulate the request genuinely reaching and being processed by
        // the server (e.g. a loan application row inserted, a document
        // saved) — the failure is the *response* going missing, not the
        // request. This is exactly the ambiguous case a naive retry
        // policy would double-submit.
        await request.drain<void>();
        serverSideProcessedCount++;
        // Never write a response — client will hit receiveTimeout.
      }));

      final client = ApiClient(
        baseUrl: 'http://127.0.0.1:${server.port}',
        connectTimeout: const Duration(milliseconds: 300),
        receiveTimeout: const Duration(milliseconds: 300),
      );

      final result = await client.request<void>(
        (dio) => dio.post('/v1/loan-applications'),
        mapper: (_) {},
      );

      expect(result, isA<ApiFailure<void>>());
      expect(serverSideProcessedCount, 1, reason: 'a POST must never be retried once it may have reached the server — this is the core duplicate-submission guarantee');
      await server.close(force: true);
    });

    test('HTTP 401 is not retried and is reported with statusCode 401', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      var attempts = 0;
      unawaited(server.forEach((request) async {
        attempts++;
        request.response.statusCode = 401;
        await request.response.close();
      }));

      final client = ApiClient(baseUrl: 'http://127.0.0.1:${server.port}');
      final result = await client.request<void>(
        (dio) => dio.get('/v1/auth/me'),
        mapper: (_) {},
      );

      expect(result, isA<ApiFailure<void>>());
      final failure = result as ApiFailure<void>;
      expect(failure.error.statusCode, 401);
      expect(attempts, 1, reason: 'a confirmed 401 must never be retried — the credential is invalid, not the network');
      await server.close(force: true);
    });

    test('HTTP 403 is not retried and is reported with statusCode 403', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      var attempts = 0;
      unawaited(server.forEach((request) async {
        attempts++;
        request.response.statusCode = 403;
        await request.response.close();
      }));

      final client = ApiClient(baseUrl: 'http://127.0.0.1:${server.port}');
      final result = await client.request<void>(
        (dio) => dio.get('/v1/auth/me'),
        mapper: (_) {},
      );

      expect(result, isA<ApiFailure<void>>());
      final failure = result as ApiFailure<void>;
      expect(failure.error.statusCode, 403);
      expect(attempts, 1);
      await server.close(force: true);
    });

    test('a transient failure eventually succeeds if the server recovers within the retry window', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      var attempts = 0;
      unawaited(server.forEach((request) async {
        attempts++;
        if (attempts < 2) {
          // First attempt: never respond at all, so the client's own
          // receiveTimeout fires (a real dropped/stalled connection, not
          // an empty-but-valid response) — a GET, so retrying is safe.
          return;
        }
        request.response.statusCode = 200;
        request.response.headers.contentType = ContentType.json;
        request.response.write('{"ok":true}');
        await request.response.close();
      }));

      final client = ApiClient(
        baseUrl: 'http://127.0.0.1:${server.port}',
        connectTimeout: const Duration(milliseconds: 300),
        receiveTimeout: const Duration(milliseconds: 300),
      );
      final result = await client.request<bool>(
        (dio) => dio.get('/v1/whatever'),
        mapper: (data) => (data as Map)['ok'] as bool,
      );

      expect(result, isA<ApiSuccess<bool>>());
      expect((result as ApiSuccess<bool>).data, true);
      await server.close(force: true);
    });
  });
}

Future<int> _unusedPort() async {
  final socket = await ServerSocket.bind(InternetAddress.loopbackIPv4, 0);
  final port = socket.port;
  await socket.close();
  return port;
}
