import { Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { InvitationRepository } from './invitation.repository';

@Module({
    controllers: [InvitationController],
    providers: [InvitationService, InvitationRepository],
    exports: [InvitationService, InvitationRepository],
})
export class InvitationModule {}
