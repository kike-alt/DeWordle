/**
 * Explicit response DTOs and mappers (#1536).
 *
 * Controllers must return these instead of TypeORM entities so that internal
 * columns (timestamps, status flags, token hashes, relations that were loaded
 * for other reasons) are never serialised by accident. The CI test in
 * `common/security/controller-return-types.spec.ts` enforces this.
 */
import type { User } from '../../auth/entities/user.entity';
import type { AuthSession } from '../../auth/entities/auth-session.entity';
import type { Game } from '../../games/entities/game.entity';
import type { GameSession } from '../../game-sessions/entities/game-session.entity';
import type { LeaderboardEntry } from '../../leaderboard/leaderboard-entry.entity';
import type { Word } from '../../entities/word.entity';
import type { TestEntity } from '../../entities/test.entity';
import type { AuditTrailEntity } from '../../indexer/entities/audit-trail.entity';

/** What anyone may see about a player. */
export class PublicUserDto {
  id: number;
  username: string | null;
  avatarUrl: string | null;
}

/** What a player (or an admin acting on them) may see about an account. */
export class UserDto extends PublicUserDto {
  email: string;
  walletAddress: string | null;
}

export class AuthSessionDto {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastAccessedAt: Date | null;
  createdAt: Date;
}

export class GameDto {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
}

export class GameSessionDto {
  id: number;
  score: number;
  durationSeconds: number;
  status: string;
  metadata: Record<string, unknown> | null;
  playedAt: Date;
  game?: GameDto;
}

export class LeaderboardEntryDto {
  userId: number | null;
  username: string | null;
  totalScore: number;
  wins: number;
  totalSessions: number;
  lastUpdated: Date;
}

export class WordDto {
  id: string;
  word: string;
  definition: string | null;
  example: string | null;
  partOfSpeech: string | null;
  phonetics: string | null;
  difficulty: string;
  category: string | null;
}

export class TestEntityDto {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export class AuditTrailDto {
  id: number;
  action: string;
  actor: string | null;
  details: Record<string, unknown> | null;
  targetResource: string | null;
  network: string | null;
  createdAt: Date;
}

const orNull = <T>(v: T | undefined | null): T | null => v ?? null;

export const toPublicUserDto = (u: User): PublicUserDto => ({
  id: u.id,
  username: orNull(u.username),
  avatarUrl: orNull(u.avatarUrl),
});

export const toUserDto = (u: User): UserDto => ({
  ...toPublicUserDto(u),
  email: u.email,
  walletAddress: orNull(u.walletAddress),
});

export const toAuthSessionDto = (s: AuthSession): AuthSessionDto => ({
  id: s.id,
  userAgent: orNull(s.userAgent),
  ipAddress: orNull(s.ipAddress),
  isActive: s.isActive,
  lastAccessedAt: orNull(s.lastAccessedAt),
  createdAt: s.createdAt,
});

export const toGameDto = (g: Game): GameDto => ({
  id: g.id,
  slug: g.slug,
  name: g.name,
  description: g.description,
  type: g.type,
  is_active: g.is_active,
});

export const toGameSessionDto = (s: GameSession): GameSessionDto => ({
  id: s.id,
  score: s.score,
  durationSeconds: s.durationSeconds,
  status: s.status,
  metadata: orNull(s.metadata),
  playedAt: s.playedAt,
  ...(s.game ? { game: toGameDto(s.game) } : {}),
});

export const toLeaderboardEntryDto = (e: LeaderboardEntry): LeaderboardEntryDto => ({
  userId: e.user?.id ?? null,
  username: orNull(e.user?.username),
  totalScore: e.totalScore,
  wins: e.wins,
  totalSessions: e.totalSessions,
  lastUpdated: e.lastUpdated,
});

export const toWordDto = (w: Word): WordDto => ({
  id: w.id,
  word: w.word,
  definition: orNull(w.definition),
  example: orNull(w.example),
  partOfSpeech: orNull(w.partOfSpeech),
  phonetics: orNull(w.phonetics),
  difficulty: w.difficulty,
  category:
    typeof w.metadata?.category === 'string' ? w.metadata.category : null,
});

export const toTestEntityDto = (t: TestEntity): TestEntityDto => ({
  id: t.id,
  name: t.name,
  description: orNull(t.description),
  isActive: t.isActive,
});

export const toAuditTrailDto = (a: AuditTrailEntity): AuditTrailDto => ({
  id: a.id,
  action: a.action,
  actor: orNull(a.actor),
  details: orNull(a.details),
  targetResource: orNull(a.targetResource),
  network: orNull(a.network),
  createdAt: a.createdAt,
});
