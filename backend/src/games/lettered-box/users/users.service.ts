import { Injectable, NotFoundException, ConflictException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { User } from "./entities/user.entity"
import type { CreateUserDto } from "./dto/create-user.dto"
import type { UpdateUserDto } from "./dto/update-user.dto"

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username already exists
    const existingUsername = await this.findByUsername(createUserDto.username)
    if (existingUsername) {
      throw new ConflictException("Username already exists")
    }

    // Check if email already exists (if provided)
    if (createUserDto.email) {
      const existingEmail = await this.findByEmail(createUserDto.email)
      if (existingEmail) {
        throw new ConflictException("Email already exists")
      }
    }

    const user = new User()
    Object.assign(user, createUserDto)
    return this.usersRepository.save(user)
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find()
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } })
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id)

    // Check if username is being updated and already exists
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.findByUsername(updateUserDto.username)
      if (existingUsername) {
        throw new ConflictException("Username already exists")
      }
    }

    // Check if email is being updated and already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.findByEmail(updateUserDto.email)
      if (existingEmail) {
        throw new ConflictException("Email already exists")
      }
    }

    Object.assign(user, updateUserDto)
    return this.usersRepository.save(user)
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
  }

  async verifyUser(token: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { verificationToken: token } })
    if (!user) {
      throw new NotFoundException("Invalid verification token")
    }

    user.isVerified = true
    user.verificationToken = null
    return this.usersRepository.save(user)
  }
}
