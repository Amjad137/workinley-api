import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { Project, ProjectStatus } from '@generated/prisma';
import { ProjectRepository } from './project.repository';
import { CreateProjectDto, UpdateProjectDto } from './dtos/project.dto';
import { ENTITY_SORT, IPaginationQuery, IPaginationResult, SORT_BY } from '@database/interfaces/database.interface';

@Injectable()
export class ProjectService {
    constructor(private readonly projectRepo: ProjectRepository) { }

    async findAll(query?: IPaginationQuery & { status?: ProjectStatus }): Promise<IPaginationResult<Project>> {
        const {
            page = 1,
            limit = 20,
            search,
            sortBy = SORT_BY.DATE,
            sortOrder = ENTITY_SORT.DESC,
            status,
            createdFrom,
            createdTo,
        } = query ?? {};
        const skip = (page - 1) * limit;

        const createdAt = {
            ...(createdFrom ? { gte: new Date(createdFrom) } : {}),
            ...(createdTo ? { lte: new Date(createdTo) } : {}),
        };

        const where = {
            ...(status ? { status } : {}),
            ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { code: { contains: search, mode: 'insensitive' as const } },
                    ],
                }
                : {}),
        };

        const [data, total] = await this.projectRepo.findManyWithCount(
            { where, skip, take: limit, orderBy: { [sortBy]: sortOrder } },
            where,
        );

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        };
    }

    async findAllActive() {
        return this.projectRepo.findAll({
            where: { status: ProjectStatus.ACTIVE },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        const project = await this.projectRepo.findById(id);
        if (!project) throw new NotFoundException('Project not found');
        return project;
    }

    async create(dto: CreateProjectDto) {
        const existing = await this.projectRepo.findByCode(dto.code);
        if (existing) throw new ConflictException(`Project code "${dto.code}" is already in use`);
        return this.projectRepo.create({
            name: dto.name,
            code: dto.code,
            description: dto.description,
            color: dto.color ?? '#3B82F6',
        });
    }

    async update(id: string, dto: UpdateProjectDto) {
        await this.findById(id); // throws 404 if not found
        if (dto.code) {
            const existing = await this.projectRepo.findByCode(dto.code);
            if (existing && existing.id !== id) {
                throw new ConflictException(`Project code "${dto.code}" is already in use`);
            }
        }
        return this.projectRepo.update(id, dto);
    }

    async remove(id: string) {
        await this.findById(id);
        return this.projectRepo.delete(id);
    }

    async archive(id: string) {
        await this.findById(id);
        return this.projectRepo.update(id, { status: ProjectStatus.ARCHIVED });
    }
}
