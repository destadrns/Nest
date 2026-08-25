import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { MfaService } from './mfa.service';
import { EnableMfaDto, DisableMfaDto, PasskeyRegisterDto } from './dto/security.dto';
import * as crypto from 'crypto';
import { Severity } from '@prisma/client';

@Injectable()
export class SecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
    private readonly mfaService: MfaService,
  ) {}

  /**
   * Start MFA setup: generates TOTP secret and recovery codes.
   * Does NOT enable MFA on user until verified with enableMfa().
   */
  async startMfaSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabled) throw new BadRequestException('MFA is already enabled');

    const { secret, uri } = this.mfaService.generateSecret();
    const { plaintextCodes, hashedCodes } = this.mfaService.generateRecoveryCodes();

    return {
      secret,
      uri,
      recoveryCodes: plaintextCodes,
      _hashedCodes: hashedCodes,
    };
  }

  /**
   * Finalize MFA setup by verifying the first 6-digit TOTP token.
   */
  async enableMfa(userId: string, dto: EnableMfaDto, hashedCodes: string[]) {
    const isValid = this.mfaService.verifyTotp(dto.secret, dto.token);
    if (!isValid) {
      throw new BadRequestException('Invalid TOTP verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: dto.secret,
        recoveryCodesHash: hashedCodes,
      },
    });

    await this.auditService.log({
      userId,
      action: 'MFA_ENABLED',
      resourceType: 'user_security',
      resourceId: userId,
    });

    await this.auditService.logSecurityEvent(userId, 'MFA_ENABLED', 'MEDIUM');

    return { success: true, mfaEnabled: true };
  }

  /**
   * Disable MFA after password confirmation.
   */
  async disableMfa(userId: string, dto: DisableMfaDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    // Confirm password
    const validPassword = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid password for MFA disable');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        recoveryCodesHash: [],
      },
    });

    await this.auditService.log({
      userId,
      action: 'MFA_DISABLED',
      resourceType: 'user_security',
      resourceId: userId,
    });

    await this.auditService.logSecurityEvent(userId, 'MFA_DISABLED', 'HIGH');

    return { success: true, mfaEnabled: false };
  }

  /**
   * Get overall security center summary for a user.
   */
  async getSecuritySummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            sessions: true,
            passkeys: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const recentEvents = await this.prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentAuditLogs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Compute Security Score (0-100)
    let score = 50; // base score for password
    if (user.mfaEnabled) score += 30;
    if (user.emailVerified) score += 10;
    if (user._count.passkeys > 0) score += 10;

    return {
      user: {
        id: user.id,
        email: user.email,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        sessionCount: user._count.sessions,
        passkeyCount: user._count.passkeys,
      },
      securityScore: Math.min(100, score),
      recentEvents,
      recentAuditLogs,
    };
  }

  /**
   * List passkeys for user.
   */
  async listPasskeys(userId: string) {
    return this.prisma.passkey.findMany({
      where: { userId },
      select: {
        id: true,
        credentialId: true,
        name: true,
        deviceType: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Register a new passkey credential for WebAuthn.
   */
  async registerPasskey(userId: string, dto: PasskeyRegisterDto) {
    const existing = await this.prisma.passkey.findUnique({
      where: { credentialId: dto.credentialId },
    });
    if (existing) {
      throw new BadRequestException('Passkey credential already registered');
    }

    const passkey = await this.prisma.passkey.create({
      data: {
        userId,
        credentialId: dto.credentialId,
        publicKey: dto.publicKey,
        name: dto.name?.trim() || 'My Passkey',
        deviceType: dto.deviceType || 'platform',
      },
    });

    await this.auditService.log({
      userId,
      action: 'PASSKEY_REGISTERED',
      resourceType: 'passkey',
      resourceId: passkey.id,
    });

    return {
      id: passkey.id,
      name: passkey.name,
      deviceType: passkey.deviceType,
      createdAt: passkey.createdAt,
    };
  }

  /**
   * Delete a passkey.
   */
  async deletePasskey(userId: string, passkeyId: string) {
    const passkey = await this.prisma.passkey.findFirst({
      where: { id: passkeyId, userId },
    });
    if (!passkey) throw new NotFoundException('Passkey not found');

    await this.prisma.passkey.delete({ where: { id: passkeyId } });

    await this.auditService.log({
      userId,
      action: 'PASSKEY_DELETED',
      resourceType: 'passkey',
      resourceId: passkeyId,
    });
  }
}
