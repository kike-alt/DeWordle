/**
 * QA-215: Contract registry drift snapshot tests across frontend, backend, and SDK.
 *
 * These tests guard against silent divergence when a new contract topic is added
 * to one consumer (e.g. the SDK event decoder) but not propagated to the others.
 *
 * Strategy:
 *   - The canonical source-of-truth is ALLOWED_TOPICS in event-normalizer.service.ts.
 *   - Inline "registry snapshots" represent what the frontend SDK and the frontend
 *     lib would import if they were live modules. Tests fail immediately if:
 *       (a) the BE normalizer accepts a topic that the FE/SDK snapshot does not know, or
 *       (b) the FE/SDK snapshot claims a topic that the BE normalizer rejects.
 *
 * Extension guide: when a new contract event is added, update ALL THREE registries:
 *   1. ALLOWED_TOPICS in event-normalizer.service.ts
 *   2. FE_SDK_TOPICS below
 *   3. FRONTEND_LIB_TOPICS below
 */
import { EventNormalizerService, ALLOWED_TOPICS } from './processors/event-normalizer.service';

// ---------------------------------------------------------------------------
// Inline registry snapshots (mirror what FE SDK / frontend lib export)
// ---------------------------------------------------------------------------

/** Topics the frontend SDK decoder is known to handle. */
const FE_SDK_TOPICS = new Set([
  'session_started',
  'guess_submitted',
  'session_finalized',
  'reward_claimed',
  'achievement_unlocked',
]);

/** Topics the frontend lib reads from projection-backed API responses. */
const FRONTEND_LIB_TOPICS = new Set([
  'session_started',
  'guess_submitted',
  'session_finalized',
  'reward_claimed',
  'achievement_unlocked',
]);

// ---------------------------------------------------------------------------
// Healthy synchronized scenario
// ---------------------------------------------------------------------------

describe('QA-215: contract registry — healthy synchronized state', () => {
  it('backend ALLOWED_TOPICS and FE SDK topics are identical (no drift)', () => {
    const beTopics = [...ALLOWED_TOPICS].sort();
    const sdkTopics = [...FE_SDK_TOPICS].sort();
    expect(beTopics).toEqual(sdkTopics);
  });

  it('backend ALLOWED_TOPICS and frontend lib topics are identical (no drift)', () => {
    const beTopics = [...ALLOWED_TOPICS].sort();
    const libTopics = [...FRONTEND_LIB_TOPICS].sort();
    expect(beTopics).toEqual(libTopics);
  });

  it('normalizer accepts every topic in the FE SDK snapshot', () => {
    const normalizer = new EventNormalizerService();
    for (const topic of FE_SDK_TOPICS) {
      const event = normalizer.normalize('testnet', {
        contractId: 'CTEST0000000000000000000000000000000000000000000000',
        topic,
        txHash: 'aabbccdd',
        ledger: 100,
        eventIndex: 0,
        payload: { data: 'ok' },
      });
      expect(normalizer.isValid(event)).toBe(true);
    }
  });

  it('all SDK topics normalise without mutation (lowercase passthrough)', () => {
    const normalizer = new EventNormalizerService();
    for (const topic of FE_SDK_TOPICS) {
      const event = normalizer.normalize('testnet', {
        contractId: 'CTEST0000000000000000000000000000000000000000000000',
        topic: topic.toUpperCase(),
        txHash: 'aabbccdd',
        ledger: 100,
        eventIndex: 0,
      });
      expect(event.topic).toBe(topic);
    }
  });
});

// ---------------------------------------------------------------------------
// Mismatch / drift scenario
// ---------------------------------------------------------------------------

describe('QA-215: contract registry — drift detection', () => {
  it('detects a topic added to SDK but not yet to the BE normalizer', () => {
    // Simulate drift: SDK knows about a new topic the BE has not added yet
    const driftedSdkTopics = new Set([...FE_SDK_TOPICS, 'streak_reset']);

    const unregisteredInBE = [...driftedSdkTopics].filter(
      (t) => !ALLOWED_TOPICS.has(t),
    );
    expect(unregisteredInBE).toContain('streak_reset');
  });

  it('detects a topic removed from SDK but still in BE allowlist', () => {
    // Simulate drift: SDK dropped a topic the BE still accepts
    const staleSdkTopics = new Set([...FE_SDK_TOPICS]);
    staleSdkTopics.delete('achievement_unlocked');

    const orphanedInBE = [...ALLOWED_TOPICS].filter((t) => !staleSdkTopics.has(t));
    expect(orphanedInBE).toContain('achievement_unlocked');
  });

  it('normalizer rejects a topic not in any registry (unknown contract event)', () => {
    const normalizer = new EventNormalizerService();
    const event = normalizer.normalize('testnet', {
      contractId: 'CTEST0000000000000000000000000000000000000000000000',
      topic: 'contract_upgraded', // hypothetical future topic — not yet registered
      txHash: 'aabbccdd',
      ledger: 100,
      eventIndex: 0,
    });
    expect(normalizer.isValid(event)).toBe(false);
    expect(FE_SDK_TOPICS.has('contract_upgraded')).toBe(false);
    expect(FRONTEND_LIB_TOPICS.has('contract_upgraded')).toBe(false);
  });

  it('snapshot comparison function surfaces diff set correctly', () => {
    function registryDiff(a: Set<string>, b: Set<string>) {
      return {
        onlyInA: [...a].filter((t) => !b.has(t)),
        onlyInB: [...b].filter((t) => !a.has(t)),
      };
    }

    const simulatedBE = new Set([...ALLOWED_TOPICS, 'new_event']);
    const { onlyInA, onlyInB } = registryDiff(simulatedBE, FE_SDK_TOPICS);

    expect(onlyInA).toContain('new_event');
    expect(onlyInB).toHaveLength(0);
  });
});
