const WALLET_REGEX = /[A-Za-z0-9]{20,}/g;

export function redactWalletAddress(address: string): string {
  if (!address || address.length < 8) return "****";
  return `${address.slice(0, 4)}****${address.slice(-4)}`;
}

export function redactWalletAddresses(text: string): string {
  return text.replace(WALLET_REGEX, (match) => redactWalletAddress(match));
}

export function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactWalletAddresses(raw).replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "****@****.***");
}

export function sanitizeLogPayload(record: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      sanitized[key] = redactWalletAddresses(value);
    } else if (key === "error" || key === "stack") {
      sanitized[key] = typeof value === "string" ? sanitizeErrorMessage(value) : "[redacted]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
