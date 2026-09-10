import { betterAuth } from 'better-auth';
import { admin, openAPI } from 'better-auth/plugins';
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
        openAPI(),
    ],

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        autoSignIn: true,
        sendResetPassword: async ({ user, url, token }) => {
            console.log('\n======================================================');
            console.log(`🔑 [Better Auth] Password Reset Requested for: ${user.email}`);
            console.log(`🔗 Reset URL: ${url}`);
            console.log(`🎫 Verification Token: ${token}`);
            console.log('======================================================\n');
        },
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
                    const body = ctx?.body as {
                        phoneNumber?: string;
                        address?: string;
                        invitationCode?: string;
                    } | undefined;

                    const phoneNumber = (
                        (typeof user['phoneNumber'] === 'string' ? user['phoneNumber'] : undefined) ||
                        (typeof body?.phoneNumber === 'string' ? body.phoneNumber : undefined)
                    )?.trim();

                    if (phoneNumber) {
                        const existingUserWithPhone = await prismaClient.user.findUnique({
                            where: { phoneNumber },
                        });

                        if (existingUserWithPhone) {
                            throw new APIError('BAD_REQUEST', {
                                message: 'Phone number already exists',
                            });
                        }
                    }

                    const invitationCode =
                        typeof body?.invitationCode === 'string' ? body.invitationCode : undefined;
                    const address =
                        (typeof body?.address === 'string' ? body.address : undefined) ||
                        (typeof user['address'] === 'string' ? user['address'] : undefined);

                    if (!invitationCode) {
                        return {
                            data: {
                                ...user,
                                role: UserRole.USER,
                                ...(address ? { address } : {}),
                                ...(phoneNumber ? { phoneNumber } : {}),
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
                            ...(phoneNumber ? { phoneNumber } : {}),
                        },
                    };
                },
                after: async (user, ctx) => {
                    const body = ctx?.body as { invitationCode?: string } | undefined;
                    const invitationCode =
                        typeof body?.invitationCode === 'string' ? body.invitationCode : undefined;
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

    onAPIError: {
        onError(error, ctx) {
            if (error instanceof APIError) return;
            console.error('[BetterAuth Error]', error, { ctx });
        }
    }
});

export type Auth = typeof auth;
