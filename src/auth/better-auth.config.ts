import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prismaClient } from '@database/prisma.client';
import { UserRole } from '@generated/prisma';

export const auth = betterAuth({
    database: prismaAdapter(prismaClient, { provider: 'postgresql' }),

    plugins: [
        admin({
            defaultRole: UserRole.USER,
            adminRoles: [UserRole.ADMIN],
        }),
    ],

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        autoSignIn: true,
    },

    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    },

    databaseHooks: {
        user: {
            create: {
                before: async (user, ctx) => {
                    const invitationCode = ctx?.body?.invitationCode as string | undefined;
                    const address =
                        (ctx?.body?.address as string | undefined) ||
                        ((user as Record<string, unknown>).address as string | undefined);

                    if (!invitationCode) {
                        return {
                            data: {
                                ...user,
                                role: UserRole.USER,
                                ...(address ? { address } : {}),
                            },
                        };
                    }

                    const invitation = await prismaClient.userInvitation.findUnique({
                        where: { invitationCode },
                    });

                    if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
                        throw new APIError('BAD_REQUEST', {
                            message: 'Invalid, expired, or already used invitation code.',
                        });
                    }

                    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
                        throw new APIError('BAD_REQUEST', {
                            message: 'Email address does not match the invitation.',
                        });
                    }

                    return {
                        data: {
                            ...user,
                            role: invitation.role,
                            ...(address ? { address } : {}),
                        },
                    };
                },
                after: async (user, ctx) => {
                    const invitationCode = ctx?.body?.invitationCode as string | undefined;
                    if (invitationCode) {
                        await prismaClient.userInvitation.update({
                            where: { invitationCode },
                            data: {
                                isUsed: true,
                                usedAt: new Date(),
                                usedById: user.id,
                            },
                        });
                    }
                },
            },
        },
    },

    user: {
        additionalFields: {
            phoneNumber: {
                type: 'string',
                required: true,
            },
            address: {
                type: 'string',
                required: false,
            },

            // Server-owned fields - cannot be set via API input
            role: {
                // Derived from the Prisma enum - stays in sync automatically
                // Includes: USER | MANAGER | ADMIN
                type: Object.values(UserRole) as [string, ...string[]],
                required: false,
                defaultValue: UserRole.USER,
                input: false, // only server can set role
            },
            isActive: {
                type: 'boolean',
                required: false,
                defaultValue: true,
                input: false,
            },
            lastLoginAt: {
                type: 'string', // stored as DateTime in Prisma, ISO string over the wire
                required: false,
                input: false,
            },
        },
    },

    trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000').split(','),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.APP_URL,
});

export type Auth = typeof auth;
