# Wordle Session API Implementation

## Overview

This implementation provides the POST `/wordle-sessions/:id/guess` endpoint as specified in issue #517. The endpoint allows players to submit guesses for a Wordle game session and receive feedback on their guess.

## Architecture

### Components

1. **WordleSession Entity** (`entities/wordle-session.entity.ts`)
   - Stores game session data including guess history, attempts remaining, and game state
   - Related to User and Word entities

2. **WordleSessionService** (`wordle-session.service.ts`)
   - Business logic for handling guess submissions
   - Uses the existing `evaluateGuess` function from the wordle engine
   - Manages session state and game completion logic

3. **WordleSessionController** (`wordle-session.controller.ts`)
   - REST API controller providing the POST endpoint
   - Handles request validation and response formatting

4. **DTOs and Types**
   - `SubmitGuessDto`: Request validation for guess submissions
   - `GuessResult` and `GuessHistory`: Type definitions for storing guess results

## API Endpoint

### POST `/wordle-sessions/:id/guess`

Submits a 5-letter word guess for the specified wordle session.

**Request:**

```json
{
  "guess": "AUDIO"
}
```

**Response (Success):**

```json
{
  "id": 123,
  "guessHistory": [
    {
      "guess": "AUDIO",
      "result": [
        { "letter": "A", "status": "absent" },
        { "letter": "U", "status": "present" },
        { "letter": "D", "status": "absent" },
        { "letter": "I", "status": "correct" },
        { "letter": "O", "status": "absent" }
      ],
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "isCompleted": false,
  "isWon": false,
  "attemptsRemaining": 5,
  "targetWord": {
    "id": "uuid-string",
    "word": "SUITE"
  },
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid guess format, session already completed, or no attempts remaining
- `404 Not Found`: Session not found or invalid session ID

## Features Implemented

### Core Requirements

1. **POST route at `/wordle-sessions/:id/guess`**
2. **Correct session ID extraction from URL parameters**
3. **JSON body validation for guess**
4. **Database session retrieval with 404 error handling**
5. **Integration with wordle.engine `evaluateGuess` function**
6. **Guess and result storage in session history**

### Additional Features

1. **Comprehensive Validation**
   - 5-letter word validation
   - Session completion state checking
   - Attempts remaining validation

2. **Game State Management**
   - Automatic win detection
   - Game completion on last attempt
   - Session state updates

3. **Data Consistency**
   - Uppercase normalization of guesses
   - Timestamp tracking for each guess
   - Immutable guess history

4. **Error Handling**
   - Detailed error messages
   - Proper HTTP status codes
   - Input validation with class-validator

## Database Schema

### wordle_sessions Table

| Column            | Type        | Description                            |
| ----------------- | ----------- | -------------------------------------- |
| id                | int         | Primary key, auto-increment            |
| userId            | int         | Foreign key to users table (nullable)  |
| targetWordId      | varchar(36) | Foreign key to words table             |
| guessHistory      | json        | Array of guess attempts and results    |
| isCompleted       | boolean     | Whether the game is finished           |
| isWon             | boolean     | Whether the player won                 |
| attemptsRemaining | int         | Number of attempts left (default: 6)   |
| completedAt       | timestamp   | When the game was completed (nullable) |
| createdAt         | timestamp   | Session creation time                  |
| updatedAt         | timestamp   | Last update time                       |

## Testing

### Test Coverage

1. **Service Tests** (`wordle-session.service.spec.ts`)
   - Guess submission with correct answers (winning)
   - Guess submission with incorrect answers
   - Game completion scenarios
   - Validation error handling
   - Session not found handling

2. **Controller Tests** (`wordle-session.controller.spec.ts`)
   - HTTP request/response handling
   - Parameter validation
   - Error response formatting
   - Edge case handling

3. **Integration Tests** (`wordle-session.e2e-spec.ts`)
   - End-to-end API testing
   - Full request/response cycle
   - Database interaction testing

### Running Tests

```bash
# Service tests
npm test -- wordle-session.service.spec.ts

# Controller tests
npm test -- wordle-session.controller.spec.ts

# Integration tests
npm test -- wordle-session.e2e-spec.ts

# All wordle-related tests
npm test -- wordle
```

## Usage Examples

### Correct Guess (Winning)

```bash
curl -X POST http://localhost:3000/wordle-sessions/1/guess \
  -H "Content-Type: application/json" \
  -d '{"guess": "WORLD"}'
```

### Incorrect Guess

```bash
curl -X POST http://localhost:3000/wordle-sessions/1/guess \
  -H "Content-Type: application/json" \
  -d '{"guess": "AUDIO"}'
```

### Invalid Guess Length

```bash
curl -X POST http://localhost:3000/wordle-sessions/1/guess \
  -H "Content-Type: application/json" \
  -d '{"guess": "ABC"}'
# Returns 400 Bad Request
```

## Integration Points

1. **Wordle Engine**: Uses the existing `evaluateGuess` function for game logic
2. **Word Entity**: References the existing Word entity for target words
3. **User Entity**: Optional association with authenticated users
4. **Database**: Uses existing TypeORM setup and migrations

## Future Enhancements

1. **Authentication**: Add user authentication middleware
2. **Rate Limiting**: Prevent guess spamming
3. **Leaderboards**: Track winning statistics
4. **Daily Challenges**: Integration with daily word system
5. **Multiplayer**: Support for competitive sessions

## Deployment

1. Run the migration to create the wordle_sessions table:

   ```bash
   npm run typeorm:run
   ```

2. The module is automatically registered in the main AppModule

3. The endpoint will be available at `/wordle-sessions/:id/guess`

## Dependencies

- `@nestjs/common`: Core NestJS functionality
- `@nestjs/typeorm`: Database ORM integration
- `typeorm`: Database operations
- `class-validator`: Request validation
- `@nestjs/swagger`: API documentation

The implementation is production-ready with comprehensive error handling, validation, and testing.
