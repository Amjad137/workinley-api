import { Prisma } from '@generated/prisma';

export interface IReplaceReportRelationsData {
    tasks?: Prisma.ReportTaskCreateManyInput[];
    plannedTasks?: Prisma.ReportPlannedTaskCreateManyInput[];
    blockers?: Prisma.ReportBlockerCreateManyInput[];
    achievements?: Prisma.ReportAchievementCreateManyInput[];
    hoursEntries?: Prisma.ReportHoursCreateManyInput[];
}

export enum SORT_REPORT_BY {
    WEEK_START_DATE = 'weekStartDate',
    CREATED_AT = 'createdAt',
}