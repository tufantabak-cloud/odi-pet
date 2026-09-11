'use client'

import React from 'react'
import { PassportPageType } from '@/lib/smart-scan/vision-gateway'
import { QrCode, Shield, Stethoscope, User, Heart } from 'lucide-react'

interface PassportPageReferenceProps {
  pageType: PassportPageType
}

/**
 * PII-Free schematic wireframe component illustrating the official Turkish Pet Passport layout.
 * Designed according to OPOS Design Bible standards (rounded-2xl, soft shadows, Lucide outline, WCAG AA).
 */
export function PassportPageReference({ pageType }: PassportPageReferenceProps) {
  return (
    <div
      data-testid={`passport-reference-${pageType}`}
      className="w-full max-w-[280px] h-[170px] mx-auto rounded-2xl bg-surface border border-border-main/80 shadow-sm p-3.5 flex flex-col justify-between select-none relative overflow-hidden transition-all hover:scale-[1.02] duration-300"
    >
      {/* Top watermark / corner badge */}
      <div className="absolute top-2 right-2.5 flex items-center gap-1 opacity-40 text-[9px] font-bold text-text-secondary uppercase tracking-wider">
        <span>T.C. Pasaport Mizanpajı</span>
      </div>

      {pageType === 'cover' && (
        <div className="flex flex-col justify-between h-full py-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Shield size={16} />
            </div>
            <div className="text-left">
              <div className="text-[9px] font-bold uppercase tracking-wider text-text-secondary leading-tight">
                TÜRKİYE CUMHURİYETİ
              </div>
              <div className="text-[8px] text-text-muted font-medium">
                Tarım ve Orman Bakanlığı
              </div>
            </div>
          </div>

          <div className="my-auto text-center py-1">
            <div className="inline-block text-[11px] font-black tracking-wider text-primary bg-primary/5 px-2.5 py-0.5 rounded-lg border border-primary/15">
              EVCİL HAYVAN PASAPORTU
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-dashed border-border-main/70">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-12 bg-text-secondary/15 rounded flex items-center justify-center">
                <span className="text-[8px] font-mono tracking-tighter opacity-60">||| | ||||</span>
              </div>
              <span className="text-[8px] font-mono font-bold text-text-secondary">TR-XX-XXXXXX</span>
            </div>
            <span className="text-[8px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Sayfa 1/32
            </span>
          </div>
        </div>
      )}

      {pageType === 'page_4' && (
        <div className="flex flex-col justify-between h-full py-0.5">
          <div className="flex items-center justify-between pb-1 border-b border-border-main/60">
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-tight">
                Bölüm I — Sahibine Ait Bilgiler
              </span>
            </div>
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Sayfa 4/32
            </span>
          </div>

          <div className="space-y-1.5 py-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-text-muted w-14 shrink-0">1. Adı Soyadı:</span>
              <div className="h-3 flex-1 bg-surface-muted rounded border border-border-main/50" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-text-muted w-14 shrink-0">2. Telefonu:</span>
              <div className="h-3 flex-1 bg-surface-muted rounded border border-border-main/50" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-text-muted w-14 shrink-0">3. İkametgâh:</span>
              <div className="h-3 flex-1 bg-surface-muted rounded border border-border-main/50" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-dashed border-border-main/70">
            <span className="text-[8px] text-text-muted">İl / İlçe / Posta Kodu</span>
            <span className="text-[8px] text-text-secondary italic">Sahip İmzası</span>
          </div>
        </div>
      )}

      {pageType === 'page_5' && (
        <div className="flex flex-col justify-between h-full py-0.5">
          <div className="flex items-center justify-between pb-1 border-b border-border-main/60">
            <div className="flex items-center gap-1.5">
              <Heart size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-tight">
                Bölüm II — Hayvana Ait Bilgiler
              </span>
            </div>
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Sayfa 5/32
            </span>
          </div>

          <div className="flex gap-2.5 items-center py-1">
            {/* Photo frame wireframe */}
            <div className="w-12 h-14 rounded-xl border-2 border-dashed border-border-main/80 flex flex-col items-center justify-center bg-surface-muted/50 shrink-0">
              <span className="text-[7px] text-text-muted text-center font-bold">FOTO</span>
            </div>

            {/* Field rows wireframe */}
            <div className="flex-1 space-y-1.5 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-text-muted w-12 shrink-0">1. Adı:</span>
                <div className="h-2.5 flex-1 bg-surface-muted rounded border border-border-main/50" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-text-muted w-12 shrink-0">2. Tür / Irk:</span>
                <div className="h-2.5 flex-1 bg-surface-muted rounded border border-border-main/50" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-text-muted w-12 shrink-0">3. Cinsiyet:</span>
                <div className="h-2.5 flex-1 bg-surface-muted rounded border border-border-main/50" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-dashed border-border-main/70 text-[8px] text-text-muted">
            <span>Doğum Tarihi: GG/AA/YYYY</span>
            <span>Renk / Görünüm</span>
          </div>
        </div>
      )}

      {pageType === 'page_6' && (
        <div className="flex flex-col justify-between h-full py-0.5">
          <div className="flex items-center justify-between pb-1 border-b border-border-main/60">
            <div className="flex items-center gap-1.5">
              <QrCode size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-tight">
                Bölüm III — Hayvanın Kimliği
              </span>
            </div>
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Sayfa 6/32
            </span>
          </div>

          <div className="py-1 space-y-1.5">
            {/* Microchip barcode sticker frame */}
            <div className="p-1.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-10 bg-primary/20 rounded flex items-center justify-center">
                  <span className="text-[8px] font-mono tracking-tighter text-primary">|||||||||</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-primary">900 XXXXXXXXXXX</span>
              </div>
              <span className="text-[7px] font-bold uppercase text-primary tracking-wide">Mikroçip</span>
            </div>

            {/* Tattoo and implant date wireframe */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-1 rounded bg-surface-muted border border-border-main/50">
                <span className="text-[7px] text-text-muted block">Dövme No</span>
                <div className="h-2 bg-surface rounded mt-0.5" />
              </div>
              <div className="p-1 rounded bg-surface-muted border border-border-main/50">
                <span className="text-[7px] text-text-muted block">Uygulama Tarihi</span>
                <div className="h-2 bg-surface rounded mt-0.5" />
              </div>
            </div>
          </div>

          <div className="pt-0.5 border-t border-dashed border-border-main/70 text-[8px] text-text-muted text-left">
            15 Haneli Standart Çip & Dövme Bilgisi
          </div>
        </div>
      )}

      {pageType === 'page_7' && (
        <div className="flex flex-col justify-between h-full py-0.5">
          <div className="flex items-center justify-between pb-1 border-b border-border-main/60">
            <div className="flex items-center gap-1.5">
              <Stethoscope size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-tight">
                Bölüm IV — Düzenleyen Yetkili
              </span>
            </div>
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Sayfa 7/32
            </span>
          </div>

          <div className="flex gap-2.5 items-center py-1">
            <div className="flex-1 space-y-1.5 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-text-muted w-14 shrink-0">Hekim Adı:</span>
                <div className="h-2.5 flex-1 bg-surface-muted rounded border border-border-main/50" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-text-muted w-14 shrink-0">Klinik:</span>
                <div className="h-2.5 flex-1 bg-surface-muted rounded border border-border-main/50" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-text-muted w-14 shrink-0">Telefon:</span>
                <div className="h-2.5 flex-1 bg-surface-muted rounded border border-border-main/50" />
              </div>
            </div>

            {/* Stamp & signature circle wireframe */}
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary/40 flex flex-col items-center justify-center bg-primary/5 shrink-0 text-primary">
              <span className="text-[6px] font-black tracking-tighter uppercase text-center leading-tight">
                RESMİ KAŞE<br />& İMZA
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-dashed border-border-main/70 text-[8px] text-text-muted">
            <span>Kayıt Yeri: İl / İlçe</span>
            <span>Tanzim Tarihi</span>
          </div>
        </div>
      )}
    </div>
  )
}
