"use no memo"
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HabitBanner } from '@/components/dashboard/HabitBanner'
import { PredictiveWidget } from '@/components/dashboard/PredictiveWidget'
import DashboardOnboardingWrapper from './DashboardOnboardingWrapper'

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
  let heroCta = null;
  let lastFeedingDate = 'Veri Yok';
  let foodStock = 'Hesaplanmadı';
  let lastWeightDate = 'Veri Yok';
  let dailyStreak = 3; // mock base
  let isMarketplaceEligible = false;

  if (primaryPet) {
    // Check missing feeding today
    const { data: feeding } = await supabase
      .from('feeding_logs')
      .select('created_at')
      .eq('pet_id', primaryPet.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    let fedToday = false;
    if (feeding) {
      const feedingDate = new Date(feeding.created_at);
      const today = new Date();
      fedToday = feedingDate.toDateString() === today.toDateString();
      
      const diffHrs = Math.floor((today.getTime() - feedingDate.getTime()) / (1000 * 60 * 60));
      if (diffHrs < 24) lastFeedingDate = `${diffHrs} saat önce`;
      else lastFeedingDate = `${Math.floor(diffHrs/24)} gün önce`;

      if (fedToday) dailyStreak++;
    }

    // Refill warning
    let refillRisk = null;
    const { data: nutrition } = await supabase
      .from('nutrition_profiles')
      .select('daily_grams, total_grams_remaining')
      .eq('pet_id', primaryPet.id)
      .single()

    if (nutrition && nutrition.daily_grams > 0 && nutrition.total_grams_remaining !== null) {
      const daysLeft = Math.floor(nutrition.total_grams_remaining / nutrition.daily_grams);
      foodStock = `${daysLeft} gün kaldı`;
      if (daysLeft <= 3) refillRisk = 'CRITICAL';
      else if (daysLeft <= 7) refillRisk = 'WARNING';
    }

    // Recent weight log
    const { data: weight } = await supabase
      .from('weight_logs')
      .select('created_at')
      .eq('pet_id', primaryPet.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let weightMissing = true;
    if (weight) {
      const wDate = new Date(weight.created_at);
      const diffDays = Math.floor((new Date().getTime() - wDate.getTime()) / (1000 * 60 * 60 * 24));
      lastWeightDate = `${diffDays} gün önce`;
      weightMissing = diffDays > 30;
    }

    // Check waitlist to set marketplace eligibility badge
    const { data: waitlist } = await supabase
      .from('marketplace_waitlist')
      .select('id')
      .eq('pet_id', primaryPet.id)
      .single()
    if (waitlist) isMarketplaceEligible = true;

    // Calculate daily progress
    let tasksTotal = 4;
    let tasksCompleted = 0;
    if (fedToday) tasksCompleted++;
    if (!weightMissing) tasksCompleted++;
    if (!refillRisk) tasksCompleted++;
    tasksCompleted++; // mock water completed

    const progressStr = `Bugünkü bakım: ${tasksCompleted}/${tasksTotal} tamamlandı`;

    if (!fedToday) {
      heroCta = { title: 'Bugünkü bakım tamamlanmadı', action: 'Besleme Kaydı Ekle', icon: '🐾', href: `/owner/pets/${primaryPet.id}/nutrition`, progressStr }
    } else if (refillRisk) {
      heroCta = { title: 'Mama stokun azalıyor', action: 'Refill Durumunu Gör', icon: '📦', href: `/owner/pets/${primaryPet.id}/nutrition`, progressStr }
    } else if (weightMissing) {
      heroCta = { title: 'Kilo ölçümü zamanı geldi', action: 'Son Kiloyu Gir', icon: '⚖️', href: `/owner/pets/${primaryPet.id}/nutrition`, progressStr }
    } else {
      heroCta = { title: 'Bugün her şey yolunda', action: 'Genel Duruma Bak', icon: '✨', href: `/owner/pets/${primaryPet.id}`, progressStr }
    }
  }

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
  const scoredTasks = upcomingSchedules.map(task => {
    const diffDays = Math.ceil((new Date(task.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let score = diffDays < 0 ? 100 : diffDays <= 3 ? 70 : 10;
    if (task.postpone_count > 0) score += 50;
    return { ...task, aiScore: score, diffDays };
  });

  const topTask = scoredTasks.sort((a,b) => b.aiScore - a.aiScore)[0];
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const timelineSchedules = upcomingSchedules
    .filter(s => new Date(s.due_date) <= in30)
    .sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  // Vaccine OS Summary
  let vaccineOSSummary = { nextVaccine: null as string | null, nextDate: null as string | null, overdueCount: 0 }
  if (primaryPet) {
    const { data: vRecords } = await supabase
      .from('vaccine_records_v2')
      .select('vaccine_name, status, due_at')
      .eq('pet_id', primaryPet.id)
      .in('status', ['due', 'scheduled', 'overdue'])
      .order('due_at', { ascending: true })
      .limit(10)
    if (vRecords) {
      const overdue = vRecords.filter(r => r.status === 'overdue')
      const next = vRecords.find(r => r.status === 'due' || r.status === 'scheduled')
      vaccineOSSummary = {
        nextVaccine: next?.vaccine_name ?? null,
        nextDate: next?.due_at ? new Date(next.due_at).toLocaleDateString('tr-TR') : null,
        overdueCount: overdue.length,
      }
    }
  }

  return (
    <DashboardOnboardingWrapper>
    <div className="flex flex-col gap-8 pb-4">
      {/* Predictive Engine */}
      {primaryPet ? (
        <PredictiveWidget 
          petId={primaryPet.id} 
          fallbackSuggestion={
            <div className="card-base bg-gradient-to-r from-primary-soft/40 to-surface border-primary/20 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[20px]">🧠</span>
                <h2 className="text-[14px] font-black text-text-primary uppercase tracking-widest opacity-80">Akıllı Öneri</h2>
              </div>
              {topTask ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[16px] font-bold text-text-primary leading-snug">
                    Bugün yapılması gereken en önemli şey:
                  </p>
                  <div className="bg-white border-l-4 border-l-primary rounded-lg p-4 shadow-sm flex items-center justify-between group cursor-pointer hover:border-l-primary-hover transition-all">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-[16px] text-text-primary">
                        {topTask.title || topTask.vaccines?.name || 'Sağlık İşlemi'}
                      </span>
                      <span className="text-[13px] text-text-secondary mt-1">
                        {topTask.diffDays < 0 
                          ? `⚠️ ${Math.abs(topTask.diffDays)} gün gecikti. Gecikme sağlık riski oluşturabilir.` 
                          : `Zamanında yapılması dostunun sağlığını korur.`}
                      </span>
                    </div>
                    <Link href={`/owner/health?petId=${topTask.pet_id}`} className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-l-4 border-l-success rounded-lg p-4 shadow-sm">
                  <p className="font-extrabold text-[16px] text-text-primary">Bugün her şey yolunda ✨</p>
                  <p className="text-[13px] text-text-secondary mt-1">Dostunuz için acil bir işlem bulunmuyor.</p>
                </div>
              )}
            </div>
          }
        />
      ) : null}

      {/* Greeting */}
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight">
          Merhaba, {profile?.first_name || 'Hoş Geldin'} 👋
        </h1>
        <p className="text-text-secondary font-medium mt-1">Pati dostlarının günlük özeti aşağıda.</p>
      </div>

      {/* Top Hero CTA */}
      {heroCta && (
        <div className="card-base p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 relative overflow-hidden">
          {isMarketplaceEligible && (
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-indigo-200 flex items-center gap-2 shadow-sm">
              <span className="text-[14px]">🛒</span>
              <span className="text-[11px] font-black text-indigo-800 uppercase tracking-widest">Beta Marketplace Aktif</span>
            </div>
          )}
          <div className="absolute top-4 left-6 hidden sm:block">
            <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">{heroCta.progressStr}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 sm:mt-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-[28px] shrink-0">
                {heroCta.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 sm:hidden">{heroCta.progressStr}</span>
                <span className="text-[18px] font-extrabold text-indigo-900 leading-snug">{heroCta.title}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Link href={heroCta.href} className="btn-primary px-6 py-3 whitespace-nowrap shadow-md shadow-primary/20 text-center">
                {heroCta.action}
              </Link>
              {isMarketplaceEligible && (
                <Link href="/marketplace-beta" className="btn-outline px-4 py-3 whitespace-nowrap text-center text-[13px] border-indigo-200 text-indigo-700 hover:bg-indigo-100">
                  Partner Fırsatlarını Gör
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Behavior KPI Strip */}
      {primaryPet && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-base p-4 flex flex-col justify-between border-l-4 border-l-blue-400">
            <div className="flex items-center gap-2 text-text-secondary mb-2">
              <span className="text-[16px]">🍽</span>
              <span className="text-[11px] font-black uppercase tracking-widest">Son Besleme</span>
            </div>
            <p className="text-[20px] font-black text-text-primary">{lastFeedingDate}</p>
          </div>
          <div className="card-base p-4 flex flex-col justify-between border-l-4 border-l-warning">
            <div className="flex items-center gap-2 text-text-secondary mb-2">
              <span className="text-[16px]">📦</span>
              <span className="text-[11px] font-black uppercase tracking-widest">Mama Stoğu</span>
            </div>
            <p className="text-[20px] font-black text-text-primary">{foodStock}</p>
          </div>
          <div className="card-base p-4 flex flex-col justify-between border-l-4 border-l-purple-400">
            <div className="flex items-center gap-2 text-text-secondary mb-2">
              <span className="text-[16px]">⚖️</span>
              <span className="text-[11px] font-black uppercase tracking-widest">Son Kilo Ölçümü</span>
            </div>
            <p className="text-[20px] font-black text-text-primary">{lastWeightDate}</p>
          </div>
          <div className="card-base p-4 flex flex-col justify-between border-l-4 border-l-error">
            <div className="flex items-center gap-2 text-text-secondary mb-2">
              <span className="text-[16px]">🔥</span>
              <span className="text-[11px] font-black uppercase tracking-widest">Günlük Streak</span>
            </div>
            <p className="text-[20px] font-black text-text-primary">{dailyStreak} gün</p>
          </div>
        </div>
      )}

      {/* Pet Slider */}
      {pets && pets.length > 0 ? (
        <div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {pets.map(pet => (
              <Link key={pet.id} href={`/owner/pets/${pet.id}`}
                className="card-base snap-start shrink-0 w-[200px] sm:w-[220px] p-5 flex flex-col gap-3 group cursor-pointer">
                <div className="w-14 h-14 rounded-[16px] bg-gradient-to-tr from-primary-soft to-white flex items-center justify-center text-primary text-[24px] font-black shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  {pet.avatar_url
                    ? <img src={pet.avatar_url} alt={pet.name} className="w-full h-full rounded-[14px] object-cover" />
                    : (pet.name || '?').charAt(0)
                  }
                </div>
                <div>
                  <p className="font-extrabold text-text-primary text-[16px]">{pet.name}</p>
                  <p className="text-[13px] text-text-secondary">{pet.species} • {calcAge(pet.birth_date)}</p>
                </div>
                <span className="badge-success self-start text-[11px]">Sağlıklı</span>
              </Link>
            ))}
            <Link href="/owner/pets/add"
              className="snap-start shrink-0 w-[200px] sm:w-[220px] p-5 flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-border-main hover:border-primary/40 hover:bg-primary-soft/30 transition-all cursor-pointer group">
              <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </div>
              <p className="text-[13px] font-bold text-text-secondary group-hover:text-primary text-center transition-colors">Yeni Pati Ekle</p>
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
      {primaryPet && (vaccineOSSummary.nextVaccine || vaccineOSSummary.overdueCount > 0) && (
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
