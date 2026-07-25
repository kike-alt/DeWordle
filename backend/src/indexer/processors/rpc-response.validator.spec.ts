import {
  RpcValidationError,
  validateRpcResponseShape,
  diagnoseMalformedEvent,
} from './rpc-response.validator';

// ---------------------------------------------------------------------------
// validateRpcResponseShape
// ---------------------------------------------------------------------------

describe('validateRpcResponseShape', () => {
  it('returns the events array from a well-formed response', () => {
    const events = [{ contractId: 'C1', topic: 'session_started' }];
    const result = validateRpcResponseShape({ result: { events } });
    expect(result).toBe(events);
  });

  it('returns an empty array when result.events is empty', () => {
    const result = validateRpcResponseShape({ result: { events: [] } });
    expect(result).toEqual([]);
  });

  it('throws when body is null', () => {
    expect(() => validateRpcResponseShape(null)).toThrow(RpcValidationError);
    expect(() => validateRpcResponseShape(null)).toThrow(
      'RPC response body is not a JSON object',
    );
  });

  it('throws and includes receivedType when body is a primitive', () => {
    expect(() => validateRpcResponseShape('string')).toThrow(
      RpcValidationError,
    );
    expect(() => validateRpcResponseShape(42)).toThrow(RpcValidationError);
  });

  it('throws when body is an array', () => {
    expect(() => validateRpcResponseShape([])).toThrow(RpcValidationError);
  });

  it('throws when response contains an error field', () => {
    const call = () =>
      validateRpcResponseShape({
        error: { code: -32600, message: 'Invalid Request' },
      });
    expect(call).toThrow(RpcValidationError);
    expect(call).toThrow('RPC returned an error response');
  });

  it('includes error code and message in RpcValidationError context', () => {
    try {
      validateRpcResponseShape({
        error: { code: -32600, message: 'Invalid Request' },
      });
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcValidationError);
      expect((err as RpcValidationError).context).toMatchObject({
        code: -32600,
        message: 'Invalid Request',
      });
    }
  });

  it('throws when result field is missing', () => {
    expect(() => validateRpcResponseShape({ jsonrpc: '2.0', id: 1 })).toThrow(
      'RPC response missing "result" field',
    );
  });

  it('includes presentKeys in context when result is missing', () => {
    try {
      validateRpcResponseShape({ jsonrpc: '2.0', id: 1 });
      fail('should have thrown');
    } catch (err) {
      expect((err as RpcValidationError).context.presentKeys).toContain(
        'jsonrpc',
      );
    }
  });

  it('throws when result is null', () => {
    expect(() => validateRpcResponseShape({ result: null })).toThrow(
      'RPC response missing "result" field',
    );
  });

  it('throws when result is not an object', () => {
    expect(() => validateRpcResponseShape({ result: 'bad' })).toThrow(
      '"result" is not an object',
    );
    expect(() => validateRpcResponseShape({ result: 123 })).toThrow(
      '"result" is not an object',
    );
  });

  it('throws when result is an array', () => {
    expect(() => validateRpcResponseShape({ result: [] })).toThrow(
      '"result" is not an object',
    );
  });

  it('throws when result.events is missing', () => {
    expect(() => validateRpcResponseShape({ result: {} })).toThrow(
      '"result.events" is not an array',
    );
  });

  it('throws when result.events is not an array', () => {
    expect(() =>
      validateRpcResponseShape({ result: { events: 'bad' } }),
    ).toThrow('"result.events" is not an array');
    expect(() =>
      validateRpcResponseShape({ result: { events: null } }),
    ).toThrow('"result.events" is not an array');
    expect(() => validateRpcResponseShape({ result: { events: {} } })).toThrow(
      '"result.events" is not an array',
    );
  });

  it('includes receivedType in context for events shape error', () => {
    try {
      validateRpcResponseShape({ result: { events: 'oops' } });
      fail('should have thrown');
    } catch (err) {
      expect((err as RpcValidationError).context.receivedType).toBe('string');
    }
  });

  it('reports receivedType as "missing" when events key is absent', () => {
    try {
      validateRpcResponseShape({ result: {} });
      fail('should have thrown');
    } catch (err) {
      expect((err as RpcValidationError).context.receivedType).toBe('missing');
    }
  });

  it('sets RpcValidationError.name to "RpcValidationError"', () => {
    try {
      validateRpcResponseShape(null);
    } catch (err) {
      expect((err as Error).name).toBe('RpcValidationError');
    }
  });

  it('handles gracefully when error field is a non-object truthy value', () => {
    expect(() => validateRpcResponseShape({ error: 'some error' })).toThrow(
      RpcValidationError,
    );
  });
});

