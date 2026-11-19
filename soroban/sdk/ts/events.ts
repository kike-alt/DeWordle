import { scValToNative, xdr } from "@stellar/stellar-sdk";

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

// --- Typed `session_started` subscription ---

/** Decoded `("session", "started", player, day_id)` event with `session_id` payload. */
export interface SessionStartedEvent {
  player: string;
  dayId: number;
  /** Hex-encoded 32-byte session id. */
  sessionId: string;
  contractId?: string;
  ledger?: number;
}

/** A raw RPC event: topics/value as `xdr.ScVal` or base64 XDR strings. */
export interface RawChainEvent {
  contractId?: string;
  ledger?: number;
  topic: Array<xdr.ScVal | string>;
  value: xdr.ScVal | string;
}

const toScVal = (v: xdr.ScVal | string): xdr.ScVal =>
  typeof v === "string" ? xdr.ScVal.fromXDR(v, "base64") : v;

/**
 * Decodes a raw `session_started` event into a typed object. Returns null for
 * any other event or a malformed one; it never throws.
 */
export function decodeSessionStartedEvent(raw: RawChainEvent): SessionStartedEvent | null {
  try {
    if (raw.topic.length < 4) return null;
    const [family, name, player, dayId] = raw.topic.map((t) => scValToNative(toScVal(t)));
    if (family !== "session" || name !== "started") return null;
    const sessionId = scValToNative(toScVal(raw.value));
    if (typeof player !== "string" || !(sessionId instanceof Uint8Array)) return null;
    return {
      player,
      dayId: Number(dayId),
      sessionId: Buffer.from(sessionId).toString("hex"),
      contractId: raw.contractId,
      ledger: raw.ledger,
    };
  } catch {
    return null;
  }
}

export interface SessionStartedSubscriptionOptions {
  /** Fetches events newer than `cursor` (the transport is up to the caller). */
  fetchEvents: (cursor?: string) => Promise<{ events: RawChainEvent[]; cursor?: string }>;
  /** Poll interval in ms (default 5000). */
  intervalMs?: number;
  /** Only deliver events for this player. */
  player?: string;
  /** Only deliver events for this day. */
  dayId?: number;
  onError?: (error: unknown) => void;
}

/**
 * Polls for `session_started` events and invokes `callback` with decoded,
 * typed events. Returns an `unsubscribe` function that stops polling.
 */
export function subscribeSessionStarted(
  callback: (event: SessionStartedEvent) => void,
  options: SessionStartedSubscriptionOptions,
): () => void {
  const { fetchEvents, intervalMs = 5000, player, dayId, onError } = options;
  let cursor: string | undefined;
  let stopped = false;
  let inFlight = false;

  const poll = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const result = await fetchEvents(cursor);
      if (stopped) return;
      cursor = result.cursor ?? cursor;
      for (const raw of result.events) {
        const event = decodeSessionStartedEvent(raw);
        if (!event) continue;
        if (player !== undefined && event.player !== player) continue;
        if (dayId !== undefined && event.dayId !== dayId) continue;
        callback(event);
      }
    } catch (error) {
      onError?.(error);
    } finally {
      inFlight = false;
    }
  };

  void poll();
  const timer = setInterval(poll, intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
