import { NestFactory } from "@nestjs/core"
import { Logger } from "@nestjs/common"
import { AppModule } from "./app.module"

async function bootstrap() {
  const logger = new Logger("Bootstrap")

  try {
    const app = await NestFactory.create(AppModule)

    // Enable CORS for your frontend
    app.enableCors({
      origin: true,
      credentials: true,
    })

    // Set global prefix for API routes
    app.setGlobalPrefix("api/v1")

    const port = process.env.PORT || 3000
    await app.listen(port)

    logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`)
    logger.log(`🗄️  Database connection established successfully`)
  } catch (error) {
    logger.error("❌ Error starting the application", error)
    process.exit(1)
  }
}

bootstrap()
