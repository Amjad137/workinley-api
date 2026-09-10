import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { STATUS_CODES } from 'http';
import { ApiErrorResponse } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma';

@Catch()
export class AppGlobalFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppGlobalFilter.name);

    constructor(private readonly configService: ConfigService) {}

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Handle RequestValidationException (validation errors)
        if (exception instanceof RequestValidationException) {
            this.handleValidationException(exception, request, response);
            return;
        }

        // Handle HttpException instances
        if (exception instanceof HttpException) {
            this.handleHttpException(exception, request, response);
            return;
        }

        // Handle Prisma Known Request Errors
        if (
            exception instanceof Prisma.PrismaClientKnownRequestError ||
            (exception && typeof exception === 'object' && 'code' in exception && String((exception as any).code).startsWith('P'))
        ) {
            this.handlePrismaError(exception as Prisma.PrismaClientKnownRequestError, request, response);
            return;
        }

        // Handle generic errors (transformation errors, etc.)
        if (exception instanceof Error) {
            this.handleGenericError(exception, request, response);
            return;
        }

        // Fallback for unknown exceptions
        this.handleUnknownError(exception, request, response);
    }

    private handleValidationException(
        exception: RequestValidationException,
        request: Request,
        response: Response,
    ): void {
        const errors = exception.errors.map(error => ({
            property: error.property,
            message:
                Object.values(error.constraints || {})[0] ||
                `${error.property} is invalid`,
        }));

        const httpStatusText = this.getHttpStatusText(exception.httpStatus);

        const validationResponse: ApiErrorResponse = {
            error: true,
            message: httpStatusText,
            data: {
                message: 'Validation errors.',
                statusCode: exception.statusCode,
                timestamp: new Date().toISOString(),
                path: request.path,
                errors: errors,
            },
        };

        response.status(exception.httpStatus).json(validationResponse);
    }

    private handleHttpException(
        exception: HttpException,
        request: Request,
        response: Response,
    ): void {
        const statusHttp = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        let message = 'Internal server error';
        let statusCode = statusHttp;

        // Extract custom message if available
        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        } else if (
            typeof exceptionResponse === 'object' &&
            exceptionResponse !== null
        ) {
            const resp = exceptionResponse as {
                message?: string | string[];
                statusCode?: number;
            };
            if (typeof resp.message === 'string') {
                message = resp.message;
            } else if (Array.isArray(resp.message)) {
                message = resp.message.join(', ');
            }
            if (typeof resp.statusCode === 'number') {
                statusCode = resp.statusCode;
            }
        }

        // Get HTTP status text for the main message
        const httpStatusText = this.getHttpStatusText(statusHttp);

        const responseBody: ApiErrorResponse = {
            error: true,
            message: httpStatusText,
            data: {
                message: message,
                statusCode,
                timestamp: new Date().toISOString(),
                path: request.path,
            },
        };

        response.status(statusHttp).json(responseBody);
    }

    private handlePrismaError(
        exception: Prisma.PrismaClientKnownRequestError | { code: string; meta?: any; message?: string },
        request: Request,
        response: Response,
    ): void {
        let statusCode = HttpStatus.BAD_REQUEST;
        let message = 'Database operation failed';

        if (exception.code === 'P2002') {
            statusCode = HttpStatus.CONFLICT;
            const target = (exception as any).meta?.target;
            const targetStr = Array.isArray(target) ? target.join(', ') : String(target || '');
            const constraint =
                (exception as any).meta?.driverAdapterError?.message ||
                exception.message ||
                '';

            if (
                targetStr.includes('phoneNumber') ||
                constraint.includes('phoneNumber') ||
                constraint.includes('users_phoneNumber_key')
            ) {
                message = 'Phone number already exists';
            } else if (
                targetStr.includes('email') ||
                constraint.includes('email') ||
                constraint.includes('users_email_key')
            ) {
                message = 'Email already exists';
            } else if (targetStr) {
                message = `${targetStr} already exists`;
            } else {
                message = 'A record with this value already exists';
            }
        } else if (exception.code === 'P2025') {
            statusCode = HttpStatus.NOT_FOUND;
            message = 'Record not found';
        }

        const httpStatusText = this.getHttpStatusText(statusCode);

        const responseBody: ApiErrorResponse = {
            error: true,
            message: httpStatusText,
            data: {
                message,
                statusCode,
                timestamp: new Date().toISOString(),
                path: request.path,
            },
        };

        response.status(statusCode).json(responseBody);
        this.logger.warn(`${request.method} ${request.path} [Prisma ${exception.code}]: ${message}`);
    }

    private handleGenericError(
        exception: Error,
        request: Request,
        response: Response,
    ): void {
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = exception.message;

        // Handle specific error types
        if (
            exception.message.includes('BSONError') ||
            exception.message.includes('ObjectId')
        ) {
            statusCode = HttpStatus.BAD_REQUEST;
            message = 'Invalid ObjectId format provided';
        } else if (
            exception.message.includes('P2002') ||
            exception.message.includes('Unique constraint failed')
        ) {
            statusCode = HttpStatus.CONFLICT;
            if (
                exception.message.includes('phoneNumber') ||
                exception.message.includes('users_phoneNumber_key')
            ) {
                message = 'Phone number already exists';
            } else if (
                exception.message.includes('email') ||
                exception.message.includes('users_email_key')
            ) {
                message = 'Email already exists';
            } else {
                message = 'A record with this value already exists';
            }
        }

        const httpStatusText = this.getHttpStatusText(statusCode);

        const responseBody: ApiErrorResponse = {
            error: true,
            message: httpStatusText,
            data: {
                message: message,
                statusCode,
                timestamp: new Date().toISOString(),
                path: request.path,
            },
        };

        response.status(statusCode).json(responseBody);

        // Log the error for debugging
        this.logger.error(`${request.method} ${request.path}`, exception.stack);
    }

    private handleUnknownError(
        exception: unknown,
        request: Request,
        response: Response,
    ): void {
        const responseBody: ApiErrorResponse = {
            error: true,
            message: 'Internal Server Error',
            data: {
                message: 'An unexpected error occurred',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                timestamp: new Date().toISOString(),
                path: request.path,
            },
        };

        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(responseBody);

        this.logger.error(`${request.method} ${request.path}`, exception);
    }

    private getHttpStatusText(statusCode: number): string {
        return STATUS_CODES[statusCode] || 'Error';
    }
}
