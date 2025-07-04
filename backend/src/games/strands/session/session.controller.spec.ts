import { Test, type TestingModule } from "@nestjs/testing"
import { SessionController } from "./session.controller"
import { SessionService } from "./session.service"
import type { CreateSessionDto } from "./dto/create-session.dto"
import type { AddWordDto } from "./dto/add-word.dto"
import type { UseHintDto } from "./dto/use-hint.dto"

describe("SessionController", () => {
  let controller: SessionController
  let service: SessionService

  const mockSessionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByUserAndPuzzle: jest.fn(),
    update: jest.fn(),
    addWord: jest.fn(),
    useHint: jest.fn(),
    clearHint: jest.fn(),
    completeSession: jest.fn(),
    getUserStats: jest.fn(),
    remove: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile()

    controller = module.get<SessionController>(SessionController)
    service = module.get<SessionService>(SessionService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a new session", async () => {
      const createSessionDto: CreateSessionDto = { userId: 1, puzzleId: 1 }
      const mockSession = { id: 1, ...createSessionDto }

      mockSessionService.create.mockResolvedValue(mockSession)

      const result = await controller.create(createSessionDto)

      expect(service.create).toHaveBeenCalledWith(createSessionDto)
      expect(result).toEqual(mockSession)
    })
  })

  describe("findAll", () => {
    it("should return all sessions", async () => {
      const mockSessions = [
        { id: 1, userId: 1, puzzleId: 1 },
        { id: 2, userId: 2, puzzleId: 1 },
      ]

      mockSessionService.findAll.mockResolvedValue(mockSessions)

      const result = await controller.findAll()

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined)
      expect(result).toEqual(mockSessions)
    })

    it("should return filtered sessions", async () => {
      const mockSessions = [{ id: 1, userId: 1, puzzleId: 1 }]

      mockSessionService.findAll.mockResolvedValue(mockSessions)

      const result = await controller.findAll(1, 1)

      expect(service.findAll).toHaveBeenCalledWith(1, 1)
      expect(result).toEqual(mockSessions)
    })
  })

  describe("findOne", () => {
    it("should return a session by ID", async () => {
      const mockSession = { id: 1, userId: 1, puzzleId: 1 }

      mockSessionService.findOne.mockResolvedValue(mockSession)

      const result = await controller.findOne(1)

      expect(service.findOne).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockSession)
    })
  })

  describe("addWord", () => {
    it("should add a word to the session", async () => {
      const addWordDto: AddWordDto = { word: "STRAND", isThemeWord: true }
      const mockSession = {
        id: 1,
        foundWords: ["STRAND"],
        earnedHints: 0,
      }

      mockSessionService.addWord.mockResolvedValue(mockSession)

      const result = await controller.addWord(1, addWordDto)

      expect(service.addWord).toHaveBeenCalledWith(1, addWordDto)
      expect(result).toEqual(mockSession)
    })
  })

  describe("useHint", () => {
    it("should use a hint", async () => {
      const useHintDto: UseHintDto = { hintWord: "THREAD" }
      const mockSession = {
        id: 1,
        earnedHints: 1,
        activeHint: "THREAD",
      }

      mockSessionService.useHint.mockResolvedValue(mockSession)

      const result = await controller.useHint(1, useHintDto)

      expect(service.useHint).toHaveBeenCalledWith(1, useHintDto)
      expect(result).toEqual(mockSession)
    })
  })

  describe("completeSession", () => {
    it("should complete a session", async () => {
      const mockSession = {
        id: 1,
        isCompleted: true,
        activeHint: null,
      }

      mockSessionService.completeSession.mockResolvedValue(mockSession)

      const result = await controller.completeSession(1)

      expect(service.completeSession).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockSession)
    })
  })

  describe("getUserStats", () => {
    it("should return user statistics", async () => {
      const mockStats = {
        totalSessions: 5,
        completedSessions: 3,
        totalWordsFound: 25,
        totalHintsEarned: 8,
        averageWordsPerSession: 5.0,
      }

      mockSessionService.getUserStats.mockResolvedValue(mockStats)

      const result = await controller.getUserStats(1)

      expect(service.getUserStats).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockStats)
    })
  })

  describe("remove", () => {
    it("should delete a session", async () => {
      mockSessionService.remove.mockResolvedValue(undefined)

      const result = await controller.remove(1)

      expect(service.remove).toHaveBeenCalledWith(1)
      expect(result).toEqual({ message: "Session deleted successfully" })
    })
  })
})
