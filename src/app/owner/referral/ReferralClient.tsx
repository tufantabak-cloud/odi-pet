'use client'

import { useState, useRef, useCallback } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import {
  Gift,
  Share2,
  Copy,
  Download,
  CheckCircle2,
  Clock,
  Award,
  Users,
  MessageCircle,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react'

interface InviteItem {
  id: string
  referred_id: string
  status: 'pending' | 'qualified' | 'rejected'
  created_at: string
  qualified_at?: string
}

interface ReferralClientProps {
  referralCode: string
  referralUrl: string
  referralCount: number
  qualifiedCount?: number
  earnedDays?: number
  daysLeft?: number
  invitesList?: InviteItem[]
  badges?: any[]
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-text-primary text-white text-xs font-bold shadow-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      {message}
    </div>
  )
}

export default function ReferralClient({
  referralCode,
  referralUrl,
  referralCount,
  qualifiedCount = 0,
  earnedDays = 0,
  daysLeft = 90,
  invitesList = [],
}: ReferralClientProps) {
  const [toast, setToast] = useState({ visible: false, message: '' })
  const canvasRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: '' }), 2500)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      showToast('Kopyalandı ✓')
    } catch {
      showToast('Kopyalanamadı — manuel kopyalayın')
    }
  }

  const handleDownload = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null
    if (!canvas) {
      showToast('QR kodu hazırlanamadı')
      return
    }
    const link = document.createElement('a')
    link.download = 'odi-pet-davet-kodu.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    showToast('İndirildi ✓')
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Odi.Pet — Can Dostunun Yaşam Platformu',
          text: 'Tüylü dostun için her şey bir arada! 🐾 Benimle Odi.Pet\'i dene ve +30 gün Odi Pro kazan:',
          url: referralUrl,
        })
      } catch {
        // User cancelled
      }
    } else {
      handleCopy()
    }
  }

  const shareText = encodeURIComponent(`Tüylü dostun için her şey bir arada! 🐾 Benimle Odi.Pet'i dene ve +30 gün Odi Pro kazan: ${referralUrl}`)
  const waUrl = `https://wa.me/?text=${shareText}`
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent('Odi.Pet ile evcil hayvan bakımını keşfet +30 Gün Odi Pro kazan 🐾')}`
  const smsUrl = `sms:?body=${shareText}`

  const progressPercent = Math.min(100, Math.round((daysLeft / 365) * 100))

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} />

      <div className="flex flex-col gap-6 animate-fadeInUp max-w-lg mx-auto pb-20 font-sans">
        {/* 1. Header */}
        <div className="text-center pt-2">
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Arkadaşını Davet Et
          </h1>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            Her davet eden, can dostunu da daha iyi baktırır.
          </p>
        </div>

        {/* 2. Value Proposition Card */}
        <div className="card-base p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-white border border-amber-300/40 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 border border-amber-300/40 shadow-sm">
            <Gift className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              🎁 Özel Ödül Programı
            </span>
            <h3 className="text-base font-extrabold text-text-primary leading-snug mt-0.5">
              Davet ettikçe katlanarak 330 Gün'e varan Odi Pro kazanırsın
            </h3>
          </div>
        </div>

        {/* 3. Pro Active Status Counter & Progress Bar */}
        <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-text-primary">
              Pro süren: <span className="text-primary font-black">{daysLeft} gün</span>
            </span>
            <span className="text-xs font-semibold text-text-secondary">
              {daysLeft} / 365 gün
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 4. Progressive Milestone Breakdown Card */}
        <div className="card-base p-5 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-extrabold text-text-primary">Kademeli Davet Ödülleri</span>
            </div>
            <span className="text-xs font-black text-primary">{qualifiedCount} / 5 Nitelikli Davet</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
            {[
              { step: 1, days: 30 },
              { step: 2, days: 60 },
              { step: 3, days: 90 },
              { step: 4, days: 150 },
              { step: 5, days: 330, isCrown: true },
            ].map(tier => {
              const isAchieved = qualifiedCount >= tier.step
              const isCurrent = qualifiedCount + 1 === tier.step

              return (
                <div
                  key={tier.step}
                  className={`p-2 rounded-2xl border flex flex-col items-center gap-0.5 transition-all ${
                    isAchieved
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : isCurrent
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-black ring-2 ring-amber-400/30'
                      : 'bg-slate-50 border-slate-200 text-slate-500 font-medium'
                  }`}
                >
                  <span className="text-2xs font-extrabold uppercase">
                    {tier.step}. Davet
                  </span>
                  <span className="text-xs font-black">
                    +{tier.days}G {tier.isCrown ? '👑' : ''}
                  </span>
                  {isAchieved && (
                    <span className="text-2xs text-emerald-600 font-bold">✓ Alındı</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 5. Quick Share Line */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider px-1">
            Hızlı Paylaşım
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#128C7E] font-bold text-xs hover:bg-[#25D366]/20 transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#0088cc]/10 border border-[#0088cc]/30 text-[#0088cc] font-bold text-xs hover:bg-[#0088cc]/20 transition-all active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              Telegram
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 font-bold text-xs hover:bg-pink-100 transition-all active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              Instagram
            </button>
            <a
              href={smsUrl}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              SMS
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={handleCopy}
              className="btn-secondary py-3.5 text-xs font-extrabold flex items-center justify-center gap-2 rounded-2xl active:scale-[0.98]"
            >
              <Copy className="w-4 h-4" />
              Kopyala
            </button>
            <button
              onClick={handleShare}
              className="btn-primary py-3.5 text-xs font-extrabold flex items-center justify-center gap-2 rounded-2xl active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              Tümünde Paylaş
            </button>
          </div>
        </div>

        {/* 6. Referral Code & Always Visible QR Code */}
        <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col items-center gap-3 text-center">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Davet Kodun
          </span>
          <div className="px-6 py-2.5 rounded-2xl bg-primary-soft border border-primary/20">
            <span className="text-2xl font-black text-primary tracking-widest">
              {referralCode}
            </span>
          </div>

          {/* Always Visible QR Code */}
          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner">
              <QRCodeSVG value={referralUrl} size={160} bgColor="#FFFFFF" fgColor="#0F172A" level="M" />
            </div>
            <button
              onClick={handleDownload}
              className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-2 rounded-xl active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              QR İndir
            </button>
          </div>

          {/* Hidden Canvas for QR Download */}
          <div style={{ display: 'none' }}>
            <QRCodeCanvas id="qr-canvas" value={referralUrl} size={512} bgColor="#FFFFFF" fgColor="#0F172A" level="M" />
          </div>
        </div>

        {/* 7. Qualification Conditions Card (4 explicit items) */}
        <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-3">
          <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            +30 Gün kazanmak için arkadaşın:
          </h3>
          <ul className="space-y-2 text-xs font-medium text-text-secondary pl-1">
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xs font-bold">✓</span>
              Hesabını oluşturmalı
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xs font-bold">✓</span>
              E-postasını doğrulamalı
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xs font-bold">✓</span>
              En az 1 evcil hayvan eklemeli
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xs font-bold">✓</span>
              İlk 14 günde en az 1 sağlık kaydı (aşı/kilo/parazit) girmeli
            </li>
          </ul>
        </div>

        {/* 8. Stats Card (Toplam Davet, Nitelikli Davet, Kazanılan Süre) */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="card-base p-4 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center">
            <span className="text-xl sm:text-2xl font-black text-primary">{referralCount}</span>
            <p className="text-2xs sm:text-2xs font-bold text-text-secondary uppercase tracking-wider mt-1">Toplam Davet</p>
          </div>
          <div className="card-base p-4 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center">
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{qualifiedCount}</span>
            <p className="text-2xs sm:text-2xs font-bold text-text-secondary uppercase tracking-wider mt-1">Nitelikli Davet</p>
          </div>
          <div className="card-base p-4 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center">
            <span className="text-xl sm:text-2xl font-black text-amber-500">+{earnedDays} Gün</span>
            <p className="text-2xs sm:text-2xs font-bold text-text-secondary uppercase tracking-wider mt-1">Kazanılan Süre</p>
          </div>
        </div>

        {/* 9. Invites List */}
        {invitesList.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-1">
              Davet Ettiklerin
            </h3>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] divide-y divide-border-main overflow-hidden">
              {invitesList.map((item) => (
                <div key={item.id} className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-bg-main flex items-center justify-center text-text-secondary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">
                        Davetli Kullanıcı #{item.referred_id.slice(0, 6)}
                      </p>
                      <span className="text-2xs text-text-secondary">
                        {new Date(item.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  <div>
                    {item.status === 'qualified' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-2xs font-bold border border-emerald-200">
                        Ödüllendirildi ✓
                      </span>
                    ) : item.status === 'pending' ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-2xs font-bold border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Bekliyor
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-2xs font-bold border border-slate-200">
                        Geçersiz
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
