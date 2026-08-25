import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    familyId: string,
    dto: CreateAccountDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const account = await this.prisma.account.create({
      data: {
        familyId,
        name: dto.name.trim(),
        type: dto.type,
        currency: dto.currency ?? 'USD',
        institution: dto.institution?.trim(),
        balance: BigInt(dto.initialBalance ?? 0),
        createdBy: userId,
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'ACCOUNT_CREATED',
      resourceType: 'account',
      resourceId: account.id,
      metadata: { name: dto.name, type: dto.type },
      ipAddress,
      userAgent,
    });

    return this.serializeAccount(account);
  }

  async findAllByFamily(familyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { familyId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return accounts.map(this.serializeAccount);
  }

  async findById(familyId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, familyId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Account not found');
    return this.serializeAccount(account);
  }

  async update(
    familyId: string,
    accountId: string,
    dto: UpdateAccountDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Verify account belongs to family
    const existing = await this.prisma.account.findFirst({
      where: { id: accountId, familyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Account not found');

    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.institution !== undefined && { institution: dto.institution?.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'ACCOUNT_UPDATED',
      resourceType: 'account',
      resourceId: accountId,
      metadata: dto as Record<string, unknown>,
      ipAddress,
      userAgent,
    });

    return this.serializeAccount(account);
  }

  async softDelete(
    familyId: string,
    accountId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.account.findFirst({
      where: { id: accountId, familyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Account not found');

    await this.prisma.account.update({
      where: { id: accountId },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'ACCOUNT_DELETED',
      resourceType: 'account',
      resourceId: accountId,
      ipAddress,
      userAgent,
    });
  }

  /** Convert BigInt balance to number for JSON serialization */
  private serializeAccount(account: any) {
    return {
      ...account,
      balance: Number(account.balance),
    };
  }
}
