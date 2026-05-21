"use no memo"
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardOnboardingWrapper from './DashboardOnboardingWrapper'
import CoachMark from '@/components/ui/CoachMark'
import { calcAge } from '@/lib/pets/utils'


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
      const diffHrs = Math.floor((now.getTime() - new Date(feeding.created_at).getTime()) / (1000 * 60 * 60));
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

    const overdueSchedulesCount = upcomingSchedules.filter(s => s.pet_id === pet.id && new Date(s.due_date) < now).length;
    const hasData = !!feeding || !!weight || upcomingSchedules.some(s => s.pet_id === pet.id);

    return { ...pet, lastFeedingDate, weightVal, heightVal, overdueCount: overdueSchedulesCount, hasData };
  }));

  return (
    <DashboardOnboardingWrapper>
    <div className="flex flex-col gap-8 pb-4">
      {/* Greeting */}
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight">
          Merhaba, {profile?.first_name || 'Hoş Geldin'}
        </h1>
        <p className="text-text-secondary font-medium mt-1">Can dostlarınızın günlük özeti aşağıda.</p>
      </div>

      {/* Pet Slider — Hero Card Design */}
      {petsWithStats && petsWithStats.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-extrabold text-text-primary">Can Dostlarım</h2>
            <Link
              href="/owner/pets/add"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary/90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-sm whitespace-nowrap"
            >
              <span className="text-[14px] leading-none">+</span> Can Dost Ekle
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
            {petsWithStats.map(pet => (
              <div
                key={pet.id}
                data-testid="pet-card"
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



                  {/* Name + species overlaid on photo bottom */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3 z-10">
                    <p className="font-extrabold text-white text-[16px] leading-tight drop-shadow">{pet.name}</p>
                    <p className="text-white/80 text-[12px] font-medium drop-shadow">
                      {pet.species} · {calcAge(pet.birth_date).text} ({calcAge(pet.birth_date).label})
                    </p>
                  </div>
                </div>


              </div>
            ))}


          </div>
        </div>
      ) : (
        <div className="card-base p-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-soft rounded-[18px] flex items-center justify-center text-primary mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5c2.8 0 5 2.2 5 5 0 3-4 8-5 10-1-2-5-7-5-10 0-2.8 2.2-5 5-5z"/></svg>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">Henüz can dostu eklemediniz</h3>
          <p className="text-[13px] text-text-secondary mt-2 max-w-xs">Alttaki <strong>+</strong> butonuna dokunarak ilk can dostunuzu ekleyebilirsiniz.</p>
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
              const due = new Date(plan.due_date);
              const now = new Date();
              const dateOnlyStr = plan.due_date.includes('T') ? plan.due_date.split('T')[0] : plan.due_date;
              const timeStr = plan.due_time || '12:00:00';
              const taskDateTime = new Date(`${dateOnlyStr}T${timeStr}`);
              const isOverdue = taskDateTime < now;

              let badgeText = '';
              let badgeColor = '';

              if (isOverdue) {
                const diffMs = now.getTime() - taskDateTime.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                
                if (diffMins < 60) {
                  badgeText = `${Math.max(1, diffMins)} dk gecikti`;
                } else if (diffMins < 1440) {
                  badgeText = `${Math.floor(diffMins / 60)} saat gecikti`;
                } else {
                  badgeText = `${Math.floor(diffMins / 1440)} gün gecikti`;
                }
                badgeColor = 'bg-red-50 text-red-600 border-red-100/50';
              } else {
                const today = new Date();
                today.setHours(0,0,0,0);
                const targetDate = new Date(due);
                targetDate.setHours(0,0,0,0);
                const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                let timeText = '';
                if (plan.due_time) {
                  const parts = plan.due_time.split(':');
                  if (parts.length >= 2) {
                    timeText = ` ${parts[0]}:${parts[1]}`;
                  }
                }

                if (diffDays === 0) {
                  badgeText = `Bugün${timeText}`;
                  badgeColor = 'bg-orange-50 text-orange-600 border-orange-100/50';
                } else if (diffDays === 1) {
                  badgeText = `Yarın${timeText}`;
                  badgeColor = 'bg-primary/10 text-primary border-primary/20';
                } else if (diffDays === -1) {
                  badgeText = `Dün${timeText}`;
                  badgeColor = 'bg-red-50 text-red-600 border-red-100/50';
                } else if (diffDays < -1) {
                  badgeText = `${Math.abs(diffDays)} gün gecikti`;
                  badgeColor = 'bg-red-50 text-red-600 border-red-100/50';
                } else {
                  badgeText = `${diffDays} gün kaldı`;
                  badgeColor = diffDays <= 3 ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20';
                }
              }

              return (
                <Link href={`/owner/pets/${plan.pet_id}#pet-tasks`} key={plan.id} className="flex items-center gap-4 p-4 border border-border-main rounded-[16px] bg-surface hover:border-primary/40 hover:shadow-md transition-all group">
                  <div className="flex flex-col items-center bg-bg-main rounded-[12px] px-3 py-2 shrink-0 min-w-[52px] group-hover:bg-white transition-colors">
                    <p className="text-[18px] font-black text-text-primary leading-none">{due.getDate()}</p>
                    <p className="text-[11px] font-bold text-text-secondary">{due.toLocaleString('tr-TR', { month: 'short' })}</p>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-bold text-text-primary text-[15px] truncate group-hover:text-primary transition-colors">{plan.title || plan.vaccines?.name || 'Sağlık İşlemi'}</p>
                    <p className="text-[13px] text-text-secondary">{plan.pets?.name}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap ${badgeColor}`}>
                    {badgeText.startsWith('» ') ? badgeText.replace('» ', '') : badgeText}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}



    </div>
    </DashboardOnboardingWrapper>
  )
}
