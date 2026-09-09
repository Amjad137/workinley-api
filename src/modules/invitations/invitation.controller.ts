import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto, InvitationQueryDto } from './dtos/invitation.dto';
import { RolesGuard } from '@auth';
import { Role, Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@generated/prisma';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationController {
    constructor(private readonly invitationService: InvitationService) {}

    /** Validate an invitation code (public endpoint for signup flow) */
    @AllowAnonymous()
    @Get('validate')
    @ApiOperation({ summary: 'Validate an invitation code for signup' })
    @ApiResponse({ status: 200, description: 'Invitation is valid' })
    @ApiResponse({ status: 400, description: 'Invalid, expired, or used code' })
    validate(@Query('code') code: string) {
        return this.invitationService.validateCode(code);
    }

    /** Create a new invitation (Admin only) */
    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @ApiBearerAuth()
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new user invitation (Admin only)' })
    create(@Body() dto: CreateInvitationDto, @CurrentUser() user: User) {
        return this.invitationService.create(dto, user?.id);
    }

    /** List all invitations with pagination and filters (Admin only) */
    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @ApiBearerAuth()
    @Get()
    @ApiOperation({ summary: 'List all user invitations (Admin only)' })
    findAll(@Query() query: InvitationQueryDto) {
        return this.invitationService.findAll(query);
    }

    /** Resend an invitation - renews expiration and outputs link (Admin only) */
    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @ApiBearerAuth()
    @Post(':id/resend')
    @ApiOperation({ summary: 'Resend an invitation (Admin only)' })
    resend(@Param('id') id: string) {
        return this.invitationService.resend(id);
    }

    /** Revoke / delete an invitation (Admin only) */
    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Revoke an invitation (Admin only)' })
    delete(@Param('id') id: string) {
        return this.invitationService.delete(id);
    }
}
