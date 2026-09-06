'use client'

import React from 'react'
import { GlassCard } from '@/components/ui/primitives'
import { Share, PlusSquare, Smartphone, Bell, X, ArrowRight } from 'lucide-react'

interface IosPermissionGuideModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
  isSubmitting?: boolean
}

export default function IosPermissionGuideModal({
  isOpen,
  onClose,
  onContinue,
  isSubmitting = false,
}: IosPermissionGuideModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <GlassCard
        className="w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col relative rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-white/20 dark:border-white/10"
        padding="none"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface/80 hover:bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors z-20 border border-border-main/50"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Section */}
        <div className="p-6 pb-4 border-b border-border-main/50 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3 shadow-sm">
            <Smartphone className="w-6 h-6" />
          </div>
          <h2 className="text-[20px] font-extrabold tracking-tight text-text-primary leading-snug">
            iPhone Ana Ekrana Ekleme ve İzin Kılavuzu
          </h2>
          <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
            iPhone'larda web sitelerinin doğrudan bildirim gönderebilmesi için sitenin önce ana ekrana uygulama gibi eklenmesi gerekiyor.
          </p>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-[13px] font-bold text-text-primary uppercase tracking-wide">
            Sırasıyla şu adımları izleyebilirsiniz:
          </p>

          {/* Step 1 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface border border-border-main/60">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-extrabold text-[14px] flex items-center justify-center shrink-0">
              1
            </div>
            <div className="flex-1 text-[13px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary font-bold">Paylaş Menüsünü Açın:</strong> Safari'nin en altındaki araç çubuğunda yer alan <span className="inline-flex items-center gap-1 font-semibold text-text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[12px]"><Share className="w-3 h-3 text-primary inline" /> Paylaş</span> (kare içinden yukarı ok çıkan simge) butonuna dokunun.
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface border border-border-main/60">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-extrabold text-[14px] flex items-center justify-center shrink-0">
              2
            </div>
            <div className="flex-1 text-[13px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary font-bold">Ana Ekrana Ekleyin:</strong> Açılan menüyü biraz aşağı kaydırıp <span className="inline-flex items-center gap-1 font-semibold text-text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[12px]"><PlusSquare className="w-3 h-3 text-primary inline" /> "Ana Ekrana Ekle"</span> seçeneğini seçin ve sağ üstteki <strong className="text-text-primary font-bold">Ekle</strong> butonuna basın.
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface border border-border-main/60">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-extrabold text-[14px] flex items-center justify-center shrink-0">
              3
            </div>
            <div className="flex-1 text-[13px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary font-bold">Uygulamayı Açın:</strong> Telefonunuzun ana ekranına eklenen yeni simgeye dokunarak uygulamayı açın.
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface border border-border-main/60">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-extrabold text-[14px] flex items-center justify-center shrink-0">
              4
            </div>
            <div className="flex-1 text-[13px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary font-bold">Bildirimleri Onaylayın:</strong> Ekrandaki mor renkli <strong className="text-purple-600 dark:text-purple-400 font-bold">"Bildirimleri Etkinleştir ve Devam Et"</strong> butonuna dokunun ve ekrana gelen uyarıda <strong className="text-emerald-600 dark:text-emerald-400 font-bold">İzin Ver</strong>'i seçin.
            </div>
          </div>

          {/* Fallback Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[12px] text-text-secondary leading-relaxed">
            <p>
              Şu an ana ekrana eklemeden doğrudan devam etmek isterseniz de alttaki mor <strong className="text-text-primary font-bold">"Bildirimleri Etkinleştir ve Devam Et"</strong> butonuna basarak bir sonraki adıma geçebilirsiniz; ancak iOS kısıtlaması nedeniyle anlık bildirimler gelmeyebilir.
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-bg-main border-t border-border-main/50 flex flex-col gap-2">
          <button
            onClick={onContinue}
            disabled={isSubmitting}
            className="h-12 w-full bg-primary hover:bg-primary/90 text-white rounded-xl font-extrabold text-[15px] active:scale-[0.98] transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Bell className="w-4 h-4" />
            <span>{isSubmitting ? 'Bildirimler Etkinleştiriliyor...' : 'Bildirimleri Etkinleştir ve Devam Et'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </div>
  )
}
