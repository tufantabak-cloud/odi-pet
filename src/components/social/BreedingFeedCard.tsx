import Image from 'next/image'
import { useState } from 'react'
import { PetSelectorModal } from './PetSelectorModal'

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
      case 'experienced': return { icon: '⭐', label: 'Deneyimli', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'expert': return { icon: '🏆', label: 'Çok Deneyimli', color: 'bg-violet-50 text-violet-700 border-violet-200' }
      case 'beginner':
      default: return { icon: '🌱', label: 'İlk Deneyim', color: 'bg-green-50 text-green-700 border-green-200' }
    }
  }
  const exp = getExperienceBadge(experience_level)
  const displayPhoto = photo_url || pet.avatar_url

  const hasApplied = userApplications.some(app => app.listing?.id === listing.id)

  return (
    <div className="card-base bg-white border border-border-main p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md group rounded-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-100 to-transparent rounded-bl-full opacity-50 -z-10 transition-transform group-hover:scale-110" />

      <div className="flex gap-4 items-center">
        {displayPhoto ? (
          <div className="relative w-[60px] h-[60px] rounded-2xl overflow-hidden shadow-sm shrink-0">
            <Image
              src={displayPhoto}
              alt={pet.name || 'Pet Avatar'}
              fill
              className="object-cover"
              sizes="60px"
            />
          </div>
        ) : (
          <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-50 flex items-center justify-center shadow-sm shrink-0">
            <span className="text-2xl">❤️</span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <h3 className="font-black text-text-primary text-[17px] truncate">{pet.name}</h3>
            {pet.gender === 'male' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">♂ Erkek</span>}
            {pet.gender === 'female' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100 shrink-0">♀ Dişi</span>}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${exp.color} shrink-0 flex items-center gap-1`}><span>{exp.icon}</span> {exp.label}</span>
          </div>
          <p className="text-[13px] text-text-secondary font-medium truncate flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-100 text-[10px]">
              {pet.species === 'Kedi' ? '🐱' : pet.species === 'Köpek' ? '🐶' : '🐾'}
            </span>
            {pet.species} {pet.breed ? ` • ${pet.breed}` : ''} {ageText ? ` • ${ageText}` : ''} {pet.city ? ` • ${pet.city}` : ''}
          </p>
        </div>
      </div>

      <div className="bg-rose-50/80 rounded-xl p-3.5 border border-rose-100/50">
        <h4 className="font-bold text-[14px] text-rose-900 mb-1">{title}</h4>
        {notes && (
          <p className="text-[13px] text-text-primary leading-relaxed line-clamp-2">
            {notes}
          </p>
        )}
        {dateRange && (
          <p className="text-[12px] text-rose-700 font-medium mt-2 flex items-center gap-1">
            🗓️ Tercih: {dateRange}
          </p>
        )}
      </div>

      {requirements && requirements.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {requirements.map((req: string, i: number) => (
            <span key={i} className="px-2.5 py-1 bg-pink-50 text-pink-700 text-[11px] font-bold rounded-lg border border-pink-100/50 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-pink-400" />
              {req}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-1 pt-4 border-t border-border-main/50">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-text-secondary font-medium">
            {new Date(created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} eklendi
          </span>
          {distance_km !== undefined && (
            <span className="text-[10px] text-text-muted flex items-center gap-0.5 font-bold">
              📍 ~{Math.round(distance_km)} km uzakta
            </span>
          )}
        </div>
        {hasApplied ? (
          <button disabled className="btn-primary py-2 px-4 text-[13px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed shadow-none">
            ✓ Başvuruldu
          </button>
        ) : (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary py-2 px-4 text-[13px] font-bold bg-pink-500 hover:bg-pink-600 rounded-xl shadow-sm shadow-pink-500/20 active:scale-95 transition-all">
            Eşleşme İste →
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
