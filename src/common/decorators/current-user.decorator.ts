import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // better-auth sets request.user as { user, session }
    const sessionUser = request.user?.user ?? request.user;

    if (!sessionUser) {
        throw new UnauthorizedException('User not authenticated');
    }

    return sessionUser;
});
