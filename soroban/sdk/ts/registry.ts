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
