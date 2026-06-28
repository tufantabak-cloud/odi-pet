'use client'

import Link from 'next/link'
import Image from 'next/image'
import FloatingSOS from '@/components/FloatingSOS'
import { RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, MoreVertical } from 'lucide-react'

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
  const router = useRouter()

  return (
    <div className="relative flex flex-col w-full bg-white rounded-b-3xl shadow-sm border-b border-border-main overflow-hidden">
      <div className="relative h-[220px] w-full overflow-hidden">
        
        {/* Kapak fotoğrafı */}
        {pet.avatar_url ? (
          <Image
            src={pet.avatar_url}
            alt={pet.name}
            fill
            className="object-cover object-center"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-primary/80 to-primary flex items-center justify-center">
            <span className="text-[80px]">
              {pet.species === 'cat' || pet.species === 'kedi' ? '🐱' : '🐶'}
            </span>
          </div>
        )}

        {/* Koyu gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Üst butonlar */}
        <div className="absolute top-safe top-3 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center">
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="flex gap-2">
            <Link 
              href={`/owner/pets/${pet.id}/edit`}
              className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center">
              <Pencil size={15} className="text-white" />
            </Link>
            <button className="w-8 h-8 rounded-full bg-black/35 flex items-center justify-center">
              <MoreVertical size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* Alt bilgi overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10">
          <h1 className="text-[22px] font-black text-white">
            {pet.name}
          </h1>
          <p className="text-[11px] text-white/75 mt-0.5">
            {pet.breed || 'Bilinmiyor'} · {pet.gender === 'male' ? 'Erkek' : pet.gender === 'female' ? 'Dişi' : 'Bilinmiyor'} · {age.text}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {/* Mevcut badge'ler */}
            {pet.breed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10">
                🐾 {pet.breed}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/80 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10">
              🎂 {age.text}
            </span>
            {pet.gender && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10">
                {pet.gender === 'male' ? '♂ Erkek' : pet.gender === 'female' ? '♀ Dişi' : '—'}
              </span>
            )}
            {pet.is_neutered != null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10">
                {pet.is_neutered ? '✂️ Kısır' : '🌿 Kısırlaştırılmamış'}
              </span>
            )}
            {latestWeight && latestWeight !== '-' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10">
                ⚖️ {latestWeight} kg
              </span>
            )}
            {pet.microchip_no && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm border border-white/10">
                📡 Çipli
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
