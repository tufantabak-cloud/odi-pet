import { describe, expect, it } from 'vitest'
import { shouldShowGlobalNotificationGate } from './pwa-enforcer-policy'

describe('global bildirim kapısı politikası', () => {
  it('ilk sistem iznini uygulama açılışında zorlamaz', () => {
    expect(shouldShowGlobalNotificationGate({
      pathname: '/owner/dashboard',
      permission: 'default',
      isSubscribed: false,
      isInitializing: false,
    })).toBe(false)
  })

  it('pet onboarding ekranında ikinci bir bildirim istemi göstermez', () => {
    expect(shouldShowGlobalNotificationGate({
      pathname: '/owner/pets/add/success',
      permission: 'granted',
      isSubscribed: false,
      isInitializing: false,
    })).toBe(false)
  })

  it('izin açık fakat cihaz kaydı eksikse onboarding dışında onarım kapısını gösterir', () => {
    expect(shouldShowGlobalNotificationGate({
      pathname: '/owner/dashboard',
      permission: 'granted',
      isSubscribed: false,
      isInitializing: false,
    })).toBe(true)
  })

  it('çalışan abonelik varsa global kapıyı göstermez', () => {
    expect(shouldShowGlobalNotificationGate({
      pathname: '/owner/dashboard',
      permission: 'granted',
      isSubscribed: true,
      isInitializing: false,
    })).toBe(false)
  })
})