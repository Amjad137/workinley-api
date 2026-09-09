import { Prisma } from '@generated/prisma';

export const reportFullInclude = {
    user: { select: { id: true, name: true, email: true, image: true, role: true } },
    project: true,
    tasks: { orderBy: { orderIndex: 'asc' as const } },
    plannedTasks: { orderBy: { orderIndex: 'asc' as const } },
    blockers: { orderBy: { orderIndex: 'asc' as const } },
    achievements: { orderBy: { orderIndex: 'asc' as const } },
    hoursEntries: { orderBy: { category: 'asc' as const } },
    versions: { orderBy: { versionNumber: 'asc' as const } },
    reviews: {
        orderBy: { createdAt: 'desc' as const },
        include: {
            reviewer: { select: { id: true, name: true, email: true, image: true } },
        },
    },
} satisfies Prisma.WeeklyReportInclude;
