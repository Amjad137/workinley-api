import { Response } from 'express';

export interface ApiResponse<T = unknown> {
    error: boolean;
    message: string;
    data?: T;
}

export interface ApiErrorResponse {
    error: true;
    message: string;
    data: {
        message: string;
        statusCode: number;
        timestamp: string;
        path: string;
        errors?: Array<{
            property: string;
            message: string;
        }>;
    };
}

export interface ApiSuccessResponse<T = unknown> {
    error: false;
    message: string;
    data: T;
}

/** Express Response augmented with a captured body (used for response logging). */
export interface ResponseWithBody extends Response {
    body?: unknown;
}
