import 'reflect-metadata';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum StellarNetwork {
  Testnet = 'testnet',
  Mainnet = 'mainnet',
}

@ValidatorConstraint({ name: 'isSafeRpcUrl', async: false })
export class IsSafeRpcUrlConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!text) return false;
    try {
      const url = new URL(text);
      const env = (args.object as any).NODE_ENV;
      if (env === NodeEnv.Production || env === NodeEnv.Test) {
        return url.protocol === 'https:';
      }

      if (url.protocol === 'http:') {
        return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      }

      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'SOROBAN_RPC_URL must be a secure https endpoint or a local http endpoint (localhost) in development.';
  }
}

export function IsSafeRpcUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeRpcUrlConstraint,
    });
  };
}

class EnvironmentVariables {
  // ── Server ──────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  // ── Database ─────────────────────────────────────────────────────────────────
  @IsNotEmpty()
  @IsString()
  DB_HOST: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsNotEmpty()
  @IsString()
  DB_USERNAME: string;

  @IsNotEmpty()
  @IsString()
  DB_PASSWORD: string;

  @IsNotEmpty()
  @IsString()
  DB_NAME: string;

  // ── Auth ─────────────────────────────────────────────────────────────────────
  @IsNotEmpty()
  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  FRONTEND_URL: string = 'http://localhost:3000';

  // ── Soroban / Indexer ─────────────────────────────────────────────────────
  @IsNotEmpty()
  @IsSafeRpcUrl()
  SOROBAN_RPC_URL: string;

  @IsNotEmpty()
  @IsString()
  SOROBAN_CORE_GAME_CONTRACT_ID: string;

  @IsOptional()
  @IsEnum(StellarNetwork)
  SOROBAN_NETWORK: StellarNetwork = StellarNetwork.Testnet;

  @IsOptional()
  @IsInt()
  @Min(1)
  INDEXER_MAX_PAYLOAD_BYTES: number = 8192;
}

/**
 * Validates all required environment variables at application startup.
 * Throws a descriptive error immediately if any required var is missing or
 * malformed — prevents partial-startup failures deep inside request handlers.
 */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('\n  ');
    throw new Error(
      `Environment validation failed at startup:\n  ${messages}\n\nCheck your .env file or deployment config.`,
    );
  }

  return validated;
}
