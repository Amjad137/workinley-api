import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@generated/prisma';
import { UserRepository } from '@modules/user/user.repository';
import { UpdateUserDto, UserResponseDto } from '@modules/user/dtos/user.dto';
import { IPaginationQuery, IPaginationResult } from '@database/interfaces/database.interface';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) { }

    async findById(id: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findById(id);
        if (!user || !user.isActive) {
            throw new NotFoundException('User not found');
        }
        return this.toResponseDto(user);
    }

    async findAll(query?: IPaginationQuery): Promise<IPaginationResult<UserResponseDto>> {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } =
            query ?? {};
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            isActive: true,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [data, total] = await this.userRepository.findManyWithCount(
            {
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            },
            where,
        );

        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(u => this.toResponseDto(u)),
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

    async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
        const user = await this.userRepository.update(id, dto);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return this.toResponseDto(user);
    }

    async remove(id: string): Promise<void> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        await this.userRepository.softDelete(id);
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.userRepository.updateLastLogin(id);
    }

    toResponseDto(user: User): UserResponseDto {
        const { ...dto } = user;
        return dto as unknown as UserResponseDto;
    }
}
