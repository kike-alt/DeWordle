import { Test } from '@nestjs/testing';
import { WordSuggestionService } from './word-suggestion.service';
import { GameService } from '../game/game.service';

// #1703: voting fraud detection
describe('WordSuggestionService voting fraud detection', () => {
  let service: any;
  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [WordSuggestionService] }).compile();
    service = mod.get(WordSuggestionService);
  });

  it('rejects a second vote from the same user on the same suggestion', async () => {
    await service.vote({ suggestionId: 1, userId: 'u1', value: 1 });
    await expect(service.vote({ suggestionId: 1, userId: 'u1', value: 1 })).rejects.toBeDefined();
  });

  it('flags rapid votes from one user across many suggestions', async () => {
    const attempts = Array.from({ length: 50 }, (_, i) => service.vote({ suggestionId: i, userId: 'bot', value: 1 }).catch((e: unknown) => e));
    const results = await Promise.all(attempts);
    expect(results.some((r) => r instanceof Error)).toBe(true);
  });
});

// #1704: 100 concurrent game sessions
describe('GameService stress: 100 concurrent sessions', () => {
  it('starts 100 sessions concurrently with unique ids and no failures', async () => {
    const mod = await Test.createTestingModule({ providers: [GameService] }).compile();
    const game = mod.get(GameService) as any;
    const sessions = await Promise.all(
      Array.from({ length: 100 }, (_, i) => game.startSession({ playerId: `player-${i}` })),
    );
    const ids = new Set(sessions.map((s: any) => s.id));
    expect(ids.size).toBe(100);
  }, 30000);
});
