import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class PresignedUrlRequestDto {
    @ApiProperty({
        description: 'File type/MIME type',
        example: 'image/jpeg',
    })
    @IsString()
    @IsNotEmpty()
    fileType: string;

    @ApiProperty({
        description: 'Folder path in S3 bucket',
        example: 'profile-pictures',
    })
    @IsString()
    @IsNotEmpty()
    folder: string;

    @ApiProperty({
        description: 'Number of keys to generate',
        example: 1,
        minimum: 1,
        maximum: 10,
    })
    @IsNumber()
    @Min(1)
    @Max(10)
    keyCount: number = 1;

    @ApiProperty({
        description: 'Old keys to delete (for replacement)',
        example: ['old-image-key.jpg'],
        required: false,
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    oldKeys?: string[];
}

export class PresignedUrlResponseDto {
    @ApiProperty({
        description: 'S3 object key',
        example: 'profile-pictures/user-123-abc.jpg',
    })
    key: string;

    @ApiProperty({
        description: 'Presigned URL for upload',
        example: 'https://bucket.s3.region.amazonaws.com/key?signature=...',
    })
    presignedUrl: string;
}

export class PublicUploadResponseDto extends PresignedUrlResponseDto {
    @ApiProperty({
        description: 'Public URL to access the uploaded file',
        example:
            'https://bucket.s3.region.amazonaws.com/profile-pictures/user-123-abc.jpg',
    })
    publicUrl: string;
}

export class DeleteFilesRequestDto {
    @ApiProperty({
        description: 'Array of S3 keys to delete',
        example: [
            'profile-pictures/user-123-abc.jpg',
            'posts/post-456-def.jpg',
        ],
    })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    keys: string[];
}

export class FileUrlResponseDto {
    @ApiProperty({
        description: 'File URL',
        example:
            'https://bucket.s3.region.amazonaws.com/profile-pictures/user-123-abc.jpg',
        required: false,
    })
    url?: string;
}
