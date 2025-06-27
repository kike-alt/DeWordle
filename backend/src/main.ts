import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AppModule } from "./app.module"
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Global prefix
  app.setGlobalPrefix("api/v1")

  // Enable CORS
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:3001", configService.get("FRONTEND_URL")].filter(Boolean),
    credentials: true,
  })

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter())

  const port = configService.get("PORT") || 3000

  console.log("🚀 Starting Dewordle API...")
  console.log(`📊 Environment: ${configService.get("NODE_ENV")}`)
  console.log(`🌐 Port: ${port}`)
  console.log(`🔗 API URL: http://localhost:${port}/api/v1`)

  await app.listen(port)

  console.log("✅ Dewordle API is running successfully!")
  console.log(`📋 Health Check: http://localhost:${port}/api/v1/health`)
  console.log(`🗄️  Database Health: http://localhost:${port}/api/v1/health/db`)
}

bootstrap().catch((error) => {
  console.error("❌ Failed to start the application:", error)
  process.exit(1)
})
