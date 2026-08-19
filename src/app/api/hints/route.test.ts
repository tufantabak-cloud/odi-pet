import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('/api/hints route tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/hints', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' },
      });

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 when authData or user.id is missing', async () => {
      mockGetUser.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 200 with dismissed list when user has hints in DB', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({
        data: [
          { hint_key: 'dashboard_welcome' },
          { hint_key: 'vaccine_intro' },
        ],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ dismissed: ['dashboard_welcome', 'vaccine_intro'] });
      expect(mockFrom).toHaveBeenCalledWith('onboarding_hints');
      expect(mockSelect).toHaveBeenCalledWith('hint_key');
      expect(mockEq).toHaveBeenCalledWith('profile_id', 'user-123');
    });

    it('returns 200 with empty array when user has no hints (empty DB result)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ dismissed: [] });
    });

    it('returns 200 with empty array when data is null or undefined without throwing TypeError', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ dismissed: [] });
    });

    it('filters out null, empty, or whitespace-only hint_keys safely', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({
        data: [
          { hint_key: 'valid_hint' },
          { hint_key: null },
          { hint_key: '' },
          { hint_key: '   ' },
          null,
        ],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ dismissed: ['valid_hint'] });
    });

    it('handles database error safely and returns 200 with empty dismissed fallback array', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation onboarding_hints does not exist', code: '42P01' },
      });

      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ dismissed: [] });
    });

    it('catches unexpected exceptions and returns 200 with fallback array without crashing', async () => {
      mockGetUser.mockRejectedValue(new Error('Supabase connection timeout'));

      const request = new Request('http://localhost/api/hints', { method: 'GET' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ dismissed: [] });
    });
  });

  describe('POST /api/hints', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' },
      });

      const request = new Request('http://localhost/api/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint_key: 'test_hint' }),
      });
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 400 when body is invalid JSON or not an object', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = new Request('http://localhost/api/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toEqual({ error: 'Invalid JSON body' });
    });

    it('returns 400 when hint_key is missing, empty, or non-string', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const invalidBodies = [
        {},
        { hint_key: '' },
        { hint_key: '   ' },
        { hint_key: 123 },
        { hint_key: null },
        { hint_key: [] },
      ];

      for (const body of invalidBodies) {
        const request = new Request('http://localhost/api/hints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json).toEqual({ error: 'hint_key is required and must be a non-empty string' });
      }
    });

    it('successfully upserts hint_key and returns 200', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ upsert: mockUpsert });

      const request = new Request('http://localhost/api/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint_key: '  nutrition_intro  ' }),
      });
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ success: true });
      expect(mockFrom).toHaveBeenCalledWith('onboarding_hints');
      expect(mockUpsert).toHaveBeenCalledWith(
        { profile_id: 'user-123', hint_key: 'nutrition_intro' },
        { onConflict: 'profile_id,hint_key' }
      );
    });

    it('handles database upsert error gracefully and returns 200 with fallback flag', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockUpsert = vi.fn().mockResolvedValue({
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      });
      mockFrom.mockReturnValue({ upsert: mockUpsert });

      const request = new Request('http://localhost/api/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint_key: 'test_hint' }),
      });
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ success: true, warning: 'Saved locally' });
    });
  });
});
