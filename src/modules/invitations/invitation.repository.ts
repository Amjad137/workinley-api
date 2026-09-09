import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@generated/prisma';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class InvitationRepository {
    constructor(private readonly prisma: PrismaService) {}

    create(data: {
        email: string;
        role: UserRole;
        invitationCode: string;
        expiresAt: Date;
        invitedById?: string;
    }) {
        return this.prisma.db.userInvitation.create({
            data,
            include: {
                invitedBy: { select: { id: true, name: true, email: true } },
            },
        });
    }

    findByCode(invitationCode: string) {
        return this.prisma.db.userInvitation.findUnique({
            where: { invitationCode },
            include: {
                invitedBy: { select: { id: true, name: true, email: true } },
                usedBy: { select: { id: true, name: true, email: true } },
            },
        });
    }

    findById(id: string) {
        return this.prisma.db.userInvitation.findUnique({
            where: { id },
            include: {
                invitedBy: { select: { id: true, name: true, email: true } },
                usedBy: { select: { id: true, name: true, email: true } },
            },
        });
    }

    findByEmail(email: string) {
        return this.prisma.db.userInvitation.findFirst({
            where: { email: email.toLowerCase(), isUsed: false, expiresAt: { gt: new Date() } },
        });
    }

    async findAll(params: {
        skip: number;
        take: number;
        search?: string;
        role?: UserRole;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        const { skip, take, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = params;

        const where: Prisma.UserInvitationWhereInput = {};

        if (search) {
            where.email = { contains: search, mode: 'insensitive' };
        }

        if (role) {
            where.role = role;
        }

        if (status && status !== 'ALL') {
            const now = new Date();
            if (status === 'PENDING') {
                where.isUsed = false;
                where.expiresAt = { gt: now };
            } else if (status === 'USED') {
                where.isUsed = true;
            } else if (status === 'EXPIRED') {
                where.isUsed = false;
                where.expiresAt = { lte: now };
            }
        }

        const [data, total] = await this.prisma.db.$transaction([
            this.prisma.db.userInvitation.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    invitedBy: { select: { id: true, name: true, email: true } },
                    usedBy: { select: { id: true, name: true, email: true } },
                },
            }),
            this.prisma.db.userInvitation.count({ where }),
        ]);

        return { data, total };
    }

    update(id: string, data: Prisma.UserInvitationUpdateInput) {
        return this.prisma.db.userInvitation.update({
            where: { id },
            data,
            include: {
                invitedBy: { select: { id: true, name: true, email: true } },
                usedBy: { select: { id: true, name: true, email: true } },
            },
        });
    }

    markAsUsed(invitationCode: string, userId: string) {
        return this.prisma.db.userInvitation.update({
            where: { invitationCode },
            data: {
                isUsed: true,
                usedAt: new Date(),
                usedById: userId,
            },
        });
    }

    delete(id: string) {
        return this.prisma.db.userInvitation.delete({ where: { id } });
    }
}
