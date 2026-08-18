import { describe, it, expect, vi } from 'vitest'

describe('P1-G-001 Plan Completion Notification Dismissal Matrix', () => {
  // Mock DB store
  interface NotificationRow {
    id: string
    plan_id: string | null
    title: string
    is_read: boolean
    opened_at: string | null
  }

  interface PlanRow {
    id: string
    parent_plan_id: string | null
    status: 'active' | 'completed' | 'cancelled'
  }

  function simulateTrigger(
    newPlan: PlanRow,
    notifications: NotificationRow[]
  ): NotificationRow[] {
    if (newPlan.status !== 'completed') {
      return notifications
    }

    return notifications.map(n => {
      const isTarget =
        n.plan_id === newPlan.id ||
        (newPlan.parent_plan_id !== null && n.plan_id === newPlan.parent_plan_id)

      if (isTarget && !n.is_read) {
        return {
          ...n,
          is_read: true,
          opened_at: n.opened_at || new Date().toISOString()
        }
      }
      return n
    })
  }

  function simulateRetroactiveCleanup(
    plans: PlanRow[],
    notifications: NotificationRow[]
  ): NotificationRow[] {
    const completedPlanIds = new Set(
      plans.filter(p => p.status === 'completed').map(p => p.id)
    )
    const completedParentPlanIds = new Set(
      plans.filter(p => p.status === 'completed' && p.parent_plan_id).map(p => p.parent_plan_id!)
    )

    return notifications.map(n => {
      if (!n.is_read && n.plan_id) {
        if (completedPlanIds.has(n.plan_id) || completedParentPlanIds.has(n.plan_id)) {
          return {
            ...n,
            is_read: true,
            opened_at: n.opened_at || new Date().toISOString()
          }
        }
      }
      return n
    })
  }

  it('Scenario 1: Plan completed -> active linked notification becomes is_read = true', () => {
    const planId = 'plan-101'
    const initialNotifications: NotificationRow[] = [
      { id: 'notif-1', plan_id: planId, title: 'Aşıya 7 gün kaldı', is_read: false, opened_at: null }
    ]

    const updatedNotifications = simulateTrigger(
      { id: planId, parent_plan_id: null, status: 'completed' },
      initialNotifications
    )

    expect(updatedNotifications[0].is_read).toBe(true)
    expect(updatedNotifications[0].opened_at).toBeTruthy()
  })

  it('Scenario 2: Different plan completion does NOT affect unrelated notification', () => {
    const targetPlanId = 'plan-target'
    const otherPlanId = 'plan-other'

    const initialNotifications: NotificationRow[] = [
      { id: 'notif-other', plan_id: otherPlanId, title: 'Diğer Plan Hatırlatması', is_read: false, opened_at: null }
    ]

    const updatedNotifications = simulateTrigger(
      { id: targetPlanId, parent_plan_id: null, status: 'completed' },
      initialNotifications
    )

    expect(updatedNotifications[0].is_read).toBe(false)
    expect(updatedNotifications[0].opened_at).toBeNull()
  })

  it('Scenario 3: Already read notifications remain unchanged without losing state or opened_at', () => {
    const planId = 'plan-102'
    const existingOpenedAt = '2026-08-15T09:00:00.000Z'
    const initialNotifications: NotificationRow[] = [
      { id: 'notif-read', plan_id: planId, title: 'Eski Bildirim', is_read: true, opened_at: existingOpenedAt }
    ]

    const updatedNotifications = simulateTrigger(
      { id: planId, parent_plan_id: null, status: 'completed' },
      initialNotifications
    )

    expect(updatedNotifications[0].is_read).toBe(true)
    expect(updatedNotifications[0].opened_at).toBe(existingOpenedAt)
  })

  it('Scenario 4: Retroactive cleanup ONLY dismisses notifications tied to completed plans, active plans remain intact', () => {
    const plans: PlanRow[] = [
      { id: 'plan-done-1', parent_plan_id: null, status: 'completed' },
      { id: 'plan-active-1', parent_plan_id: null, status: 'active' },
      { id: 'plan-cancelled-1', parent_plan_id: null, status: 'cancelled' }
    ]

    const initialNotifications: NotificationRow[] = [
      { id: 'notif-done', plan_id: 'plan-done-1', title: 'Tamamlanan Aşı', is_read: false, opened_at: null },
      { id: 'notif-active', plan_id: 'plan-active-1', title: 'Aktif Aşı', is_read: false, opened_at: null },
      { id: 'notif-cancelled', plan_id: 'plan-cancelled-1', title: 'İptal Aşı', is_read: false, opened_at: null }
    ]

    const cleaned = simulateRetroactiveCleanup(plans, initialNotifications)

    // Only notif-done should become is_read: true
    expect(cleaned.find(n => n.id === 'notif-done')?.is_read).toBe(true)
    expect(cleaned.find(n => n.id === 'notif-active')?.is_read).toBe(false)
    expect(cleaned.find(n => n.id === 'notif-cancelled')?.is_read).toBe(false)
  })
})
