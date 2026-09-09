import 'dotenv/config';
import { auth } from '@auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/client';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

async function seed() {
    await auth.api.signUpEmail({
        body: {
            email: 'admin@my.dev',
            password: 'Admin@1234',
            name: 'Super Admin',
            phoneNumber: '+1234567890',
        },
    });

    await prisma.user.update({
        where: { email: 'admin@my.dev' },
        data: { role: 'ADMIN', name: 'Super Admin' },
    });

    console.log('Seed complete');
    await prisma.$disconnect();
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
