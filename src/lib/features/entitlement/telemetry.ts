import { PlanKey, FeatureAccessReason, FeatureContext } from './types';

export interface TelemetryEvent {
  feature: string;
  tier: PlanKey;
  reason: FeatureAccessReason;
  userId: string;
  context?: FeatureContext;
  durationMs?: number;
  timestamp: string; // ISO8601 UTC
}

export interface MetricSnapshot {
  feature_allowed_total: number;
  feature_denied_total: number;
  quota_exceeded_total: number;
  latency_histogram: {
    count: number;
    p50: number;
    p90: number;
    p99: number;
  };
}

export interface TelemetryProvider {
  logAccess(event: TelemetryEvent, allowed: boolean): void;
  recordLatency(durationMs: number): void;
  getMetrics(): MetricSnapshot;
}

export class OpenTelemetryProvider implements TelemetryProvider {
  private allowedCount = 0;
  private deniedCount = 0;
  private quotaExceededCount = 0;
  private latencies: number[] = [];

  logAccess(event: TelemetryEvent, allowed: boolean): void {
    if (allowed) {
      this.allowedCount++;
    } else {
      this.deniedCount++;
      if (event.reason === FeatureAccessReason.USAGE_LIMIT_REACHED) {
        this.quotaExceededCount++;
      }
    }
    if (event.durationMs !== undefined) {
      this.recordLatency(event.durationMs);
    }
  }

  recordLatency(durationMs: number): void {
    this.latencies.push(durationMs);
    // Keep sliding window of last 1000 observations
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }
  }

  getMetrics(): MetricSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;

    const p50 = count > 0 ? sorted[Math.floor(count * 0.50)] : 0;
    const p90 = count > 0 ? sorted[Math.floor(count * 0.90)] : 0;
    const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;

    return {
      feature_allowed_total: this.allowedCount,
      feature_denied_total: this.deniedCount,
      quota_exceeded_total: this.quotaExceededCount,
      latency_histogram: {
        count,
        p50: Number(p50.toFixed(2)),
        p90: Number(p90.toFixed(2)),
        p99: Number(p99.toFixed(2))
      }
    };
  }
}

let activeProvider: TelemetryProvider = new OpenTelemetryProvider();

export function setTelemetryProvider(provider: TelemetryProvider) {
  activeProvider = provider;
}

export function getTelemetryProvider(): TelemetryProvider {
  return activeProvider;
}
