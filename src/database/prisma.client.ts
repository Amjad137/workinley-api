import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@generated/prisma';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

const adapter = new PrismaPg(pool);

// Single PrismaClient instance shared across the entire process.
// Do NOT import PrismaClient anywhere else - always import from here.
export const prismaClient = new PrismaClient({ adapter });
