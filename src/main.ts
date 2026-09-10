import 'dotenv/config';
import { NestApplication, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer, validate } from 'class-validator';
import swaggerInit from '@app/swagger';
import { plainToInstance } from 'class-transformer';
import { AppEnvDto } from '@app/dtos/app.env.dto';
import compression from 'compression';
import { Logger as PinoLogger } from 'nestjs-pino';
import { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { ResponseWithBody } from '@common/response/interfaces/response.interface';

async function bootstrap() {
    // Validate env FIRST - before NestJS boots.
    const classEnv = plainToInstance(AppEnvDto, process.env);
    const envErrors = await validate(classEnv, { stopAtFirstError: false });
    if (envErrors.length > 0) {
        const messages = envErrors
            .flatMap(e => Object.values(e.constraints ?? {}))
            .join('\n  ');
        console.error(`\n❌ Invalid or missing environment variables:\n  ${messages}\n`);
        process.exit(1);
    }

    const app: NestApplication = await NestFactory.create(AppModule, {
        abortOnError: false,
        bufferLogs: false,
        bodyParser: false, // Required - better-auth handles its own body parsing
    });

    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env');
    const timezone: string = configService.get<string>('app.timezone');
    const host: string = configService.get<string>('app.http.host');
    const port: number = configService.get<number>('app.http.port');
    const globalPrefix: string = configService.get<string>('app.globalPrefix');
    const versioningPrefix: string = configService.get<string>(
        'app.urlVersion.prefix',
    );
    const version: string = configService.get<string>('app.urlVersion.version');

    // enable
    const versionEnable: string = configService.get<string>(
        'app.urlVersion.enable',
    );

    const logger = new Logger('NestJS-API');
    process.env.NODE_ENV = env;
    process.env.TZ = timezone;

    // logger
    app.useLogger(app.get(PinoLogger));

    // CORS - Must be enabled at application level to handle OPTIONS preflight across all routes
    const corsOrigin = configService.get<string | string[]>('middleware.cors.allowOrigin');
    const corsMethods = configService.get<string[]>('middleware.cors.allowMethod');
    const corsHeaders = configService.get<string[]>('middleware.cors.allowHeader');

    app.enableCors({
        origin: corsOrigin,
        methods: corsMethods ?? [
            'GET',
            'HEAD',
            'PUT',
            'PATCH',
            'POST',
            'DELETE',
            'OPTIONS',
        ],
        allowedHeaders: corsHeaders,
        credentials: true,
    });

    // Compression
    app.use(compression());

    // Cookie parser
    app.use(cookieParser());

    // Global
    app.setGlobalPrefix(globalPrefix);

    // For Custom Validation
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Versioning
    if (versionEnable) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: version,
            prefix: versioningPrefix,
        });
    }

    // Swagger
    await swaggerInit(app);

    // set response for log
    app.use(function (_: Request, res: Response, next: NextFunction) {
        const send = res.send;
        res.send = function (body?: unknown) {
            (res as ResponseWithBody).body = body;
            return send.call(this, body);
        };
        next();
    });

    // Listen
    await app.listen(port, host);

    // app.getUrl() returns the actual bound address (e.g. http://127.0.0.1:8000)
    // This is the internal bind address - correct for local logs.
    const serverUrl = (await app.getUrl()).replace('[::1]', host);

    logger.log(`Env            : ${env}`);
    logger.log(`Server         : ${serverUrl}`);
    logger.log(`Versioning     : ${versionEnable ? 'enabled' : 'disabled'}`);
    if (env !== 'production') {
        logger.log(`Swagger runs at: ${serverUrl}/${globalPrefix}/docs`);
    }
}
bootstrap();
