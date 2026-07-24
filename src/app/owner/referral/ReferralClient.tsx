'use client'

import { useState, useRef, useCallback } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

// ── Tip tanımları ─────────────────────────────────────────────────
interface ReferralClientProps {
  referralCode: string
  referralUrl: string
  referralCount: number
  badges?: any[]
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
          {count === 0 ? 'Henüz davet yok' : 'arkadaşın katıldı'}
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
          <h1 className="text-[26px] font-black text-text-primary tracking-tight">
            Arkadaşını Davet Et
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

        {/* ── KVKK Notu ── */}
        <p className="text-center text-[11px] text-text-secondary/60 px-4 pb-2 leading-relaxed">
          Davet sistemine katılarak KVKK kapsamında veri işlenmesine onay vermiş sayılırsınız.
        </p>

      </div>
    </>
  )
}
