'use client'

import { useState } from 'react'
import { Crown, RotateCw, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  userName: string
}

export default function QuickGrantUserButton({ userId, userName }: Props) {
  const router = useRouter()
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleGrant = async (customDays?: number) => {
    const grantDays = customDays || days
    if (!confirm(`${userName} kullanıcısına +${grantDays} Gün Pro kredi hediye etmek istediğinize emin misiniz?`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/memberships/credit-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: [userId],
          days: grantDays,
          reason: 'admin_grant',
          note: 'Kullanıcı detay sayfasından admin tarafından doğrudan Pro hediye edildi.',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')

      const label = grantDays >= 36500 ? 'Sonsuz (Ömür Boyu) ♾️' : `+${grantDays} Gün`
      setToast(`✓ ${label} Pro Kredi Tanımlandı!`)
      setShowOptions(false)
      setTimeout(() => {
        setToast(null)
        window.location.reload()
      }, 800)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      {toast && (
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-2xs font-extrabold flex items-center gap-1.5 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {!showOptions ? (
        <button
          type="button"
          onClick={() => setShowOptions(true)}
          className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-2xs"
        >
          <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
          <span>👑 Kullanıcıyı Pro Yap / Gün Yükle</span>
        </button>
      ) : (
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
          <span className="text-2xs font-black text-amber-900 block">Pro Kredi Süresi Seçin:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[30, 90, 180, 365, 36500].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleGrant(d)}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 text-2xs font-black transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {d === 36500 ? '♾️ Sonsuz (Ömür Boyu)' : `+${d} Gün ${d === 30 ? '(1 Ay)' : d === 365 ? '(1 Yıl)' : ''}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleGrant(days)}
              disabled={loading}
              className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
              <span>Yükle (+{days} Gün)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="py-1.5 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-2xs font-bold hover:bg-slate-100"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
