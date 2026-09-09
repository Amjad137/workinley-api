import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '@database/prisma.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Health')
@AllowAnonymous()
@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly prismaService: PrismaService,
    ) { }

    @Get()
    @HealthCheck()
    @ApiOperation({ summary: 'Health check' })
    @ApiResponse({ status: 200, description: 'Health check successful' })
    check() {
        return this.health.check([
            async (): Promise<HealthIndicatorResult> => {
                await this.prismaService.db.$queryRaw`SELECT 1`;
                return { postgresql: { status: 'up' } };
            },
        ]);
    }
}
