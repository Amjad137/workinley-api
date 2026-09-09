import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
    PresignedUrlRequestDto,
    PresignedUrlResponseDto,
    PublicUploadResponseDto,
} from './dtos/s3.dto';

@Injectable()
export class S3Service {
    private readonly logger = new Logger(S3Service.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly region: string;
    private readonly baseUrl: string;
    private readonly presignExpired: number;

    constructor(private readonly configService: ConfigService) {
        const awsConfig = this.configService.get('aws');

        this.bucketName = awsConfig.s3.bucket;
        this.region = awsConfig.s3.region;
        this.baseUrl = awsConfig.s3.baseUrl;
        this.presignExpired = awsConfig.s3.presignExpired;

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: awsConfig.s3.credential.key,
                secretAccessKey: awsConfig.s3.credential.secret,
            },
        });

        this.logger.log('S3Service initialized');
    }

    /**
     * Generate presigned URLs for public uploads
     */
    async generatePublicUploadUrls(
        request: PresignedUrlRequestDto,
    ): Promise<PublicUploadResponseDto[]> {
        const { fileType, folder, keyCount, oldKeys } = request;

        // Delete old keys if provided
        if (oldKeys && oldKeys.length > 0) {
            await this.deleteFiles(oldKeys);
        }

        const results: PublicUploadResponseDto[] = [];

        for (let i = 0; i < keyCount; i++) {
            const key = this.generateKey(folder, fileType);
            const presignedUrl = await this.generatePresignedUrl(key, fileType);
            const publicUrl = this.getPublicUrl(key);

            results.push({
                key,
                presignedUrl,
                publicUrl,
            });
        }

        this.logger.log(
            `Generated ${keyCount} presigned URLs for folder: ${folder}`,
        );
        return results;
    }

    /**
     * Generate presigned URLs for secure uploads (for future use)
     */
    async generateSecureUploadUrls(
        request: PresignedUrlRequestDto,
    ): Promise<PresignedUrlResponseDto[]> {
        const { fileType, folder, keyCount, oldKeys } = request;

        // Delete old keys if provided
        if (oldKeys && oldKeys.length > 0) {
            await this.deleteFiles(oldKeys);
        }

        const results: PresignedUrlResponseDto[] = [];

        for (let i = 0; i < keyCount; i++) {
            const key = this.generateKey(folder, fileType);
            const presignedUrl = await this.generatePresignedUrl(key, fileType);

            results.push({
                key,
                presignedUrl,
            });
        }

        this.logger.log(
            `Generated ${keyCount} secure presigned URLs for folder: ${folder}`,
        );
        return results;
    }

    /**
     * Delete files from S3
     */
    async deleteFiles(keys: string[]): Promise<void> {
        const deletePromises = keys.map(async key => {
            try {
                const command = new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                });
                await this.s3Client.send(command);
                this.logger.log(`Deleted file: ${key}`);
            } catch (error) {
                this.logger.error(`Failed to delete file ${key}:`, error);
                // Don't throw error for individual file deletion failures
            }
        });

        await Promise.all(deletePromises);
        this.logger.log(`Completed deletion of ${keys.length} files`);
    }

    /**
     * Get public URL for a file
     */
    getPublicUrl(key: string): string {
        return `${this.baseUrl}/${key}`;
    }

    /**
     * Check if file exists in S3
     */
    async fileExists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Generate a unique key for the file
     */
    private generateKey(folder: string, fileType: string): string {
        const timestamp = Date.now();
        const uuid = uuidv4().substring(0, 8);
        const extension = this.getFileExtension(fileType);
        return `${folder}/${timestamp}-${uuid}${extension}`;
    }

    /**
     * Generate presigned URL for upload
     */
    private async generatePresignedUrl(
        key: string,
        fileType: string,
    ): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: fileType,
        });

        return await getSignedUrl(this.s3Client, command, {
            expiresIn: this.presignExpired,
        });
    }

    /**
     * Get file extension from MIME type
     */
    private getFileExtension(fileType: string): string {
        const extensions: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
            'application/pdf': '.pdf',
            'text/plain': '.txt',
        };

        return extensions[fileType] || '.bin';
    }
}
