import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IngestedEventDto } from './ingested-event.dto';

const validPayload = () => ({
  network: 'testnet',
  contractId: 'CABC',
  topic: 'session_finalized',
  txHash: 'abc123',
  ledger: 10,
  eventIndex: 0,
  payload: {},
});

describe('IngestedEventDto validation', () => {
  const validate_ = async (data: object) => {
    const dto = plainToInstance(IngestedEventDto, data);
    return validate(dto);
  };

  it('accepts a valid payload', async () => {
    const errors = await validate_(validPayload());
    expect(errors).toHaveLength(0);
  });

  it('rejects missing contractId', async () => {
    const errors = await validate_({ ...validPayload(), contractId: '' });
    expect(errors.some((e) => e.property === 'contractId')).toBe(true);
  });

  it('rejects missing txHash', async () => {
    const errors = await validate_({ ...validPayload(), txHash: '' });
    expect(errors.some((e) => e.property === 'txHash')).toBe(true);
  });

  it('rejects ledger < 1', async () => {
    const errors = await validate_({ ...validPayload(), ledger: 0 });
    expect(errors.some((e) => e.property === 'ledger')).toBe(true);
  });

  it('rejects negative eventIndex', async () => {
    const errors = await validate_({ ...validPayload(), eventIndex: -1 });
    expect(errors.some((e) => e.property === 'eventIndex')).toBe(true);
  });

  it('rejects invalid network value', async () => {
    const errors = await validate_({ ...validPayload(), network: 'devnet' });
    expect(errors.some((e) => e.property === 'network')).toBe(true);
  });

  it('rejects non-object payload', async () => {
    const errors = await validate_({ ...validPayload(), payload: 'bad' });
    expect(errors.some((e) => e.property === 'payload')).toBe(true);
  });

  it('rejects missing topic', async () => {
    const errors = await validate_({ ...validPayload(), topic: '' });
    expect(errors.some((e) => e.property === 'topic')).toBe(true);
  });

  it('accepts mainnet as valid network', async () => {
    const errors = await validate_({ ...validPayload(), network: 'mainnet' });
    expect(errors).toHaveLength(0);
  });
});
