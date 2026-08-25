import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { FamilyRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { FAMILY_PARAM_KEY } from '../decorators/family-param.decorator';

/**
 * Enforces RBAC at the route level.
 *
 * 1. Reads required roles from @Roles() decorator
 * 2. Extracts familyId from route params (configurable key via @FamilyParam())
 * 3. Looks up user's membership and role in that family
 * 4. Grants or denies access
 *
 * Attaches familyMember to request for downstream use.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<FamilyRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → allow (auth-only route)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Determine which param holds the familyId
    const familyParamKey =
      this.reflector.getAllAndOverride<string>(FAMILY_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'familyId';

    const familyId = request.params[familyParamKey];

    if (!familyId) {
      throw new ForbiddenException('Family context required');
    }

    // Look up membership
    const membership = await this.prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: user.id,
          familyId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Check role hierarchy
    const roleHierarchy: Record<FamilyRole, number> = {
      OWNER: 4,
      ADMIN: 3,
      MEMBER: 2,
      VIEWER: 1,
    };

    const userLevel = roleHierarchy[membership.role];
    const minRequired = Math.min(...requiredRoles.map((r) => roleHierarchy[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Attach membership to request for downstream use
    (request as any).familyMember = membership;
    (request as any).familyId = familyId;

    return true;
  }
}
