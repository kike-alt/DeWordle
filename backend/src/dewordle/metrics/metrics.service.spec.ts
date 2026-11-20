import { MetricsService } from './metrics.service';
import { collectDefaultMetrics, Registry } from 'prom-client';

// Mock prom-client
jest.mock('prom-client', () => {
  const metricsMock = jest.fn().mockResolvedValue('mock_metrics');
  const metricMock = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    inc: jest.fn(),
  }));
  return {
    Registry: jest.fn().mockImplementation(() => ({
      metrics: metricsMock,
    })),
    collectDefaultMetrics: jest.fn(),
    Counter: metricMock,
    Histogram: metricMock,
  };
});

describe('MetricsService', () => {
  let service: MetricsService;
  let registryInstance: Registry;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MetricsService();
    registryInstance = (Registry as unknown as jest.Mock).mock.results[0].value;
  });

  it('should initialize a new registry and call collectDefaultMetrics', () => {
    expect(Registry).toHaveBeenCalledTimes(1);
    expect(collectDefaultMetrics).toHaveBeenCalledWith({
      register: registryInstance,
    });
  });

  it('should return metrics from the registry', async () => {
    const result = await service.getMetrics();
    expect(result).toBe('mock_metrics');
    expect(registryInstance.metrics).toHaveBeenCalled();
  });

  it('records normalization failures with event and reason labels', () => {
    service.recordEventNormalizationFailure('session_finalized', 'schema_validation');
    expect(service.eventNormalizationFailures.inc).toHaveBeenCalledWith({
      event_type: 'session_finalized',
      error_reason: 'schema_validation',
    });
  });
});
