import { Account, Address, Keypair, scValToNative, type xdr } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import type { ContractRegistry, SorobanNetworkConfig } from "./network";
import { resolveContractId } from "./registry";
import { CompatibilityGuard, type CompatibilityOptions } from "./contract-compat";
import { buildContractTx, simulateAndAssemble } from "./tx-builder";

/** Read-only simulations never sign or charge the source, so any account works. */
const READ_ONLY_SOURCE_KEY = Keypair.fromRawEd25519Seed(Buffer.alloc(32)).publicKey();

export interface ClaimSimulation {
  /** Tokens the claim would pay out right now. */
  claimableAmount: bigint;
  /** Estimated minimum resource fee, in stroops, as a string. */
  fee: string;
}

export class RewardsClient {
  private readonly server: Server;
  private readonly compat: CompatibilityGuard;

  constructor(
    private readonly contractId: string,
    private readonly network: SorobanNetworkConfig,
    compatibility?: CompatibilityOptions,
  ) {
    this.server = new Server(network.rpcUrl);
    this.compat = new CompatibilityGuard({
      contractName: "rewards",
      contractId,
      server: this.server,
      network,
      options: compatibility,
    });
  }

  static fromRegistry(
    network: SorobanNetworkConfig,
    registry: ContractRegistry,
    compatibility?: CompatibilityOptions,
  ) {
    return new RewardsClient(resolveContractId(registry, "rewards"), network, compatibility);
  }

  async buildClaimTx(sourcePublicKey: string) {
    await this.compat.ensure();
    const account = await this.server.getAccount(sourcePublicKey);
    const tx = await buildContractTx({
      server: this.server,
      source: account,
      network: this.network,
      contractId: this.contractId,
      method: "claim",
      args: [new Address(sourcePublicKey).toScVal()],
    });

    return simulateAndAssemble({ server: this.server, tx });
  }

  /**
   * Previews what `claim` would pay `player` by simulating it; nothing is
   * signed or submitted. A zero-balance or uninitialized contract yields 0n.
   */
  async simulateClaim(player: string): Promise<ClaimSimulation> {
    await this.compat.ensure();
    const tx = await buildContractTx({
      server: this.server,
      source: new Account(READ_ONLY_SOURCE_KEY, "0"),
      network: this.network,
      contractId: this.contractId,
      method: "claim",
      args: [new Address(player).toScVal()],
    });
    try {
      const { simulated } = await simulateAndAssemble({ server: this.server, tx });
      const retval = (simulated as { result?: { retval: xdr.ScVal } }).result?.retval;
      const native = retval ? scValToNative(retval) : 0n;
      const fee = String((simulated as { minResourceFee?: string | number }).minResourceFee ?? "0");
      return { claimableAmount: BigInt(native as bigint | number), fee };
    } catch (error) {
      // NotInitialized (#2): nothing to claim yet.
      if (error instanceof Error && /Error\(Contract,\s*#2\)/.test(error.message)) {
        return { claimableAmount: 0n, fee: "0" };
      }
      throw error;
    }
  }
}
