import { describe, expect, it } from 'vitest'

import {
  classifyApiRequest,
  isAdminBoundaryPath,
  isProtectedPagePath,
} from './request-boundary'

describe('classifyApiRequest', () => {
  it.each([
    ['/api/auth/callback', 'GET'],
    ['/api/beta/signup', 'POST'],
    ['/api/provinces', 'GET'],
    ['/api/version', 'GET'],
    ['/api/pets/pet-1/lost', 'GET'],
    ['/api/invite/accept', 'GET'],
  ])('%s %s isteğini public olarak sınıflandırır', (pathname, method) => {
    expect(classifyApiRequest(pathname, method)).toBe('public')
  })

  it.each([
    ['/api/share/get/share-token', 'GET'],
    ['/api/calendar/feed/calendar-token', 'GET'],
    ['/api/logbook/create', 'POST'],
  ])('%s %s isteğini token olarak sınıflandırır', (pathname, method) => {
    expect(classifyApiRequest(pathname, method)).toBe('token')
  })

  it.each([
    ['/api/cron/orchestrator', 'GET'],
    ['/api/cron/user-health', 'GET'],
    ['/api/payments/webhook', 'POST'],
  ])('%s %s isteğini service olarak sınıflandırır', (pathname, method) => {
    expect(classifyApiRequest(pathname, method)).toBe('service')
  })

  it.each([
    ['/api/pets/pet-1/lost', 'POST'],
    ['/api/invite/accept', 'POST'],
    ['/api/provinces', 'POST'],
    ['/api/version', 'POST'],
    ['/api/payments/webhook', 'GET'],
    ['/api/v1/reports/lost', 'POST'],
    ['/api/v1/reports/lost/report-1/publish', 'POST'],
    ['/api/admin/users', 'GET'],
    ['/api/authentication', 'GET'],
    ['/api/cronology', 'GET'],
  ])('%s %s isteğini session olarak sınıflandırır', (pathname, method) => {
    expect(classifyApiRequest(pathname, method)).toBe('session')
  })
})

describe('sayfa ve admin sınırları', () => {
  it('yalnızca gerçek korumalı sayfa segmentlerini eşleştirir', () => {
    expect(isProtectedPagePath('/owner/pets')).toBe(true)
    expect(isProtectedPagePath('/clinic')).toBe(true)
    expect(isProtectedPagePath('/admin/settings')).toBe(true)
    expect(isProtectedPagePath('/ownership')).toBe(false)
  })

  it('admin sayfaları ile admin API segmentlerini eşleştirir', () => {
    expect(isAdminBoundaryPath('/admin')).toBe(true)
    expect(isAdminBoundaryPath('/api/admin/notifications')).toBe(true)
    expect(isAdminBoundaryPath('/api/users')).toBe(true)
    expect(isAdminBoundaryPath('/api/administrator')).toBe(false)
  })
})
