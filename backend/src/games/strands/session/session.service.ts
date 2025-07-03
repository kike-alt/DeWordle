import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Puzzle } from '../../../puzzle/entities/puzzle.entity';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AddWordDto } from './dto/add-word.dto';
import { UseHintDto } from './dto/use-hint.dto';
import { getConnection } from 'typeorm';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Puzzle)
    private readonly puzzleRepository: Repository<Puzzle>,
  ) {}

  /**
   * Create a new game session for a user and puzzle
   */
  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const { userId, puzzleId } = createSessionDto;

    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify puzzle exists
    const puzzle = await this.puzzleRepository.findOne({
      where: { id: String(puzzleId) },
    });
    if (!puzzle) {
      throw new NotFoundException(`Puzzle with ID ${puzzleId} not found`);
    }

    // Check if session already exists for this user and puzzle
    const existingSession = await this.sessionRepository.findOne({
      where: { userId, puzzleId },
    });

    if (existingSession) {
      throw new BadRequestException(
        'Session already exists for this user and puzzle',
      );
    }

    const session = this.sessionRepository.create({
      userId,
      puzzleId,
      foundWords: [],
      nonThemeWords: [],
      earnedHints: 0,
      activeHint: null,
      isCompleted: false,
    });

    return await this.sessionRepository.save(session);
  }

  /**
   * Get all sessions with optional filtering
   */
  async findAll(userId?: number, puzzleId?: number): Promise<Session[]> {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('session.puzzle', 'puzzle');

    if (userId) {
      query.andWhere('session.userId = :userId', { userId });
    }

    if (puzzleId) {
      query.andWhere('session.puzzleId = :puzzleId', { puzzleId });
    }

    return await query.getMany();
  }

  /**
   * Get a specific session by ID
   */
  async findOne(id: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['user', 'puzzle'],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
  }

  /**
   * Get session by user and puzzle
   */
  async findByUserAndPuzzle(
    userId: number,
    puzzleId: number,
  ): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { userId, puzzleId },
      relations: ['user', 'puzzle'],
    });

    if (!session) {
      throw new NotFoundException(
        `Session not found for user ${userId} and puzzle ${puzzleId}`,
      );
    }

    return session;
  }

  /**
   * Update session data
   */
  async update(
    id: number,
    updateSessionDto: UpdateSessionDto,
  ): Promise<Session> {
    const session = await this.findOne(id);

    Object.assign(session, updateSessionDto);

    return await this.sessionRepository.save(session);
  }

  /**
   * Add a word to the session (theme or non-theme)
   */
  async addWord(id: number, addWordDto: AddWordDto): Promise<Session> {
    const session = await this.findOne(id);
    const { word, isThemeWord } = addWordDto;

    if (session.isCompleted) {
      throw new BadRequestException('Cannot add words to a completed session');
    }

    // Check if word already exists in either array
    if (
      session.foundWords.includes(word) ||
      session.nonThemeWords.includes(word)
    ) {
      throw new BadRequestException('Word already found in this session');
    }

    if (isThemeWord) {
      session.foundWords.push(word);

      // Award hints for theme words (e.g., 1 hint per 3 theme words)
      if (session.foundWords.length % 3 === 0) {
        session.earnedHints += 1;
      }
    } else {
      session.nonThemeWords.push(word);

      // Award hints for non-theme words (e.g., 1 hint per 5 non-theme words)
      if (session.nonThemeWords.length % 5 === 0) {
        session.earnedHints += 1;
      }
    }

    return await this.sessionRepository.save(session);
  }

  /**
   * Use a hint in the session
   */
  async useHint(id: number, useHintDto: UseHintDto): Promise<Session> {
    const session = await this.findOne(id);
    const { hintWord } = useHintDto;

    if (session.isCompleted) {
      throw new BadRequestException('Cannot use hints on a completed session');
    }

    if (session.earnedHints <= 0) {
      throw new BadRequestException('No hints available');
    }

    session.earnedHints -= 1;
    session.activeHint = hintWord;

    return await this.sessionRepository.save(session);
  }

  /**
   * Clear active hint
   */
  async clearHint(id: number): Promise<Session> {
    const session = await this.findOne(id);
    session.activeHint = null;

    return await this.sessionRepository.save(session);
  }

  /**
   * Mark session as completed and update user statistics
   */
  async completeSession(
    sessionId: number,
    earnedHints: number,
    spangramFound: boolean,
  ): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: session.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const today = new Date();
    const lastPlayedDate = user.userStats.lastPlayedDate;
    const isStreakContinued =
      lastPlayedDate &&
      new Date(lastPlayedDate).toDateString() ===
        new Date(today.setDate(today.getDate() - 1)).toDateString();

    user.userStats.totalPuzzlesCompleted += 1;
    user.userStats.totalHintsUsed += earnedHints;
    if (spangramFound) {
      user.userStats.totalSpangramsFound += 1;
    }

    if (isStreakContinued) {
      user.userStats.currentStreak += 1;
    } else {
      user.userStats.currentStreak = 1;
    }

    if (user.userStats.currentStreak > user.userStats.longestStreak) {
      user.userStats.longestStreak = user.userStats.currentStreak;
    }

    user.userStats.lastPlayedDate = today;

    await getConnection().transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.save(user);
      await transactionalEntityManager.save(session);
    });

    const sessions = await this.findOne(sessionId);

    if (sessions.isCompleted) {
      throw new BadRequestException('Session is already completed');
    }

    sessions.isCompleted = true;
    sessions.activeHint = null; // Clear any active hints

    return await this.sessionRepository.save(sessions);
  }

  /**
   * Delete a session
   */
  async remove(id: number): Promise<void> {
    const session = await this.findOne(id);
    await this.sessionRepository.remove(session);
  }

  /**
   * Get user statistics for Strands game
   */
  async getUserStats(userId: number): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalWordsFound: number;
    totalHintsEarned: number;
    averageWordsPerSession: number;
  }> {
    const sessions = await this.sessionRepository.find({
      where: { userId },
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.isCompleted).length;
    const totalWordsFound = sessions.reduce(
      (sum, s) => sum + s.foundWords.length + s.nonThemeWords.length,
      0,
    );
    const totalHintsEarned = sessions.reduce(
      (sum, s) => sum + s.earnedHints,
      0,
    );
    const averageWordsPerSession =
      totalSessions > 0 ? totalWordsFound / totalSessions : 0;

    return {
      totalSessions,
      completedSessions,
      totalWordsFound,
      totalHintsEarned,
      averageWordsPerSession: Math.round(averageWordsPerSession * 100) / 100,
    };
  }
}
