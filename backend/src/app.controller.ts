import { Controller, Get } from "@nestjs/common"
import { AppService } from "./app.service"

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Get("health")
  getHealth() {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "NestJS API",
      database: "Neon PostgreSQL",
    }
  }

  @Get("test-db")
  async testDatabase() {
    return this.appService.testDatabaseConnection()
  }

  @Get("test-entities")
  async getTestEntities() {
    return this.appService.getAllTestEntities()
  }
}
