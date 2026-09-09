import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@generated/prisma';
import { PaginationQueryDto } from '@database/dtos/pagination.dto';

export enum InvitationStatusFilter {
    ALL = 'ALL',
    PENDING = 'PENDING',
    USED = 'USED',
    EXPIRED = 'EXPIRED',
}

export class CreateInvitationDto {
    @ApiProperty({ example: 'colleague@example.com', description: 'Email address to invite' })
    @IsEmail({}, { message: 'Must be a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER, description: 'Role assigned upon signup' })
    @IsEnum(UserRole, { message: 'Role must be USER, MANAGER, or ADMIN' })
    @IsOptional()
    role?: UserRole = UserRole.USER;
}

export class InvitationQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: UserRole, description: 'Filter by assigned role' })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @ApiPropertyOptional({ enum: InvitationStatusFilter, description: 'Filter by status: PENDING, USED, EXPIRED, or ALL' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Alias for search keyword' })
    @IsOptional()
    @IsString()
    search_key?: string;
}

export class ValidateInvitationDto {
    @ApiProperty({ description: 'Invitation code from link' })
    @IsString()
    @IsNotEmpty()
    code: string;
}
