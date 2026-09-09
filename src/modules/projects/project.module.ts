import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma.module';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectRepository } from './project.repository';

@Module({
    imports: [PrismaModule],
    controllers: [ProjectController],
    providers: [ProjectService, ProjectRepository],
    exports: [ProjectService],
})
export class ProjectModule {}
