import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { UserRole } from '@generated/prisma';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true; // No specific roles required
        }

        const request = context.switchToHttp().getRequest();

        // better-auth guard sets request.user as the session object { user, session }
        // The user object contains the role field from the Prisma User model.
        const sessionUser = request.user?.user ?? request.user;

        if (!sessionUser) {
            return false; // No user authenticated
        }

        return requiredRoles.some(role => sessionUser.role === role);
    }
}
