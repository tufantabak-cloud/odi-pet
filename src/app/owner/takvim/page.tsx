import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildPetAgendaEvents } from '@/lib/agenda/pet-agenda-service'
import { selectTimelineEvents } from '@/lib/agenda/selectors'
import TakvimClient from './TakvimClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Takvim | Odi',
  description: 'Tüm can dostlarının aşı, bakım ve randevu takvimi tek yerde.',
}

export default async function TakvimPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  // Sahip olunan + üyesi olunan petler
  const [ownedPetsRes, memberPetsRes] = await Promise.all([
    supabase
      .from('pets')
      .select('id, name, species, avatar_url')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('pet_members')
      .select('pet_id, pets(id, name, species, avatar_url)')
      .eq('profile_id', user.id),
  ])

  if (ownedPetsRes.error) console.error('[takvim] pets fetch failed:', ownedPetsRes.error.message)
  if (memberPetsRes.error) console.error('[takvim] pet_members fetch failed:', memberPetsRes.error.message)

  const petMap = new Map<string, { id: string; name: string; species: string | null; avatar_url: string | null }>()
  for (const p of ownedPetsRes.data ?? []) {
    if (p?.id) petMap.set(p.id, p as never)
  }
  for (const m of memberPetsRes.data ?? []) {
    const p = (m as unknown as { pets: { id: string; name: string; species: string | null; avatar_url: string | null } | null }).pets
    if (p?.id) petMap.set(p.id, p)
  }

  const pets = Array.from(petMap.values())
  if (pets.length === 0) redirect('/owner/dashboard')

  const allPetIds = pets.map(p => p.id)

  // Tarih penceresi: son 30 gün ve sonraki 30 gün (-30 / +30)
  const now = new Date()
  const past30 = new Date(now.getTime() - 30 * 86400000)
  const future30 = new Date(now.getTime() + 30 * 86400000)

  const past30Str = past30.toISOString().split('T')[0]
  const future30Str = future30.toISOString().split('T')[0]

  // 8 paralel sorgu + error loglaması
  const [
    plansRes,
    vacsRes,
    parasitesRes,
    schedulesRes,
    growthRes,
    weightLogsRes,
    appointmentsRes,
    medsRes,
    nutritionRes
  ] = await Promise.all([
    supabase.from('plans').select('*').in('pet_id', allPetIds),
    supabase.from('vaccine_records_v2').select('*').in('pet_id', allPetIds),
    supabase.from('parasite_records').select('*').in('pet_id', allPetIds),
    supabase.from('health_schedules').select('*').in('pet_id', allPetIds),
    supabase.from('growth_records').select('*').in('pet_id', allPetIds),
    supabase.from('weight_logs').select('*').in('pet_id', allPetIds).or('is_archived.is.null,is_archived.eq.false'),
    supabase.from('appointments').select('*').in('pet_id', allPetIds),
    supabase.from('health_medications').select('*').in('pet_id', allPetIds),
    supabase.from('nutrition_logs').select('*').in('pet_id', allPetIds),
  ])

  if (plansRes.error) console.error('[takvim] plans fetch failed:', plansRes.error.message)
  if (vacsRes.error) console.error('[takvim] vaccine_records_v2 fetch failed:', vacsRes.error.message)
  if (parasitesRes.error) console.error('[takvim] parasite_records fetch failed:', parasitesRes.error.message)
  if (schedulesRes.error) console.error('[takvim] health_schedules fetch failed:', schedulesRes.error.message)
  if (growthRes.error && !growthRes.error.message?.includes('schema cache') && growthRes.error?.code !== 'PGRST200') {
    console.error('[takvim] growth_records fetch failed:', growthRes.error.message)
  }
  if (weightLogsRes.error) console.error('[takvim] weight_logs fetch failed:', weightLogsRes.error.message)
  if (appointmentsRes.error) console.error('[takvim] appointments fetch failed:', appointmentsRes.error.message)
  if (medsRes.error) console.error('[takvim] health_medications fetch failed:', medsRes.error.message)
  if (nutritionRes.error) console.error('[takvim] nutrition_logs fetch failed:', nutritionRes.error.message)

  // growth_records + weight_logs birleşimi
  const rawGrowth = [
    ...(growthRes.data || []),
    ...(weightLogsRes.data || [])
  ]

  // Kanonik ajanda olaylarını üret
  const rawAgendaEvents = buildPetAgendaEvents(
    plansRes.data || [],
    vacsRes.data || [],
    parasitesRes.data || [],
    schedulesRes.data || [],
    rawGrowth,
    appointmentsRes.data || [],
    medsRes.data || [],
    nutritionRes.data || []
  )

  // Tarih süzgeci (-30 / +30 gün) — completed kayıtlar elenmez!
  const timelineEvents = selectTimelineEvents(rawAgendaEvents, past30Str, future30Str)

  const petNameMap = new Map(pets.map(p => [p.id, p]))

  const initialEvents = timelineEvents.map(evt => {
    const targetPetId = evt.displayMetadata?.extraData?.pet_id || (evt as any).pet_id || (
      plansRes.data?.find(p => p.id === evt.sourceRecordId)?.pet_id ||
      vacsRes.data?.find(v => v.id === evt.sourceRecordId)?.pet_id ||
      parasitesRes.data?.find(p => p.id === evt.sourceRecordId)?.pet_id ||
      weightLogsRes.data?.find(w => w.id === evt.sourceRecordId)?.pet_id ||
      growthRes.data?.find(g => g.id === evt.sourceRecordId)?.pet_id ||
      appointmentsRes.data?.find(a => a.id === evt.sourceRecordId)?.pet_id ||
      medsRes.data?.find(m => m.id === evt.sourceRecordId)?.pet_id ||
      nutritionRes.data?.find(n => n.id === evt.sourceRecordId)?.pet_id ||
      null
    )

    const pet = targetPetId ? petNameMap.get(targetPetId) : null

    return {
      id: evt.eventId,
      type: evt.category === 'saglik' && (evt.subCategory || "").includes('Randevu') ? ('appointment' as const) : ('task' as const),
      plan_type: evt.category || null,
      title: evt.displayMetadata?.title || evt.subCategory || 'Görev',
      date: evt.scheduledAt || evt.dateKey,
      pet_id: targetPetId,
      pet_name: pet?.name || '',
      pet_species: pet?.species || undefined,
      status: evt.displayStatus,
      displayStatus: evt.displayStatus,
      source: evt.source,
      sourceRecordId: evt.sourceRecordId
    }
  })

  return <TakvimClient pets={pets} initialEvents={initialEvents} />
}
