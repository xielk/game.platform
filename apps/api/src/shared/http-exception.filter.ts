import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response, Request } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const requestId = randomUUID();
    if (status >= 500) console.error(`[${requestId}] ${request.method} ${request.url}`, exception instanceof Error ? exception.message : exception);
    response.status(status).json({ statusCode: status, message: typeof detail === 'string' ? detail : (detail as any).message, path: request.url, requestId, timestamp: new Date().toISOString() });
  }
}
