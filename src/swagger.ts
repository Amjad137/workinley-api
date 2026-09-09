import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { writeFileSync } from 'fs';

export default async function swaggerInit(
    app: INestApplication,
): Promise<void> {
    const configService = app.get(ConfigService);
    const env: string = configService.get<string>('app.env');

    const docName: string = configService.get<string>('doc.name');
    const docDesc: string = configService.get<string>('doc.description');
    const docVersion: string = configService.get<string>('app.version');
    const docPrefix: string = configService.get<string>('doc.prefix');
    const globalPrefix: string = configService.get<string>('app.globalPrefix');

    if (env !== 'production') {
        const documentBuild = new DocumentBuilder()
            .setTitle(docName || 'APIs Specification')
            .setDescription(docDesc || 'APIs documentation')
            .setVersion(docVersion || '1.0')
            .addServer('/')
            .addTag('Auth', 'Authentication endpoints')
            .addTag('Users', 'User management endpoints')
            .addTag('Health', 'Health check endpoints')
            .build();

        const document = SwaggerModule.createDocument(app, documentBuild, {
            deepScanRoutes: true,
        });

        writeFileSync('swagger.json', JSON.stringify(document));
        const docsPath = docPrefix || `/${globalPrefix}/docs`;
        SwaggerModule.setup(docsPath, app, document, {
            jsonDocumentUrl: `${docsPath}/json`,
            yamlDocumentUrl: `${docsPath}/yaml`,
            explorer: true,
            customSiteTitle: docName || 'APIs Specification',
            swaggerOptions: {
                docExpansion: 'none',
                persistAuthorization: true,
                displayOperationId: true,
                operationsSorter: 'method',
                tagsSorter: 'alpha',
                tryItOutEnabled: true,
                filter: true,
                deepLinking: true,
            },
        });
    }
}
