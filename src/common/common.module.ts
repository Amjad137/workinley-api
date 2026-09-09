import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import configs from '@config';
import { PrismaModule } from '@database/prisma.module';
import { MessageModule } from '@common/message/message.module';
import { RequestModule } from '@common/request/request.module';
import { ResponseModule } from '@common/response/response.module';
import { ServerResponse } from 'http';

@Module({
    imports: [
        // Config
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
        }),

        // Database — global Prisma module (replaces MongooseModule.forRootAsync)
        PrismaModule,

        // Cache
        CacheModule.register({
            isGlobal: true,
            ttl: 300, // 5 minutes
            max: 100, // maximum number of items in cache
        }),

        // Logger
        LoggerModule.forRoot({
            pinoHttp: {
                level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
                autoLogging: true,
                customReceivedMessage: req => `--> ${req.method} ${req.url}`,
                customSuccessMessage: (req, res: ServerResponse) =>
                    `<-- ${req.method} ${req.url} ${res.statusCode}`,
                customErrorMessage: (req, res, err) =>
                    `<x- ${req.method} ${req.url} ${res.statusCode} ${err?.message}`,
                serializers: {
                    req: req => ({
                        id: req.id,
                        method: req.method,
                        url: req.url,
                    }),
                    res: res => ({ statusCode: res.statusCode }),
                },
                redact: {
                    paths: ['req.headers.cookie', 'req.headers.authorization'],
                    remove: true,
                },
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                        singleLine: true,
                        messageFormat: '{msg}',
                    },
                },
            },
        }),

        // Health Check
        TerminusModule,

        // Common modules
        MessageModule,
        RequestModule.forRoot(),
        ResponseModule,
    ],
    exports: [PrismaModule, MessageModule, RequestModule, ResponseModule],
})
export class CommonModule { }
