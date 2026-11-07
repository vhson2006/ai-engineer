import { HttpStatus } from '@nestjs/common';

/**
 * Every failure of a database call, classified ONCE where it happens (the Prisma extension in
 * database-errors.extension.ts), so services never need try/catch for database errors:
 *
 *   kind                   HTTP  when
 *   unique_violation       409   unique constraint (P2002, SQLSTATE 23505)
 *   foreign_key_violation  422   related row missing / still referenced (P2003, 23503)
 *   not_found              404   update/delete/connect target missing (P2025)
 *   invalid_value          400   value the column can't hold: too long, bad uuid, out of range
 *   conflict               409   concurrent write / deadlock (P2034, 40001, 40P01): retry
 *   timeout                503   statement or operation timeout (57014, P1008)
 *   unavailable            503   can't connect, pool exhausted, auth failed, server closed
 *   query_error            500   anything else: a bug in our query (validation, unknown)
 *
 * `message` is for OUR logs (model, operation, codes); `publicMessage` is what the client sees.
 * Query arguments (user data) are never put in either.
 */
export type DatabaseErrorKind =
  | 'unique_violation'
  | 'foreign_key_violation'
  | 'not_found'
  | 'invalid_value'
  | 'conflict'
  | 'timeout'
  | 'unavailable'
  | 'query_error';

const STATUS: Record<DatabaseErrorKind, number> = {
  unique_violation: HttpStatus.CONFLICT,
  foreign_key_violation: HttpStatus.UNPROCESSABLE_ENTITY,
  not_found: HttpStatus.NOT_FOUND,
  invalid_value: HttpStatus.BAD_REQUEST,
  conflict: HttpStatus.CONFLICT,
  timeout: HttpStatus.SERVICE_UNAVAILABLE,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  query_error: HttpStatus.INTERNAL_SERVER_ERROR,
};

const PUBLIC_MESSAGES: Record<DatabaseErrorKind, string> = {
  unique_violation: 'Resource already exists',
  foreign_key_violation: 'Related resource is missing or still in use',
  not_found: 'Resource not found',
  invalid_value: 'Invalid value',
  conflict: 'The resource was changed by another request, try again',
  timeout: 'The database is busy, try again later',
  unavailable: 'The database is unavailable, try again later',
  query_error: 'Internal error',
};

export interface DatabaseErrorDetails {
  kind: DatabaseErrorKind;
  /** Prisma model ("Deployment"), undefined for raw queries. */
  model?: string;
  /** Prisma operation ("create", "findMany", "$queryRaw"). */
  operation?: string;
  /** Prisma code (P2002), Postgres SQLSTATE (23505) or Node code (ECONNREFUSED). */
  code?: string;
  /** Constraint/index name for constraint violations ("uq_deployments_name_version"). */
  constraint?: string;
  /** Overrides the default public message (e.g. per unique constraint). */
  publicMessage?: string;
}

export class DatabaseError extends Error {
  readonly kind: DatabaseErrorKind;
  readonly statusCode: number;
  readonly publicMessage: string;
  readonly model?: string;
  readonly operation?: string;
  readonly code?: string;
  readonly constraint?: string;

  constructor(details: DatabaseErrorDetails, options?: { cause?: unknown }) {
    const where = [details.model, details.operation].filter(Boolean).join('.') || 'query';
    const extra = [details.code, details.constraint].filter(Boolean).join(' ');
    super(`Database ${details.kind} in ${where}${extra ? ` (${extra})` : ''}`, options);
    this.name = 'DatabaseError';
    this.kind = details.kind;
    this.statusCode = STATUS[details.kind];
    this.publicMessage = details.publicMessage ?? PUBLIC_MESSAGES[details.kind];
    this.model = details.model;
    this.operation = details.operation;
    this.code = details.code;
    this.constraint = details.constraint;
  }

  /** Worth retrying the whole request later (503) or right away (conflict). */
  get isTransient(): boolean {
    return ['conflict', 'timeout', 'unavailable'].includes(this.kind);
  }
}
