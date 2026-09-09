import { registerAs } from '@nestjs/config';

export default registerAs(
    'aws',
    (): Record<string, unknown> => ({
        s3: {
            presignExpired: 30 * 60, // 30 mins
            credential: {
                key: process.env.AWS_ACCESS_KEY_ID,
                secret: process.env.AWS_SECRET_ACCESS_KEY,
            },
            region: process.env.AWS_REGION,
            bucket: process.env.S3_BUCKET_NAME,
            baseUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
        },
    }),
);
