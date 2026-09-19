import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from './auth.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Authenticates when a valid token is present and lets the request through
 * when it is not, leaving `req.user` undefined. For endpoints open to guests
 * that still want to know who someone is when they happen to be signed in —
 * liking a design, for instance.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser | undefined {
    if (err) throw err;
    return user || undefined;
  }

  canActivate(ctx: ExecutionContext) {
    return super.canActivate(ctx) as Promise<boolean>;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return !!user && roles.includes(user.role);
  }
}
