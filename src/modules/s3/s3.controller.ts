import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { S3Service } from './s3.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import {
    PresignedUrlRequestDto,
    PresignedUrlResponseDto,
    PublicUploadResponseDto,
    DeleteFilesRequestDto,
    FileUrlResponseDto,
} from './dtos/s3.dto';

@ApiTags('S3')
@Controller('s3')
@ApiBearerAuth()
export class S3Controller {
    constructor(private readonly s3Service: S3Service) {}

    @AllowAnonymous()
    @Post('public-upload')
    @ApiOperation({
        summary: 'Get presigned URLs for public image uploads',
        description:
            'Generate presigned URLs for uploading public images (profile pictures, post images)',
    })
    @ApiResponse({
        status: 201,
        description: 'Presigned URLs generated successfully',
        type: [PublicUploadResponseDto],
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request data',
    })
    async getPublicUploadUrls(
        @Body() request: PresignedUrlRequestDto,
    ): Promise<PublicUploadResponseDto[]> {
        return this.s3Service.generatePublicUploadUrls(request);
    }

    @Post('protected-upload')
    @ApiOperation({
        summary: 'Get presigned URLs for secure file uploads',
        description:
            'Generate presigned URLs for uploading secure/private files',
    })
    @ApiResponse({
        status: 201,
        description: 'Presigned URLs generated successfully',
        type: [PresignedUrlResponseDto],
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request data',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getSecureUploadUrls(
        @Body() request: PresignedUrlRequestDto,
    ): Promise<PresignedUrlResponseDto[]> {
        return this.s3Service.generateSecureUploadUrls(request);
    }

    @Delete('files')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete files from S3',
        description: 'Delete multiple files from S3 bucket using their keys',
    })
    @ApiResponse({
        status: 204,
        description: 'Files deleted successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request data',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async deleteFiles(@Body() request: DeleteFilesRequestDto): Promise<void> {
        await this.s3Service.deleteFiles(request.keys);
    }

    @Get('file-url/:key')
    @ApiOperation({
        summary: 'Get file URL',
        description: 'Get the public URL for a file stored in S3',
    })
    @ApiResponse({
        status: 200,
        description: 'File URL retrieved successfully',
        type: FileUrlResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: 404,
        description: 'File not found',
    })
    async getFileUrl(
        @Param('key') key: string,
        @Query('secure') isSecure: boolean = false,
    ): Promise<FileUrlResponseDto> {
        const exists = await this.s3Service.fileExists(key);

        if (!exists) {
            return { url: undefined };
        }

        const url = isSecure
            ? undefined // For secure files, we don't return public URLs
            : this.s3Service.getPublicUrl(key);

        return { url };
    }
}
