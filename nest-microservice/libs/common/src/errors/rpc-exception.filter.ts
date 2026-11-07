import { ArgumentsHost, Catch, Logger, RpcExceptionFilter } from '@nestjs/common';
import { NatsContext } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { toProblem } from './problem-details';

/**
 * Apply on EVERY NATS controller (event consumers): `@UseFilters(RpcAllExceptionsFilter)`.
 *
 * For @EventPattern handlers nobody receives the error, so the useful part is the log:
 * full stack for 5xx, a short line for 4xx (e.g. an invalid event payload).
 */
@Catch()
export class RpcAllExceptionsFilter implements RpcExceptionFilter<unknown> {
  private readonly logger = new Logger(RpcAllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<never> {
    const payload = toProblem(exception);
    const subject = host.switchToRpc().getContext<NatsContext | undefined>()?.getSubject?.();

    if (payload.status >= 500) {
      this.logger.error(
        `${subject ?? 'rpc'} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${subject ?? 'rpc'} → ${payload.status} ${payload.code}: ${payload.detail}`,
      );
    }

    return throwError(() => payload);
  }
}
