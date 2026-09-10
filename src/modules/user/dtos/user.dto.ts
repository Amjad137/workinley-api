import {
    IsEmail,
    IsOptional,
    IsString,
    IsPhoneNumber,
    IsArray,
    IsBoolean,
    IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { BaseDto } from '@database/dtos/base.dto';
import { PaginationQueryDto } from '@database/dtos/pagination.dto';
import { UserRole } from '@generated/prisma';

export class UserQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: UserRole, example: UserRole.USER })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}

export class UserCountQueryDto {
    @ApiPropertyOptional({ enum: UserRole, example: UserRole.USER, description: 'Filter count by role' })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}

export class VerifyUsersDto {
    @ApiProperty({ example: ['cuid1', 'cuid2'] })
    @IsArray()
    @IsString({ each: true })
    userIDs: string[];

    @ApiProperty({ example: true })
    @IsBoolean()
    verification: boolean;
}

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'John' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'john@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsPhoneNumber()
    @IsOptional()
    phoneNumber?: string;

    @ApiPropertyOptional({ example: '123 Main St, City, Country' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
    @IsOptional()
    @IsString()
    image?: string;
}

export class UserResponseDto extends PartialType(BaseDto) {
    @ApiProperty({ example: 'john@example.com' })
    email: string;

    @ApiProperty({ example: 'John Doe' })
    name: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    phoneNumber?: string;

    @ApiPropertyOptional({ example: '123 Main St, City, Country' })
    address?: string;

    @ApiProperty({ example: UserRole.USER, enum: UserRole })
    role: UserRole;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
    image?: string;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: false })
    emailVerified: boolean;

    @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
    lastLoginAt?: Date;
}
