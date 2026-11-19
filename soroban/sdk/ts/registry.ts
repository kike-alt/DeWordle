import type { ContractRegistry, NetworkName } from "./network";
import {
  diagnoseRegistryMismatch,
  formatRegistryMismatchDiagnostics,
} from "./registry-diagnostics";

export function resolveContractId(
  registry: ContractRegistry,
  key: keyof ContractRegistry["contracts"],
): string {
  const value = registry.contracts[key];
  if (!value || !value.trim()) {
    const diagnostics = diagnoseRegistryMismatch({
      contractKey: key,
      missingContractId: true,
    });
    throw new Error(
      `Missing contract id for ${key}. ${formatRegistryMismatchDiagnostics(diagnostics!)}`,
    );
  }
  return value;
}

export function assertRegistryNetwork(registry: ContractRegistry, network: NetworkName) {
  if (registry.network !== network) {
    const diagnostics = diagnoseRegistryMismatch({
      expectedNetwork: network,
      actualNetwork: registry.network,
    });
    throw new Error(
      `Contract registry mismatch: expected ${network}, got ${registry.network}. ` +
        formatRegistryMismatchDiagnostics(diagnostics!),
    );
  }
}

export interface ResolverCacheOptions {
  /** How long a resolved address stays cached (default 60000 ms). */
  ttlMs?: number;
  /** Replaceable for tests. */
  now?: () => number;
}

type ContractKey = keyof ContractRegistry["contracts"];

/**
 * Resolves contract addresses from a registry loaded through `loader`, caching
 * each resolved address in memory so repeated lookups do not hit the network.
 */
export class ContractRegistryResolver {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly cache = new Map<ContractKey, { address: string; expiresAt: number }>();

  constructor(
    private readonly loader: () => Promise<ContractRegistry>,
    options: ResolverCacheOptions = {},
  ) {
    this.ttlMs = options.ttlMs ?? 60_000;
    this.now = options.now ?? Date.now;
  }

  /** Cached address if still fresh, otherwise `undefined`. Synchronous. */
  getCached(key: ContractKey): string | undefined {
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    if (this.now() >= hit.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return hit.address;
  }

  /** Resolves `key`, using the cache within the TTL and the loader otherwise. */
  async resolve(key: ContractKey): Promise<string> {
    const cached = this.getCached(key);
    if (cached !== undefined) return cached;
    const registry = await this.loader();
    const address = resolveContractId(registry, key);
    this.cache.set(key, { address, expiresAt: this.now() + this.ttlMs });
    return address;
  }

  /** Drops every cached address so the next `resolve` hits the loader. */
  clearCache(): void {
    this.cache.clear();
  }
}
