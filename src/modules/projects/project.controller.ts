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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto, ProjectQueryDto, UpdateProjectDto } from './dtos/project.dto';
import { RolesGuard } from '@auth';
import { Roles, Role } from '@common/decorators/roles.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }

    /** List all projects - authenticated users can read the list for dropdowns */
    @Get()
    @ApiOperation({ summary: 'List all projects (paginated)' })
    findAll(@Query() query: ProjectQueryDto) {
        return this.projectService.findAll(query);
    }

    /** Full list of active projects for dropdowns (no pagination) */
    @Get('active')
    @ApiOperation({ summary: 'List all active projects (no pagination)' })
    findActive() {
        return this.projectService.findAllActive();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single project by ID' })
    findOne(@Param('id') id: string) {
        return this.projectService.findById(id);
    }

    @Roles(Role.MANAGER, Role.ADMIN)
    @UseGuards(RolesGuard)
    @Post()
    @ApiOperation({ summary: 'Create a new project (Manager/Admin only)' })
    create(@Body() dto: CreateProjectDto) {
        return this.projectService.create(dto);
    }

    @Roles(Role.MANAGER, Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch(':id')
    @ApiOperation({ summary: 'Update a project (Manager/Admin only)' })
    update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
        return this.projectService.update(id, dto);
    }

    @Roles(Role.MANAGER, Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch(':id/archive')
    @ApiOperation({ summary: 'Archive a project (Manager/Admin only)' })
    archive(@Param('id') id: string) {
        return this.projectService.archive(id);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a project permanently (Admin only)' })
    remove(@Param('id') id: string) {
        return this.projectService.remove(id);
    }
}
