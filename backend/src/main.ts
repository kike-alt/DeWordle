import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { RateLimitHeadersInterceptor } from './common/rate-limit-headers.interceptor';
import { MetricsService } from './dewordle/metrics/metrics.service';
import { MetricsInterceptor } from './common/metrics.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestContextLogger } from './common/request-context-logger';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

const DB_RETRY_ATTEMPTS = 10;
const DB_RETRY_BASE_DELAY_MS = 2000;

/**
 * Probes the PostgreSQL connection before bootstrapping the app.
 * Containers can start in any order, so retry transient connection
 * failures with exponential backoff instead of crashing immediately.
 */
async function waitForDatabaseConnection(logger: Logger): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  let attempt = 1;
  while (attempt <= DB_RETRY_ATTEMPTS) {
    try {
      await dataSource.initialize();
      await dataSource.destroy();
      logger.log('Database connection established');
      return;
    } catch (error) {
      if (attempt === DB_RETRY_ATTEMPTS) {
        logger.error(
          `Database connection failed after ${DB_RETRY_ATTEMPTS} attempts`,
        );
        throw error;
      }
      const delayMs = DB_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(
        `Database connection attempt ${attempt}/${DB_RETRY_ATTEMPTS} failed. ` +
          `Retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    await waitForDatabaseConnection(logger);

    const app = await NestFactory.create(AppModule);
    app.useLogger(new RequestContextLogger());
    app.useGlobalInterceptors(new RequestLoggingInterceptor());

    // Issue #1212: HSTS security headers (max-age=31536000, includeSubDomains).
    applySecurityHeaders(app);

    const metricsService = app.get(MetricsService);
    app.useGlobalInterceptors(
      new MetricsInterceptor(metricsService),
      new TimeoutInterceptor(),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    const allowedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    app.enableCors({
      origin: allowedOrigin,
      credentials: true,
    });

    app.useGlobalPipes(createValidationPipe());

    // Honours @Exclude() on entity fields for anything that still gets serialised.
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new RateLimitHeadersInterceptor(),
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
