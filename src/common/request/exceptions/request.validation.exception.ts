import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class RequestValidationException extends HttpException {
    readonly httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly statusCode: number = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super('request.validation', HttpStatus.UNPROCESSABLE_ENTITY);

        this.errors = errors;
    }
}
