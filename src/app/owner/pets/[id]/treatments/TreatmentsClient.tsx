'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CoachMark from '@/components/ui/CoachMark'

export default function TreatmentsClient({ pet }: { pet: any }) {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch(`/api/plans?pet_id=${pet.id}&category=saglik`)
        const data = await res.json()
        if (res.ok) {
          setPlans(data.plans || [])
        } else {
          console.error('[TreatmentsClient] API Error:', res.status, data)
        }
      } catch (err) {
        console.error('[TreatmentsClient] Fetch Error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPlans()
  }, [pet.id])

  if (loading) {
    return <div className="p-10 text-center text-text-secondary text-sm">Sağlık planları yükleniyor...</div>
  }

  const activePlans = plans.filter(p => p.status === 'active')
  const completedPlans = plans.filter(p => p.status === 'completed')

  return (
    <div className="flex flex-col gap-6 pb-32 pb-safe w-full mx-auto animate-fadeIn">
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Sağlık Geçmişi'ne Dön
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
        <CoachMark
          hintKey="treatments_intro"
          title="Sağlık Sürecini Yönet"
          message="Hastalık süreçlerini, ilaç alım saatlerini ve veteriner randevularını artık Plan Yap sihirbazı üzerinden ekleyebilirsiniz."
          icon="🩺"
          position="bottom"
        />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-soft to-primary/20 flex items-center justify-center shrink-0">
            <span className="text-2xl">🩺</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Sağlık Takip Modülü</h1>
            <p className="text-sm text-text-secondary font-medium">{pet.name} için hastalık ve tedavi geçmişi</p>
          </div>
        </div>
      </div>

      <div className="card-base p-5 border-l-4 border-l-primary flex flex-col gap-3">
        <p className="text-sm text-text-secondary font-medium">Yeni ilaç tedavisi veya sağlık planı eklemek için ana sayfadaki veya menüdeki <b>Plan Yap</b> sihirbazını kullanın.</p>
        <button onClick={() => router.push(`/owner/plan-yap/saglik?pet_id=${pet.id}`)} className="btn-primary w-max min-h-[50px] flex items-center justify-center px-4 shadow-sm">
          + Yeni Sağlık Planı Ekle
        </button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4 mt-2">Aktif Tedaviler ve Planlar</h2>
        {activePlans.length === 0 ? (
          <div className="text-sm text-text-secondary p-4 bg-white rounded-xl border border-border-main">Aktif sağlık planı bulunmuyor.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activePlans.map(plan => (
              <div key={plan.id} className="card-base p-5 flex flex-col gap-2 border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">🩺</div>
                  <div>
                    <h3 className="font-bold text-text-primary text-base">{plan.sub_type}</h3>
                    <p className="text-xs text-text-secondary">{plan.repeat_rule === 'daily' ? 'Günlük' : plan.repeat_rule === 'weekly' ? 'Haftalık' : plan.repeat_rule === 'monthly' ? 'Aylık' : 'Tek Seferlik'}</p>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-2"><b>Tarih:</b> {new Date(plan.scheduled_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {plan.note && <p className="text-xs text-text-secondary mt-1"><b>Not:</b> {plan.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {completedPlans.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-bold text-text-primary mb-4">Tamamlanmış Tedaviler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-70">
            {completedPlans.map(plan => (
              <div key={plan.id} className="card-base p-5 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900 border-l-4 border-l-slate-400 dark:border-l-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">✓</div>
                  <div>
                    <h3 className="font-bold text-text-primary text-base">{plan.sub_type}</h3>
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
