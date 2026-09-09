import { ENVIRONMENT } from '@app/dtos/app.env.dto';
import { registerAs } from '@nestjs/config';
import { version } from 'package.json';

export default registerAs(
    'app',
    (): Record<string, unknown> => ({
        env: (process.env.NODE_ENV as ENVIRONMENT) || ENVIRONMENT.DEVELOPMENT,
        timezone: process.env.APP_TZ || 'UTC',
        url: process.env.APP_URL,
        http: {
            host: process.env.APP_HOST,
            port: Number(process.env.APP_PORT),
        },
        globalPrefix: process.env.APP_GLOBAL_PREFIX || 'api',
        urlVersion: {
            enable: process.env.APP_URL_VERSION_ENABLE === 'true',
            prefix: process.env.APP_URL_VERSION_PREFIX || 'v',
            version: process.env.APP_URL_VERSION || '1',
        },
        version,
    }),
);
