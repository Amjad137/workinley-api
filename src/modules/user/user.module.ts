import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/user.service';
import { UserController } from '@modules/user/user.controller';
import { UserRepository } from '@modules/user/user.repository';

@Module({
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserService, UserRepository],
})
export class UserModule { }
