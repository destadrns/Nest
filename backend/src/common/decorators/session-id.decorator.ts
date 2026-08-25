import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract session ID from request (set by AuthGuard).
 */
export const SessionId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.sessionId;
});
