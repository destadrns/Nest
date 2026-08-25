import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(familyId: string, dto: CreateCategoryDto, userId: string) {
    // Check duplicate name within family
    const existing = await this.prisma.category.findFirst({
      where: { familyId, name: dto.name.trim(), type: dto.type },
    });
    if (existing) throw new ConflictException('Category with this name already exists');

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: {
          id: dto.parentId,
          OR: [{ familyId }, { familyId: null, isSystem: true }],
        },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const category = await this.prisma.category.create({
      data: {
        familyId,
        name: dto.name.trim(),
        type: dto.type,
        parentId: dto.parentId,
        icon: dto.icon,
        color: dto.color,
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'CATEGORY_CREATED',
      resourceType: 'category',
      resourceId: category.id,
    });

    return category;
  }

  async findAllByFamily(familyId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ familyId }, { familyId: null, isSystem: true }],
      },
      include: { children: true },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async update(familyId: string, categoryId: string, dto: UpdateCategoryDto, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, familyId },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.isSystem) throw new ConflictException('Cannot modify system categories');

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'CATEGORY_UPDATED',
      resourceType: 'category',
      resourceId: categoryId,
    });

    return updated;
  }

  async delete(familyId: string, categoryId: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, familyId },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.isSystem) throw new ConflictException('Cannot delete system categories');

    // Check if category has transactions
    const txCount = await this.prisma.transaction.count({
      where: { categoryId, deletedAt: null },
    });
    if (txCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ${txCount} existing transactions. Reassign them first.`,
      );
    }

    await this.prisma.category.delete({ where: { id: categoryId } });

    await this.auditService.log({
      familyId,
      userId,
      action: 'CATEGORY_DELETED',
      resourceType: 'category',
      resourceId: categoryId,
    });
  }
}
