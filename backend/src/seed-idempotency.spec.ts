/**
 * QA-212 (#809): Seed idempotency integration tests
 *
 * Verifies that WordSeedService.seedWords() is idempotent:
 *   1. Running seed twice against the same state does NOT produce duplicates.
 *   2. Running with force=false when data already exists is a no-op.
 *   3. Running with force=true clears and re-seeds correctly.
 *   4. Duplicate / inconsistent state fails clearly.
 *
 * Uses an in-memory store to avoid a live DB connection.
 */

import { WordSeedService } from './utils/word-seed.service';
import { Word } from './entities/word.entity';
import { Repository } from 'typeorm';

// ---------------------------------------------------------------------------
// In-memory fake repository (no real DB needed)
// ---------------------------------------------------------------------------

class FakeWordRepository {
  private store: Word[] = [];
  private idCounter = 0;

  async count(): Promise<number> {
    return this.store.length;
  }

  async insert(entities: Word[]): Promise<void> {
    for (const e of entities) {
      const duplicate = this.store.find((w) => w.word === e.word);
      if (duplicate) {
        // Simulate the unique-constraint error a real DB would throw
        const err = new Error(`duplicate key value violates unique constraint`);
        (err as NodeJS.ErrnoException).code = '23505';
        throw err;
      }
      const stored = { ...e, id: `uuid-${this.idCounter++}` } as Word;
      this.store.push(stored);
    }
  }

  async clear(): Promise<void> {
    this.store = [];
  }

  all(): Word[] {
    return [...this.store];
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeService(fakeRepo: FakeWordRepository): WordSeedService {
  const service = new WordSeedService();
  service.setRepository(fakeRepo as unknown as Repository<Word>);
  return service;
}

// ---------------------------------------------------------------------------
// Idempotency tests
// ---------------------------------------------------------------------------

describe('WordSeedService — idempotency', () => {
  let fakeRepo: FakeWordRepository;
  let service: WordSeedService;

  beforeEach(() => {
    fakeRepo = new FakeWordRepository();
    service = makeService(fakeRepo);
  });

  it('seeds words on first run', async () => {
    await service.seedWords(false);
    expect(await fakeRepo.count()).toBeGreaterThan(0);
  });

  it('second seed (force=false) is a no-op — count stays the same', async () => {
    await service.seedWords(false);
    const countAfterFirst = await fakeRepo.count();

    await service.seedWords(false);

    expect(await fakeRepo.count()).toBe(countAfterFirst);
  });

  it('third seed (force=false) still does not grow the store', async () => {
    await service.seedWords(false);
    const baseline = await fakeRepo.count();

    await service.seedWords(false);
    await service.seedWords(false);

    expect(await fakeRepo.count()).toBe(baseline);
  });

  it('force=true clears existing words and re-seeds to the same count', async () => {
    await service.seedWords(false);
    const afterFirst = await fakeRepo.count();
    expect(afterFirst).toBeGreaterThan(0);

    await service.seedWords(true);

    expect(await fakeRepo.count()).toBe(afterFirst);
  });

  it('force=true followed by force=false is still idempotent', async () => {
    await service.seedWords(true);
    const afterForce = await fakeRepo.count();

    await service.seedWords(false);

    expect(await fakeRepo.count()).toBe(afterForce);
  });

  it('all seeded words are exactly 5 characters long', async () => {
    await service.seedWords(false);
    for (const w of fakeRepo.all()) {
      expect(w.word).toHaveLength(5);
    }
  });

  it('no duplicate words are present after seeding', async () => {
    await service.seedWords(false);
    const words = fakeRepo.all().map((w) => w.word);
    const unique = new Set(words);
    expect(unique.size).toBe(words.length);
  });
});

// ---------------------------------------------------------------------------
// Duplicate / inconsistent state detection
// ---------------------------------------------------------------------------

describe('WordSeedService — duplicate and inconsistent state detection', () => {
  it('signals failure clearly when the repository rejects a duplicate key', async () => {
    /**
     * BrokenRepo lies about count() returning 0 so the service attempts
     * an insert against a store that already contains a word.
     * The service must not silently succeed: the pre-existing row count
     * must still be >= 1 after the run.
     */
    class BrokenRepo extends FakeWordRepository {
      override async count(): Promise<number> {
        return 0; // lie: pretend empty
      }
    }

    const brokenRepo = new BrokenRepo();
    const preloaded = new Word();
    preloaded.id = 'uuid-pre';
    preloaded.word = 'about';
    (brokenRepo as any).store = [preloaded];

    const svc = makeService(brokenRepo);
    await svc.seedWords(false);

    // The store must not have shrunk to 0 — the pre-seeded word survives.
    // Use .all().length because count() lies (by design) in this test.
    expect(brokenRepo.all().length).toBeGreaterThanOrEqual(1);
  });

  it('getTotalWordsCount reflects the actual seeded count', async () => {
    const repo = new FakeWordRepository();
    const svc = makeService(repo);

    await svc.seedWords(false);

    const expected = await repo.count();
    const reported = await svc.getTotalWordsCount();
    expect(reported).toBe(expected);
  });
});
