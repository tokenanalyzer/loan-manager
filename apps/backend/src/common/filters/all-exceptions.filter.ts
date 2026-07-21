import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
  requestId?: string;
  /** Extra structured fields a specific exception wants to carry (e.g. `blockingDocuments` on the approval-gate ConflictException) — see `extractExtraFields`. */
  [key: string]: unknown;
}

/**
 * AllExceptionsFilter — global error handling.
 *
 * Catches every unhandled exception (HttpException and unexpected
 * errors alike), logs it once with full context, and returns a
 * consistent, client-safe JSON error shape. No business-specific
 * error codes are defined here — this is generic infrastructure that
 * feature modules will build on in later phases.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse, exception, isHttpException);

    const body: ErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error: isHttpException ? exception.name : 'InternalServerError',
      requestId: (request.headers['x-request-id'] as string) ?? undefined,
      ...this.extractExtraFields(exceptionResponse),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception, path: request.url }, 'Unhandled exception');
    } else {
      this.logger.warn({ path: request.url, status }, message.toString());
    }

    response.status(status).json(body);
  }

  /**
   * `isHttpException` gates whether `exception.message` is ever
   * client-visible. An `HttpException` was deliberately thrown by our
   * own code with a message meant to be shown to the caller ("Enter a
   * valid amount", etc.) — safe to forward as-is. Anything else is an
   * *unexpected* error (a bug, a raw DB constraint violation, a null
   * reference) whose real message can leak implementation details
   * (schema/constraint names, internal paths, library internals) to
   * any API caller — those must never reach the client, only the
   * server-side log line just above, which already has full detail.
   */
  private extractMessage(
    exceptionResponse: string | object | null,
    exception: unknown,
    isHttpException: boolean,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message;
    }

    if (isHttpException && exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  /**
   * Passes through any additional structured fields a caught exception's
   * response object carries beyond `message` (e.g. the approval
   * validation gate's `blockingDocuments` — see
   * LoanApplicationsService.review). Excludes `statusCode`/`message`/
   * `error` so a caller-supplied object can never override this filter's
   * own authoritative values for those.
   */
  private extractExtraFields(exceptionResponse: string | object | null): Record<string, unknown> {
    if (!exceptionResponse || typeof exceptionResponse !== 'object') {
      return {};
    }
    const reservedKeys = new Set(['statusCode', 'message', 'error']);
    return Object.fromEntries(
      Object.entries(exceptionResponse as Record<string, unknown>).filter(([key]) => !reservedKeys.has(key)),
    );
  }
}
