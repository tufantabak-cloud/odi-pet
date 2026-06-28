'use client'

import Link from 'next/link'
import Image from 'next/image'
import FloatingSOS from '@/components/FloatingSOS'
import { RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, MoreVertical, Camera } from 'lucide-react'

export interface PetHeroCardProps {
  pet: any
  score: number
  age: { text: string; label: string }
  coverInputRef: RefObject<HTMLInputElement | null>
  avatarInputRef?: RefObject<HTMLInputElement | null>
  activeLostReport?: any
  onLostReport: () => void
  onMarkFound: () => void
  latestWeight?: string | null
  onMenuOpen?: () => void
  onChangeCoverClick?: () => void
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
}: PetHeroCardProps) {
  const router = useRouter()

  return (
    <div className="relative w-full overflow-hidden" style={{height: '200px'}}>

      {/* KAPAK ALANI */}
      <div className="absolute inset-0">

        {pet.cover_url || pet.avatar_url ? (
          <>
            {/* Blur arka plan */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${
                  pet.cover_url || pet.avatar_url
                })`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px)',
                transform: `scale(${1.2 * (pet.cover_scale || 1)})`,
                transformOrigin: 
                  pet.cover_position === 'top'
                    ? 'center top'
                    : pet.cover_position === 'bottom'
                    ? 'center bottom'
                    : 'center center'
              }}
            />
            
            {/* Koyu overlay */}
            <div className="absolute inset-0 
              bg-gradient-to-t 
              from-black/70 via-black/20 
              to-transparent" />

            {/* NET fotoğraf - ortada */}
            <Image
              src={pet.cover_url || pet.avatar_url}
              alt={pet.name}
              fill
              className={`object-contain ${
                pet.cover_position === 'top'
                  ? 'object-top'
                  : pet.cover_position === 'bottom'
                  ? 'object-bottom'
                  : 'object-center'
              }`}
              style={{
                transform: `scale(${
                  pet.cover_scale || 1
                })`,
                transformOrigin: 
                  pet.cover_position === 'top'
                    ? 'center top'
                    : pet.cover_position === 'bottom'
                    ? 'center bottom'
                    : 'center center'
              }}
              priority
            />
          </>
        ) : (
          <div className="absolute inset-0 
            bg-gradient-to-br 
            from-[#1a6eb5] to-[#2d9cdb]" />
        )}

      </div>

      {/* Üst butonlar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center">
          <ChevronLeft size={18} className="text-white" />
        </button>

        <div className="flex gap-2">
          {/* Kapak fotoğrafı değiştir */}
          <button
            onClick={() => onChangeCoverClick ? onChangeCoverClick() : coverInputRef.current?.click()}
            className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center"
            title="Kapak fotoğrafını değiştir">
            <Camera size={15} className="text-white" />
          </button>
          
          {/* Düzenle */}
          <Link
            href={`/owner/pets/${pet.id}/edit`}
            className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center">
            <Pencil size={15} className="text-white" />
          </Link>

          {/* Menü */}
          <button
            onClick={onMenuOpen}
            className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center">
            <MoreVertical size={15} className="text-white" />
          </button>
        </div>
      </div>

      {/* Alt: Profil foto + isim */}
      <div className="absolute bottom-0 
        left-0 right-0 px-4 pb-0
        flex items-center gap-3 z-10">

        {/* Profil fotoğrafı */}
        <div className="relative flex-shrink-0">
          <div className="w-[64px] h-[64px] 
            rounded-full border-[3px] 
            border-white overflow-hidden 
            bg-white">
            {pet.avatar_url ? (
              <Image
                src={pet.avatar_url}
                alt={pet.name}
                width={64}
                height={64}
                className="object-cover 
                  object-center w-full h-full"
              />
            ) : (
              <div className="w-full h-full 
                flex items-center 
                justify-center text-[28px]">
                {pet.species === 'cat' || 
                 pet.species === 'kedi' 
                 ? '🐱' : '🐶'}
              </div>
            )}
          </div>
        </div>

        {/* İsim sol — bilgiler sağ */}
        <div className="flex items-center 
          gap-3 flex-1">
          
          {/* İsim — büyük sol */}
          <h1 
            className="text-[32px] font-black 
              text-white leading-none flex-shrink-0"
            style={{
              textShadow: 
                '0 1px 4px rgba(0,0,0,0.8)'
            }}>
            {pet.name}
          </h1>

          {/* Dikey çizgi */}
          <div className="w-[1px] h-[48px] 
            bg-white/40 flex-shrink-0" />

          {/* Bilgiler — sağ */}
          <div 
            className="flex flex-col gap-0.5"
            style={{
              textShadow: 
                '0 1px 3px rgba(0,0,0,0.8)'
            }}>
            <p className="text-[11px] 
              text-white font-medium leading-tight">
              {pet.breed || 'Bilinmiyor'} 
              {pet.gender === 'male' 
                ? ' - Erkek' 
                : pet.gender === 'female' 
                ? ' - Dişi' : ''}
            </p>
            <p className="text-[11px] 
              text-white/90 leading-tight">
              {age.text}
            </p>
            <p className="text-[11px] 
              text-white/90 leading-tight">
              {latestWeight && 
               latestWeight !== '-' 
                ? `${latestWeight} Kilo  –  ` : ''}
              {pet.is_neutered 
                ? 'Kısırlaştırıldı' 
                : 'Kısırlaştırılmamış'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
