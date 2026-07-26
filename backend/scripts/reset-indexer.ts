import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  const mode = process.argv[2] || 'cursor';
  const confirm = process.argv[3];

  if (confirm !== '--confirm') {
    console.error(
      `Usage: npx ts-node scripts/reset-indexer.ts <cursor|projection|all> --confirm`,
    );
    console.error(`  cursor     - Reset indexer cursor to genesis`);
    console.error(`  projection - Clear all projection data`);
    console.error(`  all        - Reset both cursor and projections`);
    await app.close();
    process.exit(1);
  }

  const network =
    configService.get<string>('SOROBAN_NETWORK') || 'testnet';
  const streamKey = 'core_game_events';

  if (mode === 'cursor' || mode === 'all') {
    await dataSource.query(
      `DELETE FROM indexer_cursors WHERE network = $1 AND "streamKey" = $2`,
      [network, streamKey],
    );
    console.log(`Cursor reset for ${network}/${streamKey}`);
  }

  if (mode === 'projection' || mode === 'all') {
    await dataSource.query(`DELETE FROM session_projections`);
    console.log('Projection data cleared');
  }

  await app.close();
  console.log('Reset complete. Run typeorm:migration:run to re-sync if needed.');
}

bootstrap().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
