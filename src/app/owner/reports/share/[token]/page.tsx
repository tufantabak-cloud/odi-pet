import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintReportClient from '../../[petId]/print/PrintReportClient'

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

  const { data: report } = await supabase
    .from('pet_reports')
    .select('*')
    .eq('share_token', token)
    .single()

  if (!report || new Date(report.share_expires_at) < new Date()) notFound()

  const since = new Date(Date.now() - 365 * 86400000).toISOString()

  const [
    { data: pet }, { data: vaccines }, { data: diseases },
    { data: medications }, { data: allergies }, { data: growthRecords },
    { data: appointments }, { data: schedules },
  ] = await Promise.all([
    supabase.from('pets').select('*, profiles!pets_owner_id_fkey(first_name, last_name, email)').eq('id', report.pet_id).single(),
    supabase.from('vaccine_records').select('*, vaccines(name)').eq('pet_id', report.pet_id).gte('applied_date', since).order('applied_date'),
    supabase.from('disease_records').select('*').eq('pet_id', report.pet_id).gte('diagnosis_date', since).order('diagnosis_date'),
    supabase.from('medication_records').select('*').eq('pet_id', report.pet_id).gte('start_date', since).order('start_date'),
    supabase.from('allergy_records').select('*').eq('pet_id', report.pet_id),
    supabase.from('growth_records').select('*').eq('pet_id', report.pet_id).order('recorded_at', { ascending: false }).limit(6),
    supabase.from('appointments').select('*, clinics(name, address, phone)').eq('pet_id', report.pet_id).gte('scheduled_at', since).order('scheduled_at'),
    supabase.from('health_schedules').select('*').eq('pet_id', report.pet_id).neq('status', 'done').order('due_date').limit(5),
  ])

  if (!pet) notFound()

  return (
    <PrintReportClient data={{
      pet, vaccines: vaccines ?? [], diseases: diseases ?? [],
      medications: medications ?? [], allergies: allergies ?? [],
      growthRecords: growthRecords ?? [], appointments: appointments ?? [],
      upcomingTasks: schedules ?? [], insight: null,
      reportType: report.report_type, dateRange: report.date_range,
      verificationHash: report.verification_hash,
      generatedAt: report.created_at,
      ownerName: `${(pet as any).profiles?.first_name ?? ''} ${(pet as any).profiles?.last_name ?? ''}`.trim(),
      ownerEmail: '',  // privacy: don't expose email in shared view
    }} />
  )
}
