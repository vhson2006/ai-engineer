import { UnsupportedMediaTypeException } from '@nestjs/common';
import express from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Express middlewares for REST services, registered in setup.ts with app.use(...).
 * Errors are passed to next(): Nest's exception layer (HttpAllExceptionsFilter) answers them.
 */

/** application/json, application/merge-patch+json, application/*+json (with any parameters). */
const JSON_MEDIA_TYPE = /^application\/([\w.-]+\+)?json\s*(;|$)/i;

function hasBody(req: IncomingMessage): boolean {
  const length = req.headers['content-length'];
  return (length !== undefined && length !== '0') || req.headers['transfer-encoding'] !== undefined;
}

/**
 * 415 Unsupported Media Type (RFC 9110 §15.5.16) when a request carries a body that isn't JSON.
 * Without it, a text/plain or form body is silently ignored by the JSON parser and the client
 * gets a confusing list of "field should not be empty" errors.
 */
export function requireJsonBody(
  req: IncomingMessage,
  _res: ServerResponse,
  next: (error?: unknown) => void,
): void {
  if (hasBody(req) && !JSON_MEDIA_TYPE.test(req.headers['content-type'] ?? '')) {
    return next(
      new UnsupportedMediaTypeException('The request body must be JSON (application/json)'),
    );
  }
  next();
}

/**
 * Responses to authenticated API calls carry user data: no shared cache (proxy, CDN, browser
 * back/forward cache) may store them (RFC 9111 §5.2.2.5, OWASP API Security). Endpoints that
 * are really cacheable can override the header.
 */
export function noStoreCache(_req: IncomingMessage, res: ServerResponse, next: () => void): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/**
 * JSON body parsing with our own error mapping. Register BEFORE Nest's parser (which then skips
 * the already parsed body):  app.use(...jsonBody())
 *
 * Why: Nest turns every SyntaxError from the parser into BadRequestException(err.message) and
 * drops the original error, so the client would get parser internals ("Unexpected token } in
 * JSON at position 9"). Here the parse error is replaced, while it still carries its type, by a
 * neutral one that toProblem maps to 400 "malformed_body". Size errors keep their 413.
 */
export function jsonBody(limit = '100kb') {
  const parse = express.json({
    limit,
    type: (req) => JSON_MEDIA_TYPE.test(req.headers['content-type'] ?? ''),
  });
  const mapErrors = (
    error: unknown,
    _req: IncomingMessage,
    _res: ServerResponse,
    next: (error?: unknown) => void,
  ): void => {
    const type = (error as { type?: unknown } | null)?.type;
    if (type === 'entity.parse.failed') {
      return next(
        Object.assign(new Error('The request body is not valid JSON'), {
          type,
          status: 400,
          expose: true,
        }),
      );
    }
    next(error);
  };
  return [parse, mapErrors] as const;
}
