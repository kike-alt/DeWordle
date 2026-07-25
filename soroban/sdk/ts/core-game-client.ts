import { Keypair, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
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
import { buildContractTx, simulateAndAssemble } from "./tx-builder";

export interface CoreGameClientOptions {
  contractId: string;
  network: SorobanNetworkConfig;
}

export class CoreGameClient {
  private readonly server: Server;

  constructor(private readonly options: CoreGameClientOptions) {
    this.server = new Server(options.network.rpcUrl);
  }

  static fromRegistry(network: SorobanNetworkConfig, registry: ContractRegistry) {
    return new CoreGameClient({
      contractId: resolveContractId(registry, "core_game"),
      network,
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
    const account = await this.server.getAccount(sourcePublicKey);

    const tx = await buildContractTx({
      server: this.server,
      source: account,
      network: this.options.network,
      contractId: this.options.contractId,
      method: "create_session",
      args: [nativeToScVal(sourcePublicKey), nativeToScVal(dayId), nativeToScVal(nonce)],
    });

    return simulateAndAssemble({ server: this.server, tx });
  }

  async buildSubmitGuessTx(
    sourcePublicKey: string,
    input: SubmitGuessInput,
  ): Promise<TxBuildResult> {
    const account = await this.server.getAccount(sourcePublicKey);

    const tx = await buildContractTx({
      server: this.server,
      source: account,
      network: this.options.network,
      contractId: this.options.contractId,
      method: "submit_guess",
      args: [
        nativeToScVal(input.player),
        nativeToScVal(input.sessionId),
        nativeToScVal(input.guessCommitment),
        nativeToScVal(input.outcomeCode),
        nativeToScVal(input.isCorrect),
      ],
    });

    return simulateAndAssemble({ server: this.server, tx });
  }

  /**
   * Read day config from the contract.
   * Returns null if the day is not found or the response cannot be parsed.
   */
  async getDayConfig(dayId: number): Promise<DayConfig | null> {
    try {
      const account = await this.server.getAccount(this.options.contractId);
      const tx = await buildContractTx({
        server: this.server,
        source: account,
        network: this.options.network,
        contractId: this.options.contractId,
        method: "get_day_config",
        args: [nativeToScVal(dayId, { type: "u32" })],
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
    try {
      const account = await this.server.getAccount(this.options.contractId);
      const tx = await buildContractTx({
        server: this.server,
        source: account,
        network: this.options.network,
        contractId: this.options.contractId,
        method: "get_session",
        args: [nativeToScVal(Buffer.from(sessionId, "hex"), { type: "bytes" })],
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
