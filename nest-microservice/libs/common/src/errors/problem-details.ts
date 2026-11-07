import { HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { STATUS_CODES } from 'node:http';
import { DatabaseError } from '../database/database-error';
import { isPrismaError, toDatabaseError } from '../database/prisma-error-mapper';
import { UpstreamError } from '../http-client/upstream-error';
import { ValidationProblemException } from './validation';

/**
 * The ONE error body of every service: RFC 9457 "Problem Details for HTTP APIs"
 * (https://www.rfc-editor.org/rfc/rfc9457), media type application/problem+json.
 *
 *   {
 *     "type": "about:blank",              RFC 9457 §4.2.1: no extra semantics beyond the status...
 *     "title": "Conflict",                ...so the title is the status' standard reason phrase
 *     "status": 409,
 *     "detail": "A deployment with this name and version already exists",   for humans
 *     "instance": "/api/deployments",     the request path (no query string)
 *     "code": "unique_violation",         extension member: stable, for programs (switch on it)
 *     "requestId": "9f1c…",               extension member: the X-Request-Id, to find the logs
 *     "errors": [{ "field": "name", "message": "name must be a string" }]   validation only
 *   }
 *
 * Clients branch on `status` and `code`, show `detail`, and quote `requestId` to support.
 * Never in a problem: stack traces, SQL, constraint names, upstream URLs or bodies.
 * When public docs exist for the error codes, `type` can become their URL (RFC 9457 §3.1.1).
 *
 * Used by HttpAllExceptionsFilter (REST) and RpcAllExceptionsFilter (NATS event handlers).
 */
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

export interface FieldError {
  /** Path of the invalid property: "name", "items[0].price". "" for the whole body. */
  field: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  requestId?: string;
  errors?: FieldError[];
}

export interface ProblemContext {
  instance?: string;
  requestId?: string;
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  const v = value as Partial<ProblemDetails> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.status === 'number' &&
    typeof v.title === 'string' &&
    typeof v.code === 'string'
  );
}

/** "not_found" for 404, "unprocessable_entity" for 422... */
const codeOf = (status: number): string =>
  (HttpStatus[status] as string | undefined)?.toLowerCase() ?? `http_${status}`;

const titleOf = (status: number): string => STATUS_CODES[status] ?? 'Error';

function problem(
  status: number,
  detail: string,
  code: string = codeOf(status),
  errors?: FieldError[],
): ProblemDetails {
  return {
    type: 'about:blank',
    title: titleOf(status),
    status,
    detail,
    code,
    ...(errors?.length ? { errors } : {}),
  };
}

const INTERNAL = (): ProblemDetails =>
  problem(HttpStatus.INTERNAL_SERVER_ERROR, 'An unexpected error occurred', 'internal_error');

/**
 * Errors raised by Express' body parser before any Nest code runs (they carry `type`, `status`
 * and `expose`). Their own messages describe parser internals, so they are replaced.
 */
const BODY_PARSER_ERRORS: Record<string, { status: number; detail: string; code: string }> = {
  'entity.parse.failed': {
    status: HttpStatus.BAD_REQUEST,
    detail: 'The request body is not valid JSON',
    code: 'malformed_body',
  },
  'entity.too.large': {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    detail: 'The request body is too large',
    code: 'payload_too_large',
  },
  'encoding.unsupported': {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    detail: 'Unsupported content encoding',
    code: 'unsupported_media_type',
  },
  'charset.unsupported': {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    detail: 'Unsupported charset',
    code: 'unsupported_media_type',
  },
  'request.aborted': {
    status: HttpStatus.BAD_REQUEST,
    detail: 'The request was aborted',
    code: 'request_aborted',
  },
};

