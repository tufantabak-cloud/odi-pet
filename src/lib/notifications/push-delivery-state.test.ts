import { describe, expect, it } from 'vitest'
import { shouldFinalizePushJob } from '../../../supabase/functions/dispatch-notifications/delivery-state'

describe('push notification job delivery state', () => {
  it('aboneliği olmayan kullanıcı için uygulama içi bildirimi yeterli sayar', () => {
    expect(shouldFinalizePushJob({
      subscriptionCount: 0,
      deliveredCount: 0,
      invalidSubscriptionCount: 0,
      retryableFailureCount: 0,
    })).toBe(true)
  })

  it('en az bir cihaza teslim edilen işi tamamlar', () => {
    expect(shouldFinalizePushJob({
      subscriptionCount: 2,
      deliveredCount: 1,
      invalidSubscriptionCount: 0,
      retryableFailureCount: 1,
    })).toBe(true)
  })

  it('geçici gönderim hatasında işi yeniden denemeye bırakır', () => {
    expect(shouldFinalizePushJob({
      subscriptionCount: 1,
      deliveredCount: 0,
      invalidSubscriptionCount: 0,
      retryableFailureCount: 1,
    })).toBe(false)
  })

  it('tüm abonelikler geçersizse sonsuz yeniden deneme yapmaz', () => {
    expect(shouldFinalizePushJob({
      subscriptionCount: 2,
      deliveredCount: 0,
      invalidSubscriptionCount: 2,
      retryableFailureCount: 0,
    })).toBe(true)
  })

  it('sonucu eksik kalan işi güvenli biçimde yeniden dener', () => {
    expect(shouldFinalizePushJob({
      subscriptionCount: 2,
      deliveredCount: 0,
      invalidSubscriptionCount: 1,
      retryableFailureCount: 0,
    })).toBe(false)
  })
})
