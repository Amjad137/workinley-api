import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from '@modules/health/health.controller';

// PrismaModule is @Global() so PrismaService is available without explicit import.
@Module({
    imports: [
        TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 1000,
        }),
    ],
    controllers: [HealthController],
    providers: [],
    exports: [],
})
export class HealthModule {}
