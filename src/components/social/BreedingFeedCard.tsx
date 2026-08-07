import React, { useState } from 'react'
import Image from 'next/image'
import { PetSelectorModal } from './PetSelectorModal'
import { Heart, Sparkles, MapPin, Check, ChevronRight } from 'lucide-react'
import { getSpeciesLabel } from '@/lib/species'

export function BreedingFeedCard({ listing, userApplications = [] }: { listing: any, userApplications?: any[] }) {
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

  const getExperienceBadge = (level: string) => {
    switch(level) {
      case 'experienced': return { label: 'Deneyimli', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'expert': return { label: 'Çok Deneyimli', color: 'bg-violet-50 text-violet-700 border-violet-200' }
      case 'beginner':
      default: return { label: 'İlk Deneyim', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    }
  }
  const exp = getExperienceBadge(experience_level)

  return (
    <>
      <div className="rounded-3xl bg-white border border-slate-100 p-3 flex gap-3.5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden transition-all hover:shadow-md group items-center">
        
        {/* Left: Square Image */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-pink-50 shrink-0 overflow-hidden">
          {displayPhoto ? (
            <Image
              src={displayPhoto}
              alt={pet.name || 'Pet'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="112px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-pink-300">
              <Heart className="w-8 h-8 stroke-[1.5]" />
            </div>
          )}

          <div className="absolute top-2 left-2">
            {pet.gender === 'male' && <span className="px-1.5 py-0.5 rounded-md bg-blue-600/90 text-white text-2xs font-extrabold shadow-sm">♂ Erkek</span>}
            {pet.gender === 'female' && <span className="px-1.5 py-0.5 rounded-md bg-pink-600/90 text-white text-2xs font-extrabold shadow-sm">♀ Dişi</span>}
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
          <div>
            {/* Top row: Name & Experience */}
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-extrabold text-base text-slate-900 truncate">{pet.name}</h3>
              <span className={`px-2 py-0.5 rounded-lg text-2xs font-semibold border shrink-0 ${exp.color}`}>
                {exp.label}
              </span>
            </div>

            {/* Subtitle */}
            <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
              {[speciesLabel, pet.breed, ageText].filter(Boolean).join(' • ')}
            </p>

            {/* Location */}
            {pet.city && (
              <p className="text-2xs text-slate-600 font-medium flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-pink-500 stroke-[2] shrink-0" />
                <span className="truncate">{pet.city}</span>
              </p>
            )}
          </div>

          {/* Bottom row: CTA Button */}
          <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-slate-50">
            {hasApplied ? (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                <Check className="w-3 h-3 stroke-[2.5]" /> Başvuruldu
              </span>
            ) : (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl active:scale-[0.98] transition-all shadow-sm shadow-pink-600/20 shrink-0 flex items-center gap-1"
              >
                Başvuru Yap <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            )}
          </div>
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
