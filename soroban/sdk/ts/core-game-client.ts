import { Account, Address, Keypair, hash, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import type {
  DayConfig,
  GuessResult,
  Session,
  SubmitGuessInput,
  TxBuildResult,
} from "./types";
import type { ContractRegistry, SorobanNetworkConfig } from "./network";
import { resolveContractId } from "./registry";
import { CompatibilityGuard, type CompatibilityOptions } from "./contract-compat";
import { buildContractTx, simulateAndAssemble } from "./tx-builder";

/**
 * Read-only simulations need a source account, but a contract address is not
 * an account and the RPC rejects it. Any well-formed account works because
 * simulation neither signs nor charges it.
 */
const READ_ONLY_SOURCE_KEY = Keypair.fromRawEd25519Seed(Buffer.alloc(32)).publicKey();

const u32 = (value: number) => nativeToScVal(value, { type: "u32" });
const address = (value: string) => new Address(value).toScVal();
const bytes32 = (hex: string) => nativeToScVal(Buffer.from(hex, "hex"), { type: "bytes" });

export interface CoreGameClientOptions {
  contractId: string;
  network: SorobanNetworkConfig;
  /** SDK/contract compatibility check settings. */
  compatibility?: CompatibilityOptions;
}

export class CoreGameClient {
  private readonly server: Server;
  private readonly compat: CompatibilityGuard;

  constructor(private readonly options: CoreGameClientOptions) {
    this.server = new Server(options.network.rpcUrl);
    this.compat = new CompatibilityGuard({
      contractName: "core_game",
      contractId: options.contractId,
      server: this.server,
      network: options.network,
      options: options.compatibility,
    });
  }

  static fromRegistry(
    network: SorobanNetworkConfig,
    registry: ContractRegistry,
    compatibility?: CompatibilityOptions,
  ) {
    return new CoreGameClient({
      contractId: resolveContractId(registry, "core_game"),
      network,
      compatibility,
    });
  }

  get contractId() {
    return this.options.contractId;
  }

  async buildCreateSessionTx(
    sourcePublicKey: string,
    dayId: number,
    nonce: number,
  ): Promise<TxBuildResult> {
    await this.compat.ensure();
    const account = await this.server.getAccount(sourcePublicKey);

    const tx = await buildContractTx({
      server: this.server,
      source: account,
      network: this.options.network,
      contractId: this.options.contractId,
      method: "create_session",
      args: [address(sourcePublicKey), u32(dayId), u32(nonce)],
    });

    return simulateAndAssemble({ server: this.server, tx });
  }

  async buildSubmitGuessTx(
    sourcePublicKey: string,
    input: SubmitGuessInput,
  ): Promise<TxBuildResult> {
    await this.compat.ensure();
    const account = await this.server.getAccount(sourcePublicKey);

    const tx = await buildContractTx({
      server: this.server,
      source: account,
      network: this.options.network,
      contractId: this.options.contractId,
      method: "submit_guess",
      args: [
        address(input.player),
        bytes32(input.sessionId),
        bytes32(input.guessCommitment),
        u32(input.outcomeCode),
        nativeToScVal(input.isCorrect, { type: "bool" }),
      ],
    });

    return simulateAndAssemble({ server: this.server, tx });
  }

  /**
   * Read day config from the contract.
   * Returns null if the day is not found or the response cannot be parsed.
   */
  async getDayConfig(dayId: number): Promise<DayConfig | null> {
    await this.compat.ensure();
    try {
      const account = new Account(READ_ONLY_SOURCE_KEY, "0");
      const tx = await buildContractTx({
        server: this.server,
        source: account,
        network: this.options.network,
        contractId: this.options.contractId,
        method: "get_day_config",
        args: [u32(dayId)],
      });
      const { simulated } = await simulateAndAssemble({ server: this.server, tx });
      const result = (simulated as { result?: { retval: xdr.ScVal } }).result?.retval;
      if (!result) return null;
      return this._parseDayConfig(scValToNative(result));
    } catch {
      return null;
    }
  }

  /**
   * Read session from the contract by session ID (hex string).
   * Returns null if not found or unparseable.
   */
  async getSession(sessionId: string): Promise<Session | null> {
    await this.compat.ensure();
    try {
      const account = new Account(READ_ONLY_SOURCE_KEY, "0");
      const tx = await buildContractTx({
        server: this.server,
        source: account,
        network: this.options.network,
        contractId: this.options.contractId,
        method: "get_session",
        args: [bytes32(sessionId)],
      });
      const { simulated } = await simulateAndAssemble({ server: this.server, tx });
      const result = (simulated as { result?: { retval: xdr.ScVal } }).result?.retval;
      if (!result) return null;
      return this._parseSession(scValToNative(result));
    } catch {
      return null;
    }
  }

  /**
   * Parse a raw contract response into a typed GuessResult.
   * Returns null for malformed payloads.
   */
  async parseGuessResult(raw: unknown): Promise<GuessResult | null> {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const attemptNo = Number(obj["attempt_no"] ?? obj["attemptNo"]);
    const outcomeCode = Number(obj["outcome_code"] ?? obj["outcomeCode"]);
    const isCorrect = Boolean(obj["is_correct"] ?? obj["isCorrect"]);
    if (isNaN(attemptNo) || isNaN(outcomeCode)) return null;
    return { attemptNo, outcomeCode, isCorrect };
  }

  // --- Private parse helpers ---

  private _parseDayConfig(raw: unknown): DayConfig | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    return {
      dayId: Number(obj["day_id"] ?? obj["dayId"]),
      puzzleCommitment: String(obj["puzzle_commitment"] ?? obj["puzzleCommitment"] ?? ""),
      maxAttempts: Number(obj["max_attempts"] ?? obj["maxAttempts"]),
      closesAt: Number(obj["closes_at"] ?? obj["closesAt"]),
      published: Boolean(obj["published"]),
    };
  }

  private _parseSession(raw: unknown): Session | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    return {
      id: String(obj["id"] ?? ""),
      player: String(obj["player"] ?? ""),
      dayId: Number(obj["day_id"] ?? obj["dayId"]),
      attemptsUsed: Number(obj["attempts_used"] ?? obj["attemptsUsed"]),
      maxAttempts: Number(obj["max_attempts"] ?? obj["maxAttempts"]),
      status: (obj["status"] as Session["status"]) ?? "InProgress",
      finalized: Boolean(obj["finalized"]),
      startedAt: Number(obj["started_at"] ?? obj["startedAt"]),
      updatedAt: Number(obj["updated_at"] ?? obj["updatedAt"]),
    };
  }
}

export function generateEphemeralSigner() {
  return Keypair.random();
}

/**
 * Normalizes a word for commitment hashing: Unicode NFKC, lowercase, and
 * every character outside a-z removed.
 */
export function normalizeCommitmentWord(word: string): string {
  return word.normalize("NFKC").toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Commitment for a puzzle word: SHA-256 over `salt` followed by the UTF-8
 * bytes of the normalized word. The 32-byte result matches the contract's
 * `BytesN<32>` commitment parameters.
 */
export function hashWordCommitment(word: string, salt: Uint8Array): Uint8Array {
  const wordBytes = Buffer.from(normalizeCommitmentWord(word), "utf8");
  return new Uint8Array(hash(Buffer.concat([Buffer.from(salt), wordBytes])));
}

/** True when `commitment` (bytes or hex) matches the word and salt. */
export function verifyWordCommitment(
  word: string,
  salt: Uint8Array,
  commitment: Uint8Array | string,
): boolean {
  const expected = typeof commitment === "string" ? Buffer.from(commitment, "hex") : Buffer.from(commitment);
  const actual = Buffer.from(hashWordCommitment(word, salt));
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
