import { describe, it, expect } from "vitest";
import {
  EVENT_SCHEMAS,
  SCHEMA_VERSION,
  getSchemaByTopic,
  getSchemasForFamily,
  EventSchema,
} from "../events/schemas";
import {
  sessionStartedFixture,
  guessSubmittedFixture,
  sessionFinalizedFixture,
  rewardClaimedFixture,
  achievementUnlockedFixture,
} from "./fixtures/events";

const FIXTURE_MAP: Record<string, (typeof sessionStartedFixture)> = {
  session_started: sessionStartedFixture,
  guess_submitted: guessSubmittedFixture,
  session_finalized: sessionFinalizedFixture,
  claimed: rewardClaimedFixture,
  achievement_unlocked: achievementUnlockedFixture,
};

function assertFieldShape(
  schemaFields: EventSchema["topicFields"],
  fixtureFields: { name: string; type: string }[],
  direction: "schema-has-fixture" | "fixture-has-schema",
) {
  for (const field of fixtureFields) {
    const match = schemaFields.find((s) => s.name === field.name);
    if (direction === "schema-has-fixture") {
      expect(match, `Missing field "${field.name}" in schema`).toBeDefined();
      if (match) {
        expect(match.type).toBe(field.type);
      }
    } else {
      expect(match, `Unexpected field "${field.name}" in fixture`).toBeDefined();
    }
  }
}

describe("Event schema backward compatibility", () => {
  it("schema version is a positive integer", () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  it("all schemas have required properties", () => {
    for (const schema of EVENT_SCHEMAS) {
      expect(schema.topic).toBeTruthy();
      expect(schema.family).toBeTruthy();
      expect(schema.description).toBeTruthy();
      expect(schema.version).toBeGreaterThanOrEqual(1);
      expect(schema.topicFields.length).toBeGreaterThan(0);
      expect(schema.payloadFields.length).toBeGreaterThan(0);
    }
  });

  it("every schema has at least one topic field with type Symbol", () => {
    for (const schema of EVENT_SCHEMAS) {
      const hasSymbolTopic = schema.topicFields.some(
        (f) => f.type === "Symbol" && f.name === "topic",
      );
      expect(hasSymbolTopic).toBe(true);
    }
  });

  it("schema topics match fixture topics", () => {
    for (const schema of EVENT_SCHEMAS) {
      const fixture = FIXTURE_MAP[schema.topic];
      if (fixture) {
        expect(fixture.topic).toBe(schema.topic);
      }
    }
  });

  it("schema topic fields match fixture topic fields", () => {
    for (const schema of EVENT_SCHEMAS) {
      const fixture = FIXTURE_MAP[schema.topic];
      if (fixture) {
        assertFieldShape(schema.topicFields, fixture.topicFields, "schema-has-fixture");
        assertFieldShape(schema.topicFields, fixture.topicFields, "fixture-has-schema");
      }
    }
  });

  it("schema payload fields match fixture payload fields", () => {
    for (const schema of EVENT_SCHEMAS) {
      const fixture = FIXTURE_MAP[schema.topic];
      if (fixture) {
        assertFieldShape(schema.payloadFields, fixture.payloadFields, "schema-has-fixture");
        assertFieldShape(schema.payloadFields, fixture.payloadFields, "fixture-has-schema");
      }
    }
  });

  it("no duplicate topic names across schemas", () => {
    const topics = EVENT_SCHEMAS.map((s) => s.topic);
    const unique = new Set(topics);
    expect(unique.size).toBe(topics.length);
  });

  it("getSchemaByTopic returns correct schema", () => {
    expect(getSchemaByTopic("session_started")?.family).toBe("core_game");
    expect(getSchemaByTopic("claimed")?.family).toBe("rewards");
    expect(getSchemaByTopic("achievement_unlocked")?.family).toBe("achievements");
    expect(getSchemaByTopic("nonexistent")).toBeUndefined();
  });

  it("getSchemasForFamily returns correct schemas", () => {
    const coreGame = getSchemasForFamily("core_game");
    expect(coreGame.length).toBeGreaterThanOrEqual(3);
    for (const s of coreGame) {
      expect(s.family).toBe("core_game");
    }

    const rewards = getSchemasForFamily("rewards");
    expect(rewards.length).toBeGreaterThanOrEqual(1);
    for (const s of rewards) {
      expect(s.family).toBe("rewards");
    }

    const achievements = getSchemasForFamily("achievements");
    expect(achievements.length).toBeGreaterThanOrEqual(1);
    for (const s of achievements) {
      expect(s.family).toBe("achievements");
    }
  });

  it("field types are valid Soroban types", () => {
    const VALID_TYPES = [
      "Symbol", "Address", "BytesN<32>",
      "u32", "u64", "i32", "i64",
      "bool", "String", "Vec", "Map",
    ];

    for (const schema of EVENT_SCHEMAS) {
      for (const field of [...schema.topicFields, ...schema.payloadFields]) {
        expect(
          VALID_TYPES.includes(field.type),
          `Invalid type "${field.type}" in schema "${schema.topic}" field "${field.name}"`,
        ).toBe(true);
      }
    }
  });
});
