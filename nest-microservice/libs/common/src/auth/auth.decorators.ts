import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from './auth.types';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';

/** Skip authentication for this route or controller (e.g. /health). Use sparingly. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * The caller needs AT LEAST ONE of these roles (403 otherwise).
 * Without @Roles, any authenticated caller passes: always state the roles on business routes.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** The authenticated caller, set by AuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!req.user) {
      // Only reachable on a @Public() route: a programming error, not a client error.
      throw new Error('@CurrentUser() used on a route without authentication');
    }
    return req.user;
  },
);
