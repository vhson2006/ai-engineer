import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import { AuthUser } from './auth.types';
import { JwtVerifier } from './jwt-verifier.service';

/**
 * Global guard (registered by AuthModule as APP_GUARD): every HTTP route requires a valid
 * Bearer token unless marked @Public(). Then @Roles(...) is enforced (any-of).
 *
 * KrakenD already checked the token, this is defense in depth: the service port is reachable
 * without KrakenD in dev, and later by other services.
 *   no / invalid / expired token → 401   ·   valid token, missing role → 403
 *
 * Both carry the challenge RFC 9110 §15.5.2 requires on 401 (and RFC 6750 §3 recommends on 403):
 *   401 no token       WWW-Authenticate: Bearer realm="api"
 *   401 bad token      WWW-Authenticate: Bearer realm="api", error="invalid_token"
 *   403 missing role   WWW-Authenticate: Bearer realm="api", error="insufficient_scope"
 */
const REALM = 'Bearer realm="api"';
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true; // NATS event handlers carry no token
    }

    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const res = context.switchToHttp().getResponse<Response>();
    const token = bearerToken(req);
    if (!token) {
      res.setHeader('WWW-Authenticate', REALM); // no error code when no credentials (RFC 6750 §3.1)
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      req.user = await this.verifier.verify(token);
    } catch (error) {
      // The reason (expired, bad signature, wrong audience...) is logged, never sent back.
      this.logger.debug(
        `Rejected token: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.setHeader('WWW-Authenticate', `${REALM}, error="invalid_token"`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, targets);
    if (required?.length && !required.some((role) => req.user!.roles.includes(role))) {
      res.setHeader('WWW-Authenticate', `${REALM}, error="insufficient_scope"`);
      throw new ForbiddenException(`Requires one of the roles: ${required.join(', ')}`);
    }
    return true;
  }
}

function bearerToken(req: Request): string | undefined {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}
