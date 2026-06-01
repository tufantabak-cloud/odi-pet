"use no memo"
export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardOnboardingWrapper from './DashboardOnboardingWrapper'
import DashboardSmartCards from './DashboardSmartCards'

import { calcAge } from '@/lib/pets/utils'
import { getNowTR } from '@/lib/utils'
import Image from 'next/image'
import { getCachedDashboardData } from './dashboard-queries'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import EmptyState from '@/components/ui/EmptyState'
import { DefaultCatAvatar, DefaultDogAvatar, PawIcon, CarrierIcon } from '@/components/icons/PetIcons'

export default async function OwnerDashboard() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { profile, pets, upcomingSchedules, completedSchedules, allFeedingLogs, allWeightLogs } =
    await getCachedDashboardData(user.id)

  const primaryPet = pets && pets.length > 0 ? pets[0] : null;

  // Next Best Action logic & KPI stats
  // (Removed heroCta logic since it's redundant with pet cards and modules)

  const now = getNowTR();

  const in30 = getNowTR(); in30.setDate(in30.getDate() + 30);
  const timelineSchedules = upcomingSchedules
    .filter(s => new Date(s.due_date) <= in30)
    .sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  const petIds = (pets || []).map((p: any) => p.id);

  const petsWithStats = (pets || []).map((pet) => {
    let lastFeedingDate = 'Veri Yok';
    let weightVal = 'Veri Yok';
    let heightVal = '';
    
    // Pick the most recent feeding log for this pet
    const feeding = allFeedingLogs.find(f => f.pet_id === pet.id);
      
    if (feeding) {
      const diffHrs = Math.floor((now.getTime() - new Date(feeding.created_at).getTime()) / (1000 * 60 * 60));
      if (diffHrs < 24) lastFeedingDate = `${diffHrs} s. önce`;
      else lastFeedingDate = `${Math.floor(diffHrs/24)} g. önce`;
    }

    // Pick the most recent weight log for this pet
    const weight = allWeightLogs.find(w => w.pet_id === pet.id);
      
    if (weight) {
      if (weight.weight_kg) weightVal = `${weight.weight_kg} kg`;
      if (weight.height_cm) heightVal = `${weight.height_cm} cm`;
    }

    const overdueSchedulesCount = upcomingSchedules.filter(s => s.pet_id === pet.id && new Date(s.due_date) < now).length;
    const hasData = !!feeding || !!weight || upcomingSchedules.some(s => s.pet_id === pet.id);

    return { ...pet, lastFeedingDate, weightVal, heightVal, overdueCount: overdueSchedulesCount, hasData };
  });

  return (
    <DashboardOnboardingWrapper>
    <div className="flex flex-col gap-8 pb-4">
      {/* Greeting */}
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight">
          Merhaba, {profile?.first_name || 'Hoş Geldin'}
        </h1>
        <p className="text-text-secondary font-medium mt-1">Petlerinizin günlük özeti aşağıda.</p>
      </div>

      {/* Pet Slider — Hero Card Design */}
      {petsWithStats && petsWithStats.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-extrabold text-text-primary">Petlerim</h2>
            <Link
              href="/owner/pets/add"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary/90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-sm whitespace-nowrap"
            >
              <span className="text-[14px] leading-none">+</span> Pet Ekle
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
            {petsWithStats.map((pet: any) => (
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
                    <Image
                      src={pet.avatar_url}
                      alt={pet.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full">
                      {pet.species?.toLowerCase() === 'kedi' || pet.species?.toLowerCase() === 'cat' ? (
                        <DefaultCatAvatar />
                      ) : (
                        <DefaultDogAvatar />
                      )}
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Name + species overlaid on photo bottom */}
                  <div className="absolute bottom-4 left-0 right-0 px-4 z-10">
                    <p className="font-extrabold text-white text-[16px] leading-tight drop-shadow">{pet.name}</p>
                    <p className="text-white/80 text-[11px] font-medium drop-shadow leading-tight">
                      {pet.species} · {calcAge(pet.birth_date).text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<PawIcon width={48} height={48} />}
          title="Henüz pet eklemediniz"
          message="İlk petinizi eklemek için aşağıdaki butona dokunun."
          cta={{ label: "Pet Ekle", href: "/owner/pets/add" }}
        />
      )}



      {pets && pets.length > 0 && (
        <DashboardSmartCards pets={pets} upcomingSchedules={upcomingSchedules} completedSchedules={completedSchedules} />
      )}

      {/* Pet Günlüğü - Quick Action Bar */}
      {pets && pets.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-text-primary">Pet Günlüğü</h2>
            <Link href={pets.length === 1 ? `/owner/pets/${pets[0].id}/journal` : `/owner/journal/select-pet?redirect=journal`} className="text-[13px] font-bold text-primary hover:underline">
              Tümünü Gör
            </Link>
          </div>
          <div className="card-base p-4 flex items-center justify-between gap-4 border border-border-main hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-text-primary truncate">Yeni Durum Kaydet</p>
                <p className="text-[12px] text-text-secondary font-medium truncate">İştah, ruh hali, notlar...</p>
              </div>
            </div>
            <Link href={pets.length === 1 ? `/owner/pets/${pets[0].id}/journal/new` : `/owner/journal/select-pet?redirect=new`} className="btn-primary py-2.5 px-4 text-[13px] font-bold whitespace-nowrap shrink-0 shadow-sm">
              Kaydet +
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming Timeline */}
      {pets && pets.length > 0 && (
        <div className="card-base p-6 sm:p-8">
          <h2 className="text-[18px] font-extrabold text-text-primary mb-5 flex items-center gap-3">
            <div className="bg-warning/10 text-warning p-2.5 rounded-xl">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            Yaklaşan Etkinlikler
          </h2>
          {timelineSchedules.length > 0 ? (
            <div className="flex flex-col gap-3">
              {timelineSchedules.map(plan => {
                const dateOnlyStr = plan.due_date.includes('T') ? plan.due_date.split('T')[0] : plan.due_date;
                const [y, m, d] = dateOnlyStr.split('-').map(Number);
                const due = getNowTR();
                due.setFullYear(y, m - 1, d);
                
                const now = getNowTR();
                const timeStr = plan.due_time || '12:00:00';
                const [th, tm, ts] = timeStr.split(':').map(Number);
                
                const taskDateTime = getNowTR();
                taskDateTime.setFullYear(y, m - 1, d);
                taskDateTime.setHours(th || 12, tm || 0, ts || 0, 0);
                
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
                  badgeColor = 'bg-error/10 text-error border-error/20';
                } else {
                  const today = getNowTR();
                  today.setHours(0,0,0,0);
                  const targetDate = getNowTR();
                  targetDate.setFullYear(y, m - 1, d);
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
                    badgeColor = 'bg-warning/10 text-warning border-warning/20';
                  } else if (diffDays === 1) {
                    badgeText = `Yarın${timeText}`;
                    badgeColor = 'bg-primary/10 text-primary border-primary/20';
                  } else if (diffDays === -1) {
                    badgeText = `Dün${timeText}`;
                    badgeColor = 'bg-error/10 text-error border-error/20';
                  } else if (diffDays < -1) {
                    badgeText = `${Math.abs(diffDays)} gün gecikti`;
                    badgeColor = 'bg-error/10 text-error border-error/20';
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
          ) : (
            <EmptyState
              icon={<CarrierIcon width={48} height={48} />}
              title="Yaklaşan etkinlik yok"
              message="Petinizin sağlık takvimi henüz oluşturulmadı. Aşı veya ilaç hatırlatıcılarınız burada görünecek."
            />
          )}
        </div>
      )}



    </div>
    </DashboardOnboardingWrapper>
  )
}
