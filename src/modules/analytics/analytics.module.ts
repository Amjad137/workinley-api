import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma.module';
import { UserModule } from '@modules/user/user.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';

@Module({
    imports: [PrismaModule, UserModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService, AnalyticsRepository],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}
