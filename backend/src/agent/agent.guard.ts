import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 10;

/**
 * The agent API's lock: the `x-agent-key` header must match AGENT_API_KEY
 * from the server's .env (at least 32 characters). With no key set, the
 * whole API is switched off. Ten wrong keys from one address in ten minutes
 * lock that address out for the rest of the window.
 */
@Injectable()
export class AgentKeyGuard implements CanActivate {
  private readonly logger = new Logger('AgentAPI');
  private readonly digest: Buffer | null;
  private readonly failures = new Map<string, { n: number; since: number }>();

  constructor(config: ConfigService) {
    const key = config.get<string>('AGENT_API_KEY')?.trim();
    // compared as digests, so the comparison takes the same time whatever was sent
    this.digest =
      key && key.length >= 32
        ? createHash('sha256').update(key).digest()
        : null;
  }

  canActivate(ctx: ExecutionContext): boolean {
    if (!this.digest)
      throw new ForbiddenException(
        'The agent API is switched off (set AGENT_API_KEY on the server).',
      );
    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = String(req.ip ?? 'unknown');
    const now = Date.now();
    const f = this.failures.get(ip);
    if (f && now - f.since < WINDOW_MS && f.n >= MAX_FAILURES) {
      throw new HttpException(
        'Too many wrong keys; try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const given = createHash('sha256')
      .update(String(req.headers['x-agent-key'] ?? ''))
      .digest();
    if (!timingSafeEqual(given, this.digest)) {
      const fresh = !f || now - f.since >= WINDOW_MS;
      this.failures.set(ip, {
        n: fresh ? 1 : f.n + 1,
        since: fresh ? now : f.since,
      });
      this.logger.warn(`wrong agent key from ${ip}`);
      throw new UnauthorizedException('Wrong agent key');
    }
    this.failures.delete(ip);
    return true;
  }
}
