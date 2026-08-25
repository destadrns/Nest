import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown[];
  correlationId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = (request as any).correlationId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = {
      statusCode: status,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      correlationId,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        body = {
          statusCode: status,
          error: this.statusToErrorCode(status),
          message: exResponse,
          correlationId,
        };
      } else if (typeof exResponse === 'object') {
        const obj = exResponse as Record<string, unknown>;
        body = {
          statusCode: status,
          error: this.statusToErrorCode(status),
          message: (obj['message'] as string) ?? 'Error',
          details: Array.isArray(obj['message']) ? (obj['message'] as unknown[]) : undefined,
          correlationId,
        };
      }
    } else {
      // Unknown error — log full details server-side, return message
      const errMessage = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
      body.message = errMessage;
    }

    response.status(status).json(body);
  }

  private statusToErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'AUTHENTICATION_ERROR',
      403: 'AUTHORIZATION_ERROR',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'BUSINESS_RULE_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }
}
