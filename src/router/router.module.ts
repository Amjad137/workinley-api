import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { HealthModule } from '@modules/health/health.module';
import { S3Module } from '@modules/s3/s3.module';

// Note: The global AuthGuard is registered by AuthModule.forRoot() in AppModule
// via @thallesp/nestjs-better-auth. No manual APP_GUARD provider needed here.

@Module({
    controllers: [],
    providers: [],
    imports: [UserModule, HealthModule, S3Module],
    exports: [UserModule, HealthModule, S3Module],
})
export class RouterModule { }
