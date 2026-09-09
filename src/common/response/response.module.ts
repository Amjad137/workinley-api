import { Module } from '@nestjs/common';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';

@Module({
    providers: [ResponseInterceptor],
    exports: [ResponseInterceptor],
})
export class ResponseModule {}
