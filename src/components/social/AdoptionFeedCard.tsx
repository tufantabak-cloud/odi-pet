import Image from 'next/image'
import Link from 'next/link'

export function AdoptionFeedCard({ adoption }: { adoption: any }) {
  const { pet, story, requirements, created_at } = adoption

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

  return (
    <div className="card-base bg-white border border-border-main p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md group rounded-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-100 to-transparent rounded-bl-full opacity-50 -z-10 transition-transform group-hover:scale-110" />

      <div className="flex gap-4 items-center">
        {pet.avatar_url ? (
          <div className="relative w-[60px] h-[60px] rounded-2xl overflow-hidden shadow-sm shrink-0">
            <Image
              src={pet.avatar_url}
              alt={pet.name || 'Pet Avatar'}
              fill
              className="object-cover"
              sizes="60px"
            />
          </div>
        ) : (
          <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-tr from-violet-100 to-indigo-50 flex items-center justify-center shadow-sm shrink-0">
            <span className="text-2xl">{pet.species === 'Kedi' ? '🐱' : '🐶'}</span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-text-primary text-[17px] truncate">{pet.name}</h3>
          <p className="text-[13px] text-text-secondary font-medium truncate flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-100 text-[10px]">
              {pet.species === 'Kedi' ? '🐈' : '🐕'}
            </span>
            {pet.breed || pet.species} {ageText ? ` • ${ageText}` : ''} {pet.city ? ` • 📍 ${pet.city}` : ''}
          </p>
        </div>
      </div>

      {story && (
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100/50">
          <p className="text-[13px] text-text-primary leading-relaxed italic">
            "{story}"
          </p>
        </div>
      )}

      {requirements && requirements.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {requirements.map((req: string, i: number) => (
            <span key={i} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[11px] font-bold rounded-lg border border-violet-100/50 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-violet-400" />
              {req}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-1 pt-4 border-t border-border-main/50">
        <span className="text-[11px] text-text-secondary font-medium">
          {new Date(created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} eklendi
        </span>
        <button className="btn-primary py-2 px-4 text-[13px] font-bold bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm shadow-violet-600/20 active:scale-95 transition-all">
          Sahiplenmek İstiyorum
        </button>
      </div>
    </div>
  )
}
