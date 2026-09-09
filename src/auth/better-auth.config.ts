import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prismaClient } from '@database/prisma.client';
import { UserRole } from '@generated/prisma';

export const auth = betterAuth({
    database: prismaAdapter(prismaClient, { provider: 'postgresql' }),

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

            // Server-owned fields — cannot be set via API input
            role: {
                // Derived from the Prisma enum — stays in sync automatically
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
