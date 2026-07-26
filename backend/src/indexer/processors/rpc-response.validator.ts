export class RpcValidationError extends Error {
  readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'RpcValidationError';
    this.context = context;
  }
}

/**
 * Validates the top-level JSON-RPC 2.0 response body and returns the raw events array.
 *
 * Throws RpcValidationError for protocol-level failures: error responses, missing
 * "result" field, or "result.events" not being an array. These indicate the RPC
 * node is misbehaving and the entire poll cycle should be aborted.
 */
export function validateRpcResponseShape(
  data: unknown,
): Record<string, unknown>[] {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new RpcValidationError('RPC response body is not a JSON object', {
      receivedType: data === null ? 'null' : typeof data,
    });
  }

  const body = data as Record<string, unknown>;

  if (body.error !== undefined) {
    const err =
      body.error !== null && typeof body.error === 'object'
        ? (body.error as Record<string, unknown>)
        : {};
    throw new RpcValidationError('RPC returned an error response', {
      code: err.code,
      message: err.message,
    });
  }

  if (body.result === undefined || body.result === null) {
    throw new RpcValidationError('RPC response missing "result" field', {
      presentKeys: Object.keys(body),
    });
  }

  if (typeof body.result !== 'object' || Array.isArray(body.result)) {
    throw new RpcValidationError('"result" is not an object', {
      receivedType: typeof body.result,
    });
  }

  const result = body.result as Record<string, unknown>;

  if (!Array.isArray(result.events)) {
    throw new RpcValidationError('"result.events" is not an array', {
      receivedType:
        result.events === undefined ? 'missing' : typeof result.events,
    });
  }

  return result.events as Record<string, unknown>[];
}

export interface RawEventDiagnostic {
  index: number;
  missingFields: string[];
  malformedFields: Record<string, { expected: string; received: string }>;
}

/**
 * Inspects a single raw event from the RPC response for structural correctness
 * before it enters normalization. Returns null if the event is well-formed, or a
 * diagnostic object describing every missing/malformed field so callers can log
 * actionable details and skip the event.
 *
 * Semantic validation (allowed topics, ledger range, payload size) is left to
 * EventNormalizerService.isValid() after normalization.
 */
export function diagnoseMalformedEvent(
  raw: unknown,
  index: number,
): RawEventDiagnostic | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      index,
      missingFields: [],
      malformedFields: {
        '<event>': {
          expected: 'object',
          received:
            raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw,
        },
      },
    };
  }

  const e = raw as Record<string, unknown>;
  const missingFields: string[] = [];
  const malformedFields: Record<
    string,
    { expected: string; received: string }
  > = {};

  for (const field of ['contractId', 'txHash', 'topic'] as const) {
    if (e[field] === undefined || e[field] === null) {
      missingFields.push(field);
    } else if (typeof e[field] !== 'string') {
      malformedFields[field] = {
        expected: 'string',
        received: typeof e[field],
      };
    }
  }

  if (e.ledger === undefined || e.ledger === null) {
    missingFields.push('ledger');
  } else if (typeof e.ledger !== 'number') {
    malformedFields.ledger = {
      expected: 'number',
      received: typeof e.ledger,
    };
  }

  if (e.eventIndex === undefined || e.eventIndex === null) {
    missingFields.push('eventIndex');
  } else if (typeof e.eventIndex !== 'number') {
    malformedFields.eventIndex = {
      expected: 'number',
      received: typeof e.eventIndex,
    };
  }

  if (
    e.payload !== undefined &&
    e.payload !== null &&
    (typeof e.payload !== 'object' || Array.isArray(e.payload))
  ) {
    malformedFields.payload = {
      expected: 'object',
      received: Array.isArray(e.payload) ? 'array' : typeof e.payload,
    };
  }

  if (missingFields.length === 0 && Object.keys(malformedFields).length === 0) {
    return null;
  }

  return { index, missingFields, malformedFields };
}
