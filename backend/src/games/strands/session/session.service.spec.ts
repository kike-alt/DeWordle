import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { SessionService } from "./session.service"
import { Session } from "./entities/session.entity"
import { User } from "../../../users/entities/user.entity"
import { Puzzle } from "../../../puzzle/entities/puzzle.entity"
import { NotFoundException, BadRequestException } from "@nestjs/common"

describe("SessionService", () => {
  let service: SessionService
  let sessionRepository: Repository<Session>
  let userRepository: Repository<User>
  let puzzleRepository: Repository<Puzzle>

  const mockSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockUserRepository = {
    findOne: jest.fn(),
  }

  const mockPuzzleRepository = {
    findOne: jest.fn(),
  }

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Puzzle),
          useValue: mockPuzzleRepository,
        },
      ],
    }).compile()

    service = module.get<SessionService>(SessionService)
    sessionRepository = module.get<Repository<Session>>(getRepositoryToken(Session))
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    puzzleRepository = module.get<Repository<Puzzle>>(getRepositoryToken(Puzzle))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    const createSessionDto = { userId: 1, puzzleId: 1 }
    const mockUser = { id: 1, email: "test@example.com" }
    const mockPuzzle = { id: 1, title: "Test Puzzle" }

    it("should create a new session successfully", async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        puzzleId: 1,
        foundWords: [],
        nonThemeWords: [],
        earnedHints: 0,
        activeHint: null,
        isCompleted: false,
      }

      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockPuzzleRepository.findOne.mockResolvedValue(mockPuzzle)
      mockSessionRepository.findOne.mockResolvedValue(null)
      mockSessionRepository.create.mockReturnValue(mockSession)
      mockSessionRepository.save.mockResolvedValue(mockSession)

      const result = await service.create(createSessionDto)

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
      expect(mockPuzzleRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
      expect(mockSessionRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, puzzleId: 1 },
      })
      expect(mockSessionRepository.create).toHaveBeenCalledWith({
        userId: 1,
        puzzleId: 1,
        foundWords: [],
        nonThemeWords: [],
        earnedHints: 0,
        activeHint: null,
        isCompleted: false,
      })
      expect(result).toEqual(mockSession)
    })

    it("should throw NotFoundException when user does not exist", async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      await expect(service.create(createSessionDto)).rejects.toThrow(new NotFoundException("User with ID 1 not found"))
    })

    it("should throw NotFoundException when puzzle does not exist", async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockPuzzleRepository.findOne.mockResolvedValue(null)

      await expect(service.create(createSessionDto)).rejects.toThrow(
        new NotFoundException("Puzzle with ID 1 not found"),
      )
    })

    it("should throw BadRequestException when session already exists", async () => {
      const existingSession = { id: 1, userId: 1, puzzleId: 1 }

      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockPuzzleRepository.findOne.mockResolvedValue(mockPuzzle)
      mockSessionRepository.findOne.mockResolvedValue(existingSession)

      await expect(service.create(createSessionDto)).rejects.toThrow(
        new BadRequestException("Session already exists for this user and puzzle"),
      )
    })
  })

  describe("findAll", () => {
    it("should return all sessions when no filters provided", async () => {
      const mockSessions = [
        { id: 1, userId: 1, puzzleId: 1 },
        { id: 2, userId: 2, puzzleId: 1 },
      ]

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getMany.mockResolvedValue(mockSessions)

      const result = await service.findAll()

      expect(mockSessionRepository.createQueryBuilder).toHaveBeenCalledWith("session")
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith("session.user", "user")
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith("session.puzzle", "puzzle")
      expect(result).toEqual(mockSessions)
    })

    it("should filter by userId when provided", async () => {
      const mockSessions = [{ id: 1, userId: 1, puzzleId: 1 }]

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getMany.mockResolvedValue(mockSessions)

      const result = await service.findAll(1)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("session.userId = :userId", { userId: 1 })
      expect(result).toEqual(mockSessions)
    })
  })

  describe("addWord", () => {
    const mockSession = {
      id: 1,
      userId: 1,
      puzzleId: 1,
      foundWords: [],
      nonThemeWords: [],
      earnedHints: 0,
      activeHint: null,
      isCompleted: false,
    }

    it("should add theme word and award hint when threshold reached", async () => {
      const sessionWithWords = {
        ...mockSession,
        foundWords: ["WORD1", "WORD2"], // 2 words already found
      }

      jest.spyOn(service, "findOne").mockResolvedValue(sessionWithWords as Session)
      mockSessionRepository.save.mockResolvedValue({
        ...sessionWithWords,
        foundWords: ["WORD1", "WORD2", "WORD3"],
        earnedHints: 1,
      })

      const result = await service.addWord(1, { word: "WORD3", isThemeWord: true })

      expect(result.foundWords).toContain("WORD3")
      expect(result.earnedHints).toBe(1)
    })

    it("should throw BadRequestException when session is completed", async () => {
      const completedSession = { ...mockSession, isCompleted: true }

      jest.spyOn(service, "findOne").mockResolvedValue(completedSession as Session)

      await expect(service.addWord(1, { word: "WORD", isThemeWord: true })).rejects.toThrow(
        new BadRequestException("Cannot add words to a completed session"),
      )
    })

    it("should throw BadRequestException when word already exists", async () => {
      const sessionWithWord = {
        ...mockSession,
        foundWords: ["EXISTING"],
      }

      jest.spyOn(service, "findOne").mockResolvedValue(sessionWithWord as Session)

      await expect(service.addWord(1, { word: "EXISTING", isThemeWord: true })).rejects.toThrow(
        new BadRequestException("Word already found in this session"),
      )
    })
  })

  describe("useHint", () => {
    const mockSession = {
      id: 1,
      userId: 1,
      puzzleId: 1,
      foundWords: [],
      nonThemeWords: [],
      earnedHints: 2,
      activeHint: null,
      isCompleted: false,
    }

    it("should use hint successfully", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockSession as Session)
      mockSessionRepository.save.mockResolvedValue({
        ...mockSession,
        earnedHints: 1,
        activeHint: "HINT_WORD",
      })

      const result = await service.useHint(1, { hintWord: "HINT_WORD" })

      expect(result.earnedHints).toBe(1)
      expect(result.activeHint).toBe("HINT_WORD")
    })

    it("should throw BadRequestException when no hints available", async () => {
      const sessionWithoutHints = { ...mockSession, earnedHints: 0 }

      jest.spyOn(service, "findOne").mockResolvedValue(sessionWithoutHints as Session)

      await expect(service.useHint(1, { hintWord: "HINT" })).rejects.toThrow(
        new BadRequestException("No hints available"),
      )
    })
  })

  describe("completeSession", () => {
    const mockSession = {
      id: 1,
      userId: 1,
      puzzleId: 1,
      foundWords: ["WORD1", "WORD2"],
      nonThemeWords: [],
      earnedHints: 1,
      activeHint: "HINT",
      isCompleted: false,
    }

    const mockUser = {
      id: 1,
      userStats: {
        totalPuzzlesCompleted: 0,
        totalHintsUsed: 0,
        totalSpangramsFound: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDate: null,
      },
    }

    it("should complete session successfully", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockSession as Session)
      mockSessionRepository.save.mockResolvedValue({
        ...mockSession,
        isCompleted: true,
        activeHint: null,
      })

      const result = await service.completeSession(1)

      expect(result.isCompleted).toBe(true)
      expect(result.activeHint).toBeNull()
    })

    it("should throw BadRequestException when session already completed", async () => {
      const completedSession = { ...mockSession, isCompleted: true }

      jest.spyOn(service, "findOne").mockResolvedValue(completedSession as Session)

      await expect(service.completeSession(1)).rejects.toThrow(new BadRequestException("Session is already completed"))
    })

    it("should update user stats on session completion", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockSession as any)
      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockSessionRepository.save.mockResolvedValue({ ...mockSession, isCompleted: true })
      mockUserRepository.save = jest.fn().mockResolvedValue(mockUser)

      await service.completeSession(1, 2, true)

      expect(mockUser.userStats.totalPuzzlesCompleted).toBe(1)
      expect(mockUser.userStats.totalHintsUsed).toBe(2)
      expect(mockUser.userStats.totalSpangramsFound).toBe(1)
      expect(mockUser.userStats.currentStreak).toBe(1)
      expect(mockUser.userStats.longestStreak).toBe(1)
      expect(mockUser.userStats.lastPlayedDate).not.toBeNull()
    })

    it("should reset streak if lastPlayedDate is not yesterday", async () => {
      mockUser.userStats.lastPlayedDate = new Date("2025-06-07")

      jest.spyOn(service, "findOne").mockResolvedValue(mockSession as any)
      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockSessionRepository.save.mockResolvedValue({ ...mockSession, isCompleted: true })
      mockUserRepository.save = jest.fn().mockResolvedValue(mockUser)

      await service.completeSession(1, 0, false)

      expect(mockUser.userStats.currentStreak).toBe(1)
    })

    it("should increment streak if lastPlayedDate is yesterday", async () => {
      mockUser.userStats.lastPlayedDate = new Date("2025-06-08")

      jest.spyOn(service, "findOne").mockResolvedValue(mockSession as any)
      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockSessionRepository.save.mockResolvedValue({ ...mockSession, isCompleted: true })
      mockUserRepository.save = jest.fn().mockResolvedValue(mockUser)

      await service.completeSession(1, 1, false)

      expect(mockUser.userStats.currentStreak).toBe(2)
      expect(mockUser.userStats.longestStreak).toBe(2)
    })
  })
})
