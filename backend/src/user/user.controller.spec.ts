import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-user.dto';
import { validate } from 'class-validator';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('UpdateProfileDto Validation', () => {
  it('should reject username with control characters', async () => {
    const dto = new UpdateProfileDto();
    dto.username = 'user\tname';
    dto.avatarUrl = 'https://example.com/avatar.jpg';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'username')).toBeTruthy();
  });

  it('should reject username with leading whitespace', async () => {
    const dto = new UpdateProfileDto();
    dto.username = ' username';
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'username')).toBeTruthy();
  });

  it('should reject username shorter than 3 characters', async () => {
    const dto = new UpdateProfileDto();
    dto.username = 'ab';
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'username' && e.constraints?.minLength)).toBeTruthy();
  });

  it('should accept valid username', async () => {
    const dto = new UpdateProfileDto();
    dto.username = 'gamer_123';
    dto.avatarUrl = 'https://example.com/avatar.jpg';
    const errors = await validate(dto);
    expect(errors.filter(e => e.property === 'username').length).toBe(0);
  });

  it('should reject avatarUrl with javascript: protocol', async () => {
    const dto = new UpdateProfileDto();
    dto.avatarUrl = 'javascript:alert(1)';
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'avatarUrl')).toBeTruthy();
  });

  it('should reject avatarUrl with data: protocol', async () => {
    const dto = new UpdateProfileDto();
    dto.avatarUrl = 'data:image/png;base64,abc';
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'avatarUrl')).toBeTruthy();
  });

  it('should accept valid HTTPS avatarUrl', async () => {
    const dto = new UpdateProfileDto();
    dto.avatarUrl = 'https://example.com/avatar.jpg';
    const errors = await validate(dto);
    expect(errors.filter(e => e.property === 'avatarUrl').length).toBe(0);
  });
});
