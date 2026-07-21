import { ArgumentsHost, ConflictException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';

import { AllExceptionsFilter } from './all-exceptions.filter';

/**
 * The approval validation gate (LoanApplicationsService.review) throws
 * `ConflictException({ message, blockingDocuments })` so the frontend
 * can show exactly which documents are blocking approval without
 * re-deriving that logic itself. This only works if the global filter
 * actually forwards `blockingDocuments` to the client instead of
 * normalizing it away — the bug this fix addresses.
 */
describe('AllExceptionsFilter', () => {
  function buildHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/v1/loan-applications/app-1/review', headers: {} }),
      }),
    } as unknown as ArgumentsHost;
    return { host, json, status };
  }

  function buildFilter(): AllExceptionsFilter {
    const logger = { setContext: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as PinoLogger;
    return new AllExceptionsFilter(logger);
  }

  it('forwards custom structured fields (e.g. blockingDocuments) from the exception response', () => {
    const filter = buildFilter();
    const { host, json, status } = buildHost();
    const blockingDocuments = [{ code: 'pan_card', label: 'PAN Card', reason: 'missing' }];

    filter.catch(
      new ConflictException({
        message: 'Cannot approve — required documents are not fully verified.',
        blockingDocuments,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Cannot approve — required documents are not fully verified.',
        error: 'ConflictException',
        blockingDocuments,
      }),
    );
  });

  it('never lets a custom field override the filter’s own statusCode/message/error', () => {
    const filter = buildFilter();
    const { host, json } = buildHost();

    filter.catch(
      new ConflictException({
        message: 'Real message',
        statusCode: 999,
        error: 'Spoofed',
      }),
      host,
    );

    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(409);
    expect(body.error).toBe('ConflictException');
    expect(body.message).toBe('Real message');
  });

  it('still returns the plain shape for a simple string-message exception (no regression)', () => {
    const filter = buildFilter();
    const { host, json } = buildHost();

    filter.catch(new ConflictException('Simple message'), host);

    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Simple message');
    expect(body.blockingDocuments).toBeUndefined();
  });

  it('never leaks a raw unexpected error message to the client, only a generic 500 message', () => {
    const filter = buildFilter();
    const { host, json, status } = buildHost();

    filter.catch(
      new Error('duplicate key value violates unique constraint "uq_loans_loan_number"'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(body.error).toBe('InternalServerError');
  });
});
