import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WordSeederService } from './word-seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const seederService = app.get(WordSeederService);
    await seederService.seedWords();
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
