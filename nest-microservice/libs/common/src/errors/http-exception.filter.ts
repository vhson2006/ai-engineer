import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { currentRequestId } from '../logging/request-context';
import { PROBLEM_CONTENT_TYPE, toProblem } from './problem-details';

/**
 * Global filter for every REST service: `app.useGlobalFilters(new HttpAllExceptionsFilter())`.
 *
 * Every error leaves as RFC 9457 Problem Details (application/problem+json), whatever threw it:
 * a Nest exception, the ValidationPipe, Prisma, an external API, Express' body parser. Never
 * leaks internals. Logs once: full stack for 5xx, a short line for 4xx.
 */
@Catch()
export class HttpAllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpAllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const instance = (req.originalUrl ?? req.url ?? '/').split('?')[0];
    const header = res.getHeader('X-Request-Id');
    const body = toProblem(exception, {
      instance,
      requestId: currentRequestId() ?? (typeof header === 'string' ? header : undefined),
    });
    const route = `${req.method} ${instance}`;

    if (body.status >= 500) {
      this.logger.error(
        `${route} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${route} → ${body.status} ${body.code}: ${body.detail}`);
    }

    // Set before res.json(), which keeps an existing Content-Type.
    res.setHeader('Content-Type', `${PROBLEM_CONTENT_TYPE}; charset=utf-8`);
    res.status(body.status).json(body);
  }
}
