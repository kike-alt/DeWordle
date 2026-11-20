import 'reflect-metadata';
import {
  toAuthSessionDto,
  toGameSessionDto,
  toLeaderboardEntryDto,
  toPublicUserDto,
  toUserDto,
  toWordDto,
} from './response-mappers';

const user: any = {
  id: 7,
  email: 'a@b.io',
  password: '$2b$hash',
  role: 'admin',
  username: 'ada',
  walletAddress: 'GABC',
  avatarUrl: null,
  digestOptIn: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  sessions: [{ id: 1 }],
};

describe('response mappers (#1536)', () => {
  it('public user DTO exposes only id, username and avatar', () => {
    expect(toPublicUserDto(user)).toEqual({ id: 7, username: 'ada', avatarUrl: null });
  });

  it('user DTO never includes password, role, timestamps or relations', () => {
    const dto = toUserDto(user);
    expect(dto).toEqual({
      id: 7,
      username: 'ada',
      avatarUrl: null,
      email: 'a@b.io',
      walletAddress: 'GABC',
    });
    for (const key of ['password', 'role', 'createdAt', 'updatedAt', 'sessions', 'digestOptIn']) {
      expect(dto).not.toHaveProperty(key);
    }
  });

  it('game session DTO drops the solution and the owning user', () => {
    const dto = toGameSessionDto({
      id: 1,
      score: 3,
      durationSeconds: 40,
      status: 'WON',
      metadata: { guestId: 'g' },
      playedAt: new Date(0),
      solution: 'crane',
      user,
      game: { id: 2, slug: 'w', name: 'W', description: 'd', type: 't', is_active: true, created_at: new Date(), sessions: [] },
    } as any);
    expect(dto).not.toHaveProperty('solution');
    expect(dto).not.toHaveProperty('user');
    expect(dto.game).toEqual({ id: 2, slug: 'w', name: 'W', description: 'd', type: 't', is_active: true });
  });

  it('leaderboard DTO reduces the user relation to id and username', () => {
    const dto = toLeaderboardEntryDto({
      id: 9,
      user,
      game: { id: 1 },
      totalScore: 10,
      wins: 2,
      totalSessions: 3,
      lastUpdated: new Date(0),
    } as any);
    expect(dto).toEqual({
      userId: 7,
      username: 'ada',
      totalScore: 10,
      wins: 2,
      totalSessions: 3,
      lastUpdated: new Date(0),
    });
  });

  it('word DTO exposes only public category metadata, not enrichment internals', () => {
    const dto = toWordDto({
      id: 'w1',
      word: 'crane',
      difficulty: 'EASY',
      status: 'approved',
      qualityScore: 0.9,
      sources: ['x'],
      metadata: { raw: 1, category: 'Nature' },
      isEnriched: true,
      isDaily: true,
      definition: 'a bird',
    } as any);
    expect(dto).toEqual({
      id: 'w1',
      word: 'crane',
      definition: 'a bird',
      example: null,
      partOfSpeech: null,
      phonetics: null,
      difficulty: 'EASY',
      category: 'Nature',
    });
    expect(toWordDto({ word: 'other', metadata: { category: { value: 'bad' } } } as any).category).toBeNull();
  });

  it('auth session DTO keeps device info but not the owning user', () => {
    const dto = toAuthSessionDto({
      id: 's',
      walletAddress: 'W',
      userAgent: 'UA',
      ipAddress: '1.1.1.1',
      isActive: true,
      lastAccessedAt: undefined,
      user,
      createdAt: new Date(0),
    } as any);
    expect(dto).not.toHaveProperty('user');
    expect(dto).not.toHaveProperty('walletAddress');
    expect(dto.lastAccessedAt).toBeNull();
  });
});
