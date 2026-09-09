import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@generated/prisma';
import { AnalyticsRepository } from './analytics.repository';
import { UserRepository } from '@modules/user/user.repository';
import {
    WeekQueryDto,
    VelocityQueryDto,
    ActivityQueryDto,
    IDashboardSummary,
    ITaskVelocity,
    IHoursDistribution,
    IProjectWorkload,
    IComplianceMatrixUser,
    IActivityFeedItem,
} from './dtos/analytics.dto';

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly analyticsRepo: AnalyticsRepository,
        private readonly userRepo: UserRepository,
    ) { }

    private resolveWeekAndYear(query?: WeekQueryDto): { weekNumber: number; year: number } {
        if (query?.weekNumber && query?.year) {
            return { weekNumber: query.weekNumber, year: query.year };
        }
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const currentWeekNumber = Math.ceil(
            ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
        );
        return {
            weekNumber: query?.weekNumber ?? currentWeekNumber,
            year: query?.year ?? now.getFullYear(),
        };
    }

    /**
     * Dashboard summary KPIs for a given week
     */
    async getDashboardSummary(query?: WeekQueryDto): Promise<IDashboardSummary> {
        const { weekNumber, year } = this.resolveWeekAndYear(query);

        const [statusGroups, totalUsers, activeBlockers] = await Promise.all([
            this.analyticsRepo.getReportStatusGroups(weekNumber, year),
            this.userRepo.countActiveUsers(),
            this.analyticsRepo.countActiveBlockers(weekNumber, year),
        ]);

        const countByStatus = Object.fromEntries(
            statusGroups.map((g) => [g.status, g._count.status]),
        ) as Partial<Record<ReportStatus, number>>;

        const submitted = countByStatus[ReportStatus.SUBMITTED] ?? 0;
        const approved = countByStatus[ReportStatus.APPROVED] ?? 0;
        const needsCorrection = countByStatus[ReportStatus.NEEDS_CORRECTION] ?? 0;
        const draft = countByStatus[ReportStatus.DRAFT] ?? 0;
        const totalReports = submitted + approved + needsCorrection + draft;
        const notStarted = Math.max(0, totalUsers - totalReports);

        return {
            weekNumber,
            year,
            totalUsers,
            totalReports,
            submitted,
            approved,
            needsCorrection,
            draft,
            notStarted,
            complianceRate:
                totalUsers > 0
                    ? Math.round(((submitted + approved + needsCorrection) / totalUsers) * 100)
                    : 0,
            activeBlockers,
        };
    }

    /**
     * Weekly velocity: tasks planned vs completed over the last N weeks
     */
    async getTaskVelocity(query?: VelocityQueryDto): Promise<ITaskVelocity[]> {
        const year = query?.year ?? new Date().getFullYear();
        const reports = await this.analyticsRepo.findReportsForVelocity(year);

        // Group by weekNumber
        const byWeek: Record<number, { planned: number; actual: number; completed: number; total: number }> = {};
        for (const r of reports) {
            const wn = r.weekNumber;
            if (!byWeek[wn]) byWeek[wn] = { planned: 0, actual: 0, completed: 0, total: 0 };
            for (const t of r.tasks) {
                byWeek[wn].planned += t.plannedCompletionPercent;
                byWeek[wn].actual += t.actualCompletionPercent;
                byWeek[wn].total += 1;
            }
        }

        return Object.entries(byWeek).map(([week, val]) => ({
            weekNumber: Number(week),
            year,
            avgPlannedPercent: val.total ? Math.round(val.planned / val.total) : 0,
            avgActualPercent: val.total ? Math.round(val.actual / val.total) : 0,
            totalTasks: val.total,
        }));
    }

    /**
     * Team-wide hours distribution for a given week.
     * Uses SQL aggregation (groupBy category, sum hours) at database engine level.
     */
    async getHoursDistribution(query?: WeekQueryDto): Promise<IHoursDistribution> {
        const { weekNumber, year } = this.resolveWeekAndYear(query);
        const aggregated = await this.analyticsRepo.aggregateHoursByCategory(weekNumber, year);

        const totals: IHoursDistribution = {
            development: 0,
            testing: 0,
            meetings: 0,
            documentation: 0,
            other: 0,
        };

        for (const row of aggregated) {
            const key = row.category.toLowerCase() as keyof IHoursDistribution;
            if (key in totals) {
                totals[key] = row._sum.hours ?? 0;
            }
        }

        return totals;
    }

    /**
     * Workload distribution by project.
     * Uses SQL aggregation (groupBy projectId, sum plannedHours, sum actualHours, count tasks) at database engine level.
     */
    async getProjectWorkload(query?: WeekQueryDto): Promise<IProjectWorkload[]> {
        const { weekNumber, year } = this.resolveWeekAndYear(query);
        const aggregated = await this.analyticsRepo.aggregateProjectWorkload(weekNumber, year);

        const projectIds = aggregated
            .map((r) => r.projectId)
            .filter((id): id is string => id !== null);

        if (projectIds.length === 0) return [];

        const projects = await this.analyticsRepo.findProjectsByIds(projectIds);
        const projectMap = new Map(projects.map((p) => [p.id, p]));

        return aggregated
            .filter((r) => r.projectId && projectMap.has(r.projectId))
            .map((r) => ({
                project: projectMap.get(r.projectId!)!,
                taskCount: r._count.id,
                totalPlannedHours: r._sum.plannedHours ?? 0,
                totalSpentHours: r._sum.actualHours ?? 0,
            }));
    }

    /**
     * Team compliance matrix for a given week
     */
    async getComplianceMatrix(query?: WeekQueryDto): Promise<IComplianceMatrixUser[]> {
        const { weekNumber, year } = this.resolveWeekAndYear(query);

        const [users, reports] = await Promise.all([
            this.userRepo.findActiveUsers(),
            this.analyticsRepo.findReportsForCompliance(weekNumber, year),
        ]);

        const reportByUser = Object.fromEntries(reports.map((r) => [r.userId, r]));

        return users.map((u) => {
            const report = reportByUser[u.id];
            return {
                user: u,
                status: report?.status ?? 'NOT_STARTED',
                currentVersion: report?.currentVersion ?? 0,
                submittedAt: report?.submittedAt ?? null,
            };
        });
    }

    /**
     * All active blockers across the team for a given week
     */
    async getTeamBlockers(query?: WeekQueryDto) {
        const { weekNumber, year } = this.resolveWeekAndYear(query);
        return this.analyticsRepo.findTeamBlockers(weekNumber, year);
    }

    /**
     * Individual team member stats
     */
    async getMemberStats(userId: string) {
        const [user, reports, totalTasks] = await Promise.all([
            this.userRepo.findMemberUser(userId),
            this.analyticsRepo.findMemberReports(userId, 12),
            this.analyticsRepo.countMemberTasks(userId),
        ]);

        if (!user) {
            throw new NotFoundException('Team member not found');
        }

        const statusCounts = Object.fromEntries(
            Object.values(ReportStatus).map((s) => [s, reports.filter((r) => r.status === s).length]),
        );

        const avgRevisions =
            reports.length > 0
                ? Number((reports.reduce((sum, r) => sum + r.currentVersion, 0) / reports.length).toFixed(2))
                : 0;

        return {
            user,
            userId,
            totalReports: reports.length,
            statusCounts,
            totalTasks,
            avgRevisions,
            recentReports: reports,
        };
    }

    /**
     * Recent activity feed
     */
    async getActivityFeed(query?: ActivityQueryDto): Promise<IActivityFeedItem[]> {
        const limit = query?.limit ?? 20;
        const reviews = await this.analyticsRepo.findRecentReviews(limit);

        return reviews.map((r) => ({
            id: r.id,
            action: r.action,
            comment: r.comment,
            createdAt: r.createdAt,
            reviewer: r.reviewer,
            report: r.report,
        }));
    }
}
