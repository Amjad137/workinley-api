import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma';
import { PrismaService } from '@database/prisma.service';
import { reportFullInclude } from './constants/report.select';
import { IReplaceReportRelationsData } from './interfaces/report.interface';

@Injectable()
export class ReportRepository {
    constructor(private readonly prisma: PrismaService) {}

    findById(id: string, include: Prisma.WeeklyReportInclude = reportFullInclude) {
        return this.prisma.db.weeklyReport.findUnique({ where: { id }, include });
    }

    findByUserAndWeek(userId: string, weekNumber: number, year: number) {
        return this.prisma.db.weeklyReport.findUnique({
            where: { userId_weekNumber_year: { userId, weekNumber, year } },
            include: reportFullInclude,
        });
    }

    findMany(args: Prisma.WeeklyReportFindManyArgs) {
        return this.prisma.db.weeklyReport.findMany(args);
    }

    findManyWithCount(
        args: Prisma.WeeklyReportFindManyArgs,
        where?: Prisma.WeeklyReportWhereInput,
    ): Promise<[Awaited<ReturnType<typeof this.prisma.db.weeklyReport.findMany>>, number]> {
        return this.prisma.db.$transaction([
            this.prisma.db.weeklyReport.findMany(args),
            this.prisma.db.weeklyReport.count({ where }),
        ]) as Promise<[Awaited<ReturnType<typeof this.prisma.db.weeklyReport.findMany>>, number]>;
    }

    create(data: Prisma.WeeklyReportCreateInput) {
        return this.prisma.db.weeklyReport.create({ data, include: reportFullInclude });
    }

    update(id: string, data: Prisma.WeeklyReportUpdateInput) {
        return this.prisma.db.weeklyReport.update({ where: { id }, data, include: reportFullInclude });
    }

    delete(id: string) {
        return this.prisma.db.weeklyReport.delete({ where: { id } });
    }

    /**
     * Atomically replaces nested child collections for a report using a batch transaction.
     */
    async replaceReportRelations(reportId: string, relations: IReplaceReportRelationsData) {
        const operations: Prisma.PrismaPromise<unknown>[] = [];

        if (relations.tasks !== undefined) {
            operations.push(
                this.prisma.db.reportTask.deleteMany({ where: { reportId } }),
                ...(relations.tasks.length > 0
                    ? [this.prisma.db.reportTask.createMany({ data: relations.tasks })]
                    : []),
            );
        }

        if (relations.plannedTasks !== undefined) {
            operations.push(
                this.prisma.db.reportPlannedTask.deleteMany({ where: { reportId } }),
                ...(relations.plannedTasks.length > 0
                    ? [this.prisma.db.reportPlannedTask.createMany({ data: relations.plannedTasks })]
                    : []),
            );
        }

        if (relations.blockers !== undefined) {
            operations.push(
                this.prisma.db.reportBlocker.deleteMany({ where: { reportId } }),
                ...(relations.blockers.length > 0
                    ? [this.prisma.db.reportBlocker.createMany({ data: relations.blockers })]
                    : []),
            );
        }

        if (relations.achievements !== undefined) {
            operations.push(
                this.prisma.db.reportAchievement.deleteMany({ where: { reportId } }),
                ...(relations.achievements.length > 0
                    ? [this.prisma.db.reportAchievement.createMany({ data: relations.achievements })]
                    : []),
            );
        }

        if (relations.hoursEntries !== undefined) {
            operations.push(
                this.prisma.db.reportHours.deleteMany({ where: { reportId } }),
                ...(relations.hoursEntries.length > 0
                    ? [this.prisma.db.reportHours.createMany({ data: relations.hoursEntries })]
                    : []),
            );
        }

        return this.prisma.db.$transaction(operations);
    }

    createVersion(data: Prisma.ReportVersionCreateInput) {
        return this.prisma.db.reportVersion.create({ data });
    }

    createReview(data: Prisma.ReportReviewCreateInput) {
        return this.prisma.db.reportReview.create({ data });
    }
}
