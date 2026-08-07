export interface CacheMetrics {
  cacheHits: number;
  cacheMisses: number;
  memoryHits: number;
  distributedHits: number;
  evictions: number;
  invalidations: number;
}

export interface CacheMetricsProvider {
  recordHit(tier: 'memory' | 'distributed'): void;
  recordMiss(): void;
  recordEviction(): void;
  recordInvalidation(): void;
  getMetrics(): CacheMetrics;
  reset(): void;
}

export class MemoryMetricsProvider implements CacheMetricsProvider {
  private metrics: CacheMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    memoryHits: 0,
    distributedHits: 0,
    evictions: 0,
    invalidations: 0,
  };

  recordHit(tier: 'memory' | 'distributed'): void {
    this.metrics.cacheHits++;
    if (tier === 'memory') this.metrics.memoryHits++;
    if (tier === 'distributed') this.metrics.distributedHits++;
  }

  recordMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordEviction(): void {
    this.metrics.evictions++;
  }

  recordInvalidation(): void {
    this.metrics.invalidations++;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      memoryHits: 0,
      distributedHits: 0,
      evictions: 0,
      invalidations: 0,
    };
  }
}

export class NoopMetricsProvider implements CacheMetricsProvider {
  recordHit(): void {}
  recordMiss(): void {}
  recordEviction(): void {}
  recordInvalidation(): void {}
  getMetrics(): CacheMetrics {
    return {
      cacheHits: 0, cacheMisses: 0, memoryHits: 0,
      distributedHits: 0, evictions: 0, invalidations: 0
    };
  }
  reset(): void {}
}

// Default export is a global instance for convenience, but can be replaced.
export const globalMetrics = new MemoryMetricsProvider();
