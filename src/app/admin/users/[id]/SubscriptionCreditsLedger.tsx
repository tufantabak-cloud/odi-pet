'use client'

import { Gift, Calendar, Sparkles, Award, ShieldCheck, Crown } from 'lucide-react'

interface CreditRecord {
  id: string
  credit_days: number
  reason: string
  metadata: any
  created_at: string
}

interface Props {
  credits: CreditRecord[]
}

const REASON_MAP: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  campaign: { label: 'Promosyon Kampanyası', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: '🎁' },
  admin_grant: { label: 'Özel Admin Hediyesi', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: '👑' },
  welcome_gift: { label: 'Hoş Geldin Kredisi', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', icon: '🚀' },
  referee_welcome: { label: 'Davet Hoş Geldin Kredisi', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: '🐾' },
  referral_tier: { label: 'Nitelikli Davet Bonusu', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: '🏆' },
  milestone: { label: 'Kilometre Taşı Ödülü', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: '⭐️' },
  support_apology: { label: 'Destek / Sistem Telafisi', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: '🛠️' },
}

export default function SubscriptionCreditsLedger({ credits }: Props) {
  const totalDays = credits.reduce((acc, curr) => acc + (curr.credit_days || 0), 0)

  return (
    <div className="card-base overflow-hidden">
      <div className="px-6 py-4 border-b border-border-main flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-black text-[15px] text-text-primary flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" />
          <span>Abonelik, Kredi Kazanç & Kullanım Geçmişi</span>
          <span className="text-[12px] font-semibold text-text-secondary">({credits.length} İşlem)</span>
        </h2>
        {credits.length > 0 && (
          <span className="text-2xs font-extrabold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
            Toplam Verilen Kredi: +{totalDays >= 36500 ? 'Sonsuz ♾️' : `${totalDays} Gün`}
          </span>
        )}
      </div>

      {credits.length === 0 ? (
        <div className="p-8 text-center text-text-secondary text-[13px]">
          Henüz bu kullanıcı için kaydedilmiş bir abonelik/kredi hareketi bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-wider uppercase text-3xs">
              <tr>
                <th className="px-6 py-3">Tarih</th>
                <th className="px-6 py-3">Gerekçe / İşlem Tipi</th>
                <th className="px-6 py-3">Kullanılan / Yüklenen Kredi</th>
                <th className="px-6 py-3">Detay / Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {credits.map(c => {
                const reasonInfo = REASON_MAP[c.reason] || {
                  label: c.reason || 'Kredi Yükleme',
                  bg: 'bg-slate-50 border-slate-200',
                  text: 'text-slate-700',
                  icon: '⚡',
                }

                const isInfinite = c.credit_days >= 3650

                return (
                  <tr key={c.id} className="hover:bg-bg-main/50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-2xs shrink-0">
                      {new Date(c.created_at).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-2xs font-extrabold ${reasonInfo.bg} ${reasonInfo.text}`}
                      >
                        <span>{reasonInfo.icon}</span>
                        <span>{reasonInfo.label}</span>
                      </span>
                    </td>

                    <td className="px-6 py-3.5 font-mono">
                      <span className="font-black text-amber-600 text-xs">
                        +{isInfinite ? 'Sonsuz (Ömür Boyu) ♾️' : `${c.credit_days} Gün`}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-slate-600 text-2xs">
                      {c.metadata?.note || c.metadata?.granted_by ? (
                        <span>{c.metadata?.note || `Admin tarafından yüklendi (${c.metadata?.granted_by})`}</span>
                      ) : (
                        <span className="text-slate-400 font-italic">Sistem otomatik kredilendirmesi</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
