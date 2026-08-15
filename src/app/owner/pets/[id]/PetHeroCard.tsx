'use client'

import Image from 'next/image'
import { RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MoreVertical, Camera, AlertTriangle } from 'lucide-react'
import { getSpeciesEmoji, getSpeciesLabel } from '@/lib/species';

export interface PetHeroCardProps {
  pet: any
  score?: number
  age: { text: string; label: string }
  coverInputRef?: RefObject<HTMLInputElement | null>
  avatarInputRef?: RefObject<HTMLInputElement | null>
  activeLostReport?: any
  onLostReport?: () => void
  onMarkFound?: () => void
  latestWeight?: string | null
  onMenuOpen?: () => void
  onChangeCoverClick?: () => void
  onChangeAvatarClick?: () => void
}

export default function PetHeroCard({
  pet,
  score,
  age,
  coverInputRef,
  avatarInputRef,
  activeLostReport,
  onLostReport,
  onMarkFound,
  latestWeight,
  onMenuOpen,
  onChangeCoverClick,
  onChangeAvatarClick,
}: PetHeroCardProps) {
  const router = useRouter()

  const handleAvatarClick = () => {
    if (avatarInputRef?.current) {
      avatarInputRef.current.click()
    } else if (onChangeAvatarClick) {
      onChangeAvatarClick()
    }
  }

  return (
    <div className="relative w-full overflow-hidden h-[210px] sm:h-[230px]">

      {/* KAPAK ALANI */}
      <div className="absolute inset-0 bg-slate-900">
        {pet.cover_url ? (
          <>
            {/* KAPAK FOTOĞRAFI — Full object-cover */}
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={pet.cover_url}
                alt={pet.name}
                fill
                className="object-cover w-full h-full"
                style={{
                  transform: pet.cover_position && pet.cover_position.includes('scale')
                    ? pet.cover_position
                    : pet.cover_position === 'top'
                    ? 'scale(1.05) translateY(-10%)'
                    : pet.cover_position === 'bottom'
                    ? 'scale(1.05) translateY(10%)'
                    : 'scale(1)',
                  transformOrigin: 'center center'
                }}
                priority
              />
            </div>
            
            {/* Koyu Degrade Overlay — Yüksek Okunabilirlik Sağlar */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a6eb5] via-[#2d9cdb] to-[#114b7a]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        )}
      </div>

      {/* Üst Butonlar — Sol: Geri | Orta: Kayıp Rozeti | Sağ: 3 Nokta Menü */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Geri Dön"
          className="w-[42px] h-[42px] min-w-[42px] min-h-[42px] rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-all active:scale-95 shadow-md">
          <ChevronLeft size={20} className="text-white" />
        </button>

        {activeLostReport && (
          <button
            type="button"
            onClick={onMarkFound}
            aria-label="Kayıp İlanı Aktif"
            className="px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold backdrop-blur-md border border-red-400/30 flex items-center gap-1.5 shadow-lg animate-pulse hover:bg-red-700 transition-colors cursor-pointer">
            <AlertTriangle size={14} className="text-white" />
            <span>Kayıp İlanı Aktif</span>
          </button>
        )}

        {/* Sağ Üst — TEK ÜÇ NOKTA (...) MENÜSÜ */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (onMenuOpen) onMenuOpen()
            else if (onChangeCoverClick) onChangeCoverClick()
          }}
          aria-label="Profil Menüsü"
          title="Seçenekler"
          className="w-[42px] h-[42px] min-w-[42px] min-h-[42px] rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-all active:scale-95 shadow-md">
          <MoreVertical size={20} className="text-white" />
        </button>
      </div>

      {/* Alt: Profil foto (Avatar) + İsim & Bilgiler */}
      <div className="absolute bottom-3 left-0 right-0 px-4 flex items-end gap-3 z-20">

        {/* Profil Fotoğrafı (Avatar) — Kamera Rozetli ve Tıklanabilir */}
        <button
          type="button"
          onClick={handleAvatarClick}
          className="relative flex-shrink-0 group cursor-pointer text-left focus:outline-none"
          title="Profil fotoğrafını değiştir">
          <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full border-[3px] border-white overflow-hidden bg-white shadow-xl transition-transform group-hover:scale-105 relative">
            {pet.avatar_url ? (
              <Image
                src={pet.avatar_url}
                alt={pet.name}
                width={76}
                height={76}
                className="object-cover object-center w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-100">
                {getSpeciesEmoji(pet.species)}
              </div>
            )}
          </div>
          
          {/* Kamera Rozeti (Camera Badge) */}
          <div className="absolute bottom-0 right-0 w-[24px] h-[24px] rounded-full bg-primary text-white border-2 border-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Camera size={12} />
          </div>
        </button>

        {/* İsim ve Bilgiler */}
        <div className="flex items-center gap-3 flex-1 min-w-0 pb-1">
          {/* İsim */}
          <h1 
            className="text-2xl sm:text-3xl font-bold text-white leading-none truncate max-w-[130px] sm:max-w-none flex-shrink min-w-0"
            style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
            {pet.name}
          </h1>

          {/* Dikey Çizgi */}
          <div className="w-[1px] h-[36px] sm:h-[44px] bg-white/40 flex-shrink-0" />

          {/* Detay Bilgileri */}
          <div 
            className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden text-white"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            <p className="text-xs font-semibold leading-tight truncate">
              {pet.breed || 'Bilinmiyor'} 
              {pet.gender === 'male' 
                ? ' • Erkek' 
                : pet.gender === 'female' 
                ? ' • Dişi' : ''}
            </p>
            <p className="text-2xs sm:text-xs text-white/90 leading-tight truncate font-medium">
              {age.text}
            </p>
            <p className="text-2xs sm:text-xs text-white/90 leading-tight truncate font-medium">
              {latestWeight && latestWeight !== '-' ? `${latestWeight} Kilo • ` : ''}
              {pet.is_neutered ? 'Kısırlaştırıldı' : 'Kısırlaştırılmamış'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
