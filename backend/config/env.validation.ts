import { plainToClass } from "class-transformer"
import { IsString, IsNumber, validateSync } from "class-validator"
import { Transform } from "class-transformer"

class EnvironmentVariables {
  @IsString()
  DB_HOST: string

  @Transform(({ value }) => Number(value))
  @IsNumber()
  DB_PORT: number

  @IsString()
  DB_USERNAME: string

  @IsString()
  DB_PASSWORD: string

  @IsString()
  JWT_SECRET: string

  @IsString()
  JWT_EXPIRATION: string

  @IsString()
  CONTRACT_ADDRESS: string
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config)
  const errors = validateSync(validatedConfig, { skipMissingProperties: false })

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors}`)
  }

  return validatedConfig
}
