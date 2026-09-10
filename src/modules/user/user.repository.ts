import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@generated/prisma';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    findById(id: string) {
        return this.prisma.db.user.findUnique({ where: { id } });
    }

    findByEmail(email: string) {
        return this.prisma.db.user.findUnique({ where: { email } });
    }

    findByPhoneNumber(phoneNumber: string) {
        return this.prisma.db.user.findUnique({ where: { phoneNumber } });
    }

    findMany(args?: Prisma.UserFindManyArgs) {
        return this.prisma.db.user.findMany(args);
    }

    count(where?: Prisma.UserWhereInput) {
        return this.prisma.db.user.count({ where });
    }

    /**
     * Runs findMany and count in a single database transaction (one round-trip).
     * Returns [rows, totalCount].
     */
    findManyWithCount(
        args: Prisma.UserFindManyArgs,
        where?: Prisma.UserWhereInput,
    ): Promise<[Awaited<ReturnType<typeof this.prisma.db.user.findMany>>, number]> {
        return this.prisma.db.$transaction([
            this.prisma.db.user.findMany(args),
            this.prisma.db.user.count({ where }),
        ]) as Promise<[Awaited<ReturnType<typeof this.prisma.db.user.findMany>>, number]>;
    }

    create(data: Prisma.UserCreateInput) {
        return this.prisma.db.user.create({ data });
    }

    update(id: string, data: Prisma.UserUpdateInput) {
        return this.prisma.db.user.update({ where: { id }, data });
    }

    updateMany(where: Prisma.UserWhereInput, data: Prisma.UserUpdateManyMutationInput) {
        return this.prisma.db.user.updateMany({ where, data });
    }

    updateLastLogin(id: string) {
        return this.prisma.db.user.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
    }

    softDelete(id: string) {
        return this.prisma.db.user.update({
            where: { id },
            data: { isActive: false },
        });
    }

    countActiveUsers(role: UserRole = UserRole.USER) {
        return this.prisma.db.user.count({
            where: { isActive: true, role },
        });
    }

    findActiveUsers(role: UserRole = UserRole.USER) {
        return this.prisma.db.user.findMany({
            where: { isActive: true, role },
            select: { id: true, name: true, email: true, image: true },
        });
    }

    findMemberUser(userId: string) {
        return this.prisma.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                createdAt: true,
            },
        });
    }
}
