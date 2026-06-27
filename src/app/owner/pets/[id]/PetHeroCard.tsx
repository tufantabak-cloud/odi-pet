/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              PetHeroCard — KİLİTLİ BÖLGE                    ║
 * ║  Bu bileşen onaylanmış ve test edilmiş son halindedir.       ║
 * ║  Yapısal değişiklik yapmadan önce Tufan'dan onay alınız.     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Kart yapısı:
 *  ┌─────────────────────────────────────────┐
 *  │ [+]   KAPAK FOTOĞRAFI (160px)       [✎] │
 *  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
 *  │ (avatar)  Pet Adı         ● İyi durumda │
 *  │           Tür · Irk · Yaş               │
 *  ├─────────────────────────────────────────┤
 *  │  [Paylaş]         [Acil Durum]          │
 *  └─────────────────────────────────────────┘
 *
 * Notlar:
 *  - Avatar: absolute top-[122px] left-4 z-30 — overflow-hidden dışında konumlandırılmış
 *  - Cover input: bileşen dışında (PetDetailClient) tutulur, ref prop olarak geçilir
 *  - Pet adı: pl-[104px] ile avatarın sağından başlar, text-left
 *  - Tür·Irk·Yaş: pl-[104px] ile avatarla hizalı, text-left
 *  - Paylaş + Acil Durum: flex-1 eşit genişlikte, h-9
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import FloatingSOS from '@/components/FloatingSOS'
import { RefObject } from 'react'

export interface PetHeroCardProps {
  pet: any
  score: number
  age: { text: string; label: string }
  coverInputRef: RefObject<HTMLInputElement | null>
  activeLostReport?: any
  onLostReport: () => void
  onMarkFound: () => void
  latestWeight?: string | null
}

