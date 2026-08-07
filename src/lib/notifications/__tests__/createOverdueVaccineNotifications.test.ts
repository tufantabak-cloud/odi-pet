import { describe, it, expect, vi } from 'vitest'
import { createOverdueVaccineNotifications } from '../create-overdue-vaccine-notifications'
import type { OverduePlan } from '@/lib/plans/mark-overdue-plans'

describe('createOverdueVaccineNotifications Category Neutrality', () => {
  it('creates overdue notifications for all plan categories with dynamic titles and messages', async () => {
    const insertedRows: any[] = []
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            insert: (row: any) => {
              insertedRows.push(row)
              return Promise.resolve({ error: null })
            },
          }
        }
        return {}
      }),
    } as any

    const plans: OverduePlan[] = [
      { id: 'plan-1', pet_id: 'pet-1', user_id: 'user-1', category: 'asi', sub_type: 'Karma Aşı', scheduled_at: '2026-07-01' },
      { id: 'plan-2', pet_id: 'pet-1', user_id: 'user-1', category: 'parazit', sub_type: 'İç Parazit Damlası', scheduled_at: '2026-07-02' },
      { id: 'plan-3', pet_id: 'pet-1', user_id: 'user-1', category: 'beslenme', sub_type: 'Diyet Mama', scheduled_at: '2026-07-03' },
      { id: 'plan-4', pet_id: 'pet-1', user_id: 'user-1', category: 'bakim', sub_type: 'Tırnak Kesimi', scheduled_at: '2026-07-04' },
    ]

    const result = await createOverdueVaccineNotifications(mockSupabase, plans)

    expect(result.notified).toBe(4)
    expect(result.skipped).toBe(0)
    expect(insertedRows.length).toBe(4)

    expect(insertedRows[0].title).toBe('Aşı zamanı geçti')
    expect(insertedRows[1].title).toBe('Parazit uygulaması zamanı geçti')
    expect(insertedRows[2].title).toBe('Beslenme planı zamanı geçti')
    expect(insertedRows[3].title).toBe('Bakım zamanı geçti')
  })
})
