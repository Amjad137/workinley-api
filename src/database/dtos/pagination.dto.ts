import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsDateString, IsEnum } from 'class-validator';
import { ENTITY_SORT, IPaginationQuery } from '@database/interfaces/database.interface';

export class PaginationQueryDto implements IPaginationQuery {
    @ApiPropertyOptional({
        description: 'Page number',
        minimum: 1,
        default: 1,
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Search term to filter results',
        example: 'john',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Field to sort by',
        example: 'createdAt',
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: ENTITY_SORT,
        default: ENTITY_SORT.DESC,
        example: ENTITY_SORT.DESC,
    })
    @IsOptional()
    @IsEnum(ENTITY_SORT)
    sortOrder?: ENTITY_SORT = ENTITY_SORT.DESC;

    @ApiPropertyOptional({
        description: 'Filter records created on or after this ISO date string',
        example: '2025-01-01T00:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    createdFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter records created on or before this ISO date string',
        example: '2025-12-31T23:59:59.999Z',
    })
    @IsOptional()
    @IsDateString()
    createdTo?: string;

    @ApiPropertyOptional({
        description: 'Status filter',
        example: 'ACTIVE',
    })
    @IsOptional()
    @IsString()
    status?: string;
}
