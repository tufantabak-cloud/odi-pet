import { EventEmitter } from 'events';

export type PremiumEventType = 
  | 'PLAN_CHANGED'
  | 'LIMIT_CHANGED'
  | 'FEATURE_DISABLED'
  | 'FEATURE_ENABLED'
  | 'BUNDLE_UPDATED'
  | 'PUBLISH_COMPLETED'
  | 'ROLLBACK_COMPLETED';

export interface PremiumEventPayload {
  type: PremiumEventType;
  userId?: string;
  planKey?: string;
  featureKey?: string;
  versionId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

type EventCallback = (payload: PremiumEventPayload) => void;

class PremiumEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(type: PremiumEventType, payload: Omit<PremiumEventPayload, 'type' | 'timestamp'>): void {
    const fullPayload: PremiumEventPayload = {
      ...payload,
      type,
      timestamp: new Date().toISOString()
    };
    this.emitter.emit(type, fullPayload);
    this.emitter.emit('*', fullPayload);
  }

  on(type: PremiumEventType | '*', callback: EventCallback): void {
    this.emitter.on(type, callback);
  }

  off(type: PremiumEventType | '*', callback: EventCallback): void {
    this.emitter.off(type, callback);
  }
}

export const premiumEventBus = new PremiumEventBus();
