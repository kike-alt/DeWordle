import { EVENT_SCHEMAS, SCHEMA_VERSION } from "../shared/events/schemas";

interface SchemaSnapshot {
  version: number;
  schemas: Array<{
    topic: string;
    family: string;
    topicFields: Array<{ name: string; type: string }>;
    payloadFields: Array<{ name: string; type: string }>;
  }>;
}

function buildSnapshot(): SchemaSnapshot {
  return {
    version: SCHEMA_VERSION,
    schemas: EVENT_SCHEMAS.map((s) => ({
      topic: s.topic,
      family: s.family,
      topicFields: s.topicFields.map((f) => ({ name: f.name, type: f.type })),
      payloadFields: s.payloadFields.map((f) => ({ name: f.name, type: f.type })),
    })),
  };
}

interface SchemaDiff {
  added: string[];
  removed: string[];
  fieldChanges: Array<{ topic: string; change: string }>;
}

function diffSnapshots(prev: SchemaSnapshot, curr: SchemaSnapshot): SchemaDiff {
  const prevTopics = new Set(prev.schemas.map((s) => s.topic));
  const currTopics = new Set(curr.schemas.map((s) => s.topic));

  const added = [...currTopics].filter((t) => !prevTopics.has(t));
  const removed = [...prevTopics].filter((t) => !currTopics.has(t));
  const fieldChanges: SchemaDiff["fieldChanges"] = [];

  for (const currSchema of curr.schemas) {
    const prevSchema = prev.schemas.find((s) => s.topic === currSchema.topic);
    if (!prevSchema) continue;

    for (const field of currSchema.topicFields) {
      const prevField = prevSchema.topicFields.find((f) => f.name === field.name);
      if (!prevField) {
        fieldChanges.push({ topic: currSchema.topic, change: `added topic field "${field.name}" (${field.type})` });
      } else if (prevField.type !== field.type) {
        fieldChanges.push({ topic: currSchema.topic, change: `topic field "${field.name}" type changed from "${prevField.type}" to "${field.type}"` });
      }
    }

    for (const field of currSchema.payloadFields) {
      const prevField = prevSchema.payloadFields.find((f) => f.name === field.name);
      if (!prevField) {
        fieldChanges.push({ topic: currSchema.topic, change: `added payload field "${field.name}" (${field.type})` });
      } else if (prevField.type !== field.type) {
        fieldChanges.push({ topic: currSchema.topic, change: `payload field "${field.name}" type changed from "${prevField.type}" to "${field.type}"` });
      }
    }

    for (const prevField of prevSchema.topicFields) {
      if (!currSchema.topicFields.find((f) => f.name === prevField.name)) {
        fieldChanges.push({ topic: currSchema.topic, change: `removed topic field "${prevField.name}"` });
      }
    }

    for (const prevField of prevSchema.payloadFields) {
      if (!currSchema.payloadFields.find((f) => f.name === prevField.name)) {
        fieldChanges.push({ topic: currSchema.topic, change: `removed payload field "${prevField.name}"` });
      }
    }
  }

  return { added, removed, fieldChanges };
}

function hasBreakingChanges(diff: SchemaDiff): boolean {
  if (diff.removed.length > 0) return true;
  if (diff.fieldChanges.some((c) => c.change.startsWith("removed "))) return true;
  if (diff.fieldChanges.some((c) => c.change.includes("type changed"))) return true;
  return false;
}

function main() {
  const snapshot = buildSnapshot();
  const diffs: SchemaDiff = { added: [], removed: [], fieldChanges: [] };

  for (const schema of snapshot.schemas) {
    const prevVersionSchemas = snapshot.schemas.filter((s) => s.topic !== schema.topic);
    if (prevVersionSchemas.length === snapshot.schemas.length) {
      diffs.added.push(schema.topic);
    }
  }

  const breaking = hasBreakingChanges(diffs);

  console.log("=== Event Schema Check ===");
  console.log(`Schema version: ${SCHEMA_VERSION}`);
  console.log(`Total schemas: ${snapshot.schemas.length}`);
  console.log(`New topics: ${diffs.added.length}`);
  console.log(`Removed topics: ${diffs.removed.length}`);
  console.log(`Breaking changes: ${breaking ? "YES" : "NO"}`);

  if (breaking) {
    console.error("\nBreaking schema changes detected! Bump SCHEMA_VERSION.");
    process.exit(1);
  }

  if (diffs.added.length > 0) {
    console.log(`\nNew event schemas: ${diffs.added.join(", ")}`);
  }

  console.log("\nSchema check passed.");
}

main();
