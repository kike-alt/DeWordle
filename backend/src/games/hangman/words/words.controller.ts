
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { WordsService } from "./words.service"
import type { CreateWordDto } from "./dto/create-word.dto"
import type { UpdateWordDto } from "./dto/update-word.dto"
import { JwtAuthGuard } from "security/guards/jwt-auth.guard"
import { Throttle } from "@nestjs/throttler"
import { RolesGuard } from "security/guards/rolesGuard/roles.guard"
import { Roles } from "src/games/lettered-box/auth/decorators/roles.decorator"
import { RoleDecorator, UserRole } from "security/decorators/roles.decorator"

@ApiTags("words")
@Controller("words")
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get()
  @ApiOperation({ summary: "Get all words or filter by category" })
  findAll(@Query('category') category?: string) {
    return category
      ? this.wordsService.getWordsByCategory(category)
      : this.wordsService.findAll();
  }



  @Get("random")
  @Throttle({default: { limit: 5, ttl: 60 }}) // Limit to 5 requests per 60 seconds
  @ApiOperation({ summary: "Get a random word" })
  @ApiResponse({ status: 200, description: "Random word retrieved successfully." })
  @ApiResponse({ status: 404, description: "No words found in the specified category." })

  getRandomWord(@Query('category') category?: string) {
    return this.wordsService.getRandomWord(category);
  }

  @Get("random/:difficulty")

  @ApiOperation({ summary: "Get a random word by difficulty" })

  @ApiResponse({ status: 200, description: "Return a random word of specified difficulty." })
  @Throttle({default: { limit: 5, ttl: 60 }}) // Limit to 5 requests per minute
  getRandomWordByDifficulty(@Param('difficulty') difficulty: string, @Query('category') category?: string) {
    return this.wordsService.getRandomWordByDifficulty(Number(difficulty), category)
  }

  @Get("categories")
  @ApiOperation({ summary: "Get all available categories" })
  getCategories() {
    return this.wordsService.getCategories();
  }

  @Get("stats")
  @ApiOperation({ summary: "Get word count per category" })
  getStats() {
    return this.wordsService.getCategoryStats();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a word by ID" })
  findOne(@Param("id") id: string) {
    return this.wordsService.findOne(+id);
  }

  // ---------- Admin Endpoints ----------
  @RoleDecorator(UserRole.Admin)
  @ApiBearerAuth()
  @Post("admin/words")
  @ApiOperation({ summary: "Create a new word (Admin)" })
  createWord(@Body() createWordDto: CreateWordDto) {
    return this.wordsService.create(createWordDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.Admin)
  @ApiBearerAuth()
  @Post("admin/words/batch")
  @ApiOperation({ summary: "Create multiple words (Admin)" })
  createWords(@Body() createWordDto: CreateWordDto[]) {
    return this.wordsService.createBatch(createWordDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.Admin)
  @ApiBearerAuth()
  @Patch("admin/words/:id")
  @ApiOperation({ summary: "Update a word (Admin)" })
  updateWord(@Param("id") id: string, @Body() updateWordDto: UpdateWordDto) {
    return this.wordsService.update(+id, updateWordDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.Admin)
  @ApiBearerAuth()
  @Delete("admin/words/:id")
  @ApiOperation({ summary: "Delete a word (Admin)" })
  removeWord(@Param("id") id: string) {
    return this.wordsService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RoleDecorator(UserRole.Admin)
  @ApiBearerAuth()
  @Get("admin/words/export")
  @ApiOperation({ summary: "Export all words (Admin)" })
  exportWords() {
    return this.wordsService.exportWords();
  }
}
