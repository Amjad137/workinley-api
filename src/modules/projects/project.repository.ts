import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class ProjectRepository {
    constructor(private readonly prisma: PrismaService) {}

    findAll(args?: Prisma.ProjectFindManyArgs) {
        return this.prisma.db.project.findMany(args);
    }

    findManyWithCount(
        args: Prisma.ProjectFindManyArgs,
        where?: Prisma.ProjectWhereInput,
    ): Promise<[Awaited<ReturnType<typeof this.prisma.db.project.findMany>>, number]> {
        return this.prisma.db.$transaction([
            this.prisma.db.project.findMany(args),
            this.prisma.db.project.count({ where }),
        ]) as Promise<[Awaited<ReturnType<typeof this.prisma.db.project.findMany>>, number]>;
    }

    findById(id: string) {
        return this.prisma.db.project.findUnique({ where: { id } });
    }

    findByCode(code: string) {
        return this.prisma.db.project.findUnique({ where: { code } });
    }

    create(data: Prisma.ProjectCreateInput) {
        return this.prisma.db.project.create({ data });
    }

    update(id: string, data: Prisma.ProjectUpdateInput) {
        return this.prisma.db.project.update({ where: { id }, data });
    }

    delete(id: string) {
        return this.prisma.db.project.delete({ where: { id } });
    }
}
