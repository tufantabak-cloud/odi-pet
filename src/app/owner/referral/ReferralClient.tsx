'use client'

import { useState, useRef, useCallback } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

// ── Tip tanımları ─────────────────────────────────────────────────
interface BadgeData {
  key: string
  label: string
  emoji: string
  threshold: number
  earned: boolean
  earnedAt: string | null
  progress: number
}

interface ReferralClientProps {
  referralCode: string
  referralUrl: string
  referralCount: number
  badges: BadgeData[]
}

// ── Rozet gradyanları ─────────────────────────────────────────────
const BADGE_STYLES: Record<string, { from: string; to: string; shadow: string; ringColor: string }> = {
  first_invite: {
    from: '#FBBF24',
    to: '#D97706',
    shadow: 'rgba(251,191,36,0.45)',
    ringColor: 'ring-yellow-400/40',
  },
  three_friends: {
    from: '#94A3B8',
    to: '#64748B',
    shadow: 'rgba(148,163,184,0.45)',
    ringColor: 'ring-slate-400/40',
  },
  super_ambassador: {
    from: '#A855F7',
    to: '#4F46E5',
    shadow: 'rgba(168,85,247,0.45)',
    ringColor: 'ring-purple-500/40',
  },
}

// ── Yarı-3D Rozet SVG ─────────────────────────────────────────────
function BadgeSVG({ badgeKey, earned }: { badgeKey: string; earned: boolean }) {
  const style = BADGE_STYLES[badgeKey] ?? BADGE_STYLES.first_invite
  const opacity = earned ? 1 : 0.35

  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <radialGradient id={`grad-${badgeKey}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={style.from} />
          <stop offset="100%" stopColor={style.to} />
        </radialGradient>
        <filter id={`shadow-${badgeKey}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={style.shadow} />
        </filter>
      </defs>
      {/* Ana rozet şekli — sekizgen */}
      <polygon
        points="32,4 52,14 60,34 52,54 32,62 12,54 4,34 12,14"
        fill={`url(#grad-${badgeKey})`}
        filter={`url(#shadow-${badgeKey})`}
      />
      {/* Parlaklık overlay */}
      <polygon
        points="32,7 50,16 57,34 50,52 32,59 14,52 7,34 14,16"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />
      {/* İç pati / kemik detayı */}
      <circle cx="32" cy="28" r="5" fill="rgba(255,255,255,0.85)" />
      <circle cx="24" cy="23" r="3" fill="rgba(255,255,255,0.7)" />
      <circle cx="40" cy="23" r="3" fill="rgba(255,255,255,0.7)" />
      <circle cx="20" cy="30" r="2.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="44" cy="30" r="2.5" fill="rgba(255,255,255,0.6)" />
    </svg>
  )
}

// ── Toast Bildirimi ───────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-text-primary text-white text-[13px] font-bold shadow-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      {message}
    </div>
  )
}

// ── İstatistik Chip ───────────────────────────────────────────────
function StatChip({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/15">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div>
        <p className="text-[22px] font-black text-text-primary leading-none">{count}</p>
        <p className="text-[12px] text-text-secondary font-medium mt-0.5">
          {count === 0 ? 'Henüz davet yok' : count === 1 ? 'arkadaşın katıldı' : 'arkadaşın katıldı'}
        </p>
      </div>
    </div>
  )
}

