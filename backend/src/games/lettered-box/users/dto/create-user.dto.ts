import { IsString, IsEmail, IsNotEmpty, IsOptional, IsBoolean } from "class-validator"

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string

  @IsString()
  @IsNotEmpty()
  password: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean

  @IsString()
  @IsOptional()
  verificationToken?: string

  @IsString()
  @IsOptional()
  role?: string
}
