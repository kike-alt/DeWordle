import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { MetricsService } from './dewordle/metrics/metrics.service';
import { MetricsInterceptor } from './common/metrics.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    const metricsService = app.get(MetricsService);
    app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

    // Restrict CORS to the configured frontend origin.
    // In development FRONTEND_URL defaults to http://localhost:3000.
    const allowedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    app.enableCors({
      origin: allowedOrigin,
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1');

    const config = new DocumentBuilder()
      .setTitle('DeWordle API')
      .setDescription('Backend API for DeWordle game services')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = Number.parseInt(process.env.PORT ?? '3000', 10);
    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}/api/v1`);
    logger.log(`Swagger docs available at: http://localhost:${port}/api`);
  } catch (error) {
    logger.error('Error starting the application', error);
    process.exit(1);
  }
}

void bootstrap();
