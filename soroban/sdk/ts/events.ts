export interface DecodedEvent<T = unknown> {
  contractId: string;
  topic: string;
  payload: T;
  ledger?: number;
  txHash?: string;
}

export interface EventDecodeTraceEntry {
  phase: "normalize" | "classify" | "parse" | "fallback";
  topic: string;
  detail: string;
  timestamp: number;
}

export interface EventDecodeTrace {
  entries: EventDecodeTraceEntry[];
}

export interface DecodeWithTraceOptions {
  trace?: EventDecodeTrace;
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

function traceAdd(
  trace: EventDecodeTrace | undefined,
  phase: EventDecodeTraceEntry["phase"],
  topic: string,
  detail: string,
) {
  if (!trace) return;
  trace.entries.push({ phase, topic, detail, timestamp: Date.now() });
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

/**
 * Decode an event while collecting opt-in debug trace information.
 * When no `trace` is provided in options, behaviour is identical to `decodeEvent`
 * with zero overhead — no trace entries are allocated.
 */
export function decodeEventWithTrace(
  raw: RawEvent,
  options?: DecodeWithTraceOptions,
): DecodedEvent {
  const trace = options?.trace;
  const rawTopic = raw.topic;
  const topic = normalizeTopic(rawTopic);

  traceAdd(trace, "normalize", rawTopic, `normalized to "${topic}"`);

  if (isCoreGameEvent(topic)) {
    traceAdd(trace, "classify", topic, "routed to core_game parser");
    return parseCoreGameEvent(raw);
  }
  if (isRewardsEvent(topic)) {
    traceAdd(trace, "classify", topic, "routed to rewards parser");
    return parseRewardsEvent(raw);
  }
  if (isAchievementsEvent(topic)) {
    traceAdd(trace, "classify", topic, "routed to achievements parser");
    return parseAchievementsEvent(raw);
  }
  if (isAdminRegistryEvent(topic)) {
    traceAdd(trace, "classify", topic, "routed to admin_registry parser");
    return parseAdminRegistryEvent(raw);
  }

  traceAdd(trace, "classify", topic, "unrecognised — using fallback decoder");
  traceAdd(trace, "fallback", topic, "payload passed through as-is");

  return {
    contractId: raw.contractId,
    topic,
    payload: raw.value,
    ledger: raw.ledger,
    txHash: raw.txHash,
  };
}

/** Create a fresh trace collector for use with `decodeEventWithTrace`. */
export function createEventDecodeTrace(): EventDecodeTrace {
  return { entries: [] };
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

// --- Runtime type guards for decoded core_game events ---

export interface GuessResultPayload {
  attemptNo: number;
  outcomeCode: number;
  isCorrect: boolean;
}

/** `session_started`: payload is the hex session id. */
export type SessionStartedPayload = string;
/** `guess_submitted`: the guess commitment plus the guess result. */
export interface GuessSubmittedPayload {
  guessCommitment: string;
  result: GuessResultPayload;
}
/** `session_finalized`: payload is the player's address. */
export type SessionFinalizedPayload = string;
/** `streak_updated`: the player's streak counters. */
export interface StreakUpdatedPayload {
  current: number;
  max: number;
  lastDayPlayed: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isUint = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const pick = (o: Record<string, unknown>, camel: string, snake: string) => o[camel] ?? o[snake];

function isDecodedEvent(value: unknown, topic: string): value is DecodedEvent {
  return (
    isRecord(value) &&
    isNonEmptyString(value["contractId"]) &&
    typeof value["topic"] === "string" &&
    normalizeTopic(value["topic"]) === topic &&
    "payload" in value
  );
}

export function isSessionStartedEvent(value: unknown): value is DecodedEvent<SessionStartedPayload> {
  return isDecodedEvent(value, "session_started") && isNonEmptyString(value.payload);
}

export function isGuessSubmittedEvent(value: unknown): value is DecodedEvent<GuessSubmittedPayload> {
  if (!isDecodedEvent(value, "guess_submitted") || !isRecord(value.payload)) return false;
  const payload = value.payload;
  const result = payload["result"];
  return (
    isNonEmptyString(pick(payload, "guessCommitment", "guess_commitment")) &&
    isRecord(result) &&
    isUint(pick(result, "attemptNo", "attempt_no")) &&
    isUint(pick(result, "outcomeCode", "outcome_code")) &&
    typeof pick(result, "isCorrect", "is_correct") === "boolean"
  );
}

export function isSessionFinalizedEvent(value: unknown): value is DecodedEvent<SessionFinalizedPayload> {
  return isDecodedEvent(value, "session_finalized") && isNonEmptyString(value.payload);
}

export function isStreakUpdatedEvent(value: unknown): value is DecodedEvent<StreakUpdatedPayload> {
  if (!isDecodedEvent(value, "streak_updated") || !isRecord(value.payload)) return false;
  const payload = value.payload;
  return (
    isUint(payload["current"]) &&
    isUint(payload["max"]) &&
    isUint(pick(payload, "lastDayPlayed", "last_day_played"))
  );
}
