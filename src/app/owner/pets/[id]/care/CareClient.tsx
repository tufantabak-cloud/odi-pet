'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import CoachMark from '@/components/ui/CoachMark'

export default function CareClient({ pet }: { pet: any }) {
  const [plans, setPlans] = useState<any[]>([])
  const [loadingPlan, setLoadingPlan] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch(`/api/plans?pet_id=${pet.id}&category=bakim`)
        const data = await res.json()
        if (res.ok) {
          setPlans(data.plans || [])
        } else {
          console.error('[CareClient] API Error:', res.status, data)
        }
      } catch (err) {
        console.error('[CareClient] Fetch Error:', err)
      } finally {
        setLoadingPlan(false)
      }
    }
    loadPlans()
  }, [pet.id])

  if (loadingPlan) {
    return <div className="p-10 text-center text-text-secondary text-sm">Bakım planları yükleniyor...</div>
  }

  const activePlans = plans.filter(p => p.status === 'active')
  const completedPlans = plans.filter(p => p.status === 'completed')

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto animate-fadeIn">
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Profile Dön
      </Link>
      <div className="flex items-center gap-4 relative">
        <CoachMark
          hintKey="care_routine_intro"
          title="Bakım Rutini"
          message="Plan Yap üzerinden eklediğiniz bakım rutinlerini burada görebilirsiniz."
          icon="🛁"
          position="bottom"
        />
        <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {pet.avatar_url ? <Image src={pet.avatar_url} alt="" fill={true} className="object-cover" sizes="64px" /> : <span className="text-[28px]">🛁</span>}
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Kişisel Bakım</h1>
          <p className="text-text-secondary font-medium">Toplam {activePlans.length} aktif rutin</p>
        </div>
      </div>

      <div className="card-base p-5 border-l-4 border-l-primary flex flex-col gap-3">
        <p className="text-sm text-text-secondary font-medium">Bakım rutinleri eklemek veya yönetmek için ana sayfadaki veya menüdeki <b>Plan Yap</b> sihirbazını kullanın.</p>
        <button onClick={() => router.push(`/owner/plan-yap/bakim?pet_id=${pet.id}`)} className="btn-primary w-max py-2 px-4 shadow-sm">
          + Yeni Bakım Ekle
        </button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4 mt-2">Planlanmış Bakımlar</h2>
        {activePlans.length === 0 ? (
          <div className="text-sm text-text-secondary p-4 bg-white rounded-xl border border-border-main">Aktif planlanmış bakım bulunmuyor.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activePlans.map(plan => (
              <div key={plan.id} className="card-base p-5 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">🛁</div>
                  <div>
                    <h3 className="font-bold text-text-primary text-[15px]">{plan.sub_type}</h3>
                    <p className="text-xs text-text-secondary">{plan.repeat_rule === 'daily' ? 'Günlük' : plan.repeat_rule === 'weekly' ? 'Haftalık' : plan.repeat_rule === 'monthly' ? 'Aylık' : 'Tek Seferlik'}</p>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-2"><b>Tarih:</b> {new Date(plan.scheduled_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {completedPlans.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-bold text-text-primary mb-4">Tamamlanmış Bakımlar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-70">
            {completedPlans.map(plan => (
              <div key={plan.id} className="card-base p-5 flex flex-col gap-2 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">✓</div>
                  <div>
                    <h3 className="font-bold text-text-primary text-[15px]">{plan.sub_type}</h3>
                    <p className="text-xs text-text-secondary">{new Date(plan.updated_at || plan.scheduled_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
