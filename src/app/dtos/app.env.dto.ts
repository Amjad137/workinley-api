import {
    IsEnum,
    IsNumber,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ENVIRONMENT {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
    TEST = 'test',
}

export class AppEnvDto {
    // Node Environment
    @IsEnum(ENVIRONMENT)
    @IsOptional()
    NODE_ENV?: ENVIRONMENT;

    // App Configuration (Required)
    @IsString()
    APP_HOST: string;

    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    APP_PORT: number;

    // App Configuration (Optional)
    @IsString()
    @IsOptional()
    APP_TZ?: string;

    @IsString()
    @IsOptional()
    APP_GLOBAL_PREFIX?: string;

    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    @IsOptional()
    APP_URL_VERSION_ENABLE?: boolean;

    @IsString()
    @IsOptional()
    APP_URL_VERSION_PREFIX?: string;

    @IsString()
    @IsOptional()
    APP_URL_VERSION?: string;

    // Database Configuration (Required)
    @IsString()
    @IsNotEmpty()
    DATABASE_URL: string;

    // better-auth Configuration (Required)
    @IsString()
    @IsNotEmpty()
    BETTER_AUTH_SECRET: string;

    @IsString()
    @IsNotEmpty()
    APP_URL: string;

    // better-auth Configuration (Optional)
    @IsString()
    @IsOptional()
    TRUSTED_ORIGINS?: string;

    // AWS Configuration
    @IsString()
    @IsOptional()
    AWS_ACCESS_KEY_ID?: string;

    @IsString()
    @IsOptional()
    AWS_SECRET_ACCESS_KEY?: string;

    @IsString()
    @IsOptional()
    AWS_REGION?: string;

    @IsString()
    @IsOptional()
    S3_BUCKET_NAME?: string;

    // Middleware Configuration
    @IsString()
    @IsOptional()
    MIDDLEWARE_CORS_ORIGIN?: string;
}

