export const sessionStartedFixture = {
  topic: "session_started",
  family: "core_game",
  topicFields: [
    { name: "topic", type: "Symbol" },
    { name: "player", type: "Address" },
    { name: "day_id", type: "u32" },
  ],
  payloadFields: [{ name: "session_id", type: "BytesN<32>" }],
  samplePayload: { session_id: "0xabc123def456" },
  sampleTopic: ["session_started", "GABC...DEF", 42],
};

export const guessSubmittedFixture = {
  topic: "guess_submitted",
  family: "core_game",
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
  samplePayload: {
    guess_commitment: "0xdef789",
    attempt_no: 1,
    outcome_code: 2,
    is_correct: false,
  },
  sampleTopic: ["guess_submitted", "0xabc123"],
};

export const sessionFinalizedFixture = {
  topic: "session_finalized",
  family: "core_game",
  topicFields: [
    { name: "topic", type: "Symbol" },
    { name: "session_id", type: "BytesN<32>" },
  ],
  payloadFields: [{ name: "player", type: "Address" }],
  samplePayload: { player: "GABC...DEF" },
  sampleTopic: ["session_finalized", "0xabc123"],
};

export const rewardClaimedFixture = {
  topic: "claimed",
  family: "rewards",
  topicFields: [
    { name: "topic", type: "Symbol" },
    { name: "player", type: "Address" },
  ],
  payloadFields: [{ name: "amount", type: "u64" }],
  samplePayload: { amount: 500 },
  sampleTopic: ["claimed", "GABC...DEF"],
};

export const achievementUnlockedFixture = {
  topic: "achievement_unlocked",
  family: "achievements",
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
  samplePayload: {
    player: "GABC...DEF",
    id: "first_win",
    unlocked_at: 1700000000,
    nonce: 1,
  },
  sampleTopic: ["achievement_unlocked", "GABC...DEF", "first_win"],
};

export const ALL_FIXTURES = [
  sessionStartedFixture,
  guessSubmittedFixture,
  sessionFinalizedFixture,
  rewardClaimedFixture,
  achievementUnlockedFixture,
];
