import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ReportService } from './report.service';
import {
    CreateReportDto,
    UpdateReportDto,
    ReportQueryDto,
    ReviewCommentDto,
    RequestChangesDto,
} from './dtos/report.dto';
import { RolesGuard } from '@auth';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@generated/prisma';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    // ── Team Member endpoints ─────────────────────────────────────────────────

    @Get('my')
    @ApiOperation({ summary: 'Get my own reports (Team Member)' })
    findMyReports(@CurrentUser() user: User, @Query() query: ReportQueryDto) {
        return this.reportService.findMyReports(user.id, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single report by ID (owner or manager)' })
    findOne(@Param('id') id: string, @CurrentUser() user: User) {
        return this.reportService.findById(id, user);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new weekly report draft' })
    create(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
        return this.reportService.create(user.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a draft or needs-correction report' })
    update(
        @Param('id') id: string,
        @CurrentUser() user: User,
        @Body() dto: UpdateReportDto,
    ) {
        return this.reportService.update(id, user, dto);
    }

    @Post(':id/submit')
    @ApiOperation({ summary: 'Submit or re-submit report for review' })
    submit(@Param('id') id: string, @CurrentUser() user: User) {
        return this.reportService.submit(id, user);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a draft report' })
    remove(@Param('id') id: string, @CurrentUser() user: User) {
        return this.reportService.remove(id, user);
    }

    // ── Manager / Admin endpoints ─────────────────────────────────────────────

    @Roles(Role.MANAGER, Role.ADMIN)
    @UseGuards(RolesGuard)
    @Get('manager/all')
    @ApiOperation({ summary: 'List all team reports (Manager/Admin)' })
    findAll(@Query() query: ReportQueryDto) {
        return this.reportService.findAllReports(query);
    }

    @Roles(Role.MANAGER, Role.ADMIN)
    @UseGuards(RolesGuard)
    @Post('manager/:id/approve')
    @ApiOperation({ summary: 'Approve a submitted report (Manager/Admin)' })
    approve(
        @Param('id') id: string,
        @CurrentUser() reviewer: User,
        @Body() body: ReviewCommentDto,
    ) {
        return this.reportService.approve(id, reviewer, body.comment);
    }

    @Roles(Role.MANAGER, Role.ADMIN)
    @UseGuards(RolesGuard)
    @Post('manager/:id/request-changes')
    @ApiOperation({ summary: 'Request changes on a submitted report (Manager/Admin)' })
    requestChanges(
        @Param('id') id: string,
        @CurrentUser() reviewer: User,
        @Body() body: RequestChangesDto,
    ) {
        return this.reportService.requestChanges(id, reviewer, body.comment);
    }
}