export default function PetHeroCard({
  pet,
  score,
  age,
  coverInputRef,
  activeLostReport,
  onLostReport,
  onMarkFound,
  latestWeight,
}: PetHeroCardProps) {
  // ── Sağlık halo rengi ──────────────────────────────────────────
  const haloColor =
    score >= 75 ? '#22C55E' : score >= 40 ? '#EAB308' : '#EF4444'

  // ── Sağlık durumu etiketi ──────────────────────────────────────
  const healthStatus =
    score >= 75
      ? { label: 'İyi durumda', bg: 'var(--color-success-soft)', color: 'var(--color-success)' }
      : score >= 40
      ? { label: 'Takip gerekli', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' }
      : { label: 'Acil durum', bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' }

  return (
    /**
     * Dış container: relative — içindeki absolute elemanlar (avatar, butonlar)
     * bu container'a göre konumlanır.
     * overflow-hidden KASITLI OLARAK BURAYA EKLENMEMİŞTİR —
     * avatar (absolute top-[122px]) kırpılmamalıdır.
     */
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] relative">

      {/* ── Kapak Fotoğrafı Ekle (+) Butonu ── z-30: avatar ile aynı katman */}
      <button
        onClick={() => coverInputRef.current?.click()}
        className="absolute top-4 left-4 w-8 h-8 rounded-xl bg-white/20 hover:bg-white/40 active:scale-[0.97] backdrop-blur-md border border-white/40 flex items-center justify-center text-white transition-all z-30"
        title="Kapak Fotoğrafı Ekle"
      >
        <span className="text-[17px] font-black leading-none">+</span>
      </button>

      {/* ── Profil Düzenle Butonu ── */}
      <Link
        href={`/owner/pets/${pet.id}/edit`}
        className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-white/40 transition-all z-20"
        title="Profili Düzenle"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </Link>

      {/* ── Kapak Fotoğrafı Alanı (160px) ── overflow-hidden burada geçerli */}
      <div className="relative w-full h-[160px] bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-surface-secondary)] overflow-hidden rounded-t-[var(--radius-lg)]">
        {pet.cover_url ? (
          <img
            src={pet.cover_url}
            alt={`${pet.name} Poster`}
            className="absolute top-1/2 left-1/2 max-w-none max-h-none pointer-events-none"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              transformOrigin: 'center',
              transform: (() => {
                const isValidTransform = pet.cover_position && /^(scale\([\d.]+\)\s*)?(translate\(-?[\d.]+px,\s*-?[\d.]+px\))?$/.test(pet.cover_position)
                return isValidTransform 
                  ? `translate(-50%, -50%) ${pet.cover_position}`
                  : 'translate(-50%, -50%)'
              })(),
            }}
          />
        ) : pet.avatar_url ? (
          <Image
            src={pet.avatar_url}
            alt={pet.name}
            fill
            sizes="400px"
            className="object-cover blur-sm opacity-60"
            priority
          />
        ) : null}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      </div>

      {/*
       * ── Avatar (Profil Fotoğrafı) ──────────────────────────────────
       * NEDEN BURADA: overflow-hidden olan kapak div'inin DIŞINDA,
       * ana container'a (relative) göre absolute konumlandırılmıştır.
       * top-[122px] = kapak yüksekliği(160px) - avatar yarıçapı(38px) = 122px
       * Bu sayede avatar kapak ile alt alanın sınırına biner.
       */}
      <div className="absolute top-[122px] left-4 z-30">
        <div className="relative w-[76px] h-[76px]">
          {/* Sağlık halo halkası */}
          <svg width="76" height="76" viewBox="0 0 76 76" className="absolute inset-0">
            <circle cx="38" cy="38" r="35" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <circle
              cx="38" cy="38" r="35"
              fill="none"
              stroke={haloColor}
              strokeWidth="3"
              strokeDasharray={`${(score / 100) * 219.9} 219.9`}
              strokeDashoffset="0"
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '38px 38px' }}
            />
          </svg>
          {/* Fotoğraf */}
          <div className="absolute inset-[5px] rounded-full overflow-hidden border-2 border-white bg-[var(--color-primary-soft)] shadow-md">
            {pet.avatar_url ? (
              <Image src={pet.avatar_url} alt={pet.name} fill sizes="66px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[24px] font-800 text-[var(--color-primary)] opacity-40">
                {pet.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
       * ── İsim + Sağlık + Tür ───────────────────────────────────
       * pl-[104px] = avatar genişliği(76px) + left offset(16px) + boşluk(12px)
       * pt-2.5 — avatarın yarısı kapak altında olduğundan küçük üst boşluk yeter
       */}
      <div className="pt-2.5 pb-2 pl-[104px] pr-[var(--space-4)]">
        {/* Pet adı (sol) + Tür metni (adın hemen yanı) + Sağlık durumu (absolute sağ) */}
        <div className="relative flex items-center justify-start w-full mb-1.5 min-h-[32px]">
          <span className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)] text-left">
            {pet.name}
          </span>
          {/* Tür — adın hemen yanında, küçük ve ikincil */}
          <span className="ml-2 text-[12px] font-600 text-[var(--color-text-secondary)] self-end mb-[3px]">
            {pet.species === 'cat' ? 'Kedi' : pet.species === 'dog' ? 'Köpek' : pet.species}
          </span>
          <div
            className="absolute right-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-700 shadow-sm"
            style={{ background: healthStatus.bg, color: healthStatus.color }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: healthStatus.color }} />
            {healthStatus.label}
          </div>
        </div>
      </div>

      {/* ── Bilgi Chip'leri (Cins · Yaş · Cinsiyet · Kısırlaştırma · Kilo · Mikroçip) ── */}
      <div className="flex flex-wrap gap-1.5 px-[var(--space-4)] pb-3">
        {/* Cins (Breed) — sadece kayıtlıysa */}
        {pet.breed && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] text-[11px] font-700 border border-[var(--color-border)]">
            🐾 {pet.breed}
          </span>
        )}

        {/* Yaş */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-[11px] font-700">
          🎂 {age.text}
        </span>

        {/* Cinsiyet */}
        {pet.gender && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] text-[11px] font-700 border border-[var(--color-border)]">
            {pet.gender === 'male' ? '♂ Erkek' : pet.gender === 'female' ? '♀ Dişi' : '— Bilinmiyor'}
          </span>
        )}

        {/* Kısırlaştırma */}
        {pet.is_neutered != null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] text-[11px] font-700 border border-[var(--color-border)]">
            {pet.is_neutered ? '✂️ Kısır' : '🌿 Kısırlaştırılmamış'}
          </span>
        )}

        {/* Kilo */}
        {latestWeight && latestWeight !== '-' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] text-[11px] font-700 border border-[var(--color-border)]">
            ⚖️ {latestWeight} kg
          </span>
        )}

        {/* Mikroçip */}
        {pet.microchip_no && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] text-[11px] font-700 border border-[var(--color-border)]">
            📡 Çipli
          </span>
        )}
      </div>

      {/* ── Alt Buton Satırı ─────────────────────────────────────────── */}
      <div className="flex gap-2 px-[var(--space-4)] pb-[var(--space-3)] border-t border-[var(--color-border)] pt-[var(--space-3)]">
        {/* Paylaş — flex-1, h-9 */}
        <Link
          href={`/owner/pets/${pet.id}/share`}
          className="flex-1 h-9 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center gap-1.5 text-[11px] font-600 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Paylaş
        </Link>

        {/* Acil Durum — flex-1, h-9 (FloatingSOS fullWidth modu) */}
        <div className="flex-1">
          <FloatingSOS
            petId={pet.id}
            petName={pet.name}
            vetPhone={pet.vet_phone}
            vetName={pet.vet_name}
            sosContacts={pet.sos_contacts}
            fullWidth={true}
            onLostReport={activeLostReport ? undefined : onLostReport}
            onMarkFound={activeLostReport ? onMarkFound : undefined}
          />
        </div>
      </div>
    </div>
  )
}
