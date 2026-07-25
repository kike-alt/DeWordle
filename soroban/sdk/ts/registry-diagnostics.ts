import type { ContractRegistry, NetworkName } from "./network";

export type RegistryMismatchCause =
  | "network_mismatch"
  | "missing_contract_id"
  | "invalid_registry_network";

export interface RegistryMismatchDiagnostics {
  cause: RegistryMismatchCause;
  expectedNetwork?: NetworkName;
  actualNetwork?: string;
  contractKey?: keyof ContractRegistry["contracts"];
  remediation: string;
}

export function formatRegistryMismatchDiagnostics(
  diagnostics: RegistryMismatchDiagnostics,
): string {
  const details = [
    `cause=${diagnostics.cause}`,
    diagnostics.expectedNetwork ? `expected=${diagnostics.expectedNetwork}` : null,
    diagnostics.actualNetwork ? `actual=${diagnostics.actualNetwork}` : null,
    diagnostics.contractKey ? `contract=${diagnostics.contractKey}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `${details}. Remediation: ${diagnostics.remediation}`;
}

export function diagnoseRegistryMismatch(input: {
  expectedNetwork?: NetworkName;
  actualNetwork?: string;
  contractKey?: keyof ContractRegistry["contracts"];
  missingContractId?: boolean;
}): RegistryMismatchDiagnostics | null {
  if (input.expectedNetwork && input.actualNetwork && input.expectedNetwork !== input.actualNetwork) {
    return {
      cause: "network_mismatch",
      expectedNetwork: input.expectedNetwork,
      actualNetwork: input.actualNetwork,
      remediation:
        "Load the registry for the active network or switch SOROBAN_NETWORK before resolving contract IDs.",
    };
  }

  if (input.contractKey && input.missingContractId) {
    return {
      cause: "missing_contract_id",
      contractKey: input.contractKey,
      remediation:
        "Populate the missing contract address in the registry before constructing the client.",
    };
  }

  if (input.expectedNetwork && input.actualNetwork && !["testnet", "mainnet"].includes(input.actualNetwork)) {
    return {
      cause: "invalid_registry_network",
      expectedNetwork: input.expectedNetwork,
      actualNetwork: input.actualNetwork,
      remediation:
        "Ensure the registry provider returns a valid testnet or mainnet value before passing it to the SDK.",
    };
  }

  return null;
}
