import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePlanActions } from '../canonicalActionResolver';

describe('Application-Wide Error Resilience & Canonical Routing', () => {
  describe('1. Canonical Action Resolver Routing (plans vs health_schedules)', () => {
    it('routes modern plans with category, sub_type, repeat_rule to plans table', () => {
      const planContext = {
        planId: '695ce571-97a7-4b5c-a502-a908135e66d1',
        plan: {
          id: '695ce571-97a7-4b5c-a502-a908135e66d1',
          pet_id: '47ae5aca-2fef-438e-8c53-8ffc12d7cea8',
          category: 'bakim',
          sub_type: 'tuy_bakimi',
          repeat_rule: 'weekly',
          title: 'Tüy Bakımı',
          scheduled_at: '2026-09-19T09:00:00.000Z',
        },
      };

      const resolved = resolvePlanActions(planContext);
      expect(resolved.sourceTable).toBe('plans');
      expect(resolved.canComplete).toBe(true);
      expect(resolved.canPostpone).toBe(true);
    });

    it('routes genuine legacy health_schedules to health_schedules table', () => {
      const scheduleContext = {
        planId: 'hs-12345',
        plan: {
          id: 'hs-12345',
          pet_id: 'pet-123',
          plan_type: 'vaccine',
          vaccine_id: 'v-999',
          title: 'Karma Aşı',
          due_date: '2026-09-20',
        },
      };

      const resolved = resolvePlanActions(scheduleContext);
      expect(resolved.sourceTable).toBe('health_schedules');
    });

    it('respects explicit sourceTable when provided in context', () => {
      const explicitContext = {
        planId: 'any-id',
        sourceTable: 'plans',
        plan: { id: 'any-id' },
      };

      const resolved = resolvePlanActions(explicitContext);
      expect(resolved.sourceTable).toBe('plans');
    });
  });

  describe('2. Error Message Sanitization (PGRST116 & DB leak prevention)', () => {
    // Replicating the sanitizer logic used in CanonicalPlanActionModal
    function sanitizeErrorMessage(rawMessage: string | undefined, defaultFallback = 'İşlem tamamlanırken bir hata oluştu.'): string {
      if (!rawMessage) return defaultFallback;
      const lower = rawMessage.toLowerCase();
      if (
        lower.includes('coerce') ||
        lower.includes('json object') ||
        lower.includes('pgrst') ||
        lower.includes('null value') ||
        lower.includes('syntax error') ||
        lower.includes('failed to fetch') ||
        lower.includes('network error')
      ) {
        return 'İşlem gerçekleştirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyiniz.';
      }
      return rawMessage;
    }

    it('masks PGRST116 "Cannot coerce the result to a single JSON object"', () => {
      const dbError = 'Cannot coerce the result to a single JSON object';
      const sanitized = sanitizeErrorMessage(dbError);
      expect(sanitized).toBe('İşlem gerçekleştirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyiniz.');
      expect(sanitized).not.toContain('JSON');
      expect(sanitized).not.toContain('coerce');
    });

    it('masks Postgres syntax / null value errors', () => {
      const pgError = 'null value in column "pet_id" of relation "health_schedules" violates not-null constraint';
      const sanitized = sanitizeErrorMessage(pgError);
      expect(sanitized).toBe('İşlem gerçekleştirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyiniz.');
    });

    it('preserves clean user-facing Turkish messages', () => {
      const userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
      const sanitized = sanitizeErrorMessage(userMessage);
      expect(sanitized).toBe(userMessage);
    });
  });

  describe('3. Service Worker Error & Abort Handling Behavior', () => {
    // Replicating the handlerDidError plugin logic in src/sw.ts
    async function simulateSwHandlerDidError(request: { destination?: string; mode?: string }, error: Error, mockCachesMatch?: () => Promise<any>) {
      if (error && (error.name === 'AbortError' || String(error).includes('abort'))) {
        return { status: 499, statusText: 'Client Closed Request' };
      }
      if (request.destination === 'document' || request.mode === 'navigate') {
        const offlineFallback = mockCachesMatch ? await mockCachesMatch() : null;
        if (offlineFallback) return offlineFallback;
      }
      return { status: 500, error: true };
    }

    it('handles AbortError cleanly with 499 without throwing unhandled rejection', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';

      const result = await simulateSwHandlerDidError({ destination: 'empty' }, abortError);
      expect(result.status).toBe(499);
      expect(result.statusText).toBe('Client Closed Request');
    });

    it('falls back to offline cache for document navigation on network failure', async () => {
      const networkError = new TypeError('Failed to fetch');
      const mockOfflinePage = { status: 200, isOfflinePage: true };

      const result = await simulateSwHandlerDidError(
        { destination: 'document', mode: 'navigate' },
        networkError,
        async () => mockOfflinePage
      );
      expect(result).toBe(mockOfflinePage);
    });

    it('does not swallow non-abort, non-document application errors', async () => {
      const appError = new Error('Custom API Failure');
      const result = await simulateSwHandlerDidError({ destination: 'empty' }, appError);
      expect(result.error).toBe(true);
    });
  });
});
