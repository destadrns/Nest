import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract current authenticated user from request.
 * Usage: @CurrentUser() user  OR  @CurrentUser('id') userId
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return null;
    if (field) return user[field];
    return user;
  },
);
