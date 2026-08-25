import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the family member's membership from request (set by RolesGuard).
 */
export const CurrentFamilyMember = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const member = request.familyMember;
    if (!member) return null;
    if (field) return member[field];
    return member;
  },
);
