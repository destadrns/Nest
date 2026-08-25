import { SetMetadata } from '@nestjs/common';
import { FamilyRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify minimum role required for a route.
 * Works with RolesGuard. Use role hierarchy — specifying MEMBER
 * also allows ADMIN and OWNER.
 *
 * @example @Roles(FamilyRole.ADMIN) — only ADMIN and OWNER
 * @example @Roles(FamilyRole.VIEWER) — any family member
 */
export const Roles = (...roles: FamilyRole[]) => SetMetadata(ROLES_KEY, roles);
