import { Injectable, Logger } from "@nestjs/common"
import { Repository } from "typeorm"
import { TestEntity } from "./entities/test.entity"
import { InjectRepository } from "@nestjs/typeorm/dist/common/typeorm.decorators"

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name)

  constructor(@InjectRepository(TestEntity) private testRepository: Repository<TestEntity>) {}

  getHello(): string {
    return "Hello World! NestJS app connected to Neon PostgreSQL Database 🚀"
  }

  async testDatabaseConnection(): Promise<any> {
    try {
      // Test database connection by creating a test record
      const testEntity = this.testRepository.create({
        name: "Database Connection Test",
        description: "This entity confirms successful database connection",
        isActive: true,
      })

      const savedEntity = await this.testRepository.save(testEntity)
      this.logger.log("✅ Database connection test successful")

      return {
        success: true,
        message: "Database connection successful",
        testEntity: savedEntity,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      this.logger.error("❌ Database connection test failed", error)
      return {
        success: false,
        message: "Database connection failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  async getAllTestEntities(): Promise<TestEntity[]> {
    return this.testRepository.find({
      order: { createdAt: "DESC" },
    })
  }
}
