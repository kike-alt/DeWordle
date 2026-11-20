// Staggered tile flip timing and copyable error details. Closes #1597, #1598.

// 0ms, 250ms, 500ms, 750ms, 1000ms for a five-letter row.
export const FLIP_STEP_MS = 250;
export const flipDelayMs = (index: number) => index * FLIP_STEP_MS;

// Inline style for the tile at `index`; pair it with the keyframes below in the global CSS.
export const tileFlipStyle = (index: number) => ({
  animation: `tile-flip 500ms ease-in-out ${flipDelayMs(index)}ms both`,
});

/*
 Global CSS:
 @keyframes tile-flip {
   0%   { transform: rotateX(0); }
   50%  { transform: rotateX(-90deg); }
   100% { transform: rotateX(0); }
 }
*/

export interface TxErrorDetails {
  code?: string;
  contractAddress?: string;
  txHash?: string;
  message?: string;
}

// Plain-text block users can paste into a support ticket.
export const buildDebugInfo = (d: TxErrorDetails) =>
  [
    `Error code: ${d.code ?? "unknown"}`,
    `Contract: ${d.contractAddress ?? "unknown"}`,
    `Transaction hash: ${d.txHash ?? "unknown"}`,
    `Message: ${d.message ?? "n/a"}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

export async function copyDebugInfo(d: TxErrorDetails): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildDebugInfo(d));
    return true;
  } catch {
    return false;
  }
}
