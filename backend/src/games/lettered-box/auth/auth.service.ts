import { Injectable, UnauthorizedException } from "@nestjs/common"
import type { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcrypt"
import * as crypto from "crypto"
import type { UsersService } from "../users/users.service"
import type { RegisterDto } from "./dto/register.dto"
import type { LoginDto } from "./dto/login.dto"

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username)
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user
      return result
    }
    return null
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto
    const user = await this.validateUser(username, password)

    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const payload = { username: user.username, sub: user.id, role: user.role }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    }
  }

  async register(registerDto: RegisterDto) {
    const { username, password, email } = registerDto

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")

    // Create user
    const user = await this.usersService.create({
      username,
      password: hashedPassword,
      email,
      verificationToken,
      isVerified: false,
      role: "user",
    })

    // Generate JWT token
    const payload = { username: user.username, sub: user.id, role: user.role }

    // Remove sensitive data from response
    const { password: _, verificationToken: __, ...result } = user

    return {
      access_token: this.jwtService.sign(payload),
      user: result,
    }
  }
}
