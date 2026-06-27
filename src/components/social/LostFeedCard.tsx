import Image from 'next/image'
import { getAge, translateSpecies } from '@/lib/utils/petLabels'

export interface LostFeedCardProps {
  report: {
    id: string
    last_seen_location: string
    last_seen_at: string | null
    contact_phone: string | null
    created_at: string | null
    pet_id?: string | null
    status?: string | null
    pet: {
      id: string
      name: string
      species: string
      avatar_url: string | null
      city: string | null
      breed?: string | null
      birth_date?: string | null
    } | null
  }
}

export function LostFeedCard({ report }: { report: any }) {
  const pet = report.pet
  if (!pet) return null

  const ageText = pet.birth_date ? getAge(pet.birth_date) : ''
  const speciesLabel = translateSpecies(pet.species)
  const speciesIcon = pet.species?.toLowerCase() === 'kedi' || pet.species?.toLowerCase() === 'cat' ? '🐱' : '🐶'
  const breedText = pet.breed

  const getUrgencyBadge = () => {
    if (!report.last_seen_at) return null
    const diffMs = Date.now() - new Date(report.last_seen_at).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse">
          🔴 Bugün Kayboldu
        </span>
      )
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-black px-2 py-0.5 rounded-md">
          ⚠️ {diffDays} Gün Önce
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md">
          📅 {diffDays} Gün Önce
        </span>
      )
    }
  }

  const urgencyBadge = getUrgencyBadge()
  const hasPhone = !!report.contact_phone?.trim()

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🚨 Kayıp Pet İlanı - ${pet.name}`,
          text: `🚨 Kayıp Pet İlanı\n\n${pet.name} kaybedildi!\nTür: ${pet.species?.toLowerCase() === 'kedi' || pet.species?.toLowerCase() === 'cat' ? 'Kedi' : 'Köpek'}\nSon Görüldüğü Yer: ${report.last_seen_location}\nİletişim: ${report.contact_phone || 'Belirtilmemiş'}\n\nOdi.Pet üzerinden görüntüle →\nhttps://app.odi.pet/owner/social?tab=lost`,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      alert('Tarayıcınız paylaşım özelliğini desteklemiyor.');
    }
  }

  return (
    <div className="card-base bg-white border border-red-100 p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden group rounded-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full opacity-50 -z-10 transition-transform group-hover:scale-110" />

      <div className="flex gap-4 items-center">
        {pet.avatar_url ? (
          <div className="relative w-[60px] h-[60px] rounded-2xl overflow-hidden shadow-sm shrink-0">
            <Image
              src={pet.avatar_url}
              alt={pet.name || 'Pet'}
              fill
              className="object-cover"
              sizes="60px"
            />
          </div>
        ) : (
          <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-tr from-red-100 to-rose-50 flex items-center justify-center shadow-sm shrink-0">
            <span className="text-2xl">{speciesIcon}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <h3 className="font-black text-text-primary text-[17px] truncate">{pet.name}</h3>
            {urgencyBadge}
          </div>
          
          <p className="text-[13px] text-text-secondary font-medium truncate flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-100 text-[10px]">
              {speciesIcon === '🐱' ? '🐈' : '🐕'}
            </span>
            {speciesLabel} {breedText ? ` • ${breedText}` : ''} {ageText ? ` • ${ageText}` : ''}
          </p>
        </div>
      </div>

      <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100/50 flex flex-col gap-2">
        <p className="text-[13px] text-text-primary">
          <span className="font-bold text-red-600">📍 Son Görülme:</span> {report.last_seen_location}
        </p>
        {report.last_seen_at && (
          <p className="text-[12px] text-text-secondary">
            <span className="font-bold">🕒 Zaman:</span> {new Date(report.last_seen_at).toLocaleString('tr-TR')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-1 pt-4 border-t border-border-main/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-secondary font-medium">
            {pet.city || 'Şehir bilinmiyor'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[13px] transition-all active:scale-95 shrink-0"
            title="İlanı Paylaş"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          
          {hasPhone ? (
            <a
              href={`tel:${report.contact_phone}`}
              className="btn-primary flex-1 justify-center py-2.5 px-4 text-[13px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm shadow-red-600/20 active:scale-95 transition-all"
            >
              İletişime Geç →
            </a>
          ) : (
            <button
              disabled
              className="btn-primary flex-1 justify-center py-2.5 px-4 text-[13px] font-bold bg-slate-100 border border-slate-200 text-slate-400 rounded-xl cursor-not-allowed shadow-none"
            >
              İletişim Yok
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
