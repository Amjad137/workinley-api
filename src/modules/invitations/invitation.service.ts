import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InvitationRepository } from './invitation.repository';
import { CreateInvitationDto, InvitationQueryDto } from './dtos/invitation.dto';
import { PrismaService } from '@database/prisma.service';
import { ENTITY_SORT, IPaginationResult, SORT_BY } from '@database/interfaces/database.interface';
import { UserRole } from '@generated/prisma';
import * as crypto from 'crypto';

@Injectable()
export class InvitationService {
    private readonly logger = new Logger(InvitationService.name);

    constructor(
        private readonly repository: InvitationRepository,
        private readonly prisma: PrismaService,
    ) { }

    private getFrontendBaseUrl(): string {
        const trusted = process.env.TRUSTED_ORIGINS?.split(',')[0];
        return trusted || process.env.APP_URL || 'http://localhost:3000';
    }

    private logInvitationLink(email: string, role: string, inviteLink: string, expiresAt: Date) {
        const banner = `
======================================================
[USER INVITATION LINK GENERATED]
Sent To:     ${email}
Role:        ${role}
Invite Link: ${inviteLink}
Expires At:  ${expiresAt.toISOString()}
======================================================`;
        this.logger.log(banner);
        console.log(banner);
    }

    async create(dto: CreateInvitationDto, adminUserId?: string) {
        const email = dto.email.trim().toLowerCase();
        const role = dto.role || UserRole.USER;

        // Verify if user already exists
        const existingUser = await this.prisma.db.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictException('A user with this email address already exists');
        }

        // Check if there is an active unused invitation
        const activeInvite = await this.repository.findByEmail(email);
        if (activeInvite) {
            // Renew active invitation
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const updated = await this.repository.update(activeInvite.id, {
                role,
                expiresAt,
            });
            const inviteLink = `${this.getFrontendBaseUrl()}/auth/sign-up?invitation_code=${updated.invitationCode}`;
            this.logInvitationLink(updated.email, updated.role, inviteLink, expiresAt);
            return { ...updated, inviteLink };
        }

        const invitationCode = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation = await this.repository.create({
            email,
            role,
            invitationCode,
            expiresAt,
            invitedById: adminUserId,
        });

        const inviteLink = `${this.getFrontendBaseUrl()}/auth/sign-up?invitation_code=${invitationCode}`;
        this.logInvitationLink(invitation.email, invitation.role, inviteLink, expiresAt);

        return { ...invitation, inviteLink };
    }

    async findAll(query?: InvitationQueryDto): Promise<IPaginationResult<unknown>> {
        const page = query?.page ? Number(query.page) : 1;
        const limit = query?.limit ? Number(query.limit) : 12;
        const skip = (page - 1) * limit;

        const search = query?.search?.trim() || query?.search_key?.trim();
        const sortOrder = query?.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

        const { data, total } = await this.repository.findAll({
            skip,
            take: limit,
            search: search || undefined,
            role: query?.role,
            status: query?.status,
            sortBy: query?.sortBy || SORT_BY.DATE,
            sortOrder,
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    async validateCode(code: string) {
        if (!code || !code.trim()) {
            throw new BadRequestException('Invitation code is required');
        }

        const invitation = await this.repository.findByCode(code.trim());

        if (!invitation) {
            throw new BadRequestException('Invalid invitation code');
        }

        if (invitation.isUsed) {
            throw new BadRequestException('This invitation has already been used');
        }

        if (new Date(invitation.expiresAt) < new Date()) {
            throw new BadRequestException('This invitation has expired');
        }

        return {
            valid: true,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
        };
    }

    async resend(id: string) {
        const invitation = await this.repository.findById(id);
        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.isUsed) {
            throw new BadRequestException('Cannot resend an already used invitation');
        }

        // Renew expiration for 7 days
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const updated = await this.repository.update(id, { expiresAt });

        const inviteLink = `${this.getFrontendBaseUrl()}/auth/sign-up?invitation_code=${updated.invitationCode}`;
        this.logInvitationLink(updated.email, updated.role, inviteLink, expiresAt);

        return { ...updated, inviteLink };
    }

    async delete(id: string) {
        const invitation = await this.repository.findById(id);
        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        await this.repository.delete(id);
        return { message: 'Invitation deleted successfully' };
    }
}
