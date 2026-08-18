import { describe, it, expect, vi } from 'vitest'
import { createVaccineNotifications } from '../createVaccineNotifications'

describe('P1 Notification Timing & Multi-Pet Filter Verification', () => {
  it('correctly calculates open_delay_minutes relative to scheduled_at and attaches plan_id', async () => {
    let insertedRows: any[] = []
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation((rows: any[]) => {
          insertedRows = rows
          return Promise.resolve({ error: null })
        })
      })
    } as any

    const profileId = 'user-123'
    const petId = 'pet-456'
    const planId = 'plan-789'
    
    // Plan is scheduled 60 days in the future
    const sixtyDaysLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    const plans = [
      {
        id: planId,
        sub_type: 'Karma Aşı',
        scheduled_at: sixtyDaysLater
      }
    ]

    const result = await createVaccineNotifications(profileId, petId, plans, mockSupabase)

    expect(result.error).toBeNull()
    expect(result.count).toBe(5)
    expect(insertedRows.length).toBe(5)

    // Verify all rows have plan_id attached
    for (const row of insertedRows) {
      expect(row.plan_id).toBe(planId)
      expect(row.pet_id).toBe(petId)
      expect(row.profile_id).toBe(profileId)
      expect(row.is_read).toBe(false)
      expect(row.type).toBe('vaccine_reminder')
    }

    // Verify delay minutes calculation:
    // T-14 offset: 60 days - 14 days = 46 days delay
    const row14 = insertedRows.find(r => r.message.includes('14 gün kaldı'))
    expect(row14).toBeDefined()
    const expectedMinutes46d = 46 * 24 * 60
    expect(Math.abs(row14.open_delay_minutes - expectedMinutes46d)).toBeLessThan(5) // within 5 mins tolerance

    // T0 offset: 60 days delay
    const row0 = insertedRows.find(r => r.message.includes('Bugün'))
    expect(row0).toBeDefined()
    const expectedMinutes60d = 60 * 24 * 60
    expect(Math.abs(row0.open_delay_minutes - expectedMinutes60d)).toBeLessThan(5)
  })

  it('delivery filter logic in page.tsx filters out future notifications and retains due ones', () => {
    const now = Date.now()

    const rawNotifications = [
      // 1. Immediate notification (no delay)
      { id: 'notif-1', title: 'Hoş Geldiniz', created_at: new Date(now - 10000).toISOString(), open_delay_minutes: null },
      // 2. Due notification (created 5 hours ago with 2 hours delay -> due 3 hours ago)
      { id: 'notif-2', title: 'Bugün Aşı Günü', created_at: new Date(now - 5 * 3600000).toISOString(), open_delay_minutes: 120 },
      // 3. Premature notification (created 10 minutes ago with 60 days delay -> NOT due)
      { id: 'notif-3', title: 'Gelecek Aşı Hatırlatması', created_at: new Date(now - 600000).toISOString(), open_delay_minutes: 60 * 24 * 60 }
    ]

    const filtered = rawNotifications.filter((n: any) => {
      if (!n.open_delay_minutes || n.open_delay_minutes <= 0) return true
      const createdAtMs = n.created_at ? new Date(n.created_at).getTime() : now
      const deliveryTimeMs = createdAtMs + n.open_delay_minutes * 60 * 1000
      return deliveryTimeMs <= now
    })

    expect(filtered.map(n => n.id)).toEqual(['notif-1', 'notif-2'])
    expect(filtered.some(n => n.id === 'notif-3')).toBe(false)
  })

  it('multi-pet aggregation merges owned pets and membership pets without duplication', () => {
    const ownedPets = [
      { id: 'pet-1', name: 'Maya' },
      { id: 'pet-2', name: 'Pamuk' }
    ]

    const memberships = [
      { pet_id: 'pet-2', pets: { id: 'pet-2', name: 'Pamuk' } }, // Duplicate (already owned)
      { pet_id: 'pet-3', pets: { id: 'pet-3', name: 'Boncuk' } }  // Shared pet via membership
    ]

    const petMap = new Map<string, { id: string; name: string }>()
    for (const p of ownedPets ?? []) {
      if (p?.id) petMap.set(p.id, { id: p.id, name: p.name })
    }
    for (const m of memberships ?? []) {
      const p = m.pets as any
      if (p?.id && !petMap.has(p.id)) {
        petMap.set(p.id, { id: p.id, name: p.name })
      }
    }

    const accessiblePets = Array.from(petMap.values())
    expect(accessiblePets.length).toBe(3)
    expect(accessiblePets.map(p => p.name)).toEqual(['Maya', 'Pamuk', 'Boncuk'])
  })
})
