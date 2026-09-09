import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prismaClient } from './prisma.client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    // Expose the singleton client through DI.
    // Repositories inject PrismaService and call this.prisma.db.user.*, etc.
    readonly db = prismaClient;

    async onModuleInit() {
        await prismaClient.$connect();
    }

    async onModuleDestroy() {
        await prismaClient.$disconnect();
    }
}
