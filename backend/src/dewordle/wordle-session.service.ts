import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WordleSession, GuessHistory } from './entities/wordle-session.entity';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { evaluateGuess } from './wordle.engine';

@Injectable()
export class WordleSessionService {
  constructor(
    @InjectRepository(WordleSession)
    private readonly wordleSessionRepo: Repository<WordleSession>,
  ) {}

  async findById(id: number): Promise<WordleSession> {
    const session = await this.wordleSessionRepo.findOne({
      where: { id },
      relations: ['targetWord', 'user'],
    });

    if (!session) {
      throw new NotFoundException('Wordle session not found');
    }

    return session;
  }

  async submitGuess(
    sessionId: number,
    submitGuessDto: SubmitGuessDto,
  ): Promise<WordleSession> {
    const session = await this.findById(sessionId);

    // Validate session is not completed
    if (session.isCompleted) {
      throw new BadRequestException('Game session is already completed');
    }

    // Validate attempts remaining
    if (session.attemptsRemaining <= 0) {
      throw new BadRequestException('No attempts remaining');
    }

    // Normalize guess to uppercase
    const guess = submitGuessDto.guess.toUpperCase().trim();

    // Validate guess length (additional validation)
    if (guess.length !== 5) {
      throw new BadRequestException('Guess must be exactly 5 letters long');
    }

    // Evaluate the guess using the wordle engine
    const result = evaluateGuess(guess, session.targetWord.word);

    // Create guess history entry
    const guessEntry: GuessHistory = {
      guess,
      result,
      timestamp: new Date(),
    };

    // Update session
    session.guessHistory = [...session.guessHistory, guessEntry];
    session.attemptsRemaining -= 1;

    // Check if won (all letters are correct)
    const isWon = result.every(
      (letterResult) => letterResult.status === 'correct',
    );

    if (isWon) {
      session.isWon = true;
      session.isCompleted = true;
      session.completedAt = new Date();
    } else if (session.attemptsRemaining === 0) {
      // Game over - no more attempts
      session.isCompleted = true;
      session.completedAt = new Date();
    }

    // Save and return updated session
    return await this.wordleSessionRepo.save(session);
  }
}
