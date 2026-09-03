import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { DEFAULT_SETTINGS, type MembershipSettings } from '@/lib/referral/constants'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminSupabaseClient()
  const { data: row } = await adminSupabase
    .from('system_settings')
    .select('value')
    .eq('key', 'membership_rules')
    .maybeSingle()

  const settings: MembershipSettings = row?.value ? { ...DEFAULT_SETTINGS, ...row.value } : DEFAULT_SETTINGS

  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminSupabaseClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updatedSettings: MembershipSettings = {
    welcome_credit_days: Number(body.welcome_credit_days) ?? 90,
    per_pet_credit_days: Number(body.per_pet_credit_days) ?? 90,
    referee_welcome_days: Number(body.referee_welcome_days) ?? 30,
    referral_tier_1_days: Number(body.referral_tier_1_days) ?? 30,
    referral_tier_2_bonus: Number(body.referral_tier_2_bonus) ?? 30,
    referral_tier_3_bonus: Number(body.referral_tier_3_bonus) ?? 60,
    referral_tier_4_bonus: Number(body.referral_tier_4_bonus) ?? 120,
    referral_tier_5_bonus: Number(body.referral_tier_5_bonus) ?? 300,
    monthly_invite_cap: Number(body.monthly_invite_cap) ?? 10,
  }

  const { error } = await adminSupabase.from('system_settings').upsert({
    key: 'membership_rules',
    value: updatedSettings,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: 'key' })

  if (error) {
    console.error('[MembershipSettings/POST] Error saving settings:', error)
    return NextResponse.json({ error: error.message || 'Ayarlar kaydedilemedi' }, { status: 500 })
  }

  return NextResponse.json({ success: true, settings: updatedSettings })
}
