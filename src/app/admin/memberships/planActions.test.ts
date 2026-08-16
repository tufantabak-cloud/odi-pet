import { describe, it, expect, vi } from 'vitest'
import { writeAuditLog } from './planActions'

// FORENSIC DÜZELTME testi: `premium_audit_logs`'un gerçek şemasına
// (user_id, action_type, old_value, new_value) doğru eşlendiğini ve
// phantom kolonların (admin_id/action/target_profile_id/reason) artık
// hiç gönderilmediğini doğrular. Bu dosyanın GRANT seviyesinde
// (service_role-only) hâlâ engellendiği bilinen, kapsam dışı sınırlama
// route.ts başındaki yorumda belgelendi; bu test yalnızca alan
// eşlemesinin doğruluğunu ve hata durumunda birincil akışın
// etkilenmediğini doğrular.

function mockSupabase(insertError: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  const from = vi.fn(() => ({ insert }))
  return { from, insert } as any
}

describe('writeAuditLog (planActions.ts)', () => {
  it('gerçek kolonları kullanır (user_id, action_type); phantom admin_id/action/target_profile_id/reason KULLANMAZ', async () => {
    const supabase = mockSupabase()

    await writeAuditLog(supabase, 'admin-1', 'plan_created', 'Yeni plan', null, { plan_key: 'pro' })

    expect(supabase.from).toHaveBeenCalledWith('premium_audit_logs')
    const payload = supabase.insert.mock.calls[0][0]

    expect(payload).toEqual({
      user_id: 'admin-1',
      action_type: 'plan_created',
      old_value: null,
      new_value: { plan_key: 'pro', reason: 'Yeni plan' },
    })
    expect(payload).not.toHaveProperty('admin_id')
    expect(payload).not.toHaveProperty('action')
    expect(payload).not.toHaveProperty('target_profile_id')
    expect(payload).not.toHaveProperty('reason')
  })

  it('insert hata dönerse fırlatmaz (birincil işlemi bozmaz), yalnızca loglar', async () => {
    const supabase = mockSupabase({ message: 'permission denied for table premium_audit_logs' })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(
      writeAuditLog(supabase, 'admin-1', 'plan_archived', 'Arşivlendi', {}, {})
    ).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
