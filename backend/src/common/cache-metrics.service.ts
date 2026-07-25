import { Injectable } from '@nestjs/common';

interface CacheMetricEntry {
  hits: number;
  misses: number;
  invalidations: number;
}

@Injectable()
export class CacheMetricsService {
  private readonly metrics = new Map<string, CacheMetricEntry>();

  recordHit(key: string) {
    const entry = this.getOrCreate(key);
    entry.hits++;
  }

  recordMiss(key: string) {
    const entry = this.getOrCreate(key);
    entry.misses++;
  }

  recordInvalidation(key: string) {
    const entry = this.getOrCreate(key);
    entry.invalidations++;
  }

  snapshot() {
    const result: Record<string, CacheMetricEntry & { hitRate: number }> = {};
    for (const [key, value] of this.metrics) {
      const total = value.hits + value.misses;
      result[key] = {
        ...value,
        hitRate: total > 0 ? value.hits / total : 0,
      };
    }
    return result;
  }

  private getOrCreate(key: string): CacheMetricEntry {
    let entry = this.metrics.get(key);
    if (!entry) {
      entry = { hits: 0, misses: 0, invalidations: 0 };
      this.metrics.set(key, entry);
    }
    return entry;
  }
}
