/**
 * The logger, which used to crash the code it was reporting on.
 *
 * `formatLog` ended in `return \`${prefix} ${message}\`, data;` — the comma
 * operator, which discards the message and returns `data`. Callers then called
 * `.split('\n')` on the result, so passing any non-string `data` threw
 * `TypeError: x.split is not a function` from inside the error handler.
 */

import { logger, setSink, resetSink } from '@/lib/logger';
import { ApiError } from '@/api/errors';

describe('logger', () => {
  /** @type {jest.Mock} */
  let sink;

  beforeEach(() => {
    sink = jest.fn();
    setSink(sink);
  });

  afterEach(resetSink);

  const lastRecord = () => sink.mock.calls.at(-1)[0];

  it('does not throw when handed an object as metadata', () => {
    // The exact shape that crashed the old implementation.
    expect(() =>
      logger.error('IssuesPage', 'Load failed', new Error('boom'), { page: 2, filters: {} }),
    ).not.toThrow();
  });

  it('emits a record with a stable shape', () => {
    logger.info('AuthGuard', 'Session restored', { role: 'ward_admin' });

    const record = lastRecord();
    expect(record).toMatchObject({
      level: 'info',
      context: 'AuthGuard',
      message: 'Session restored',
      meta: { role: 'ward_admin' },
    });
    expect(record.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('serialises an Error, which JSON.stringify would otherwise flatten to {}', () => {
    const error = new Error('Network down');
    logger.error('http', 'Request failed', error);

    const { error: serialised } = lastRecord();
    expect(serialised.name).toBe('Error');
    expect(serialised.message).toBe('Network down');
    expect(serialised.stack).toBeTruthy();
    // The whole point: it survives a transport.
    expect(JSON.parse(JSON.stringify(serialised)).message).toBe('Network down');
  });

  it('lifts an ApiError’s requestId to the top level', () => {
    // This is the join key between a browser error and the backend log line
    // that produced it — the correlation the backend already emits and the
    // frontend never used.
    const error = new ApiError({
      kind: 'server',
      message: 'Boom',
      status: 500,
      requestId: 'req-abc-123',
    });
    logger.error('IssuesPage', 'Load failed', error);

    const record = lastRecord();
    expect(record.requestId).toBe('req-abc-123');
    expect(record.error.status).toBe(500);
    expect(record.error.kind).toBe('server');
  });

  it('handles a thrown non-Error without losing it', () => {
    logger.error('somewhere', 'Odd throw', 'just a string');
    expect(lastRecord().error).toEqual({ name: 'NonError', message: 'just a string' });
  });

  it('never lets a broken sink take down the caller', () => {
    setSink(() => {
      throw new Error('sink exploded');
    });
    // A logger that throws breaks the error path it exists to report on.
    expect(() => logger.error('x', 'y', new Error('z'))).not.toThrow();
  });

  it('omits optional fields rather than emitting undefined', () => {
    logger.info('x', 'plain message');
    const record = lastRecord();
    expect(record).not.toHaveProperty('error');
    expect(record).not.toHaveProperty('meta');
    expect(record).not.toHaveProperty('requestId');
  });
});
