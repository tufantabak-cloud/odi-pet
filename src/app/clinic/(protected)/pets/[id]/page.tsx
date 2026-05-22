import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export default async function ClinicPetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  const { id: petId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('clinic_memberships').select('clinic_id').eq('profile_id', user?.id)
  const clinicId = memberships?.[0]?.clinic_id ?? null

  // Pet sadece bu kliniğe randevusu varsa görünebilir (RLS bunu zaten yaptırıyor, extra check)
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('pet_id', petId)
    .eq('clinic_id', clinicId ?? '')
    .order('scheduled_at', { ascending: false })

  if (!appointments || appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold text-text-primary">Erişim Yok</h2>
        <p className="text-text-secondary mt-2">Bu hasta kaydına erişim yetkiniz bulunmuyor.</p>
        <Link href="/clinic/pets" className="btn-primary mt-6">Hasta Listesine Dön</Link>
      </div>
    )
  }

  // Pet bilgileri
  const { data: pet } = await supabase.from('pets').select('*').eq('id', petId).single()
  if (!pet) return null

  // Care plans (bu klinike ait)
  const { data: carePlans } = await supabase
    .from('care_plans').select('*').eq('pet_id', petId).eq('clinic_id', clinicId ?? '').order('due_date')

  const genderLabel: Record<string, string> = { male: 'Erkek', female: 'Dişi', unknown: 'Bilinmiyor' }

  const statusStyle: Record<string, string> = {
    pending:   'bg-warning/10 text-warning',
    confirmed: 'bg-success/10 text-success',
    cancelled: 'bg-error/10 text-error',
    completed: 'bg-border-main text-text-secondary',
  }
  const statusLabel: Record<string, string> = {
    pending: 'Bekliyor', confirmed: 'Onaylı', cancelled: 'İptal', completed: 'Tamamlandı'
  }

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <Link href="/clinic/pets" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary w-max transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Hasta Listesi
      </Link>

      {/* Patient Hero */}
      <div className="card-base overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-success to-success/40"/>
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="relative w-20 h-20 rounded-[22px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[36px] font-black shadow-sm ring-2 ring-border-main/50 shrink-0">
            {pet.avatar_url
              ? <Image src={pet.avatar_url} fill={true} className="rounded-[20px] object-cover" alt={pet.name}/>
              : pet.name.charAt(0)
            }
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">{pet.name}</h1>
            <p className="text-text-secondary font-medium">
              {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
              {pet.gender ? ` • ${genderLabel[pet.gender] ?? ''}` : ''}
            </p>
            <div className="flex gap-3 mt-2 flex-wrap">
              {pet.birth_date && (
                <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">
                  🎂 {pet.birth_date}
                </span>
              )}
              {pet.microchip_no && (
                <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">
                  📡 {pet.microchip_no}
                </span>
              )}
            </div>
          </div>
          <span className="badge-success shrink-0">Aktif Hasta</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Appointments */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="card-base p-6 sm:p-8">
            <h2 className="text-[18px] font-extrabold text-text-primary mb-5 flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </div>
              Klinik Ziyaretleri ({appointments.length})
            </h2>
            <div className="flex flex-col gap-3">
              {appointments.map(apt => {
                const dt = new Date(apt.scheduled_at)
                return (
                  <div key={apt.id} className="flex gap-4 p-4 rounded-[16px] border border-border-main bg-surface hover:border-primary/20 transition-colors">
                    <div className="flex flex-col items-center bg-bg-main rounded-[12px] px-3 py-2 shrink-0 min-w-[52px] text-center border border-border-main">
                      <p className="text-[16px] font-black text-text-primary leading-none">{dt.getDate()}</p>
                      <p className="text-[10px] font-bold text-text-secondary">{dt.toLocaleString('tr-TR', { month: 'short' })}</p>
                      <p className="text-[10px] font-bold text-text-secondary">{dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusStyle[apt.status]}`}>
                          {statusLabel[apt.status]}
                        </span>
                      </div>
                      {apt.owner_reason && (
                        <p className="text-[13px] text-text-secondary mt-1">📋 {apt.owner_reason}</p>
                      )}
                      {apt.vet_notes && (
                        <p className="text-[13px] text-text-primary mt-1 font-semibold">🩺 {apt.vet_notes}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Care Plans + Quick Add */}
        <div className="flex flex-col gap-5">
          <div className="card-base p-6">
            <h2 className="text-[16px] font-extrabold text-text-primary mb-4 flex items-center gap-2">
              <div className="bg-success/10 text-success p-2 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              Bakım Takvimi
            </h2>
            {(!carePlans || carePlans.length === 0) ? (
              <p className="text-[13px] text-text-secondary bg-bg-main rounded-[12px] p-4 border border-border-main">Henüz plan eklenmemiş.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {carePlans.map(plan => {
                  const due = new Date(plan.due_date)
                  const overdue = due.getTime() < Date.now()
                  return (
                    <div key={plan.id} className={`p-3 rounded-[12px] border ${overdue ? 'border-error/30 bg-error/5' : 'border-border-main bg-surface'}`}>
                      <p className="font-bold text-text-primary text-[13px]">{plan.title}</p>
                      <p className={`text-[11px] font-bold mt-0.5 ${overdue ? 'text-error' : 'text-text-secondary'}`}>
                        {due.toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick Add Care Plan */}
            <form className="mt-4 flex flex-col gap-3 pt-4 border-t border-border-main" action="/api/care-plans" method="POST">
              <input type="hidden" name="pet_id" value={petId}/>
              <input name="title" required placeholder="Aşı veya bakım adı" className="input-base text-[13px] py-2.5"/>
              <input name="due_date" type="date" required aria-label="Bakım tarihi" title="Bakım tarihi" className="input-base text-[13px] py-2.5"/>
              <button type="submit" className="btn-primary text-[13px] py-2.5">+ Plan Ekle</button>
            </form>
          </div>

          {/* Vet Notes */}
          <div className="card-base p-6">
            <h2 className="text-[16px] font-extrabold text-text-primary mb-4">Klinik Notu Ekle</h2>
            <textarea rows={4} placeholder="Bu ziyarete ait hekim notları..." className="input-base w-full resize-none text-[13px]"/>
            <button className="btn-primary w-full mt-3 text-[13px] py-2.5">Notu Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  )
}
