import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for your frontend
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Set global prefix for API routes
    app.setGlobalPrefix('api/v1');

    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Your Project Title')
      .setDescription('API documentation for your project')
      .setVersion('1.0')
      .addBearerAuth() // if using JWT
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
    logger.log(`📘 Swagger docs available at: http://localhost:${port}/api`);
    logger.log(`🗄️  Database connection established successfully`);
  } catch (error) {
    logger.error('❌ Error starting the application', error);
    process.exit(1);
  }
}

bootstrap();
