import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembershipService } from '../MembershipService';
import { ManualMembershipProvider } from '../ManualMembershipProvider';
import { ReferralMembershipProvider } from '../ReferralMembershipProvider';

const mockSubscriptionData = {
  id: 'sub-1',
  profile_id: 'user-1',
  plan: 'ai_plus',
  status: 'active',
  provider: 'manual',
  ai_plus_until: new Date(Date.now() + 60 * 86400000).toISOString(),
  current_period_end: new Date(Date.now() + 60 * 86400000).toISOString(),
  profiles: {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@odi.pet',
    referral_code: 'ODI-TEST'
  }
};

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscriptionData }),
          single: vi.fn().mockResolvedValue({ data: mockSubscriptionData }),
          eq: vi.fn().mockResolvedValue({ data: mockSubscriptionData, count: 0 })
        })),
        order: vi.fn(() => ({
          range: vi.fn().mockResolvedValue({ data: [mockSubscriptionData], count: 1 })
        }))
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockSubscriptionData })
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockSubscriptionData })
          })),
          eq: vi.fn().mockResolvedValue({ data: mockSubscriptionData })
        }))
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      }))
    }))
  }))
}));

describe('MembershipService Additive State Provider', () => {
  let service: MembershipService;

  beforeEach(() => {
    service = new MembershipService();
  });

  it('provides ManualMembershipProvider as default provider', () => {
    const provider = service.getProvider('manual');
    expect(provider).toBeInstanceOf(ManualMembershipProvider);
    expect(provider.providerType).toBe('manual');
  });

  it('assigns plan via ManualMembershipProvider', async () => {
    const result = await service.assignPlan(
      {
        profileId: 'user-123',
        plan: 'ai_plus',
        durationDays: 60,
        reason: 'MANUAL_ASSIGN'
      },
      'manual'
    );

    expect(result.success).toBe(true);
    expect(result.membership.plan).toBe('ai_plus');
    expect(result.membership.provider).toBe('manual');
  });

  it('extends membership via extendPlan', async () => {
    vi.spyOn(service, 'getMembership').mockResolvedValue({
      id: 'sub-1',
      profileId: 'user-1',
      plan: 'ai_plus',
      status: 'ACTIVE',
      provider: 'manual',
      currentPeriodEnd: new Date(Date.now() + 60 * 86400000).toISOString()
    });

    const result = await service.extendPlan(
      {
        profileId: 'user-1',
        additionalDays: 30,
        reason: 'PROMOTION',
        idempotencyKey: 'test-idempotency-key'
      },
      'manual'
    );

    expect(result.success).toBe(true);
  });
});
