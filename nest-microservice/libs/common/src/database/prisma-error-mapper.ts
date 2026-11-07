import { DatabaseError, DatabaseErrorKind } from './database-error';

/**
 * Turns whatever a Prisma call threw into a DatabaseError. Duck-typed on purpose: every service
 * generates its own Prisma client, so libs/common can't import their error classes.
 *
 * Shapes observed with Prisma 7 + @prisma/adapter-pg (driver adapters):
 *  - PrismaClientKnownRequestError with a Prisma code (P2002...) and, for database errors,
 *    meta.driverAdapterError.cause = { originalCode: <SQLSTATE>, kind, constraint?: { index } }.
 *    Unique violations carry the constraint NAME, not the fields.
 *  - Raw queries: P2010 with the SQLSTATE in meta.driverAdapterError.cause.originalCode.
 *  - Database down: PrismaClientKnownRequestError with code 'ECONNREFUSED' (not P1001).
 *  - Pool exhausted / host unreachable: a plain Error from `pg`
 *    ("timeout exceeded when trying to connect", "Connection terminated due to connection timeout").
 * Order: Prisma code → SQLSTATE → Node network code → pg connection messages → error class name.
 */
export interface DatabaseErrorContext {
  model?: string;
  operation?: string;
  /** Public message per unique constraint name, e.g. { uq_deployments_name_version: '...' }. */
  uniqueMessages?: Record<string, string>;
}

const PRISMA_CODES: Record<string, DatabaseErrorKind> = {
  P2002: 'unique_violation',
  P2003: 'foreign_key_violation',
  P2014: 'foreign_key_violation', // required relation would be violated
  P2025: 'not_found',
  P2015: 'not_found', // related record not found
  P2018: 'not_found', // required connected records not found
  P2000: 'invalid_value', // value too long for the column
  P2005: 'invalid_value',
  P2006: 'invalid_value',
  P2007: 'invalid_value', // e.g. invalid uuid syntax
  P2020: 'invalid_value', // value out of range
  P2023: 'invalid_value',
  P2033: 'invalid_value', // number doesn't fit
  P2034: 'conflict', // write conflict or deadlock: retry the transaction
  P1008: 'timeout',
  P1000: 'unavailable', // authentication failed
  P1001: 'unavailable', // can't reach the server
  P1002: 'unavailable', // server reached but timed out
  P1003: 'unavailable', // database does not exist
  P1010: 'unavailable', // access denied
  P1017: 'unavailable', // server closed the connection
  P2024: 'unavailable', // timed out fetching a connection from the pool
};

/** Postgres SQLSTATE → kind (https://www.postgresql.org/docs/current/errcodes-appendix.html). */
function sqlStateKind(state: string): DatabaseErrorKind | undefined {
  if (state === '23505') return 'unique_violation';
  if (state === '23503') return 'foreign_key_violation';
  if (['22001', '22P02', '22003', '22007', '22008', '22023'].includes(state))
    return 'invalid_value';
  if (state === '40001' || state === '40P01') return 'conflict';
  if (state === '57014') return 'timeout'; // statement_timeout / query cancelled
  if (state.startsWith('08') || state.startsWith('28') || state === '3D000') return 'unavailable';
  if (['53300', '57P01', '57P02', '57P03'].includes(state)) return 'unavailable';
  return undefined;
}

const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
]);

const CONNECTION_MESSAGES =
  /timeout exceeded when trying to connect|connection terminated|connection timeout|connection error|server closed the connection/i;

interface PrismaLikeError {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  meta?: {
    target?: unknown;
    driverAdapterError?: {
      cause?: { originalCode?: unknown; constraint?: { index?: unknown; fields?: unknown } };
    };
  };
}

export function toDatabaseError(error: unknown, context: DatabaseErrorContext = {}): DatabaseError {
  if (error instanceof DatabaseError) return error; // already mapped (nested calls)

  const e = (typeof error === 'object' && error !== null ? error : {}) as PrismaLikeError;
  const code = typeof e.code === 'string' ? e.code : undefined;
  const cause = e.meta?.driverAdapterError?.cause;
  const sqlState = typeof cause?.originalCode === 'string' ? cause.originalCode : undefined;

  const kind: DatabaseErrorKind =
    (code && PRISMA_CODES[code]) ||
    (sqlState && sqlStateKind(sqlState)) ||
    (code && NETWORK_CODES.has(code) ? 'unavailable' : undefined) ||
    (typeof e.message === 'string' && CONNECTION_MESSAGES.test(e.message)
      ? 'unavailable'
      : undefined) ||
    (e.name === 'PrismaClientInitializationError' ? 'unavailable' : undefined) ||
    'query_error';

  const constraint = constraintName(e);
  return new DatabaseError(
    {
      kind,
      model: context.model,
      operation: context.operation,
      code: [code, sqlState].filter(Boolean).join('/') || undefined,
      constraint,
      publicMessage:
        kind === 'unique_violation' && constraint
          ? context.uniqueMessages?.[constraint]
          : undefined,
    },
    { cause: error },
  );
}

function constraintName(e: PrismaLikeError): string | undefined {
  const constraint = e.meta?.driverAdapterError?.cause?.constraint;
  if (typeof constraint?.index === 'string') return constraint.index;
  if (Array.isArray(constraint?.fields)) return constraint.fields.join(',');
  const target = e.meta?.target; // Prisma without driver adapters
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) return target.join(',');
  return undefined;
}

/** Looks like something Prisma threw (used by toProblem for errors that skipped the extension). */
export function isPrismaError(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return typeof name === 'string' && name.startsWith('PrismaClient');
}
