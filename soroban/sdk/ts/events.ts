export interface DecodedEvent<T = unknown> {
  contractId: string;
  topic: string;
  payload: T;
  ledger?: number;
  txHash?: string;
}

export type CoreGameEventTopic =
  | "day_published"
  | "session_started"
  | "guess_submitted"
  | "session_finalized"
  | "streak_updated"
  | "core_game_paused";

export type RewardsEventTopic = "accrued" | "claimed" | "emission_set";
export type AchievementsEventTopic = "achievement_defined" | "achievement_unlocked";
export type AdminRegistryEventTopic = "contract_set" | "role_set";

interface RawEvent {
  contractId: string;
  topic: string;
  value: unknown;
  ledger?: number;
  txHash?: string;
}

export function normalizeTopic(rawTopic: string): string {
  return rawTopic.trim().toLowerCase();
}

export function parseEvent<T>(raw: RawEvent): DecodedEvent<T> {
  return {
    contractId: raw.contractId,
    topic: normalizeTopic(raw.topic),
    payload: raw.value as T,
    ledger: raw.ledger,
    txHash: raw.txHash,
  };
}

export function parseCoreGameEvent<T = unknown>(raw: RawEvent): DecodedEvent<T> {
  return parseEvent<T>(raw);
}

export function parseRewardsEvent<T = unknown>(raw: RawEvent): DecodedEvent<T> {
  return parseEvent<T>(raw);
}

export function parseAchievementsEvent<T = unknown>(raw: RawEvent): DecodedEvent<T> {
  return parseEvent<T>(raw);
}

export function parseAdminRegistryEvent<T = unknown>(raw: RawEvent): DecodedEvent<T> {
  return parseEvent<T>(raw);
}

export function isCoreGameEvent(topic: string): topic is CoreGameEventTopic {
  return [
    "day_published",
    "session_started",
    "guess_submitted",
    "session_finalized",
    "streak_updated",
    "core_game_paused",
  ].includes(normalizeTopic(topic));
}

export function isRewardsEvent(topic: string): topic is RewardsEventTopic {
  return ["accrued", "claimed", "emission_set"].includes(normalizeTopic(topic));
}

export function isAchievementsEvent(topic: string): topic is AchievementsEventTopic {
  return ["achievement_defined", "achievement_unlocked"].includes(normalizeTopic(topic));
}

export function isAdminRegistryEvent(topic: string): topic is AdminRegistryEventTopic {
  return ["contract_set", "role_set"].includes(normalizeTopic(topic));
}

/**
 * Decoder map: routes a raw event to the correct typed parser based on topic.
 * Unknown topics are returned with payload as-is and topic preserved.
 */
export function decodeEvent(raw: RawEvent): DecodedEvent {
  const topic = normalizeTopic(raw.topic);

  if (isCoreGameEvent(topic)) return parseCoreGameEvent(raw);
  if (isRewardsEvent(topic)) return parseRewardsEvent(raw);
  if (isAchievementsEvent(topic)) return parseAchievementsEvent(raw);
  if (isAdminRegistryEvent(topic)) return parseAdminRegistryEvent(raw);

  // Explicit fallback for unknown topics
  return {
    contractId: raw.contractId,
    topic,
    payload: raw.value,
    ledger: raw.ledger,
    txHash: raw.txHash,
  };
}

/** Unit-testable topic routing: returns which contract family owns the topic. */
export function resolveEventFamily(
  topic: string,
): "core_game" | "rewards" | "achievements" | "admin_registry" | "unknown" {
  const t = normalizeTopic(topic);
  if (isCoreGameEvent(t)) return "core_game";
  if (isRewardsEvent(t)) return "rewards";
  if (isAchievementsEvent(t)) return "achievements";
  if (isAdminRegistryEvent(t)) return "admin_registry";
  return "unknown";
}
