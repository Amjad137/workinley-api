/**
 * Seed script for Workinley
 * Creates: 1 admin, 1 manager, 3 team members, 4 projects, and reports across 3 weeks
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seed.ts
 */
import 'dotenv/config';
import { auth } from '@auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
    PrismaClient,
    ReportStatus,
    TaskPriority,
    TaskStatus,
    ReviewAction,
    HoursCategory,
} from './generated/client';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
}

function weekBounds(offsetWeeks: number): { start: Date; end: Date; weekNumber: number; year: number } {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 - offsetWeeks * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return {
        start: monday,
        end: sunday,
        weekNumber: getWeekNumber(monday),
        year: monday.getFullYear(),
    };
}

async function signUpUser(email: string, password: string, name: string, phoneNumber: string) {
    try {
        const res = await auth.api.signUpEmail({
            body: { email, password, name, phoneNumber },
        });
        if (res?.user) {
            await prisma.user.update({
                where: { id: res.user.id },
                data: { phoneNumber, emailVerified: true },
            });
            return res.user;
        }
    } catch {
        // Already exists - fetch by email
        return prisma.user.findUnique({ where: { email } });
    }
    return prisma.user.findUnique({ where: { email } });
}

async function seed() {
    console.log('🌱 Starting Workinley database seed...\n');

    // ─── 1. Users ───────────────────────────────────────────────────────────────
    console.log('👤 Creating users...');

    const admin = await signUpUser('admin@workinley.dev', 'Admin@1234', 'Sarah Connor (Admin)', '+15550001111');
    await prisma.user.update({ where: { id: admin!.id }, data: { role: 'ADMIN' as any } });

    const manager = await signUpUser('manager@workinley.dev', 'Manager@1234', 'Marcus Vance (Manager)', '+15550002222');
    await prisma.user.update({ where: { id: manager!.id }, data: { role: 'MANAGER' as any } });

    const alex = await signUpUser('alex.chen@workinley.dev', 'Member@1234', 'Alex Chen', '+15550003331');
    const david = await signUpUser('david.ross@workinley.dev', 'Member@1234', 'David Ross', '+15550003332');
    const priya = await signUpUser('priya.nair@workinley.dev', 'Member@1234', 'Priya Nair', '+15550003333');

    console.log('✅ Users created:');
    console.log('   Admin:   admin@workinley.dev');
    console.log('   Manager: manager@workinley.dev');
    console.log('   Alex:    alex.chen@workinley.dev');
    console.log('   David:   david.ross@workinley.dev');
    console.log('   Priya:   priya.nair@workinley.dev\n');

    // ─── 2. Projects ────────────────────────────────────────────────────────────
    console.log('📁 Creating projects...');

    const projectDefs = [
        { name: 'Client Alpha Portal', code: 'CAP', description: 'Enterprise customer portal rebuild with Next.js & NestJS', color: '#3B82F6' },
        { name: 'Internal Platform Modernization', code: 'IPM', description: 'DevOps & infrastructure upgrades, CI/CD pipeline automation', color: '#10B981' },
        { name: 'Mobile App v2', code: 'MA2', description: 'React Native cross-platform application release', color: '#8B5CF6' },
        { name: 'Design System Consolidation', code: 'DSC', description: 'Unified component library and Tailwind tokens for all products', color: '#F59E0B' },
    ];

    const projects: Record<string, any> = {};
    for (const def of projectDefs) {
        const p = await prisma.project.upsert({
            where: { code: def.code },
            update: {},
            create: def,
        });
        projects[def.code] = p;
    }
    console.log(`✅ ${Object.keys(projects).length} projects created\n`);

    // ─── 3. Weekly Reports ──────────────────────────────────────────────────────
    console.log('📋 Creating weekly reports...');

    const week2 = weekBounds(2); // 2 weeks ago
    const week1 = weekBounds(1); // 1 week ago
    const week0 = weekBounds(0); // Current week

    // Helper to create a full report with tasks, blockers, achievements, hours
    async function createReport(params: {
        userId: string;
        projectId: string;
        week: { start: Date; end: Date; weekNumber: number; year: number };
        status: ReportStatus;
        tasks: any[];
        plannedTasks?: any[];
        blockers: any[];
        achievements: any[];
        notes?: string;
        links?: string[];
        hoursBreakdown: Record<string, number>;
    }) {
        // Check for existing report
        const existing = await prisma.weeklyReport.findUnique({
            where: {
                userId_weekNumber_year: {
                    userId: params.userId,
                    weekNumber: params.week.weekNumber,
                    year: params.week.year,
                },
            },
        });
        if (existing) return existing;

        const hoursEntries = Object.entries(params.hoursBreakdown).map(([k, v]) => ({
            category: k.toUpperCase() as HoursCategory,
            hours: v,
        }));

        return prisma.weeklyReport.create({
            data: {
                userId: params.userId,
                projectId: params.projectId,
                weekStartDate: params.week.start,
                weekEndDate: params.week.end,
                weekNumber: params.week.weekNumber,
                year: params.week.year,
                status: params.status,
                notes: params.notes,
                links: params.links ?? [],
                submittedAt: params.status !== ReportStatus.DRAFT ? new Date() : null,
                reviewedAt: params.status === ReportStatus.APPROVED ? new Date() : null,
                tasks: {
                    create: params.tasks.map((t, i) => ({
                        name: t.name,
                        priority: t.priority,
                        status: t.status,
                        plannedCompletionPercent: t.plannedCompletionPercent ?? t.plannedPercent ?? 0,
                        actualCompletionPercent: t.actualCompletionPercent ?? t.actualPercent ?? 0,
                        plannedHours: t.plannedHours ?? 0,
                        actualHours: t.actualHours ?? t.spentHours ?? 0,
                        deliverable: t.deliverable,
                        orderIndex: t.orderIndex ?? i,
                    })),
                },
                plannedTasks: params.plannedTasks?.length
                    ? {
                        create: params.plannedTasks.map((pt, i) => ({
                            name: pt.name,
                            priority: pt.priority ?? TaskPriority.MEDIUM,
                            plannedHours: pt.plannedHours ?? 0,
                            orderIndex: pt.orderIndex ?? i,
                        })),
                    }
                    : undefined,
                blockers: {
                    create: params.blockers.map((b, i) => ({
                        description: b.description,
                        isKeyIssue: b.isKeyIssue ?? b.isKeyBlocker ?? false,
                        orderIndex: b.orderIndex ?? i,
                    })),
                },
                achievements: {
                    create: params.achievements.map((a, i) => ({
                        description: a.description,
                        isKeyAchievement: a.isKeyAchievement ?? false,
                        orderIndex: a.orderIndex ?? i,
                    })),
                },
                hoursEntries: {
                    create: hoursEntries,
                },
            },
        });
    }

    // ── Week 2 (approved reports) ─────────────────────────────────────────────

    const alexW2 = await createReport({
        userId: alex!.id,
        projectId: projects['CAP'].id,
        week: week2,
        status: ReportStatus.APPROVED,
        tasks: [
            { name: 'Implement authentication flow', priority: TaskPriority.HIGH, plannedCompletionPercent: 100, actualCompletionPercent: 100, status: TaskStatus.COMPLETED, plannedHours: 16, actualHours: 18, deliverable: 'https://github.com/workinley/pr/1', orderIndex: 0 },
            { name: 'Design dashboard wireframes', priority: TaskPriority.MEDIUM, plannedCompletionPercent: 80, actualCompletionPercent: 75, status: TaskStatus.IN_PROGRESS, plannedHours: 8, actualHours: 6, orderIndex: 1 },
        ],
        plannedTasks: [
            { name: 'Complete dashboard UI', priority: TaskPriority.HIGH, plannedHours: 16, orderIndex: 0 },
            { name: 'Start API integration', priority: TaskPriority.MEDIUM, plannedHours: 8, orderIndex: 1 },
        ],
        blockers: [{ description: 'Waiting on Figma design handoff', isKeyIssue: true, orderIndex: 0 }],
        achievements: [{ description: 'Shipped auth module 1 day ahead of schedule', isKeyAchievement: true, orderIndex: 0 }],
        hoursBreakdown: { development: 24, testing: 4, meetings: 6, documentation: 2, other: 0 },
    });

    // Add version snapshot and review for alexW2
    await prisma.reportVersion.upsert({
        where: { reportId_versionNumber: { reportId: alexW2.id, versionNumber: 1 } },
        update: {},
        create: {
            reportId: alexW2.id,
            versionNumber: 1,
            snapshotData: { tasks: [], blockers: [], achievements: [], notes: '' },
        },
    });
    await prisma.reportReview.create({
        data: {
            reportId: alexW2.id,
            reviewerId: manager!.id,
            versionNumber: 1,
            action: ReviewAction.APPROVE,
            comment: 'Great work this week! Auth module looks solid.',
        },
    }).catch(() => { }); // ignore if already exists

    await createReport({
        userId: david!.id,
        projectId: projects['IPM'].id,
        week: week2,
        status: ReportStatus.APPROVED,
        tasks: [
            { name: 'Set up CI/CD pipeline', priority: TaskPriority.HIGH, plannedCompletionPercent: 100, actualCompletionPercent: 100, status: TaskStatus.COMPLETED, plannedHours: 20, actualHours: 22, deliverable: 'Pipeline docs at /docs/cicd.md', orderIndex: 0 },
        ],
        plannedTasks: [
            { name: 'Set up monitoring and alerting', priority: TaskPriority.HIGH, plannedHours: 12, orderIndex: 0 },
            { name: 'Configure staging environment', priority: TaskPriority.MEDIUM, plannedHours: 8, orderIndex: 1 },
        ],
        blockers: [],
        achievements: [{ description: 'CI/CD pipeline fully operational with zero downtime deployment', isKeyAchievement: true, orderIndex: 0 }],
        hoursBreakdown: { development: 20, testing: 5, meetings: 5, documentation: 5, other: 1 },
    });

    await createReport({
        userId: priya!.id,
        projectId: projects['MA2'].id,
        week: week2,
        status: ReportStatus.APPROVED,
        tasks: [
            { name: 'Mobile app navigation setup', priority: TaskPriority.HIGH, plannedCompletionPercent: 100, actualCompletionPercent: 90, status: TaskStatus.COMPLETED, plannedHours: 16, actualHours: 20, orderIndex: 0 },
            { name: 'Push notification integration', priority: TaskPriority.MEDIUM, plannedCompletionPercent: 50, actualCompletionPercent: 30, status: TaskStatus.IN_PROGRESS, plannedHours: 8, actualHours: 4, orderIndex: 1 },
        ],
        plannedTasks: [
            { name: 'Complete push notification integration', priority: TaskPriority.HIGH, plannedHours: 10, orderIndex: 0 },
            { name: 'Start writing unit tests', priority: TaskPriority.MEDIUM, plannedHours: 8, orderIndex: 1 },
        ],
        blockers: [{ description: 'FCM credentials not yet provided by DevOps', isKeyIssue: true, orderIndex: 0 }],
        achievements: [{ description: 'Navigation structure finalized and approved by design', isKeyAchievement: false, orderIndex: 0 }],
        hoursBreakdown: { development: 20, testing: 2, meetings: 8, documentation: 4, other: 2 },
    });

    // ── Week 1 (submitted / needs correction) ────────────────────────────────

    const alexW1 = await createReport({
        userId: alex!.id,
        projectId: projects['CAP'].id,
        week: week1,
        status: ReportStatus.SUBMITTED,
        tasks: [
            { name: 'Dashboard data API integration', priority: TaskPriority.HIGH, plannedCompletionPercent: 100, actualCompletionPercent: 85, status: TaskStatus.IN_PROGRESS, plannedHours: 16, actualHours: 14, deliverable: 'https://github.com/workinley/pr/5', orderIndex: 0 },
        ],
        plannedTasks: [
            { name: 'Complete API integration', priority: TaskPriority.HIGH, plannedHours: 8, orderIndex: 0 },
            { name: 'Write integration tests', priority: TaskPriority.MEDIUM, plannedHours: 8, orderIndex: 1 },
        ],
        blockers: [{ description: 'Backend API endpoints still missing rate-limit headers', isKeyIssue: true, orderIndex: 0 }],
        achievements: [{ description: 'Dashboard skeleton page shipped to staging', isKeyAchievement: true, orderIndex: 0 }],
        hoursBreakdown: { development: 22, testing: 3, meetings: 5, documentation: 2, other: 0 },
    });

    const davidW1 = await createReport({
        userId: david!.id,
        projectId: projects['DSC'].id,
        week: week1,
        status: ReportStatus.NEEDS_CORRECTION,
        tasks: [
            { name: 'Security audit implementation', priority: TaskPriority.CRITICAL, plannedCompletionPercent: 100, actualCompletionPercent: 60, status: TaskStatus.IN_PROGRESS, plannedHours: 24, actualHours: 16, orderIndex: 0 },
        ],
        plannedTasks: [
            { name: 'Complete security audit', priority: TaskPriority.CRITICAL, plannedHours: 16, orderIndex: 0 },
            { name: 'Document findings', priority: TaskPriority.HIGH, plannedHours: 8, orderIndex: 1 },
        ],
        blockers: [{ description: 'Penetration test vendor not yet selected', isKeyIssue: true, orderIndex: 0 }],
        achievements: [],
        hoursBreakdown: { development: 16, testing: 8, meetings: 6, documentation: 2, other: 4 },
    });

    // Add manager review requesting changes on david's report
    await prisma.reportReview.create({
        data: {
            reportId: davidW1.id,
            reviewerId: manager!.id,
            versionNumber: 1,
            action: ReviewAction.REQUEST_CHANGES,
            comment: 'Please update the actual hours - the reported time does not match what was tracked in Jira. Also add specific findings from the security audit so far.',
        },
    }).catch(() => { });

    await createReport({
        userId: priya!.id,
        projectId: projects['MA2'].id,
        week: week1,
        status: ReportStatus.SUBMITTED,
        tasks: [
            { name: 'Push notifications end-to-end', priority: TaskPriority.HIGH, plannedCompletionPercent: 100, actualCompletionPercent: 100, status: TaskStatus.COMPLETED, plannedHours: 12, actualHours: 11, deliverable: 'Tested on iOS & Android - screenshots in Slack', orderIndex: 0 },
            { name: 'Unit tests for core modules', priority: TaskPriority.MEDIUM, plannedCompletionPercent: 60, actualCompletionPercent: 50, status: TaskStatus.IN_PROGRESS, plannedHours: 8, actualHours: 6, orderIndex: 1 },
        ],
        plannedTasks: [
            { name: 'Complete unit tests', priority: TaskPriority.MEDIUM, plannedHours: 8, orderIndex: 0 },
            { name: 'Prepare for QA sprint', priority: TaskPriority.HIGH, plannedHours: 8, orderIndex: 1 },
        ],
        blockers: [],
        achievements: [{ description: 'Push notifications working end-to-end on both iOS and Android', isKeyAchievement: true, orderIndex: 0 }],
        hoursBreakdown: { development: 17, testing: 8, meetings: 4, documentation: 3, other: 0 },
    });

    // ── Week 0 (current week - draft / submitted) ─────────────────────────────

    await createReport({
        userId: alex!.id,
        projectId: projects['CAP'].id,
        week: week0,
        status: ReportStatus.DRAFT,
        tasks: [
            { name: 'Fix rate-limit bug on API', priority: TaskPriority.HIGH, plannedCompletionPercent: 100, actualCompletionPercent: 0, status: TaskStatus.NOT_STARTED, plannedHours: 4, actualHours: 0, orderIndex: 0 },
        ],
        plannedTasks: [],
        blockers: [],
        achievements: [],
        hoursBreakdown: { development: 0, testing: 0, meetings: 0, documentation: 0, other: 0 },
    });

    await createReport({
        userId: david!.id,
        projectId: projects['DSC'].id,
        week: week0,
        status: ReportStatus.SUBMITTED,
        tasks: [
            { name: 'Security audit - revised findings', priority: TaskPriority.CRITICAL, plannedCompletionPercent: 100, actualCompletionPercent: 100, status: TaskStatus.COMPLETED, plannedHours: 24, actualHours: 26, deliverable: 'Findings report at /docs/security-audit-v2.pdf', orderIndex: 0 },
        ],
        plannedTasks: [
            { name: 'Present findings to CTO', priority: TaskPriority.CRITICAL, plannedHours: 4, orderIndex: 0 },
            { name: 'Begin remediation plan', priority: TaskPriority.HIGH, plannedHours: 12, orderIndex: 1 },
        ],
        blockers: [],
        achievements: [{ description: 'Security audit completed and findings documented - 3 critical issues identified and patched', isKeyAchievement: true, orderIndex: 0 }],
        hoursBreakdown: { development: 14, testing: 10, meetings: 4, documentation: 8, other: 0 },
    });

    console.log('✅ Reports created');
    console.log('\n✅ Seed complete!\n');
    console.log('📧 Test accounts:');
    console.log('   Admin:   admin@workinley.dev    / Admin@1234');
    console.log('   Manager: manager@workinley.dev  / Manager@1234');
    console.log('   Member:  alex.chen@workinley.dev / Member@1234');
    console.log('   Member:  david.ross@workinley.dev / Member@1234');
    console.log('   Member:  priya.nair@workinley.dev / Member@1234\n');

    await prisma.$disconnect();
}

seed().catch((e) => {
    console.error('Seed failed:', e);
    prisma.$disconnect();
    process.exit(1);
});
