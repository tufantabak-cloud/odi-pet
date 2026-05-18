"use no memo"
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardOnboardingWrapper from './DashboardOnboardingWrapper'
import CoachMark from '@/components/ui/CoachMark'

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '—'
  const born = new Date(birthDate)
  const now = new Date()
  const years = now.getFullYear() - born.getFullYear()
  const months = now.getMonth() - born.getMonth()
  const totalMonths = years * 12 + months
  if (totalMonths < 1) return '< 1 ay'
  if (totalMonths < 12) return `${totalMonths} ay`
  return `${Math.floor(totalMonths / 12)} yıl ${totalMonths % 12} ay`
}

export default async function OwnerDashboard() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles').select('first_name').eq('id', user.id).single()

  const { data: pets } = await supabase
    .from('pets').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })

  const primaryPet = pets && pets.length > 0 ? pets[0] : null;

  // Next Best Action logic & KPI stats
  // (Removed heroCta logic since it's redundant with pet cards and modules)

  // Get Health Schedules
  let upcomingSchedules: any[] = []
  if (pets && pets.length > 0) {
    const { data } = await supabase
      .from('health_schedules')
      .select('*, vaccines(name), pets(name)')
      .in('pet_id', pets.map(p => p.id))
      .neq('status', 'done');
    if (data) upcomingSchedules = data
  }

  const now = new Date();

  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const timelineSchedules = upcomingSchedules
    .filter(s => new Date(s.due_date) <= in30)
    .sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  // Vaccine OS Summary
  let vaccineOSSummary = { nextVaccine: null as string | null, nextDate: null as string | null, overdueCount: 0, hasAnyRecord: false }
  if (primaryPet) {
    const { data: anyV } = await supabase.from('vaccine_records_v2').select('id').eq('pet_id', primaryPet.id).limit(1);
    const { data: vRecords } = await supabase
      .from('vaccine_records_v2')
      .select('vaccine_name, status, due_at')
      .eq('pet_id', primaryPet.id)
      .in('status', ['due', 'scheduled', 'overdue'])
      .order('due_at', { ascending: true })
      .limit(10)
    if (vRecords) {
      const nowISO = new Date().toISOString();
      const overdue = vRecords.filter(r => r.status === 'overdue' || (r.status === 'scheduled' && r.due_at && r.due_at < nowISO))
      const next = vRecords.find(r => (r.status === 'due' || r.status === 'scheduled') && !(r.status === 'scheduled' && r.due_at && r.due_at < nowISO))
      vaccineOSSummary = {
        nextVaccine: next?.vaccine_name ?? null,
        nextDate: next?.due_at ? new Date(next.due_at).toLocaleDateString('tr-TR') : null,
        overdueCount: overdue.length,
        hasAnyRecord: !!(anyV && anyV.length > 0)
      }
    }
  }

  const petsWithStats = await Promise.all((pets || []).map(async (pet) => {
    let lastFeedingDate = 'Veri Yok';
    let weightVal = 'Veri Yok';
    let heightVal = '';
    
    // Check feeding - use limit(1) array check to avoid single row errors
    const { data: feedingList } = await supabase
      .from('feeding_logs')
      .select('created_at')
      .eq('pet_id', pet.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const feeding = feedingList && feedingList.length > 0 ? feedingList[0] : null;
      
    if (feeding) {
      const diffHrs = Math.floor((new Date().getTime() - new Date(feeding.created_at).getTime()) / (1000 * 60 * 60));
      if (diffHrs < 24) lastFeedingDate = `${diffHrs} s. önce`;
      else lastFeedingDate = `${Math.floor(diffHrs/24)} g. önce`;
    }

    // Check weight - query measured_at and order by measured_at
    const { data: weightList } = await supabase
      .from('weight_logs')
      .select('measured_at, weight_kg, height_cm')
      .eq('pet_id', pet.id)
      .order('measured_at', { ascending: false })
      .limit(1);
    const weight = weightList && weightList.length > 0 ? weightList[0] : null;
      
    if (weight) {
      if (weight.weight_kg) weightVal = `${weight.weight_kg} kg`;
      if (weight.height_cm) heightVal = `${weight.height_cm} cm`;
    }

    // Check overdue vaccines (include 'due' status to capture actual past-due records)
    const nowISO = new Date().toISOString();
    const { data: overdueRecords } = await supabase
      .from('vaccine_records_v2')
      .select('id, status, due_at')
      .eq('pet_id', pet.id)
      .in('status', ['due', 'overdue', 'scheduled']);
    
    const overdueCountV2 = overdueRecords?.filter(r => 
      r.status === 'overdue' || 
      ((r.status === 'due' || r.status === 'scheduled') && r.due_at && r.due_at < nowISO)
    ).length || 0;

    const overdueSchedulesCount = upcomingSchedules.filter(s => s.pet_id === pet.id && new Date(s.due_date) < new Date()).length;
    
    const overdueCount = overdueCountV2 + overdueSchedulesCount;

    // Check if has any health data (explicit user input: completed vaccines, or weight/feeding logs)
    const { data: anyCompletedVaccine } = await supabase
      .from('vaccine_records_v2')
      .select('id')
      .eq('pet_id', pet.id)
      .eq('status', 'completed')
      .limit(1);
    const hasData = (anyCompletedVaccine && anyCompletedVaccine.length > 0) || !!feeding || !!weight;

    return { ...pet, lastFeedingDate, weightVal, heightVal, overdueCount, hasData };
  }));

  return (
    <DashboardOnboardingWrapper>
    <div className="flex flex-col gap-8 pb-4">
      {/* Greeting */}
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight">
          Merhaba, {profile?.first_name || 'Hoş Geldin'} 👋
        </h1>
        <p className="text-text-secondary font-medium mt-1">Pati dostlarının günlük özeti aşağıda.</p>
      </div>

      {/* Pet Slider — Hero Card Design */}
      {petsWithStats && petsWithStats.length > 0 ? (
        <div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
            {petsWithStats.map(pet => (
              <div
                key={pet.id}
                className="snap-start shrink-0 w-[200px] sm:w-[220px] rounded-[24px] overflow-hidden group relative cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
                style={{ background: 'var(--color-surface)' }}
              >
                <Link href={`/owner/pets/${pet.id}`} className="absolute inset-0 z-20 rounded-[24px]" aria-label={`${pet.name} profiline git`} />

                {/* Hero Photo */}
                <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                  {pet.avatar_url ? (
                    <img
                      src={pet.avatar_url}
                      alt={pet.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-soft via-[#ede9fe] to-white flex items-center justify-center">
                      <span className="text-[72px] font-black text-primary/40 select-none leading-none">
                        {(pet.name || '?').charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Status badge top-right */}
                  <div className="absolute top-3 right-3 z-10">
                    {pet.overdueCount > 0 ? (
                      <span className="bg-red-500 text-white px-2.5 py-1 rounded-full font-bold text-[11px] shadow-md">⚠️ Dikkat</span>
                    ) : pet.hasData ? (
                      <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full font-bold text-[11px] shadow-md">✓ Sağlıklı</span>
                    ) : null}
                  </div>

                  {/* Name + species overlaid on photo bottom */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3 z-10">
                    <p className="font-extrabold text-white text-[16px] leading-tight drop-shadow">{pet.name}</p>
                    <p className="text-white/80 text-[12px] font-medium drop-shadow">{pet.species} · {calcAge(pet.birth_date)}</p>
                  </div>
                </div>

                {/* Stats row below photo */}
                <div className="flex gap-0 border-t border-border-main relative z-30 bg-surface">
                  <div className="flex-1 flex flex-col items-center py-3 px-2">
                    <span className="text-[18px] leading-none">🍽</span>
                    {pet.lastFeedingDate === 'Veri Yok' ? (
                      <Link href={`/owner/pets/${pet.id}/nutrition`} className="text-[11px] font-bold text-primary mt-1 hover:underline z-40 relative">Ekle +</Link>
                    ) : (
                      <span className="text-[11px] font-bold text-text-primary mt-1 text-center">{pet.lastFeedingDate}</span>
                    )}
                  </div>
                  <div className="w-px bg-border-main self-stretch my-2" />
                  <div className="flex-1 flex flex-col items-center py-3 px-2">
                    <span className="text-[18px] leading-none">⚖️</span>
                    {pet.weightVal === 'Veri Yok' ? (
                      <Link href={`/owner/pets/${pet.id}`} className="text-[11px] font-bold text-primary mt-1 hover:underline z-40 relative">Ekle +</Link>
                    ) : (
                      <span className="text-[11px] font-bold text-text-primary mt-1 text-center">{pet.weightVal}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Pet Card */}
            <Link href="/owner/pets/add"
              className="snap-start shrink-0 w-[200px] sm:w-[220px] flex flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-border-main hover:border-primary/40 hover:bg-primary-soft/20 transition-all cursor-pointer group"
              style={{ minHeight: '280px' }}
            >
              <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </div>
              <p className="text-[13px] font-bold text-text-secondary group-hover:text-primary text-center transition-colors px-4">Yeni Pati Ekle</p>
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-base p-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-soft rounded-[18px] flex items-center justify-center text-primary mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5c2.8 0 5 2.2 5 5 0 3-4 8-5 10-1-2-5-7-5-10 0-2.8 2.2-5 5-5z"/></svg>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">Henüz pati eklemediniz</h3>
          <Link href="/owner/pets/add" className="btn-primary mt-5 px-8">İlk Patiyi Ekle</Link>
        </div>
      )}

      {/* Quick Actions — Application-Specific Shortcuts */}
      {primaryPet && (
        <div>
          <h2 className="text-[14px] font-black text-text-secondary uppercase tracking-widest mb-3">Hızlı İşlemler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Vaccine Schedule */}
            <Link
              href={`/owner/pets/${primaryPet.id}/vaccines`}
              className="group flex flex-col items-center gap-2.5 p-4 rounded-[18px] bg-surface border border-border-main hover:border-primary/30 hover:bg-primary-soft/20 transition-all shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#ede9fe] flex items-center justify-center text-[24px] group-hover:scale-110 transition-transform">
                💉
              </div>
              <div className="text-center">
                <p className="font-extrabold text-text-primary text-[13px] leading-tight">Aşı Takvimi</p>
                <p className="text-text-secondary text-[11px] mt-0.5">
                  {vaccineOSSummary.overdueCount > 0
                    ? <span className="text-red-500 font-bold">{vaccineOSSummary.overdueCount} gecikmiş</span>
                    : 'Takvimi gör'}
                </p>
              </div>
            </Link>

            {/* Feeding Log */}
            <Link
              href={`/owner/pets/${primaryPet.id}/nutrition`}
              className="group flex flex-col items-center gap-2.5 p-4 rounded-[18px] bg-surface border border-border-main hover:border-primary/30 hover:bg-primary-soft/20 transition-all shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#fef3c7] flex items-center justify-center text-[24px] group-hover:scale-110 transition-transform">
                🍽️
              </div>
              <div className="text-center">
                <p className="font-extrabold text-text-primary text-[13px] leading-tight">Besleme Ekle</p>
                <p className="text-text-secondary text-[11px] mt-0.5">Günlük öğün</p>
              </div>
            </Link>

            {/* Weight / Growth */}
            <Link
              href={`/owner/pets/${primaryPet.id}`}
              className="group flex flex-col items-center gap-2.5 p-4 rounded-[18px] bg-surface border border-border-main hover:border-primary/30 hover:bg-primary-soft/20 transition-all shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#d1fae5] flex items-center justify-center text-[24px] group-hover:scale-110 transition-transform">
                📏
              </div>
              <div className="text-center">
                <p className="font-extrabold text-text-primary text-[13px] leading-tight">Büyüme Kaydı</p>
                <p className="text-text-secondary text-[11px] mt-0.5">Kilo & boy</p>
              </div>
            </Link>

            {/* AI Vet */}
            <Link
              href="/owner/ai-vet"
              className="group flex flex-col items-center gap-2.5 p-4 rounded-[18px] bg-surface border border-border-main hover:border-primary/30 hover:bg-primary-soft/20 transition-all shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#fce7f3] flex items-center justify-center text-[24px] group-hover:scale-110 transition-transform">
                🤖
              </div>
              <div className="text-center">
                <p className="font-extrabold text-text-primary text-[13px] leading-tight">AI Vet</p>
                <p className="text-text-secondary text-[11px] mt-0.5">Soru sor</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming Timeline */}
      {timelineSchedules.length > 0 && (
        <div className="card-base p-6 sm:p-8">
          <h2 className="text-[18px] font-extrabold text-text-primary mb-5 flex items-center gap-3">
            <div className="bg-warning/10 text-warning p-2.5 rounded-xl">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            Yaklaşan Etkinlikler
          </h2>
          <div className="flex flex-col gap-3">
            {timelineSchedules.map(plan => {
              const due = new Date(plan.due_date)
              const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              const urgency = daysLeft <= 3 ? 'bg-error/10 text-error border-error/20'
                : daysLeft <= 7 ? 'bg-warning/10 text-warning border-warning/20'
                : 'bg-success/10 text-success border-success/20'
              const label = daysLeft <= 3 ? 'Acil' : daysLeft <= 7 ? 'Yakında' : 'Planlı'

              return (
                <div key={plan.id} className="flex items-center gap-4 p-4 border border-border-main rounded-[16px] bg-surface hover:border-primary/20 transition-colors">
                  <div className="flex flex-col items-center bg-bg-main rounded-[12px] px-3 py-2 shrink-0 min-w-[52px]">
                    <p className="text-[18px] font-black text-text-primary leading-none">{due.getDate()}</p>
                    <p className="text-[11px] font-bold text-text-secondary">{due.toLocaleString('tr-TR', { month: 'short' })}</p>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-bold text-text-primary text-[15px] truncate">{plan.title || plan.vaccines?.name || 'Sağlık İşlemi'}</p>
                    <p className="text-[13px] text-text-secondary">{plan.pets?.name}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${urgency}`}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vaccine OS Summary Card */}
      {primaryPet && !vaccineOSSummary.hasAnyRecord && (
        <div className="relative w-full">
          <CoachMark
            hintKey="dashboard_no_vaccine"
            title="İlk adım: Aşı takvimini kur"
            message="Pet profiline gir ve 'Sağlık Geçmişi' sekmesinden aşı takibini başlat. Sistem sana adım adım rehberlik edecek."
            icon="💉"
            position="top"
          />
          <Link href={`/owner/pets/${primaryPet.id}/vaccines`} className="card-base p-5 flex items-center justify-between gap-4 border-l-4 border-l-primary hover:border-l-primary-hover group transition-all bg-gradient-to-r from-primary-soft/50 to-transparent block w-full">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] bg-primary/10">🎯</div>
              <div>
                <p className="font-extrabold text-text-primary text-[14px]">Sonraki adım: Aşı takvimini kur</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Akıllı hatırlatıcılar için işlemleri ekle</p>
              </div>
            </div>
            <span className="text-primary font-bold text-[18px] group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      )}

      {primaryPet && vaccineOSSummary.hasAnyRecord && (vaccineOSSummary.nextVaccine || vaccineOSSummary.overdueCount > 0) && (
        <div className={`card-base p-5 flex items-center justify-between gap-4 border-l-4 ${vaccineOSSummary.overdueCount > 0 ? 'border-l-error' : 'border-l-primary'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] ${vaccineOSSummary.overdueCount > 0 ? 'bg-error/10' : 'bg-primary/10'}`}>💉</div>
            <div>
              {vaccineOSSummary.overdueCount > 0 && (
                <p className="text-[11px] font-black text-error uppercase tracking-widest">{vaccineOSSummary.overdueCount} aşı gecikmiş</p>
              )}
              {vaccineOSSummary.nextVaccine ? (
                <>
                  <p className="font-extrabold text-text-primary text-[14px]">{vaccineOSSummary.nextVaccine}</p>
                  {vaccineOSSummary.nextDate && <p className="text-[12px] text-text-secondary">{vaccineOSSummary.nextDate}</p>}
                </>
              ) : (
                <p className="font-extrabold text-text-primary text-[14px]">Aşı Takvimi</p>
              )}
            </div>
          </div>
          <Link href={`/owner/pets/${primaryPet.id}/vaccines`} className="btn-primary text-[12px] py-2 px-4 shrink-0">Görüntüle →</Link>
        </div>
      )}

    </div>
    </DashboardOnboardingWrapper>
  )
}