// ── Ana Client Bileşen ────────────────────────────────────────────
export default function ReferralClient({
  referralCode,
  referralUrl,
  referralCount,
  badges,
}: ReferralClientProps) {
  const [toast, setToast] = useState({ visible: false, message: '' })
  const [shareExpanded, setShareExpanded] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Toast göster
  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: '' }), 2500)
  }, [])

  // Kopyala
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      showToast('Kopyalandı ✓')
    } catch {
      showToast('Kopyalanamadı — manuel kopyalayın')
    }
  }

  // QR İndir (Canvas üzerinden)
  const handleDownload = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null
    if (!canvas) { showToast('QR kodu hazırlanamadı'); return }
    const link = document.createElement('a')
    link.download = 'odi-pet-davet-kodu.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    showToast('İndirildi ✓')
  }

  // Paylaş (Web Share API)
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Odi.Pet — Can Dostunun Yaşam Platformu',
          text: 'Tüylü dostun için her şey bir arada! 🐾 Benimle Odi.Pet\'i dene:',
          url: referralUrl,
        })
      } catch {
        // Kullanıcı iptal etti
      }
    } else {
      setShareExpanded((prev) => !prev)
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent('Tüylü dostun için her şey bir arada! 🐾 Benimle Odi.Pet\'i dene: ' + referralUrl)}`
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Odi.Pet ile evcil hayvan bakımını keşfet 🐾 ' + referralUrl)}`

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} />

      <div className="flex flex-col gap-6 animate-fadeInUp max-w-lg mx-auto">

        {/* ── Hero Başlık ── */}
        <div className="text-center pt-2">
          {/* Animasyonlu pati + yıldız */}
          <div className="flex items-center justify-center gap-1 mb-3">
            <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ animation: 'pawBounce 2s ease-in-out infinite' }}>
              <style>{`
                @keyframes pawBounce {
                  0%, 100% { transform: translateY(0) rotate(-5deg); }
                  50% { transform: translateY(-5px) rotate(5deg); }
                }
                @keyframes starSpin {
                  0% { transform: rotate(0deg) scale(1); }
                  50% { transform: rotate(20deg) scale(1.15); }
                  100% { transform: rotate(0deg) scale(1); }
                }
              `}</style>
              <ellipse cx="32" cy="42" rx="14" ry="12" fill="url(#pawGrad)" />
              <circle cx="18" cy="30" r="7" fill="url(#pawGrad)" />
              <circle cx="46" cy="30" r="7" fill="url(#pawGrad)" />
              <circle cx="24" cy="20" r="5.5" fill="url(#pawGrad)" />
              <circle cx="40" cy="20" r="5.5" fill="url(#pawGrad)" />
              <defs>
                <radialGradient id="pawGrad" cx="40%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#4F2DBA" />
                </radialGradient>
              </defs>
            </svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              style={{ animation: 'starSpin 3s ease-in-out infinite', animationDelay: '0.5s' }}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
                fill="#FBBF24" />
            </svg>
          </div>
          <h1 className="text-[26px] font-black text-text-primary tracking-tight">
            🐾 Arkadaşını Davet Et
          </h1>
          <p className="text-[14px] text-text-secondary mt-1.5 leading-relaxed">
            Her davet eden, can dostunu da daha iyi baktırır.
          </p>
        </div>

        {/* ── QR Kod Kartı ── */}
        <div className="card-base p-6 flex flex-col items-center gap-4 border border-primary/15 bg-gradient-to-b from-primary-soft/60 to-white">
          {/* QR görseli (SVG — görsel olarak) */}
          <div className="p-4 bg-white rounded-2xl shadow-inner border border-border-main">
            <QRCodeSVG
              value={referralUrl}
              size={180}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="M"
            />
          </div>

          {/* Gizli Canvas — indirme için */}
          <div ref={canvasRef} style={{ display: 'none' }}>
            <QRCodeCanvas
              id="qr-canvas"
              value={referralUrl}
              size={512}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="M"
            />
          </div>

          {/* URL ve Kod */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">
              Davet Kodun
            </span>
            <div className="flex items-center gap-2 bg-primary-soft px-4 py-2 rounded-xl border border-primary/15">
              <span className="text-[15px] font-black text-primary tracking-wider">
                {referralCode}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary/70 mt-1 font-mono">
              odi-petcare.vercel.app/register?ref={referralCode}
            </p>
          </div>
        </div>

        {/* ── Aksiyon Butonları ── */}
        <div className="flex flex-col gap-3">
          {/* Satır 1: Kopyala + QR İndir */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="referral-copy-btn"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-surface border border-border-main font-bold text-[13px] text-text-primary hover:border-primary/30 hover:bg-primary-soft hover:text-primary transition-all duration-200 shadow-sm active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              Kopyala
            </button>
            <button
              id="referral-download-btn"
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] bg-surface border border-border-main font-bold text-[13px] text-text-primary hover:border-primary/30 hover:bg-primary-soft hover:text-primary transition-all duration-200 shadow-sm active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              QR İndir
            </button>
          </div>

          {/* Satır 2: Paylaş */}
          <button
            id="referral-share-btn"
            onClick={handleShare}
            className="w-full btn-primary py-3.5 text-[14px] font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
            </svg>
            Paylaş
          </button>

          {/* Fallback paylaşım butonları (Web Share yoksa) */}
          {shareExpanded && (
            <div className="flex gap-3 animate-fadeInUp">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] bg-[#25D366]/10 border border-[#25D366]/30 text-[#128C7E] font-bold text-[13px] hover:bg-[#25D366]/20 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
              <a
                href={twUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] bg-black/5 border border-black/15 text-text-primary font-bold text-[13px] hover:bg-black/10 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X / Twitter
              </a>
            </div>
          )}
        </div>

        {/* ── İstatistik ── */}
        <StatChip count={referralCount} />

        {/* ── Rozetler ── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-extrabold text-text-primary">🏅 Rozetlerim</h2>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((badge) => {
              const style = BADGE_STYLES[badge.key]
              return (
                <div
                  key={badge.key}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-[20px] border transition-all duration-200 ${
                    badge.earned
                      ? `bg-gradient-to-b from-white to-primary-soft border-primary/20 shadow-md hover:scale-[1.04] ${style?.ringColor ?? ''} ring-2`
                      : 'bg-surface border-border-main opacity-60'
                  }`}
                >
                  {/* Konfeti efekti — kazanılmış rozetler */}
                  {badge.earned && (
                    <div className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1.5 h-1.5 rounded-full"
                          style={{
                            background: i % 2 === 0 ? '#FBBF24' : '#A78BFA',
                            top: `${10 + (i * 12) % 60}%`,
                            left: `${8 + (i * 17) % 84}%`,
                            animation: `confettiFall ${0.8 + i * 0.2}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <BadgeSVG badgeKey={badge.key} earned={badge.earned} />
                  <div className="text-center">
                    <p className="text-[11px] font-black text-text-primary leading-tight">{badge.label}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {badge.earned ? '✓ Kazanıldı' : `${badge.progress}/${badge.threshold} davet`}
                    </p>
                  </div>

                  {/* İlerleme çubuğu */}
                  {!badge.earned && (
                    <div className="w-full h-1 bg-border-main rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(badge.progress / badge.threshold) * 100}%`,
                          background: `linear-gradient(90deg, ${style?.from ?? '#4F2DBA'}, ${style?.to ?? '#3C2096'})`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── KVKK Notu ── */}
        <p className="text-center text-[11px] text-text-secondary/60 px-4 pb-2 leading-relaxed">
          Davet sistemine katılarak KVKK kapsamında veri işlenmesine onay vermiş sayılırsınız.
        </p>

      </div>

      {/* Konfeti animasyonu CSS */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
          100% { transform: translateY(6px) rotate(45deg); opacity: 0.3; }
        }
      `}</style>
    </>
  )
}
