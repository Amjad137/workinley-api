import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from '@auth';
import { Roles, Role } from '@common/decorators/roles.decorator';
import {
    WeekQueryDto,
    ComplianceQueryDto,
    VelocityQueryDto,
    ActivityQueryDto,
} from './dtos/analytics.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Roles(Role.MANAGER, Role.ADMIN)
@UseGuards(RolesGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('summary')
    @ApiOperation({ summary: 'Dashboard KPI summary for a given week' })
    summary(@Query() query: WeekQueryDto) {
        return this.analyticsService.getDashboardSummary(query);
    }

    @Get('velocity')
    @ApiOperation({ summary: 'Task velocity trends (planned vs actual %)' })
    velocity(@Query() query: VelocityQueryDto) {
        return this.analyticsService.getTaskVelocity(query);
    }

    @Get('hours')
    @ApiOperation({ summary: 'Team-wide hours distribution for a week' })
    hours(@Query() query: WeekQueryDto) {
        return this.analyticsService.getHoursDistribution(query);
    }

    @Get('workload')
    @ApiOperation({ summary: 'Workload distribution by project' })
    workload(@Query() query: WeekQueryDto) {
        return this.analyticsService.getProjectWorkload(query);
    }

    @Get('compliance')
    @ApiOperation({ summary: 'Team submission compliance matrix' })
    compliance(@Query() query: ComplianceQueryDto) {
        return this.analyticsService.getComplianceMatrix(query);
    }

    @Get('blockers')
    @ApiOperation({ summary: 'All team blockers for a week' })
    blockers(@Query() query: WeekQueryDto) {
        return this.analyticsService.getTeamBlockers(query);
    }

    @Get('activity')
    @ApiOperation({ summary: 'Recent review activity feed' })
    activity(@Query() query: ActivityQueryDto) {
        return this.analyticsService.getActivityFeed(query);
    }

    @Get('member/:userId')
    @ApiOperation({ summary: 'Individual member stats and history' })
    memberStats(@Param('userId') userId: string) {
        return this.analyticsService.getMemberStats(userId);
    }
}
