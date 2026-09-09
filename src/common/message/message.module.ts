import { Module } from '@nestjs/common';
import { MessageService } from '@common/message/services/message.service';

@Module({
    providers: [MessageService],
    exports: [MessageService],
})
export class MessageModule {}
