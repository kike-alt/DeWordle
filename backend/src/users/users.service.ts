import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreateUsersProvider } from './providers/create-users-provider';
import { Repository } from 'typeorm';
import { FindOneByEmailProvider } from './providers/find-one-by-email.provider';
import { TokenType } from '../auth/enums/token-type.enum'; // Added missing import
import { MailService } from 'src/mail/providers/mail.service';
import { FindOneByGoogleIdProvider } from './providers/find-one-by-google-id-provider';
import { CreateGoogleUserProvider } from './providers/create-google-user-provider';
import { GoogleInterface } from 'src/auth/social/interfaces/user.interface';
import { DatabaseExceptionFilter } from 'src/common/filters';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>, // Added generic type parameter
    private readonly findOneByEmailProvider: FindOneByEmailProvider,

    private readonly findOneByGoogleIdProvider: FindOneByGoogleIdProvider,

    private readonly createGoogleUserProvider: CreateGoogleUserProvider,
    private readonly createUserProvider: CreateUsersProvider,
    private readonly mailService: MailService,
    // @Inject(forwardRef(() => AuthService))
    // private readonly authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const user = await this.createUserProvider.createUser(createUserDto);

    // // Generate verification token
    // const verificationToken = await this.createToken(
    //   user.id,
    //   TokenType.VERIFICATION,
    // );

    // Send verification email
    await this.mailService.sendVerificationEmail(
      user.email,
      // verificationToken.token,
    );

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  public async GetOneByEmail(email: string) {
    return await this.findOneByEmailProvider.FindByEmail(email);
  }

  // Find all users with pagination
  async findAll(page: number, limit: number) {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'ASC' },
    });

    return {
      total,
      page,
      limit,
      data: users,
    };
  }

  // Soft delete a user by ID
  async softDelete(id: number) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      await this.userRepository.softDelete(id);
      return { message: `User with ID ${id} has been deleted.` };
    } catch (error) {
      throw new DatabaseExceptionFilter(); // Explicitly using DB filter if needed
    }
  }

  public async findOneById(id: number): Promise<User> {
    return await this.userRepository.findOneBy({ id });
  }

  public async findOneByGoogleId(googleId: string) {
    return this.findOneByGoogleIdProvider.findOneByGoogleId(googleId);
  }

  public async createGoogleUser(googleUser: GoogleInterface) {
    return this.createGoogleUserProvider.createGoogleUser(googleUser);
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  public async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }

    // Check if email is unique before updating
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Please check your email id');
      }
    }

    // Ensure only specified fields are updated, excluding id
    const allowedUpdates = ['name', 'email'];
    for (const key of Object.keys(updateUserDto)) {
      if (allowedUpdates.includes(key)) {
        (user as any)[key] = (updateUserDto as any)[key];
      }
    }

    return this.userRepository.save(user);
  }

  // Added missing method that was referenced in create()
  private async createToken(
    userId: number,
    tokenType: TokenType,
  ): Promise<any> {
    // Implementation would go here
    return { token: 'generated-token' }; // Placeholder implementation
  }

  // Method for auth service to create user directly (bypassing email verification for auth)
  async createUserForAuth(userData: {
    email: string;
    password: string;
    walletAddress: string;
  }): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  // Method to find user by wallet address
  async findByWalletAddress(walletAddress: string): Promise<User> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  // Alias method to match auth service expectations
  async findByEmail(email: string): Promise<User> {
    return this.GetOneByEmail(email);
  }

  // Alias method to match auth service expectations
  async findById(id: number): Promise<User> {
    return this.findOneById(id);
  }
}
