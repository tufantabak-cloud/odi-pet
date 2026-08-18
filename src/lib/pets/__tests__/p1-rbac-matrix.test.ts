import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { hasPetCapability, PetCapability } from '../access'

describe('P1 RBAC Capability Matrix Verification', () => {
  const ROLES = ['primary_owner', 'co_owner', 'care_admin', 'care_editor', 'viewer'] as const

  const CAPABILITIES: PetCapability[] = [
    'can_view_pet',
    'can_edit_pet_profile',
    'can_manage_pet_care',
    'can_manage_pet_caregivers',
    'can_delete_pet'
  ]

  // Mock factory for supabase client with fallback resolution
  function createMockSupabase(role: string | null, userId = 'user-123', petOwnerId = 'owner-456') {
    return {
      rpc: vi.fn().mockImplementation(async (cap: string, params: { p_pet_id: string }) => {
        // Simulating RPC error to test canonical fallback evaluation
        return { data: null, error: { code: 'PGRST202', message: 'RPC not found in mock' } }
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } })
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'pet_memberships') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: role && role !== 'primary_owner' ? { role } : null
                    })
                  })
                })
              })
            })
          }
        }
        if (table === 'pets') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: role === 'primary_owner' ? { id: 'pet-123' } : null
                  })
                })
              })
            })
          }
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      })
    } as any
  }

  describe('Capability Role Matrix Coverage', () => {
    it('primary_owner has all capabilities', async () => {
      const supabase = createMockSupabase('primary_owner')
      expect(await hasPetCapability(supabase, 'pet-123', 'can_view_pet')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_care')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_edit_pet_profile')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_caregivers')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_delete_pet')).toBe(true)
    })

    it('co_owner has view, edit, and care, but cannot delete pet', async () => {
      const supabase = createMockSupabase('co_owner')
      expect(await hasPetCapability(supabase, 'pet-123', 'can_view_pet')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_care')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_edit_pet_profile')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_caregivers')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_delete_pet')).toBe(false)
    })

    it('care_admin can view, manage care, and manage caregivers, but cannot edit profile or delete', async () => {
      const supabase = createMockSupabase('care_admin')
      expect(await hasPetCapability(supabase, 'pet-123', 'can_view_pet')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_care')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_caregivers')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_edit_pet_profile')).toBe(false)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_delete_pet')).toBe(false)
    })

    it('care_editor can view and manage care, but cannot edit profile, manage caregivers, or delete', async () => {
      const supabase = createMockSupabase('care_editor')
      expect(await hasPetCapability(supabase, 'pet-123', 'can_view_pet')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_care')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_caregivers')).toBe(false)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_edit_pet_profile')).toBe(false)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_delete_pet')).toBe(false)
    })

    it('viewer can view only, all mutation capabilities are forbidden', async () => {
      const supabase = createMockSupabase('viewer')
      expect(await hasPetCapability(supabase, 'pet-123', 'can_view_pet')).toBe(true)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_care')).toBe(false)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_manage_pet_caregivers')).toBe(false)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_edit_pet_profile')).toBe(false)
      expect(await hasPetCapability(supabase, 'pet-123', 'can_delete_pet')).toBe(false)
    })

    it('non-member has zero capabilities (403 across all endpoints)', async () => {
      const supabase = createMockSupabase(null)
      for (const cap of CAPABILITIES) {
        expect(await hasPetCapability(supabase, 'pet-123', cap)).toBe(false)
      }
    })
  })
})
