import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IPaginationResult } from '@database/interfaces/database.interface';
import { STATUS_CODES } from 'http';
import { ApiSuccessResponse } from '@common/response/interfaces/response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) { }

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiSuccessResponse<unknown>> {
        return next.handle().pipe(
            map(data => {
                const ctx = context.switchToHttp();
                const response = ctx.getResponse();
                const statusCode = response.statusCode || HttpStatus.OK;

                // Get HTTP status text as the main message
                const httpStatusText = this.getHttpStatusText(statusCode);

                // Get custom message from decorator metadata
                const customMessage = this.reflector.get<string>(
                    'response_message',
                    context.getHandler(),
                );

                // If data is already formatted with error field, return as is
                if (data && typeof data === 'object' && 'error' in data) {
                    return data;
                }

                // Handle paginated results (IPaginationResult)
                if (
                    data &&
                    typeof data === 'object' &&
                    'pagination' in data &&
                    'data' in data
                ) {
                    const paginatedData = data as IPaginationResult<unknown>;
                    const paginatedResponseData: {
                        results: unknown[];
                        pagination: IPaginationResult<unknown>['pagination'];
                        message?: string;
                    } = {
                        results: Array.isArray(paginatedData.data)
                            ? paginatedData.data
                            : [],
                        pagination: paginatedData.pagination,
                    };

                    if (customMessage) {
                        paginatedResponseData.message = customMessage;
                    }

                    return {
                        error: false,
                        message: httpStatusText,
                        data: paginatedResponseData,
                    } as ApiSuccessResponse;
                }

                // Prepare response data
                const responseData: Record<string, unknown> = {};

                // Add custom message if provided
                if (customMessage) {
                    responseData.message = customMessage;
                }

                // Handle arrays (simple list without pagination)
                if (Array.isArray(data)) {
                    return {
                        error: false,
                        message: httpStatusText,
                        data: {
                            results: data,
                            pagination: undefined,
                            ...(customMessage
                                ? { message: customMessage }
                                : {}),
                        },
                    } as ApiSuccessResponse;
                } else {
                    // Handle single objects or other data
                    Object.assign(responseData, data);
                }

                return {
                    error: false,
                    message: httpStatusText,
                    data: responseData,
                } as ApiSuccessResponse;
            }),
        );
    }

    private getHttpStatusText(statusCode: number): string {
        return STATUS_CODES[statusCode] || 'OK';
    }
}
