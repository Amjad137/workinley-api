import { Injectable } from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class MessageService {
    setValidationMessage(errors: ValidationError[]): string[] {
        const messages: string[] = [];

        for (const error of errors) {
            if (error.constraints) {
                messages.push(...Object.values(error.constraints));
            }

            if (error.children && error.children.length > 0) {
                messages.push(...this.setValidationMessage(error.children));
            }
        }

        return messages;
    }
}
