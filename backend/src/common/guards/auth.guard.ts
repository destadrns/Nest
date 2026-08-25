import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SessionService } from '../../modules/auth/session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

const COOKIE_NAME = 'sff_session';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check standard cookie or parse raw Cookie header if cookie-parser middleware not present
    let sessionId = request.cookies?.[COOKIE_NAME];
    if (!sessionId && request.headers.cookie) {
      const match = request.headers.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
      if (match && match[1]) {
        sessionId = decodeURIComponent(match[1]);
      }
    }

    if (!sessionId) {
      throw new UnauthorizedException('Authentication required');
    }

    const session = await this.sessionService.validate(sessionId);
    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Attach user to request
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mfaEnabled: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Attach to request for downstream use
    (request as any).user = user;
    (request as any).sessionId = sessionId;

    return true;
  }
}
