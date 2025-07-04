import { IsString, IsEmail, IsNotEmpty, MinLength } from "class-validator"

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string

  @IsEmail()
  @IsNotEmpty()
  email: string
}
