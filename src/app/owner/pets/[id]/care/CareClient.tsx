'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import CoachMark from '@/components/ui/CoachMark'
import { ShampooIcon } from '@/components/icons/PetIcons'
import { Check } from 'lucide-react'

export default function CareClient({ pet }: { pet: any }) {
  const [plans, setPlans] = useState<any[]>([])
  const [loadingPlan, setLoadingPlan] = useState(true)
  const router = useRouter()
  const [editingPlan, setEditingPlan] = useState<any | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const handleSaveEdit = async () => {
    if (!editingPlan) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/plans/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          sub_type: editTitle,
          scheduled_at: editDate ? new Date(editDate).toISOString() : editingPlan.scheduled_at,
        }),
      })
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, title: editTitle, sub_type: editTitle, scheduled_at: editDate ? new Date(editDate).toISOString() : p.scheduled_at } : p))
        setEditingPlan(null)
        router.refresh()
      }
    } catch (e) {
      console.error('Error saving care plan:', e)
    } finally {
      setSavingEdit(false)
    }
  }

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
          icon={<ShampooIcon width={24} height={24} className="w-6 h-6 text-rose-500" />}
          position="bottom"
        />
        <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          {pet.avatar_url ? <Image src={pet.avatar_url} alt="" fill={true} className="object-cover" sizes="64px" /> : <ShampooIcon width={32} height={32} className="w-8 h-8 text-rose-500" />}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Kişisel Bakım</h1>
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
              <div key={plan.id} className="card-base p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold"><ShampooIcon width={20} height={20} className="w-5 h-5 text-rose-500" /></div>
                  <div>
                    <h3 className="font-bold text-text-primary text-base">{plan.title || plan.sub_type}</h3>
                    <p className="text-xs text-text-secondary">{plan.repeat_rule === 'daily' ? 'Günlük' : plan.repeat_rule === 'weekly' ? 'Haftalık' : plan.repeat_rule === 'monthly' ? 'Aylık' : 'Tek Seferlik'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border-main/50">
                  <p className="text-xs text-text-secondary"><b>Tarih:</b> {new Date(plan.scheduled_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <button
                    onClick={() => {
                      setEditingPlan(plan)
                      setEditTitle(plan.title || plan.sub_type || '')
                      setEditDate(plan.scheduled_at ? String(plan.scheduled_at).split('T')[0] : '')
                    }}
                    data-testid="edit-care-routine-button"
                    className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    Düzenle
                  </button>
                </div>
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
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold"><Check size={16} className="w-4 h-4 text-success" /></div>
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

      {/* Bakım Rutini Düzenleme Modalı */}
      {editingPlan && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white/60 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border-main pb-3">
              <h3 className="font-bold text-lg text-text-primary">Bakım Rutinini Düzenle</h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-main"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Bakım Adı / Türü</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-main bg-bg-main text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Planlanan Tarih</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border-main bg-bg-main text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-main">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary hover:bg-bg-main"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || !editTitle.trim()}
                data-testid="save-care-routine-button"
                className="btn-primary px-5 py-2 rounded-xl text-sm font-bold shadow-sm"
              >
                {savingEdit ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
