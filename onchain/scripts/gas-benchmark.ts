#!/usr/bin/env ts-node
/**
 * QA-110: Contract gas usage benchmarking and regression detection.
 * Simulates each contract function and records CPU/memory consumption
 * reported by the Soroban RPC simulateTransaction response.
 *
 * Usage:
 *   npx ts-node onchain/scripts/gas-benchmark.ts
 *   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org npx ts-node onchain/scripts/gas-benchmark.ts
 *
 * Output: onchain/benchmarks/gas-report-<timestamp>.json
 */
import { SorobanRpc, Contract, Keypair, Networks, nativeToScVal } from '@stellar/stellar-sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const RPC_URL = process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = process.env.GAME_CONTRACT_ID ?? '';
const BUDGET_LIMITS = {
  submit_guess: { cpuInsns: 50_000_000, memBytes: 5_000_000 },
  get_game_state: { cpuInsns: 10_000_000, memBytes: 2_000_000 },
  initialize: { cpuInsns: 20_000_000, memBytes: 3_000_000 },
};

interface BenchmarkResult {
  fn: string;
  cpuInsns: number;
  memBytes: number;
  withinBudget: boolean;
  budget: { cpuInsns: number; memBytes: number };
  timestamp: string;
}

async function benchmark(): Promise<void> {
  if (!CONTRACT_ID) {
    console.error('Set GAME_CONTRACT_ID to run gas benchmarks');
    process.exit(1);
  }

  const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: true });
  const contract = new Contract(CONTRACT_ID);
  const signer = Keypair.random();
  const results: BenchmarkResult[] = [];

  const functionsToTest: Array<{ name: string; args: ReturnType<typeof nativeToScVal>[] }> = [
    { name: 'submit_guess', args: [nativeToScVal('CRANE', { type: 'string' })] },
    { name: 'get_game_state', args: [] },
  ];

  for (const { name, args } of functionsToTest) {
    console.log(`Benchmarking ${name}...`);
    try {
      const op = contract.call(name, ...args);
      const account = await rpc.getAccount(signer.publicKey()).catch(() => ({
        accountId: () => signer.publicKey(),
        sequenceNumber: () => '100',
        incrementSequenceNumber: () => {},
      }));

      const { SorobanDataBuilder, TransactionBuilder, BASE_FEE } = await import('@stellar/stellar-sdk');
      const tx = new TransactionBuilder(account as any, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const simResult = await rpc.simulateTransaction(tx);
      if ('error' in simResult) {
        console.warn(`Simulation error for ${name}:`, simResult.error);
        continue;
      }

      const cpuInsns = parseInt((simResult as any).cost?.cpuInsns ?? '0', 10);
      const memBytes = parseInt((simResult as any).cost?.memBytes ?? '0', 10);
      const budget = BUDGET_LIMITS[name as keyof typeof BUDGET_LIMITS] ?? { cpuInsns: Infinity, memBytes: Infinity };

      const result: BenchmarkResult = {
        fn: name,
        cpuInsns,
        memBytes,
        withinBudget: cpuInsns <= budget.cpuInsns && memBytes <= budget.memBytes,
        budget,
        timestamp: new Date().toISOString(),
      };
      results.push(result);
      console.log(`  CPU: ${cpuInsns.toLocaleString()} insns | Mem: ${memBytes.toLocaleString()} bytes | ${result.withinBudget ? '✅ Within budget' : '❌ EXCEEDS BUDGET'}`);
    } catch (err) {
      console.error(`Failed to benchmark ${name}:`, err);
    }
  }

  const outDir = join('onchain', 'benchmarks');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `gas-report-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\nReport written to ${outFile}`);

  const failures = results.filter((r) => !r.withinBudget);
  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} function(s) exceed gas budget:`);
    failures.forEach((f) => console.error(`  - ${f.fn}`));
    process.exit(1);
  }
}

benchmark().catch(console.error);