function bodyParserProblem(exception: unknown): ProblemDetails | undefined {
  const e = exception as { type?: unknown; expose?: unknown; status?: unknown } | null;
  if (typeof e?.type !== 'string' || e.expose !== true) return undefined;
  const known = BODY_PARSER_ERRORS[e.type];
  if (known) return problem(known.status, known.detail, known.code);
  return typeof e.status === 'number' && e.status >= 400 && e.status < 500
    ? problem(e.status, titleOf(e.status))
    : undefined;
}

/** A failed call to an external API (HttpClient). The upstream's details stay in our logs. */
function upstreamProblem(error: UpstreamError): ProblemDetails {
  if (error.kind === 'timeout') {
    return problem(
      HttpStatus.GATEWAY_TIMEOUT,
      'An upstream service did not respond in time',
      'upstream_timeout',
    );
  }
  const transient =
    error.kind === 'network' ||
    error.kind === 'aborted' ||
    (error.kind === 'http' &&
      error.status !== undefined &&
      (error.status >= 500 || [408, 425, 429].includes(error.status)));
  return transient
    ? problem(
        HttpStatus.SERVICE_UNAVAILABLE,
        'An upstream service is unavailable, try again later',
        'upstream_unavailable',
      )
    : problem(
        HttpStatus.BAD_GATEWAY,
        'An upstream service returned an invalid response',
        'upstream_bad_response',
      );
}

function httpExceptionProblem(exception: HttpException): ProblemDetails {
  const status = exception.getStatus();
  if (exception instanceof ValidationProblemException) {
    return problem(status, 'The request is invalid', 'validation_error', exception.errors);
  }
  const response = exception.getResponse();
  const message =
    typeof response === 'string'
      ? response
      : ((response as { message?: unknown }).message ?? exception.message);
  if (Array.isArray(message)) {
    // A ValidationPipe without our exceptionFactory: messages without field names.
    const errors = message.map((m) => ({ field: '', message: String(m) }));
    return problem(status, 'The request is invalid', 'validation_error', errors);
  }
  // A specific machine-readable reason: throw new ConflictException({ message, code: 'upload_incomplete' })
  const code = (response as { code?: unknown } | null)?.code;
  return problem(
    status,
    typeof message === 'string' ? message : titleOf(status),
    typeof code === 'string' ? code : codeOf(status),
  );
}

/**
 * Converts anything a service throws into a problem:
 * - Nest HttpException (NotFoundException, ForbiddenException...) → same status, its message, and
 *   its `code` when thrown with one: new ConflictException({ message: '...', code: 'upload_incomplete' })
 * - ValidationProblemException (ValidationPipe) → 400 with `errors` per field
 * - DatabaseError, and raw Prisma errors → 409 / 422 / 404 / 400 / 503 / 500
 * - UpstreamError (HttpClient) → 502 / 503 / 504
 * - Express body-parser errors → 400 malformed JSON / 413 too large / 415 encoding
 * - RpcException carrying a problem → as-is
 * - everything else → 500, with NO internal details
 */
export function toProblem(exception: unknown, context: ProblemContext = {}): ProblemDetails {
  return { ...classify(exception), ...definedOnly(context) };
}

function classify(exception: unknown): ProblemDetails {
  if (exception instanceof HttpException) return httpExceptionProblem(exception);

  if (exception instanceof RpcException) {
    const error = exception.getError();
    return isProblemDetails(error) ? error : INTERNAL();
  }

  if (exception instanceof DatabaseError || isPrismaError(exception)) {
    const db = toDatabaseError(exception);
    const code =
      db.kind === 'unavailable' || db.kind === 'timeout' ? `database_${db.kind}` : db.kind;
    return db.kind === 'query_error' ? INTERNAL() : problem(db.statusCode, db.publicMessage, code);
  }

  if (exception instanceof UpstreamError) return upstreamProblem(exception);

  return bodyParserProblem(exception) ?? INTERNAL();
}

function definedOnly(context: ProblemContext): ProblemContext {
  return Object.fromEntries(Object.entries(context).filter(([, v]) => v !== undefined));
}
