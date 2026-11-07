import { toProblem } from '../errors/problem-details';
import { DatabaseError } from './database-error';
import { databaseErrors } from './database-errors.extension';
import { toDatabaseError } from './prisma-error-mapper';

/**
 * Error shapes copied from what Prisma 7 + @prisma/adapter-pg really throws (checked against a
 * real Postgres 16): see prisma-error-mapper.ts.
 */
const prismaKnown = (code: string, meta: object = {}) =>
  Object.assign(new Error('Invalid `prisma.deployment.create()` invocation'), {
    name: 'PrismaClientKnownRequestError',
    code,
    meta: { modelName: 'Deployment', ...meta },
  });
const adapterCause = (originalCode: string, extra: object = {}) => ({
  driverAdapterError: { name: 'DriverAdapterError', cause: { originalCode, ...extra } },
});

describe('[database errors] (unit)', () => {
  describe('toDatabaseError: real Prisma 7 / pg shapes', () => {
    it.each([
      [
        'unique violation',
        prismaKnown(
          'P2002',
          adapterCause('23505', {
            kind: 'UniqueConstraintViolation',
            constraint: { index: 'uq_x' },
          }),
        ),
        'unique_violation',
        409,
      ],
      ['update/delete target missing', prismaKnown('P2025'), 'not_found', 404],
      ['invalid uuid', prismaKnown('P2007', adapterCause('22P02')), 'invalid_value', 400],
      ['value too long', prismaKnown('P2000', adapterCause('22001')), 'invalid_value', 400],
      ['foreign key', prismaKnown('P2003', adapterCause('23503')), 'foreign_key_violation', 422],
      ['write conflict / deadlock', prismaKnown('P2034'), 'conflict', 409],
      ['raw query: statement timeout', prismaKnown('P2010', adapterCause('57014')), 'timeout', 503],
      [
        'raw query: unique (SQLSTATE only)',
        prismaKnown('P2010', adapterCause('23505')),
        'unique_violation',
        409,
      ],
      [
        'raw query: missing table (bug)',
        prismaKnown('P2010', adapterCause('42P01')),
        'query_error',
        500,
      ],
      ['authentication failed', prismaKnown('P1000', adapterCause('28P01')), 'unavailable', 503],
      ['database down (driver adapter)', prismaKnown('ECONNREFUSED'), 'unavailable', 503],
      [
        'pool exhausted (plain pg Error)',
        new Error('timeout exceeded when trying to connect'),
        'unavailable',
        503,
      ],
      [
        'host unreachable (plain pg Error)',
        new Error('Connection terminated due to connection timeout'),
        'unavailable',
        503,
      ],
      [
        'client init failure',
        Object.assign(new Error('x'), { name: 'PrismaClientInitializationError' }),
        'unavailable',
        503,
      ],
      [
        'invalid query (bug)',
        Object.assign(new Error('Unknown argument'), { name: 'PrismaClientValidationError' }),
        'query_error',
        500,
      ],
      ['anything else', new Error('boom'), 'query_error', 500],
    ])('%s → %s (%i)', (_label, error, kind, status) => {
      const mapped = toDatabaseError(error, { model: 'Deployment', operation: 'create' });
      expect(mapped).toBeInstanceOf(DatabaseError);
      expect(mapped).toMatchObject({
        kind,
        statusCode: status,
        model: 'Deployment',
        operation: 'create',
      });
      expect(mapped.cause).toBe(error); // the original stays available for logs
    });

    it('names the violated constraint and uses its custom public message', () => {
      const error = prismaKnown(
        'P2002',
        adapterCause('23505', { constraint: { index: 'uq_name' } }),
      );
      const mapped = toDatabaseError(error, { uniqueMessages: { uq_name: 'Name already taken' } });
      expect(mapped).toMatchObject({
        constraint: 'uq_name',
        publicMessage: 'Name already taken',
        code: 'P2002/23505',
      });
    });

    it('keeps an already mapped error as is (nested calls)', () => {
      const once = toDatabaseError(prismaKnown('P2025'), { model: 'A', operation: 'update' });
      expect(toDatabaseError(once, { model: 'B', operation: 'other' })).toBe(once);
    });

    it('puts where it happened in the log message, never the query arguments', () => {
      const mapped = toDatabaseError(prismaKnown('P2002'), {
        model: 'Deployment',
        operation: 'create',
      });
      expect(mapped.message).toBe('Database unique_violation in Deployment.create (P2002)');
    });
  });

  describe('databaseErrors() extension', () => {
    const { $allOperations } = databaseErrors({ uniqueMessages: { uq_x: 'Taken' } }).query;

    it('passes results through untouched', async () => {
      const query = jest.fn().mockResolvedValue({ id: 1 });
      await expect(
        $allOperations({ model: 'Deployment', operation: 'findFirst', args: { a: 1 }, query }),
      ).resolves.toEqual({ id: 1 });
      expect(query).toHaveBeenCalledWith({ a: 1 });
    });

    it('rethrows any failure as a DatabaseError with model, operation and options', async () => {
      const query = jest
        .fn()
        .mockRejectedValue(
          prismaKnown('P2002', adapterCause('23505', { constraint: { index: 'uq_x' } })),
        );
      await expect(
        $allOperations({ model: 'Deployment', operation: 'create', args: {}, query }),
      ).rejects.toMatchObject({
        name: 'DatabaseError',
        kind: 'unique_violation',
        model: 'Deployment',
        operation: 'create',
        publicMessage: 'Taken',
      });
    });
  });

  describe('what the client receives (toProblem)', () => {
    it('uses the public message only: no codes, constraint names or SQL', () => {
      const payload = toProblem(
        toDatabaseError(prismaKnown('P2010', adapterCause('57014')), { operation: '$queryRaw' }),
      );
      expect(payload).toEqual({
        type: 'about:blank',
        title: 'Service Unavailable',
        status: 503,
        detail: 'The database is busy, try again later',
        code: 'database_timeout',
      });
    });

    it('maps raw Prisma errors that skipped the extension the same way', () => {
      expect(toProblem(prismaKnown('P2025'))).toMatchObject({ status: 404, code: 'not_found' });
    });

    it('does not treat a non-Prisma error with a P-code as a database error', () => {
      expect(toProblem(Object.assign(new Error('x'), { code: 'P2002' })).status).toBe(500);
    });
  });
});
