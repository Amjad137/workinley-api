import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ReportStatus } from '@generated/prisma';

@Injectable()
export class AnalyticsRepository {
    constructor(private readonly prisma: PrismaService) { }

    getReportStatusGroups(weekNumber: number, year: number) {
        return this.prisma.db.weeklyReport.groupBy({
            by: ['status'],
            where: { weekNumber, year },
            _count: { status: true },
        });
    }

    countActiveBlockers(weekNumber: number, year: number) {
        return this.prisma.db.reportBlocker.count({
            where: {
                report: {
                    weekNumber,
                    year,
                    status: { in: [ReportStatus.SUBMITTED, ReportStatus.NEEDS_CORRECTION] },
                },
            },
        });
    }

    findReportsForVelocity(year: number) {
        return this.prisma.db.weeklyReport.findMany({
            where: { year, weekNumber: { gte: 1 } },
            include: {
                tasks: {
                    select: {
                        status: true,
                        plannedCompletionPercent: true,
                        actualCompletionPercent: true,
                    },
                },
            },
            orderBy: { weekNumber: 'asc' },
        });
    }

    aggregateHoursByCategory(weekNumber: number, year: number) {
        return this.prisma.db.reportHours.groupBy({
            by: ['category'],
            where: {
                report: {
                    weekNumber,
                    year,
                    status: { not: ReportStatus.DRAFT },
                },
            },
            _sum: { hours: true },
        });
    }

    aggregateProjectWorkload(weekNumber: number, year: number) {
        return this.prisma.db.reportTask.groupBy({
            by: ['projectId'],
            where: {
                report: {
                    weekNumber,
                    year,
                    status: { not: ReportStatus.DRAFT },
                },
                projectId: { not: null },
            },
            _sum: { plannedHours: true, actualHours: true },
            _count: { id: true },
        });
    }

    findProjectsByIds(ids: string[]) {
        return this.prisma.db.project.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, code: true, color: true },
        });
    }

    findReportsForCompliance(weekNumber: number, year: number) {
        return this.prisma.db.weeklyReport.findMany({
            where: { weekNumber, year },
            select: {
                userId: true,
                status: true,
                currentVersion: true,
                submittedAt: true,
            },
        });
    }

    findTeamBlockers(weekNumber: number, year: number) {
        return this.prisma.db.reportBlocker.findMany({
            where: {
                report: {
                    weekNumber,
                    year,
                    status: {
                        in: [ReportStatus.SUBMITTED, ReportStatus.NEEDS_CORRECTION, ReportStatus.APPROVED],
                    },
                },
            },
            include: {
                report: {
                    select: {
                        id: true,
                        weekNumber: true,
                        year: true,
                        user: { select: { id: true, name: true, email: true, image: true } },
                    },
                },
            },
            orderBy: [{ isKeyIssue: 'desc' }, { createdAt: 'asc' }],
        });
    }

    findMemberReports(userId: string, limit = 12) {
        return this.prisma.db.weeklyReport.findMany({
            where: { userId },
            select: {
                id: true,
                status: true,
                weekNumber: true,
                year: true,
                weekStartDate: true,
                weekEndDate: true,
                submittedAt: true,
                currentVersion: true,
                project: { select: { id: true, name: true, color: true } },
                tasks: { select: { id: true, status: true, actualHours: true } },
            },
            orderBy: { weekStartDate: 'desc' },
            take: limit,
        });
    }

    countMemberTasks(userId: string) {
        return this.prisma.db.reportTask.count({
            where: { report: { userId } },
        });
    }

    findRecentReviews(limit = 20) {
        return this.prisma.db.reportReview.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                reviewer: { select: { id: true, name: true, image: true } },
                report: {
                    select: {
                        id: true,
                        weekNumber: true,
                        year: true,
                        user: { select: { id: true, name: true } },
                    },
                },
            },
        });
    }
}
