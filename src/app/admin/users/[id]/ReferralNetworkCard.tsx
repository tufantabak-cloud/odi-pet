import React from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, Users } from 'lucide-react'

interface Referral {
  id: string
  status: 'pending' | 'qualified'
  created_at: string
  qualified_at: string | null
  referred: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

export default function ReferralNetworkCard({ referrals }: { referrals: Referral[] }) {
  const qualifiedCount = referrals.filter(r => r.status === 'qualified').length
  const pendingCount = referrals.filter(r => r.status === 'pending').length

  // Invite Index Progress (Tier mantığı)
  let nextGoal = 5
  let progressText = "Kurucu Üye Rozeti (5 Davet)"
  if (qualifiedCount < 2) { nextGoal = 2; progressText = "Tier 2 Bonus" }
  else if (qualifiedCount < 3) { nextGoal = 3; progressText = "Tier 3 Bonus" }
  else if (qualifiedCount < 4) { nextGoal = 4; progressText = "Tier 4 Bonus" }
  
  const progressPercent = qualifiedCount >= 5 ? 100 : (qualifiedCount / nextGoal) * 100

  return (
    <div className="card-base p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-[14px] text-text-primary flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Davet Ağı ve Ödüller
        </h2>
        <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          Toplam: {referrals.length}
        </span>
      </div>

      <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-2">
        <h3 className="text-purple-800 text-[12px] font-bold mb-1">Referral Programı</h3>
        <p className="text-purple-700 text-[11px] leading-tight">
          Ödüller kademeli olarak artar. <br/>
          Maksimum program ödülü: <strong>330 gün Odi Pro</strong>.
        </p>
      </div>

      <div className="flex items-center justify-between text-[12px] text-text-secondary bg-slate-50 p-3 rounded-xl border border-border-main">
        <div className="text-center flex-1 border-r border-border-main last:border-0">
          <div className="font-black text-emerald-600 text-lg">{qualifiedCount}</div>
          <div className="font-semibold">Nitelikli (Ödül Alındı)</div>
        </div>
        <div className="text-center flex-1">
          <div className="font-black text-amber-500 text-lg">{pendingCount}</div>
          <div className="font-semibold">Bekliyor (Pet/Aşı Yok)</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-bold text-slate-500">
          <span>İlerleme: {qualifiedCount} Nitelikli</span>
          <span>Hedef: {progressText}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-[12px] font-bold text-slate-700 mb-2">Davet Edilen Kullanıcılar</h3>
        {referrals.length === 0 ? (
          <p className="text-[12px] text-slate-500 text-center py-4">Henüz kimseyi davet etmedi.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {referrals.map(ref => {
              const name = [ref.referred?.first_name, ref.referred?.last_name].filter(Boolean).join(' ') || 'İsimsiz'
              return (
                <div key={ref.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/users/${ref.referred?.id}`} className="text-[13px] font-bold text-slate-900 hover:text-primary truncate block">
                      {name}
                    </Link>
                    <div className="text-[11px] text-slate-500 truncate">{ref.referred?.email}</div>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {ref.status === 'qualified' ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Nitelikli
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md" title="Henüz evcil hayvan eklemedi veya sağlık kaydı girmedi">
                        <Clock className="w-3 h-3" /> Bekliyor
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
