import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate or use existing correlation ID
    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? randomBytes(8).toString('hex');

    (request as any).correlationId = correlationId;
    response.setHeader('X-Correlation-Id', correlationId);

    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${duration}ms [${correlationId}]`,
          );
        },
        error: () => {
          const duration = Date.now() - start;
          this.logger.warn(`${method} ${url} ERR ${duration}ms [${correlationId}]`);
        },
      }),
    );
  }
}
