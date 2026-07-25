export type EventSchemaField = {
  name: string;
  type: string;
  required?: boolean;
};

export type EventSchema = {
  topic: string;
  family: "core_game" | "rewards" | "achievements" | "admin_registry";
  description: string;
  topicFields: EventSchemaField[];
  payloadFields: EventSchemaField[];
  version: number;
};

export const EVENT_SCHEMAS: EventSchema[] = [
  {
    topic: "session_started",
    family: "core_game",
    description: "Emitted when a player starts a new game session",
    topicFields: [
      { name: "topic", type: "Symbol" },
      { name: "player", type: "Address" },
      { name: "day_id", type: "u32" },
    ],
    payloadFields: [{ name: "session_id", type: "BytesN<32>" }],
    version: 1,
  },
  {
    topic: "guess_submitted",
    family: "core_game",
    description: "Emitted when a player submits a guess",
    topicFields: [
      { name: "topic", type: "Symbol" },
      { name: "session_id", type: "BytesN<32>" },
    ],
    payloadFields: [
      { name: "guess_commitment", type: "BytesN<32>" },
      { name: "attempt_no", type: "u32" },
      { name: "outcome_code", type: "u32" },
      { name: "is_correct", type: "bool" },
    ],
    version: 1,
  },
  {
    topic: "session_finalized",
    family: "core_game",
    description: "Emitted when a session is finalized (won or lost)",
    topicFields: [
      { name: "topic", type: "Symbol" },
      { name: "session_id", type: "BytesN<32>" },
    ],
    payloadFields: [{ name: "player", type: "Address" }],
    version: 1,
  },
  {
    topic: "streak_updated",
    family: "core_game",
    description: "Emitted when a player's streak is updated",
    topicFields: [
      { name: "topic", type: "Symbol" },
      { name: "player", type: "Address" },
    ],
    payloadFields: [
      { name: "current", type: "u32" },
      { name: "max", type: "u32" },
      { name: "last_day_played", type: "u32" },
    ],
    version: 1,
  },
  {
    topic: "claimed",
    family: "rewards",
    description: "Emitted when a player claims accrued reward points",
    topicFields: [
      { name: "topic", type: "Symbol" },
      { name: "player", type: "Address" },
    ],
    payloadFields: [{ name: "amount", type: "u64" }],
    version: 1,
  },
  {
    topic: "achievement_unlocked",
    family: "achievements",
    description: "Emitted when a player unlocks an achievement",
    topicFields: [
      { name: "topic", type: "Symbol" },
      { name: "player", type: "Address" },
      { name: "id", type: "Symbol" },
    ],
    payloadFields: [
      { name: "player", type: "Address" },
      { name: "id", type: "Symbol" },
      { name: "unlocked_at", type: "u64" },
      { name: "nonce", type: "u64" },
    ],
    version: 1,
  },
];

export const SCHEMA_VERSION = 1;

export function getSchemaByTopic(topic: string): EventSchema | undefined {
  return EVENT_SCHEMAS.find((s) => s.topic === topic);
}

export function getSchemasForFamily(
  family: EventSchema["family"],
): EventSchema[] {
  return EVENT_SCHEMAS.filter((s) => s.family === family);
}
