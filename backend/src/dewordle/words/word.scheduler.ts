import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Word } from 'src/entities/word.entity';
import moment from 'moment-timezone';

/**
 * Legacy daily word scheduler.
 *
 * This scheduler relies on the `words` table's `isDaily` and `dailyDate`
 * columns to select one word per calendar day. During the Soroban migration
 * the canonical daily word selection will move to a Soroban contract that
 * deterministically selects a word from the onchain word pool.
 *
 * Transitional behaviour:
 * - Until the Soroban daily puzzle contract is fully deployed and the
 *   indexer projects daily puzzle state, this legacy cron remains active.
 * - Once the Soroban flow is stable (target: Wave 6), this entire class
 *   should be replaced by the Soroban-native schedule. All direct DB
 *   word-selection logic will be removed.
 * - For now, the scheduler is intentionally left as-is to avoid breaking
 *   the daily puzzle endpoint during migration overlap.
 *
 * @deprecated Will be removed after Soroban daily puzzle contract
 *   deployment is verified and the indexer projects daily puzzle state.
 */
@Injectable()
export class WordScheduler implements OnModuleInit {
  private readonly logger = new Logger(WordScheduler.name);

  constructor(
    @InjectRepository(Word)
    private readonly wordRepo: Repository<Word>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureTodayWord();
  }

  @Cron(process.env.DAILY_WORD_SCHEDULE || CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyWordSelection() {
    await this.ensureTodayWord();
  }

  async ensureTodayWord() {
    const timezone =
      this.configService.get<string>('DAILY_WORD_TIMEZONE') || 'UTC';
    const today = moment().tz(timezone).startOf('day').format('YYYY-MM-DD');
    const todayDate = new Date(today);

    const existing = await this.wordRepo.findOneBy({ dailyDate: todayDate });
    if (existing) {
      this.logger.log(
        `Daily word for ${today} already selected: ${existing.word}`,
      );
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const unusedWord = await manager.findOne(Word, {
        where: { isDaily: false },
        order: { createdAt: 'ASC' },
      });

      if (!unusedWord) {
        this.logger.warn('Word pool exhausted. Resetting...');
        await manager.update(Word, { id: Not(IsNull()) }, { isDaily: false });
        return;
      }

      unusedWord.isDaily = true;
      unusedWord.dailyDate = todayDate;
      await manager.save(unusedWord);
      this.logger.log(`Selected new daily word: ${unusedWord.word}`);
    });
  }
}
