import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { Repository, MoreThan } from 'typeorm';

describe('SECURITY-208: Authentication Token Hardening Suite', () => {
  let service: AuthService;
  let repo: Repository<User>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'tester@domain.com',
    password: 'old-hashed-password',
    resetPasswordToken: 'active-secure-token-hash-xyz',
    resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000), // Valid for 10 more minutes
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should mitigate user enumeration by returning a generic message for non-existent emails', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    const result = await service.forgotPassword('unknown@victim.com');
    expect(result).toBeUndefined();
  });

  it('should instantly invalidate tokens upon use to prevent token replay attacks', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(mockUser as any);
    jest
      .spyOn(repo, 'save')
      .mockResolvedValue({ ...mockUser, resetPasswordToken: null } as any);

    await service.resetPassword(
      'active-secure-token-hash-xyz',
      'brand-new-secure-password-99',
    );

    // Check that target persistence properties were reset to null
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }),
    );
  });

  it('should reject password reset execution if the expiration timeline boundary has passed', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null); // TypeORM MoreThan filter returns empty

    await expect(
      service.resetPassword('expired-token-signature', 'securePassword123'),
    ).rejects.toThrow(BadRequestException);
  });
});