// ---------------------------------------------------------------------------
// diagnoseMalformedEvent
// ---------------------------------------------------------------------------

const makeValidRaw = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  contractId: 'CABC',
  topic: 'session_finalized',
  txHash: 'tx1',
  ledger: 10,
  eventIndex: 0,
  payload: { sessionId: 's1' },
  ...overrides,
});

describe('diagnoseMalformedEvent', () => {
  it('returns null for a structurally valid event', () => {
    expect(diagnoseMalformedEvent(makeValidRaw(), 0)).toBeNull();
  });

  it('returns null when optional payload is absent', () => {
    const { payload: _p, ...withoutPayload } = makeValidRaw();
    expect(diagnoseMalformedEvent(withoutPayload, 0)).toBeNull();
  });

  it('returns null for eventIndex of 0 (zero is valid)', () => {
    expect(
      diagnoseMalformedEvent(makeValidRaw({ eventIndex: 0 }), 0),
    ).toBeNull();
  });

  it('reports non-object event (null)', () => {
    const diag = diagnoseMalformedEvent(null, 3);
    expect(diag).not.toBeNull();
    expect(diag!.index).toBe(3);
    expect(diag!.malformedFields['<event>']).toBeDefined();
    expect(diag!.malformedFields['<event>'].received).toBe('null');
  });

  it('reports non-object event (array)', () => {
    const diag = diagnoseMalformedEvent([], 1);
    expect(diag!.malformedFields['<event>'].received).toBe('array');
  });

  it('reports non-object event (string)', () => {
    const diag = diagnoseMalformedEvent('oops', 0);
    expect(diag!.malformedFields['<event>'].received).toBe('string');
  });

  it('reports missing contractId', () => {
    const diag = diagnoseMalformedEvent(
      makeValidRaw({ contractId: undefined }),
      0,
    );
    expect(diag!.missingFields).toContain('contractId');
  });

  it('reports missing txHash', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ txHash: null }), 0);
    expect(diag!.missingFields).toContain('txHash');
  });

  it('reports missing topic', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ topic: undefined }), 0);
    expect(diag!.missingFields).toContain('topic');
  });

  it('reports missing ledger', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ ledger: undefined }), 0);
    expect(diag!.missingFields).toContain('ledger');
  });

  it('reports missing eventIndex', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ eventIndex: null }), 0);
    expect(diag!.missingFields).toContain('eventIndex');
  });

  it('reports contractId with wrong type', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ contractId: 123 }), 0);
    expect(diag!.malformedFields.contractId).toEqual({
      expected: 'string',
      received: 'number',
    });
  });

  it('reports txHash with wrong type', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ txHash: true }), 0);
    expect(diag!.malformedFields.txHash).toEqual({
      expected: 'string',
      received: 'boolean',
    });
  });

  it('reports topic with wrong type', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ topic: {} }), 0);
    expect(diag!.malformedFields.topic).toEqual({
      expected: 'string',
      received: 'object',
    });
  });

  it('reports ledger as string', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ ledger: '12' }), 0);
    expect(diag!.malformedFields.ledger).toEqual({
      expected: 'number',
      received: 'string',
    });
  });

  it('reports eventIndex as string', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ eventIndex: '0' }), 0);
    expect(diag!.malformedFields.eventIndex).toEqual({
      expected: 'number',
      received: 'string',
    });
  });

  it('reports payload as array', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ payload: [1, 2] }), 0);
    expect(diag!.malformedFields.payload).toEqual({
      expected: 'object',
      received: 'array',
    });
  });

  it('reports payload as primitive', () => {
    const diag = diagnoseMalformedEvent(makeValidRaw({ payload: 'bad' }), 0);
    expect(diag!.malformedFields.payload).toEqual({
      expected: 'object',
      received: 'string',
    });
  });

  it('reports multiple problems in a single call', () => {
    const diag = diagnoseMalformedEvent(
      {
        contractId: undefined,
        txHash: 999,
        ledger: undefined,
        eventIndex: 0,
        topic: 'ok',
      },
      5,
    );
    expect(diag!.index).toBe(5);
    expect(diag!.missingFields).toContain('contractId');
    expect(diag!.missingFields).toContain('ledger');
    expect(diag!.malformedFields.txHash).toBeDefined();
  });

  it('includes the correct index in the diagnostic', () => {
    const diag = diagnoseMalformedEvent(
      makeValidRaw({ contractId: undefined }),
      7,
    );
    expect(diag!.index).toBe(7);
  });

  it('does not flag null payload (null is treated as absent)', () => {
    // null payload is skipped — normalization defaults it to {}
    expect(
      diagnoseMalformedEvent(makeValidRaw({ payload: null }), 0),
    ).toBeNull();
  });
});
