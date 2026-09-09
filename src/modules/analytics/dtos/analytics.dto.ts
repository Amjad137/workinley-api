import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus, ReviewAction } from '@generated/prisma';
import { PaginationQueryDto } from '@database/dtos/pagination.dto';

export class WeekQueryDto {
    @ApiPropertyOptional({ example: 36, description: 'ISO week number (1-53)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(53)
    weekNumber?: number;

    @ApiPropertyOptional({ example: 2025, description: 'Year (e.g. 2025)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2000)
    year?: number;
}

export class ComplianceQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ example: 36, description: 'ISO week number (1-53)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(53)
    weekNumber?: number;

    @ApiPropertyOptional({ example: 2025, description: 'Year (e.g. 2025)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2000)
    year?: number;
}

export class VelocityQueryDto {
    @ApiPropertyOptional({ example: 2025, description: 'Year for velocity calculation' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2000)
    year?: number;

    @ApiPropertyOptional({ example: 8, description: 'Number of weeks back to include', default: 8 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(52)
    weeksBack?: number;
}

export class ActivityQueryDto {
    @ApiPropertyOptional({ example: 20, description: 'Maximum number of activity items to return', default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}

export interface IDashboardSummary {
    weekNumber: number;
    year: number;
    totalUsers: number;
    totalReports: number;
    submitted: number;
    approved: number;
    needsCorrection: number;
    draft: number;
    notStarted: number;
    complianceRate: number;
    activeBlockers: number;
}

export interface ITaskVelocity {
    weekNumber: number;
    year: number;
    avgPlannedPercent: number;
    avgActualPercent: number;
    totalTasks: number;
}

export interface IHoursDistribution {
    development: number;
    testing: number;
    meetings: number;
    documentation: number;
    other: number;
}

export interface IProjectWorkload {
    project: {
        id: string;
        name: string;
        code: string;
        color: string;
    };
    taskCount: number;
    totalPlannedHours: number;
    totalSpentHours: number;
}

export interface IComplianceMatrixUser {
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    status: ReportStatus | 'NOT_STARTED';
    currentVersion: number;
    submittedAt: Date | null;
}

export interface IActivityFeedItem {
    id: string;
    action: ReviewAction;
    comment: string;
    createdAt: Date;
    reviewer: {
        id: string;
        name: string;
        image: string | null;
    };
    report: {
        id: string;
        weekNumber: number;
        year: number;
        user: {
            id: string;
            name: string;
        };
    };
}
