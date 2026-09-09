import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma, ReportStatus, UserRole } from '@generated/prisma';
import { ENTITY_SORT } from '@database/interfaces/database.interface';

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

    async findComplianceMatrix(params: {
        weekNumber: number;
        year: number;
        skip: number;
        take: number;
        search?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: ENTITY_SORT;
    }) {
        const {
            weekNumber,
            year,
            skip,
            take,
            search,
            status,
            sortBy = 'name',
            sortOrder = 'asc',
        } = params;

        const validSortFields = ['name', 'email', 'createdAt'];
        const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

        const where: Prisma.UserWhereInput = {
            isActive: true,
            role: UserRole.USER,
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(status
                ? status === 'NOT_STARTED'
                    ? { reports: { none: { weekNumber, year } } }
                    : { reports: { some: { weekNumber, year, status: status as ReportStatus } } }
                : {}),
        };

        const [users, total] = await Promise.all([
            this.prisma.db.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    reports: {
                        where: { weekNumber, year },
                        select: {
                            status: true,
                            currentVersion: true,
                            submittedAt: true,
                        },
                        take: 1,
                    },
                },
                skip,
                take,
                orderBy: { [orderByField]: sortOrder },
            }),
            this.prisma.db.user.count({ where }),
        ]);

        const data = users.map((u) => {
            const report = u.reports[0];
            return {
                user: {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    image: u.image,
                },
                status: (report?.status ?? 'NOT_STARTED') as ReportStatus | 'NOT_STARTED',
                currentVersion: report?.currentVersion ?? 0,
                submittedAt: report?.submittedAt ?? null,
            };
        });

        return { data, total };
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
