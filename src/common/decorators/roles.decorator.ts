import { UserRole } from '@generated/prisma';
import { SetMetadata } from '@nestjs/common';

export const Role = UserRole;
export type Role = UserRole;

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) =>
    SetMetadata(ROLES_KEY, roles);
