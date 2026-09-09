import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportRepository } from './report.repository';

@Module({
    imports: [PrismaModule],
    controllers: [ReportController],
    providers: [ReportService, ReportRepository],
    exports: [ReportService, ReportRepository],
})
export class ReportModule {}
