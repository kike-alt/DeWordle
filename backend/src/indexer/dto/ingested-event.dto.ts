import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  Min,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngestedEventDto {
  @IsIn(['testnet', 'mainnet'])
  network: 'testnet' | 'mainnet';

  @IsString()
  @IsNotEmpty()
  contractId: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsInt()
  @Min(1)
  ledger: number;

  @IsInt()
  @Min(0)
  eventIndex: number;

  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional()
  @Type(() => Date)
  observedAt: Date;
}
