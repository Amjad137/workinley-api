import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import {
    HoursCategory,
    Prisma,
    ReportStatus,
    ReviewAction,
    User,
    UserRole,
    WeeklyReport,
} from '@generated/prisma';
import { ReportRepository } from './report.repository';
import {
    CreateReportDto,
    UpdateReportDto,
    ReportQueryDto,
    HoursBreakdownDto,
} from './dtos/report.dto';
import { ENTITY_SORT, IPaginationResult } from '@database/interfaces/database.interface';
import { SORT_REPORT_BY } from './interfaces/report.interface';

@Injectable()
export class ReportService {
    constructor(private readonly reportRepo: ReportRepository) { }

    private mapHoursBreakdownToEntries(
        breakdown?: HoursBreakdownDto,
    ): { category: HoursCategory; hours: number }[] {
        if (!breakdown) return [];

        const mapping = {
            development: HoursCategory.DEVELOPMENT,
            testing: HoursCategory.TESTING,
            meetings: HoursCategory.MEETINGS,
            documentation: HoursCategory.DOCUMENTATION,
            other: HoursCategory.OTHER,
        } satisfies Record<keyof HoursBreakdownDto, HoursCategory>;

        return (Object.keys(mapping) as (keyof HoursBreakdownDto)[])
            .filter((key) => breakdown[key] !== undefined && breakdown[key] !== null)
            .map((key) => ({ category: mapping[key], hours: breakdown[key]! }));
    }

    private getISOWeekAndYear(date: Date): { weekNumber: number; year: number } {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return { weekNumber: weekNo, year: d.getUTCFullYear() };
    }

