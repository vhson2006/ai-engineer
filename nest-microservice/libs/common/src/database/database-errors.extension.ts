import { DatabaseErrorContext, toDatabaseError } from './prisma-error-mapper';

/**
 * Prisma Client extension: wraps EVERY database call (model operations, $queryRaw/$executeRaw,
 * calls inside $transaction) and rethrows any failure as a DatabaseError with the model and
 * operation. Services just `await this.prisma.x.create(...)`: no try/catch; the global
 * exception filters turn DatabaseError into the right HTTP status (toProblem).
 *
 * Catching here, not only in the filter, matters: when the pool is exhausted or the host is
 * unreachable, `pg` throws a plain Error that looks like any other bug. Here we KNOW it came from
 * a database call, so it's classified (503) and logged with where it happened.
 *
 *   new PrismaClient({ adapter }).$extends(databaseErrors({
 *     uniqueMessages: { uq_deployments_name_version: 'This name and version already exist' },
 *   }))
 */
export interface DatabaseErrorsOptions {
  /** Public message per unique constraint/index name (the DB name, e.g. from @@unique(map: ...)). */
  uniqueMessages?: Record<string, string>;
}

interface OperationParams {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
}

export function databaseErrors(options: DatabaseErrorsOptions = {}) {
  return {
    name: 'database-errors',
    query: {
      async $allOperations({ model, operation, args, query }: OperationParams): Promise<unknown> {
        try {
          return await query(args);
        } catch (error) {
          const context: DatabaseErrorContext = { model, operation, ...options };
          throw toDatabaseError(error, context);
        }
      },
    },
  };
}
