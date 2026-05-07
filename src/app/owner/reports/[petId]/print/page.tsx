import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import PrintReportClient from './PrintReportClient'

type PageProps = {
  params: Promise<{ petId: string }>;
  searchParams: Promise<{ type?: string; range?: string; token?: string }>;
};

export default async function PrintReportPage(props: PageProps) {
  const { petId } = await props.params
  const sParams = await props.searchParams
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const reportType = sParams.type ?? 'summary'
  const dateRange  = sParams.range ?? 'last_12_months'

  // Date range
  const rangeMap: Record<string, number> = {
    last_3_months: 90, last_6_months: 180, last_12_months: 365, all_time: 3650,
  }
  const days  = rangeMap[dateRange] ?? 365
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const [
    { data: pet },
    { data: vaccines },
    { data: diseases },
    { data: medications },
    { data: allergies },
    { data: growthRecords },
    { data: appointments },
    { data: schedules },
    { data: insight },
  ] = await Promise.all([
    supabase.from('pets').select('*, profiles!pets_owner_id_fkey(first_name, last_name, email)').eq('id', petId).single(),
    supabase.from('vaccine_records').select('*, vaccines(name, description)').eq('pet_id', petId).gte('applied_date', since).order('applied_date'),
    supabase.from('disease_records').select('*').eq('pet_id', petId).gte('diagnosis_date', since).order('diagnosis_date'),
    supabase.from('medication_records').select('*').eq('pet_id', petId).gte('start_date', since).order('start_date'),
    supabase.from('allergy_records').select('*').eq('pet_id', petId),
    supabase.from('growth_records').select('*').eq('pet_id', petId).order('recorded_at', { ascending: false }).limit(6),
    supabase.from('appointments').select('*, clinics(name, address, phone)').eq('pet_id', petId).gte('scheduled_at', since).order('scheduled_at'),
    supabase.from('health_schedules').select('*').eq('pet_id', petId).neq('status', 'done').order('due_date').limit(5),
    supabase.from('predictive_insights').select('*').eq('pet_id', petId).order('created_at', { ascending: false }).limit(1).single(),
  ])

  if (!pet) redirect(`/owner/pets/${petId}`)

  // Report token lookup for verification hash
  let verificationHash = 'N/A'
  if (sParams.token) {
    const { data: rpt } = await supabase
      .from('pet_reports').select('verification_hash').eq('share_token', sParams.token).single()
    if (rpt) verificationHash = rpt.verification_hash
  }

  const data = {
    pet, vaccines: vaccines ?? [], diseases: diseases ?? [],
    medications: medications ?? [], allergies: allergies ?? [],
    growthRecords: growthRecords ?? [], appointments: appointments ?? [],
    upcomingTasks: schedules ?? [], insight,
    reportType, dateRange, verificationHash,
    generatedAt: new Date().toISOString(),
    ownerName: `${(pet as any).profiles?.first_name ?? ''} ${(pet as any).profiles?.last_name ?? ''}`.trim(),
    ownerEmail: (pet as any).profiles?.email ?? '',
  }

  return <PrintReportClient data={data} />
}
