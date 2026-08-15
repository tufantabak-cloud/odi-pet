import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembershipService } from '../MembershipService';

// FORENSIC DÜZELTME testi: `premium_audit_logs`'un gerçek şeması
// (user_id, action_type, old_value, new_value, ip_address, created_at)
// ile MembershipService.logAudit()'in artık uyumlu olduğunu doğrular.
// Genel `membershipService.test.ts` dosyasındaki tablo-agnostik mock
// yerine, burada `.from()` çağrıları tabloya göre ayrıştırılıyor ki
// özellikle `premium_audit_logs`'a giden payload'ı denetleyebilelim.

const mockSubscriptionData = {
  id: 'sub-1',
  profile_id: 'user-1',
  plan: 'ai_plus',
  status: 'active',
  provider: 'manual',
  current_period_end: new Date(Date.now() + 60 * 86400000).toISOString(),
  profiles: {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@odi.pet',
    referral_code: 'ODI-TEST',
  },
};

const auditInsert = vi.fn().mockResolvedValue({ error: null });
const eventInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'premium_audit_logs') {
        return { insert: auditInsert };
      }
      if (table === 'membership_events') {
        return { insert: eventInsert };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscriptionData }),
            single: vi.fn().mockResolvedValue({ data: mockSubscriptionData }),
            eq: vi.fn().mockResolvedValue({ data: mockSubscriptionData, count: 0 }),
          })),
          order: vi.fn(() => ({
            range: vi.fn().mockResolvedValue({ data: [mockSubscriptionData], count: 1 }),
          })),
        })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockSubscriptionData }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSubscriptionData }),
            })),
            eq: vi.fn().mockResolvedValue({ data: mockSubscriptionData }),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      };
    }),
  })),
}));

describe('MembershipService.logAudit — real schema mapping', () => {
  let service: MembershipService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipService();
  });

  it('gerçek kolonları (user_id, action_type) kullanır; phantom admin_id/action/target_profile_id/reason KULLANMAZ', async () => {
    await service.assignPlan(
      {
        profileId: 'user-123',
        plan: 'ai_plus',
        durationDays: 60,
        reason: 'MANUAL_ASSIGN',
        adminId: 'admin-1',
      },
      'manual'
    );

    expect(auditInsert).toHaveBeenCalledTimes(1);
    const payload = auditInsert.mock.calls[0][0];

    expect(payload).toHaveProperty('user_id', 'admin-1');
    expect(payload).toHaveProperty('action_type', 'ASSIGN_PLAN');
    expect(payload).not.toHaveProperty('admin_id');
    expect(payload).not.toHaveProperty('action');
    expect(payload).not.toHaveProperty('target_profile_id');
    expect(payload).not.toHaveProperty('reason');

    // Kayıp veri yok: target/reason/metadata new_value içine katlanmış olmalı
    expect(payload.new_value).toMatchObject({
      target_profile_id: 'user-123',
      reason: 'MANUAL_ASSIGN',
    });
  });

  it('adminId sağlanmadığında (opsiyonel alan) NOT NULL user_id ihlali olmaması için targetProfileId kullanılır', async () => {
    await service.assignPlan(
      {
        profileId: 'user-456',
        plan: 'ai_plus',
        durationDays: 30,
        // adminId verilmedi — types.ts'de opsiyonel (adminId?: string)
      },
      'manual'
    );

    const payload = auditInsert.mock.calls[0][0];
    expect(payload.user_id).toBe('user-456');
    expect(payload.user_id).not.toBeNull();
    expect(payload.user_id).not.toBeUndefined();
  });

  it('audit insert hata dönerse birincil işlem (assignPlan) yine de başarıyla tamamlanır', async () => {
    auditInsert.mockResolvedValueOnce({
      error: { message: 'column premium_audit_logs.user_id does not exist' },
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await service.assignPlan(
      { profileId: 'user-789', plan: 'ai_plus', durationDays: 30, adminId: 'admin-1' },
      'manual'
    );

    expect(result.success).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
