import React, { useState } from 'react'
import Image from 'next/image'
import { Heart, Sparkles, MapPin, Check, ChevronRight } from 'lucide-react'
import { PetSelectorModal } from './PetSelectorModal'
import { getSpeciesLabel } from '@/lib/species'

export function BreedingFeaturedCard({ listing, userApplications = [] }: { listing: any, userApplications?: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { pets: pet, title, notes, photo_url, experience_level } = listing

  if (!pet) return null

  const getAge = (birthDate: string) => {
    const ageInMs = Date.now() - new Date(birthDate).getTime()
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12)
      return `${months} Aylık`
    }
    return `${Math.floor(ageInYears)} Yaşında`
  }

  const ageText = pet.birth_date ? getAge(pet.birth_date) : ''
  const speciesLabel = getSpeciesLabel(pet.species)
  const displayPhoto = photo_url || pet.avatar_url
  const hasApplied = userApplications.some(app => app.listing?.id === listing.id)

  const genderText = pet.gender === 'male' ? '♂ Erkek' : pet.gender === 'female' ? '♀ Dişi' : ''

  return (
    <>
      <div 
        onClick={() => !hasApplied && setIsModalOpen(true)}
        className="relative w-[220px] xs:w-[240px] sm:w-[260px] aspect-[3/4] rounded-3xl overflow-hidden shrink-0 group border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        {/* Background Image */}
        {displayPhoto ? (
          <Image
            src={displayPhoto}
            alt={pet.name || 'Pet'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="260px"
          />
        ) : (
          <div className="w-full h-full bg-pink-50 flex items-center justify-center text-pink-300">
            <Heart className="w-12 h-12 stroke-[1.5]" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Top Header: Badge & Gender */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <span className="bg-pink-600/90 backdrop-blur-md text-white text-2xs font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3 stroke-[2.5]" /> Öne Çıkan
          </span>
          {genderText && (
            <span className={`text-2xs font-bold px-2 py-0.5 rounded-xl backdrop-blur-md text-white border border-white/20 ${
              pet.gender === 'male' ? 'bg-blue-600/80' : 'bg-pink-600/80'
            }`}>
              {genderText}
            </span>
          )}
        </div>

        {/* Bottom Content Info */}
        <div className="absolute bottom-3 left-3 right-3 text-white z-10 flex flex-col gap-1.5">
          <div>
            <h3 className="font-extrabold text-xl leading-tight drop-shadow-sm">{pet.name}</h3>
            <p className="text-xs text-white/90 font-medium truncate drop-shadow-sm">
              {[speciesLabel, pet.breed, ageText].filter(Boolean).join(' • ')}
            </p>
          </div>

          {pet.city && (
            <p className="text-2xs text-white/80 font-normal flex items-center gap-1">
              <MapPin className="w-3 h-3 text-pink-400 stroke-[2] shrink-0" />
              <span className="truncate">{pet.city}</span>
            </p>
          )}

          {hasApplied ? (
            <span className="w-full text-center py-2 bg-white/20 backdrop-blur-md text-white/80 font-semibold text-2xs rounded-xl flex items-center justify-center gap-1 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Başvuruldu
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsModalOpen(true)
              }}
              className="w-full text-center py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1 mt-0.5"
            >
              Başvuru Yap <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      <PetSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        listingId={listing.id}
        listingSpecies={pet.species}
        listingGender={pet.gender}
      />
    </>
  )
}