    // List my reports (team member)
    async findMyReports(userId: string, query: ReportQueryDto): Promise<IPaginationResult<WeeklyReport>> {
        const {
            page = 1,
            limit = 20,
            search,
            sortBy = SORT_REPORT_BY.WEEK_START_DATE,
            sortOrder = ENTITY_SORT.DESC,
            status,
            year,
            createdFrom,
            createdTo,
        } = query;
        const skip = (page - 1) * limit;

        const createdAt = {
            ...(createdFrom ? { gte: new Date(createdFrom) } : {}),
            ...(createdTo ? { lte: new Date(createdTo) } : {}),
        };

        const where: Prisma.WeeklyReportWhereInput = {
            userId,
            ...(status ? { status } : {}),
            ...(year ? { year } : {}),
            ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
            ...(search
                ? {
                    OR: [
                        { project: { name: { contains: search, mode: 'insensitive' as const } } },
                        { tasks: { some: { name: { contains: search, mode: 'insensitive' as const } } } },
                    ],
                }
                : {}),
        };

        const [data, total] = await this.reportRepo.findManyWithCount(
            {
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                    project: { select: { id: true, name: true, code: true, color: true } },
                    tasks: { select: { id: true, status: true } },
                },
            },
            where,
        );

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        };
    }

    // List all reports (managers / admins)
    async findAllReports(query: ReportQueryDto): Promise<IPaginationResult<WeeklyReport>> {
        const {
            page = 1,
            limit = 20,
            search,
            sortBy = SORT_REPORT_BY.WEEK_START_DATE,
            sortOrder = ENTITY_SORT.DESC,
            status,
            year,
            weekNumber,
            userId,
            projectId,
            createdFrom,
            createdTo,
        } = query;
        const skip = (page - 1) * limit;

        const createdAt = {
            ...(createdFrom ? { gte: new Date(createdFrom) } : {}),
            ...(createdTo ? { lte: new Date(createdTo) } : {}),
        };

        const where: Prisma.WeeklyReportWhereInput = {
            ...(status ? { status } : {}),
            ...(year ? { year } : {}),
            ...(weekNumber ? { weekNumber } : {}),
            ...(userId ? { userId } : {}),
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
            ...(search
                ? {
                    OR: [
                        { user: { name: { contains: search, mode: 'insensitive' as const } } },
                        { project: { name: { contains: search, mode: 'insensitive' as const } } },
                        { tasks: { some: { name: { contains: search, mode: 'insensitive' as const } } } },
                    ],
                }
                : {}),
        };

        const [data, total] = await this.reportRepo.findManyWithCount(
            {
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                    project: { select: { id: true, name: true, code: true, color: true } },
                    tasks: { select: { id: true, status: true } },
                },
            },
            where,
        );

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        };
    }

    // Get single report
    async findById(id: string, requestingUser: User) {
        const report = await this.reportRepo.findById(id);
        if (!report) throw new NotFoundException('Report not found');

        // Team members can only view their own reports
        if (requestingUser.role === UserRole.USER && report.userId !== requestingUser.id) {
            throw new ForbiddenException('You can only view your own reports');
        }
        return report;
    }

    // Create draft
    async create(userId: string, dto: CreateReportDto) {
        let weekNumber = dto.weekNumber;
        let year = dto.year;

        if (dto.weekStartDate) {
            const startDate = new Date(dto.weekStartDate);
            if (!isNaN(startDate.getTime())) {
                const iso = this.getISOWeekAndYear(startDate);
                weekNumber = iso.weekNumber;
                year = iso.year;
            }
        }

        // Check for duplicate week
        const existing = await this.reportRepo.findByUserAndWeek(userId, weekNumber, year);
        if (existing) {
            throw new ConflictException(`A report for week ${weekNumber} (${year}) already exists`);
        }

        const {
            tasks,
            plannedTasks,
            blockers,
            achievements,
            hoursEntries,
            hoursBreakdown,
            weekStartDate,
            weekEndDate,
            links,
            notes,
            projectId,
        } = dto;

        const resolvedHours = hoursEntries?.length
            ? hoursEntries
            : this.mapHoursBreakdownToEntries(hoursBreakdown);

        return this.reportRepo.create({
            weekNumber,
            year,
            notes,
            links: links ?? [],
            weekStartDate: new Date(weekStartDate),
            weekEndDate: new Date(weekEndDate),
            user: { connect: { id: userId } },
            project: projectId ? { connect: { id: projectId } } : undefined,
            tasks: tasks?.length
                ? {
                    create: tasks.map((t, i) => ({
                        name: t.name,
                        priority: t.priority,
                        status: t.status,
                        plannedCompletionPercent: t.plannedCompletionPercent ?? t.plannedPercent ?? 0,
                        actualCompletionPercent: t.actualCompletionPercent ?? t.actualPercent ?? 0,
                        plannedHours: t.plannedHours ?? 0,
                        actualHours: t.actualHours ?? t.spentHours ?? 0,
                        deliverable: t.deliverable,
                        projectId: t.projectId,
                        orderIndex: t.orderIndex ?? i,
                    })),
                }
                : undefined,
            plannedTasks: plannedTasks?.length
                ? {
                    create: plannedTasks.map((pt, i) => ({
                        name: pt.name,
                        priority: pt.priority,
                        plannedHours: pt.plannedHours ?? 0,
                        projectId: pt.projectId,
                        orderIndex: pt.orderIndex ?? i,
                    })),
                }
                : undefined,
            blockers: blockers?.length
                ? {
                    create: blockers.map((b, i) => ({
                        description: b.description,
                        isKeyIssue: b.isKeyIssue ?? b.isKeyBlocker ?? false,
                        orderIndex: b.orderIndex ?? i,
                    })),
                }
                : undefined,
            achievements: achievements?.length
                ? {
                    create: achievements.map((a, i) => ({
                        description: a.description,
                        isKeyAchievement: a.isKeyAchievement ?? false,
                        orderIndex: a.orderIndex ?? i,
                    })),
                }
                : undefined,
            hoursEntries: resolvedHours.length
                ? {
                    create: resolvedHours.map((h) => ({
                        category: h.category,
                        hours: h.hours,
                    })),
                }
                : undefined,
        });
    }

    // Update draft / needs-correction
    async update(id: string, requestingUser: User, dto: UpdateReportDto) {
        const report = await this.reportRepo.findById(id);
        if (!report) throw new NotFoundException('Report not found');

        // Only author can edit
        if (report.userId !== requestingUser.id) {
            throw new ForbiddenException('You can only edit your own reports');
        }
        // Only editable when DRAFT or NEEDS_CORRECTION
        if (report.status !== ReportStatus.DRAFT && report.status !== ReportStatus.NEEDS_CORRECTION) {
            throw new BadRequestException(`Reports in "${report.status}" status cannot be edited`);
        }

        const {
            tasks,
            plannedTasks,
            blockers,
            achievements,
            hoursEntries,
            hoursBreakdown,
            weekStartDate,
            weekEndDate,
            links,
            notes,
            projectId,
        } = dto;

        const resolvedHours = hoursEntries !== undefined
            ? hoursEntries
            : hoursBreakdown !== undefined
                ? this.mapHoursBreakdownToEntries(hoursBreakdown)
                : undefined;

        // Atomically replace nested relations via repository
        await this.reportRepo.replaceReportRelations(id, {
            tasks: tasks?.map((t, i) => ({
                reportId: id,
                name: t.name,
                priority: t.priority,
                status: t.status,
                plannedCompletionPercent: t.plannedCompletionPercent ?? t.plannedPercent ?? 0,
                actualCompletionPercent: t.actualCompletionPercent ?? t.actualPercent ?? 0,
                plannedHours: t.plannedHours ?? 0,
                actualHours: t.actualHours ?? t.spentHours ?? 0,
                deliverable: t.deliverable,
                projectId: t.projectId,
                orderIndex: t.orderIndex ?? i,
            })),
            plannedTasks: plannedTasks?.map((pt, i) => ({
                reportId: id,
                name: pt.name,
                priority: pt.priority,
                plannedHours: pt.plannedHours ?? 0,
                projectId: pt.projectId,
                orderIndex: pt.orderIndex ?? i,
            })),
            blockers: blockers?.map((b, i) => ({
                reportId: id,
                description: b.description,
                isKeyIssue: b.isKeyIssue ?? b.isKeyBlocker ?? false,
                orderIndex: b.orderIndex ?? i,
            })),
            achievements: achievements?.map((a, i) => ({
                reportId: id,
                description: a.description,
                isKeyAchievement: a.isKeyAchievement ?? false,
                orderIndex: a.orderIndex ?? i,
            })),
            hoursEntries: resolvedHours?.map((h) => ({
                reportId: id,
                category: h.category,
                hours: h.hours,
            })),
        });

        let updatedWeekNumber = dto.weekNumber;
        let updatedYear = dto.year;

        if (dto.weekStartDate) {
            const startDate = new Date(dto.weekStartDate);
            if (!isNaN(startDate.getTime())) {
                const iso = this.getISOWeekAndYear(startDate);
                updatedWeekNumber = iso.weekNumber;
                updatedYear = iso.year;
            }
        }

        if (updatedWeekNumber !== undefined && updatedYear !== undefined) {
            const existing = await this.reportRepo.findByUserAndWeek(report.userId, updatedWeekNumber, updatedYear);
            if (existing && existing.id !== id) {
                throw new ConflictException(`A report for week ${updatedWeekNumber} (${updatedYear}) already exists`);
            }
        }

        return this.reportRepo.update(id, {
            notes,
            ...(links !== undefined ? { links } : {}),
            ...(weekStartDate ? { weekStartDate: new Date(weekStartDate) } : {}),
            ...(weekEndDate ? { weekEndDate: new Date(weekEndDate) } : {}),
            ...(updatedWeekNumber !== undefined ? { weekNumber: updatedWeekNumber } : {}),
            ...(updatedYear !== undefined ? { year: updatedYear } : {}),
            project: projectId ? { connect: { id: projectId } } : undefined,
        });
    }

    // Submit / Resubmit
    async submit(id: string, requestingUser: User) {
        const report = await this.reportRepo.findById(id);
        if (!report) throw new NotFoundException('Report not found');

        if (report.userId !== requestingUser.id) {
            throw new ForbiddenException('You can only submit your own reports');
        }
        if (report.status !== ReportStatus.DRAFT && report.status !== ReportStatus.NEEDS_CORRECTION) {
            throw new BadRequestException(`Cannot submit a report in "${report.status}" status`);
        }

        // On resubmission: snapshot the current version
        if (report.status === ReportStatus.NEEDS_CORRECTION) {
            const snapshotData = {
                tasks: report.tasks,
                plannedTasks: report.plannedTasks,
                blockers: report.blockers,
                achievements: report.achievements,
                hoursEntries: report.hoursEntries,
                notes: report.notes,
                links: report.links,
            };

            await this.reportRepo.createVersion({
                report: { connect: { id } },
                versionNumber: report.currentVersion,
                snapshotData,
            });
        }

        return this.reportRepo.update(id, {
            status: ReportStatus.SUBMITTED,
            submittedAt: new Date(),
            ...(report.status === ReportStatus.NEEDS_CORRECTION
                ? { currentVersion: { increment: 1 } }
                : {}),
        });
    }

    // Delete (draft only)
    async remove(id: string, requestingUser: User) {
        const report = await this.reportRepo.findById(id);
        if (!report) throw new NotFoundException('Report not found');

        if (report.userId !== requestingUser.id) {
            throw new ForbiddenException('You can only delete your own reports');
        }
        if (report.status !== ReportStatus.DRAFT) {
            throw new BadRequestException('Only draft reports can be deleted');
        }

        return this.reportRepo.delete(id);
    }

    // Review: Approve
    async approve(id: string, reviewer: User, comment?: string) {
        const report = await this.reportRepo.findById(id);
        if (!report) throw new NotFoundException('Report not found');

        if (report.status !== ReportStatus.SUBMITTED) {
            throw new BadRequestException('Only submitted reports can be approved');
        }

        await this.reportRepo.createReview({
            report: { connect: { id } },
            reviewer: { connect: { id: reviewer.id } },
            versionNumber: report.currentVersion,
            action: ReviewAction.APPROVE,
            comment: comment ?? 'Approved',
        });

        return this.reportRepo.update(id, {
            status: ReportStatus.APPROVED,
            reviewedAt: new Date(),
        });
    }

    // Review: Request Changes
    async requestChanges(id: string, reviewer: User, comment: string) {
        if (!comment?.trim()) {
            throw new BadRequestException('A comment explaining the required changes is required');
        }

        const report = await this.reportRepo.findById(id);
        if (!report) throw new NotFoundException('Report not found');

        if (report.status !== ReportStatus.SUBMITTED) {
            throw new BadRequestException('Can only request changes on submitted reports');
        }

        await this.reportRepo.createReview({
            report: { connect: { id } },
            reviewer: { connect: { id: reviewer.id } },
            versionNumber: report.currentVersion,
            action: ReviewAction.REQUEST_CHANGES,
            comment,
        });

        return this.reportRepo.update(id, {
            status: ReportStatus.NEEDS_CORRECTION,
            reviewedAt: new Date(),
        });
    }
}
