import {
    Controller,
    Get,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '@modules/user/user.service';
import {
    UpdateUserDto,
    UserCountQueryDto,
    UserQueryDto,
    UserResponseDto,
    VerifyUsersDto,
} from '@modules/user/dtos/user.dto';
import { IPaginationResult } from '@database/interfaces/database.interface';
import { RolesGuard } from '@auth';
import { Roles, Role } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@generated/prisma';

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: 200,
        description: 'Profile retrieved successfully',
        type: UserResponseDto,
    })
    async getMe(@CurrentUser() user: User): Promise<UserResponseDto> {
        return this.userService.findById(user.id);
    }

    @Patch('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({
        status: 200,
        description: 'Profile updated successfully',
        type: UserResponseDto,
    })
    async updateProfile(
        @CurrentUser() user: User,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(user.id, updateUserDto);
    }

    @Get('count')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get total active users count' })
    @ApiResponse({ status: 200, description: 'Count retrieved successfully' })
    async count(@Query() query: UserCountQueryDto): Promise<number> {
        return this.userService.count(query.role);
    }

    // ADMIN ONLY ROUTES
    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch('verify')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update verification status for multiple users (admin only)' })
    @ApiResponse({ status: 200, description: 'Verification updated successfully' })
    async verifyUsers(
        @Body() verifyUsersDto: VerifyUsersDto,
    ): Promise<{ message: string; verifiedProfileIDs: string[] }> {
        return this.userService.verifyUsers(verifyUsersDto);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users with pagination (admin only)' })
    @ApiResponse({
        status: 200,
        description: 'Users retrieved successfully',
    })
    async findAll(
        @Query() query: UserQueryDto,
    ): Promise<IPaginationResult<UserResponseDto>> {
        return this.userService.findAll(query);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Get('admin/all')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users with pagination (admin only)' })
    async findAllAdmin(
        @Query() query: UserQueryDto,
    ): Promise<IPaginationResult<UserResponseDto>> {
        return this.userService.findAll(query);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Get('admin/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user by ID (admin only)' })
    @ApiResponse({
        status: 200,
        description: 'User retrieved successfully',
        type: UserResponseDto,
    })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOneAdmin(@Param('id') id: string): Promise<UserResponseDto> {
        return this.userService.findById(id);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user by ID (admin only)' })
    @ApiResponse({
        status: 200,
        description: 'User retrieved successfully',
        type: UserResponseDto,
    })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: string): Promise<UserResponseDto> {
        return this.userService.findById(id);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch('admin/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update any user (admin only)' })
    @ApiResponse({
        status: 200,
        description: 'User updated successfully',
        type: UserResponseDto,
    })
    @ApiResponse({ status: 404, description: 'User not found' })
    async updateAdmin(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(id, updateUserDto);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update any user (admin only)' })
    @ApiResponse({
        status: 200,
        description: 'User updated successfully',
        type: UserResponseDto,
    })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(id, updateUserDto);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Delete('admin/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete user (admin only)' })
    @ApiResponse({ status: 204, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async removeAdmin(@Param('id') id: string): Promise<void> {
        return this.userService.remove(id);
    }

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete user (admin only)' })
    @ApiResponse({ status: 204, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async remove(@Param('id') id: string): Promise<void> {
        return this.userService.remove(id);
    }
}
