import {
    IsString,
    IsOptional,
    IsEnum,
    IsInt,
    IsNumber,
    IsBoolean,
    Min,
    Max,
    MaxLength,
    IsArray,
    ValidateNested,
    IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    HoursCategory,
    ReportStatus,
    TaskPriority,
    TaskStatus,
} from '@generated/prisma';
import { PaginationQueryDto } from '@database/dtos/pagination.dto';

// Task (This Week)
export class CreateReportTaskDto {
    @ApiProperty({ example: 'Implement login API' })
    @IsString()
    @MaxLength(300)
    name: string;

    @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
    @IsEnum(TaskPriority)
    @IsOptional()
    priority?: TaskPriority;

    @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.IN_PROGRESS })
    @IsEnum(TaskStatus)
    @IsOptional()
    status?: TaskStatus;

    @ApiPropertyOptional({ example: 80, description: 'Planned completion % (0-100)' })
    @IsInt()
    @Min(0)
    @Max(100)
    @IsOptional()
    plannedCompletionPercent?: number;

    @ApiPropertyOptional({ example: 70, description: 'Actual completion % (0-100)' })
    @IsInt()
    @Min(0)
    @Max(100)
    @IsOptional()
    actualCompletionPercent?: number;

    @ApiPropertyOptional({ example: 8.0, description: 'Planned hours' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    plannedHours?: number;

    @ApiPropertyOptional({ example: 6.5, description: 'Actual hours spent' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    actualHours?: number;

    @ApiPropertyOptional({ example: 'https://github.com/org/repo/pull/42' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    deliverable?: string;

    @ApiPropertyOptional({ description: 'Project ID to tag this task' })
    @IsString()
    @IsOptional()
    projectId?: string;

    @ApiPropertyOptional({ example: 0, description: 'Display order' })
    @IsInt()
    @IsOptional()
    orderIndex?: number;

    // Backward-compatibility aliases
    @IsOptional()
    @IsInt()
    plannedPercent?: number;

    @IsOptional()
    @IsInt()
    actualPercent?: number;

    @IsOptional()
    @IsNumber()
    spentHours?: number;
}

// Planned Task (Next Week)
export class CreatePlannedTaskDto {
    @ApiProperty({ example: 'Implement checkout workflow' })
    @IsString()
    @MaxLength(300)
    name: string;

    @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
    @IsEnum(TaskPriority)
    @IsOptional()
    priority?: TaskPriority;

    @ApiPropertyOptional({ example: 10.0, description: 'Planned hours' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    plannedHours?: number;

    @ApiPropertyOptional({ description: 'Project ID for this planned task' })
    @IsString()
    @IsOptional()
    projectId?: string;

    @ApiPropertyOptional({ example: 0, description: 'Display order' })
    @IsInt()
    @IsOptional()
    orderIndex?: number;
}

// Blocker
export class CreateBlockerDto {
    @ApiProperty({ example: 'Waiting on design approval from client' })
    @IsString()
    @MaxLength(500)
    description: string;

    @ApiPropertyOptional({ example: true, description: 'Flag as key issue of the week' })
    @IsBoolean()
    @IsOptional()
    isKeyIssue?: boolean;

    // Backward-compatibility alias
    @IsOptional()
    @IsBoolean()
    isKeyBlocker?: boolean;

    @ApiPropertyOptional({ example: 0 })
    @IsInt()
    @IsOptional()
    orderIndex?: number;
}

// Achievemen
export class CreateAchievementDto {
    @ApiProperty({ example: 'Successfully shipped the auth module ahead of schedule' })
    @IsString()
    @MaxLength(500)
    description: string;

    @ApiPropertyOptional({ example: true, description: 'Flag as key achievement of the week' })
    @IsBoolean()
    @IsOptional()
    isKeyAchievement?: boolean;

    @ApiPropertyOptional({ example: 0 })
    @IsInt()
    @IsOptional()
    orderIndex?: number;
}

// Hours Entry
export class CreateReportHoursDto {
    @ApiProperty({ enum: HoursCategory })
    @IsEnum(HoursCategory)
    category: HoursCategory;

    @ApiProperty({ example: 20 })
    @IsNumber()
    @Min(0)
    hours: number;
}

// Backward-compatibility DTO for legacy hours breakdown map
export class HoursBreakdownDto {
    @ApiPropertyOptional({ example: 20, description: 'Hours on development' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    development?: number;

    @ApiPropertyOptional({ example: 5 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    testing?: number;

    @ApiPropertyOptional({ example: 4 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    meetings?: number;

    @ApiPropertyOptional({ example: 2 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    documentation?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    other?: number;
}

// Create Report
export class CreateReportDto {
    @ApiProperty({ example: '2025-09-01', description: 'ISO date string for week start (Monday)' })
    @IsDateString()
    weekStartDate: string;

    @ApiProperty({ example: '2025-09-07', description: 'ISO date string for week end (Sunday)' })
    @IsDateString()
    weekEndDate: string;

    @ApiProperty({ example: 36 })
    @IsInt()
    weekNumber: number;

    @ApiProperty({ example: 2025 })
    @IsInt()
    year: number;

    @ApiPropertyOptional({ description: 'Primary project ID for this week' })
    @IsString()
    @IsOptional()
    projectId?: string;

    @ApiPropertyOptional({ example: 'Notes on weekly progress' })
    @IsString()
    @IsOptional()
    @MaxLength(3000)
    notes?: string;

    @ApiPropertyOptional({ example: ['https://jira.company.com/browse/PROJ-123'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    links?: string[];

    @ApiPropertyOptional({ type: [CreateReportTaskDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateReportTaskDto)
    @IsOptional()
    tasks?: CreateReportTaskDto[];

    @ApiPropertyOptional({ type: [CreatePlannedTaskDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePlannedTaskDto)
    @IsOptional()
    plannedTasks?: CreatePlannedTaskDto[];

    @ApiPropertyOptional({ type: [CreateBlockerDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateBlockerDto)
    @IsOptional()
    blockers?: CreateBlockerDto[];

    @ApiPropertyOptional({ type: [CreateAchievementDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAchievementDto)
    @IsOptional()
    achievements?: CreateAchievementDto[];

    @ApiPropertyOptional({ type: [CreateReportHoursDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateReportHoursDto)
    @IsOptional()
    hoursEntries?: CreateReportHoursDto[];

    // Backward-compatibility fields
    @ApiPropertyOptional({ type: HoursBreakdownDto })
    @ValidateNested()
    @Type(() => HoursBreakdownDto)
    @IsOptional()
    hoursBreakdown?: HoursBreakdownDto;

    @ApiPropertyOptional({ example: '- Finish unit tests\n- Review PR #45' })
    @IsString()
    @IsOptional()
    @MaxLength(3000)
    nextWeekPlans?: string;
}

// Update Report
export class UpdateReportDto extends CreateReportDto { }

// Query params for listing
export class ReportQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ReportStatus })
    @IsEnum(ReportStatus)
    @IsOptional()
    status?: ReportStatus;

    @ApiPropertyOptional({ example: 2025 })
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    year?: number;

    @ApiPropertyOptional({ example: 36 })
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    weekNumber?: number;

    @ApiPropertyOptional({ description: 'Filter by user ID (managers only)' })
    @IsString()
    @IsOptional()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by project ID' })
    @IsString()
    @IsOptional()
    projectId?: string;
}

export class ReviewCommentDto {
    @ApiPropertyOptional({ example: 'Approved, solid work.' })
    @IsString()
    @IsOptional()
    comment?: string;
}

export class RequestChangesDto {
    @ApiPropertyOptional({ example: 'Please update task deliverable links and re-verify spent hours.' })
    @IsString()
    comment: string;
}

