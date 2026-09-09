import {
    IsString,
    IsOptional,
    IsEnum,
    MaxLength,
    MinLength,
    Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { ProjectStatus } from '@generated/prisma';
import { PaginationQueryDto } from '@database/dtos/pagination.dto';

export class CreateProjectDto {
    @ApiProperty({ example: 'Client Alpha Portal' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @ApiProperty({ example: 'CAP', description: 'Short unique code (uppercase, 2-6 chars)' })
    @IsString()
    @Matches(/^[A-Z0-9]{2,6}$/, { message: 'code must be 2-6 uppercase letters/digits' })
    code: string;

    @ApiPropertyOptional({ example: 'External client project for portal rebuild' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ example: '#3B82F6', description: 'Hex color code' })
    @IsString()
    @IsOptional()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color' })
    color?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
    @ApiPropertyOptional({ enum: ProjectStatus })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;
}

export class ProjectQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ProjectStatus })
    @IsEnum(ProjectStatus)
    @IsOptional()
    status?: ProjectStatus;
}