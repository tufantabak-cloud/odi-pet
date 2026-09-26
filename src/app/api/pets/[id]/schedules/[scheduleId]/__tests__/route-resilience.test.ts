import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockHasPetCapability: vi.fn(),
  mockSupabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: () => mocks.mockGetSessionUser(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue(mocks.mockSupabase),
  createAdminSupabaseClient: () => mocks.mockSupabase,
}));

vi.mock('@/lib/pets/access', () => ({
  hasPetCapability: (...args: any[]) => mocks.mockHasPetCapability(...args),
}));

const { mockGetSessionUser, mockHasPetCapability, mockSupabase } = mocks;

// Import after mocking
import { PATCH, DELETE } from '@/app/api/pets/[id]/schedules/[scheduleId]/route';

describe('API Route /api/pets/[id]/schedules/[scheduleId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/pets/pet-1/schedules/sched-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'pet-1', scheduleId: 'sched-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is unauthorized for pet care management', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-1' });
    mockHasPetCapability.mockResolvedValue(false);

    const req = new NextRequest('http://localhost/api/pets/pet-1/schedules/sched-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'pet-1', scheduleId: 'sched-1' }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('yetkiniz bulunmuyor');
  });

  it('updates health_schedules when record exists there', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-1' });
    mockHasPetCapability.mockResolvedValue(true);

    const mockScheduleResult = { id: 'sched-1', pet_id: 'pet-1', status: 'done' };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'health_schedules') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockScheduleResult, error: null }),
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost/api/pets/pet-1/schedules/sched-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'pet-1', scheduleId: 'sched-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('done');
  });

  it('resilience fallback: updates plans table when record not found in health_schedules', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-1' });
    mockHasPetCapability.mockResolvedValue(true);

    const mockPlanResult = { id: 'plan-1', pet_id: 'pet-1', status: 'completed' };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'health_schedules') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // 0 rows in health_schedules
        };
      }
      if (table === 'plans') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockPlanResult, error: null }), // found in plans!
        };
      }
      return {};
    });

    const req = new NextRequest('http://localhost/api/pets/pet-1/schedules/plan-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'pet-1', scheduleId: 'plan-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('plan-1');
    expect(json.status).toBe('completed');
  });

  it('returns 404 when ID exists in neither health_schedules nor plans', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-1' });
    mockHasPetCapability.mockResolvedValue(true);

    mockSupabase.from.mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const req = new NextRequest('http://localhost/api/pets/pet-1/schedules/nonexistent-id', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'pet-1', scheduleId: 'nonexistent-id' }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Görev veya plan kaydı bulunamadı.');
  });
});
