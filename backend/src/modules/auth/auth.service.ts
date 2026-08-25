import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress: string, userAgent: string) {
    // Check for existing user
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });

    // Create session
    const sessionId = await this.sessionService.create(user.id, ipAddress, userAgent);

    // Audit
    await this.auditService.log({
      userId: user.id,
      action: 'REGISTER',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    await this.auditService.logSecurityEvent(user.id, 'REGISTRATION', 'LOW', ipAddress, userAgent);

    return {
      sessionId,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Constant-time: still hash to prevent timing attacks
      await this.passwordService.hash('dummy-password-for-timing');
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditService.logSecurityEvent(
        user.id,
        'LOGIN_ATTEMPT_LOCKED',
        'MEDIUM',
        ipAddress,
        userAgent,
      );
      throw new ForbiddenException(
        'Account temporarily locked due to too many failed login attempts. Try again later.',
      );
    }

    // Verify password
    const valid = await this.passwordService.verify(user.passwordHash, dto.password);

    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData['lockedUntil'] = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.auditService.logSecurityEvent(
          user.id,
          'ACCOUNT_LOCKED',
          'HIGH',
          ipAddress,
          userAgent,
          { attempts },
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await this.auditService.logSecurityEvent(
        user.id,
        'LOGIN_FAILED',
        'MEDIUM',
        ipAddress,
        userAgent,
      );

      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Create session
    const sessionId = await this.sessionService.create(user.id, ipAddress, userAgent);

    // Audit
    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    await this.auditService.logSecurityEvent(user.id, 'LOGIN_SUCCESS', 'LOW', ipAddress, userAgent);

    return {
      sessionId,
      user: this.sanitizeUser(user),
    };
  }

  async logout(sessionId: string, userId: string, ipAddress: string, userAgent: string) {
    await this.sessionService.destroy(sessionId, userId);

    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      resourceType: 'session',
      resourceId: sessionId,
      ipAddress,
      userAgent,
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const valid = await this.passwordService.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Destroy all other sessions (security: password change invalidates other sessions)
    await this.sessionService.destroyAllForUser(userId);

    // Re-create current session (session fixation prevention after privilege change)
    const newSessionId = await this.sessionService.create(userId, ipAddress, userAgent);

    // Audit
    await this.auditService.log({
      userId,
      action: 'PASSWORD_CHANGE',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    await this.auditService.logSecurityEvent(
      userId,
      'PASSWORD_CHANGED',
      'MEDIUM',
      ipAddress,
      userAgent,
    );

    return { sessionId: newSessionId };
  }

  async getSession(sessionId: string) {
    const session = await this.sessionService.validate(sessionId);
    if (!session) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) return null;

    return {
      user: this.sanitizeUser(user),
      session: {
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
      },
    };
  }

  async getUserSessions(userId: string, currentSessionId: string) {
    const sessions = await this.sessionService.getUserSessions(userId);
    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(
    sessionIdToRevoke: string,
    userId: string,
    currentSessionId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    if (sessionIdToRevoke === currentSessionId) {
      throw new BadRequestException('Cannot revoke current session. Use logout instead.');
    }

    // Verify session belongs to user
    const session = await this.sessionService.validate(sessionIdToRevoke);
    if (!session || session.userId !== userId) {
      throw new BadRequestException('Session not found');
    }

    await this.sessionService.destroy(sessionIdToRevoke, userId);

    await this.auditService.log({
      userId,
      action: 'SESSION_REVOKED',
      resourceType: 'session',
      resourceId: sessionIdToRevoke,
      ipAddress,
      userAgent,
    });

    await this.auditService.logSecurityEvent(
      userId,
      'SESSION_REVOKED',
      'LOW',
      ipAddress,
      userAgent,
    );
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    mfaEnabled: boolean;
    emailVerified: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mfaEnabled: user.mfaEnabled,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
