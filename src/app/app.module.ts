import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@auth';
import { CommonModule } from '@common/common.module';
import { AppMiddlewareModule } from '@app/app.middleware.module';
import { RouterModule } from '@router';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';

@Module({
    imports: [
        // better-auth mounts all /api/auth/* routes — no NestJS AuthController needed
        AuthModule.forRoot({
            auth,
            bodyParser: { json: { limit: '2mb' } },
        }),

        // Common
        CommonModule,
        AppMiddlewareModule,

        // Routes
        RouterModule,
    ],
    providers: [
        // Apply ResponseInterceptor globally to all routes
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseInterceptor,
        },
    ],
})
export class AppModule { }
