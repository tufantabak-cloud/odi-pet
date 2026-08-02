import Image from 'next/image'
import { useState } from 'react'
import { PetSelectorModal } from './PetSelectorModal'
import { Heart, Sparkles, Calendar, MapPin, Check, ChevronRight } from 'lucide-react'

export function BreedingFeedCard({ listing, userApplications = [] }: { listing: any, userApplications?: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { pets: pet, title, notes, requirements, preferred_date_start, preferred_date_end, created_at, photo_url, experience_level, distance_km } = listing

  const getAge = (birthDate: string) => {
    const ageInMs = Date.now() - new Date(birthDate).getTime()
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12)
      return `${months} aylık`
    }
    return `${Math.floor(ageInYears)} yaşında`
  }

  const ageText = pet.birth_date ? getAge(pet.birth_date) : ''

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return null
    if (start && end) {
      return `${new Date(start).toLocaleDateString('tr-TR')} - ${new Date(end).toLocaleDateString('tr-TR')}`
    }
    return start ? `${new Date(start).toLocaleDateString('tr-TR')} sonrası` : `${new Date(end!).toLocaleDateString('tr-TR')} öncesi`
  }

  const dateRange = formatDateRange(preferred_date_start, preferred_date_end)

  const getExperienceBadge = (level: string) => {
    switch(level) {
      case 'experienced': return { label: 'Deneyimli', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'expert': return { label: 'Çok Deneyimli', color: 'bg-violet-50 text-violet-700 border-violet-200' }
      case 'beginner':
      default: return { label: 'İlk Deneyim', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    }
  }
  const exp = getExperienceBadge(experience_level)
  const displayPhoto = photo_url || pet.avatar_url

  const hasApplied = userApplications.some(app => app.listing?.id === listing.id)

  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-5 flex flex-col gap-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden transition-all hover:shadow-md group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-100/60 to-transparent rounded-bl-full opacity-60 -z-10 transition-transform group-hover:scale-110" />

      <div className="flex gap-4 items-center">
        {displayPhoto ? (
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0">
            <Image
              src={displayPhoto}
              alt={pet.name || 'Pet Avatar'}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-50 flex items-center justify-center text-pink-600 shadow-sm shrink-0">
            <Heart className="w-7 h-7 stroke-[1.75]" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <h3 className="font-bold text-slate-900 text-lg truncate">{pet.name}</h3>
            {pet.gender === 'male' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">♂ Erkek</span>}
            {pet.gender === 'female' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 shrink-0">♀ Dişi</span>}
            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-lg border ${exp.color} shrink-0 flex items-center gap-1`}>
              <Sparkles className="w-3 h-3 stroke-[2]" /> {exp.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
            <span>{pet.species}</span>
            {pet.breed && <span>• {pet.breed}</span>}
            {ageText && <span>• {ageText}</span>}
            {pet.city && (
              <span className="inline-flex items-center gap-0.5">
                • <MapPin className="w-3 h-3 stroke-[2]" /> {pet.city}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-rose-50/70 rounded-2xl p-3.5 border border-rose-100/60">
        <h4 className="font-bold text-sm text-rose-950 mb-1">{title}</h4>
        {notes && (
          <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
            {notes}
          </p>
        )}
        {dateRange && (
          <p className="text-xs text-rose-700 font-medium mt-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 stroke-[2]" /> Tercih: {dateRange}
          </p>
        )}
      </div>

      {requirements && requirements.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-0.5">
          {requirements.map((req: string, i: number) => (
            <span key={i} className="px-2.5 py-1 bg-pink-50 text-pink-700 text-xs font-semibold rounded-lg border border-pink-100/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              {req}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-1 pt-3.5 border-t border-slate-100">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-400 font-normal flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 stroke-[2]" />
            {new Date(created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} eklendi
          </span>
          {distance_km !== undefined && (
            <span className="text-2xs text-slate-400 flex items-center gap-1 font-medium">
              <MapPin className="w-3 h-3 stroke-[2]" /> ~{Math.round(distance_km)} km uzakta
            </span>
          )}
        </div>
        {hasApplied ? (
          <button disabled className="inline-flex items-center justify-center gap-1 bg-slate-100 text-slate-500 font-semibold text-xs py-2 px-4 rounded-2xl cursor-not-allowed border border-slate-200">
            <Check className="w-4 h-4 stroke-[2.5]" />
            Başvuruldu
          </button>
        ) : (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="inline-flex items-center justify-center gap-1 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs py-2 px-4 rounded-2xl active:scale-[0.98] transition-all shadow-sm shadow-pink-500/20"
          >
            Eşleşme İste <ChevronRight className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </div>

      <PetSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        listingId={listing.id}
        listingSpecies={pet.species}
        listingGender={pet.gender}
      />
    </div>
  )
}

