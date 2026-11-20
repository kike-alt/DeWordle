// Share result QR code and achievement progress. Closes #1611, #1613.

// Text encoded in the QR code: the formatted score plus a link to the game summary.
export const buildShareText = (summary: string, url: string) => `${summary}\n${url}`;

// No QR library is bundled, so the code is rendered by a QR image endpoint. Only the share text
// (score summary + public URL) is sent; swap for a local `qrcode` package if preferred.
export const qrImageUrl = (text: string, size = 180) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

export interface AchievementProgress {
  current: number;
  target: number;
  percent: number;
  label: string;
}

// e.g. achievementProgress(7, 10, "wins") -> { percent: 70, label: "7 / 10 wins" }
export function achievementProgress(current: number, target: number, unit = ""): AchievementProgress {
  const safeTarget = Math.max(target, 1);
  const clamped = Math.min(Math.max(current, 0), safeTarget);
  return {
    current: clamped,
    target: safeTarget,
    percent: Math.round((clamped / safeTarget) * 100),
    label: `${clamped} / ${safeTarget}${unit ? ` ${unit}` : ""}`,
  };
}
