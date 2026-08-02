import Image from 'next/image'
import { getAge, translateSpecies } from '@/lib/utils/petLabels'
import { AlertTriangle, Clock, MapPin, Share2, Phone, Calendar } from 'lucide-react'

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
  const breedText = pet.breed

  const getUrgencyBadge = () => {
    if (!report.last_seen_at) return null
    const diffMs = Date.now() - new Date(report.last_seen_at).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold px-2.5 py-1 rounded-lg animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 stroke-[2]" /> Bugün Kayboldu
        </span>
      )
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 stroke-[2]" /> {diffDays} Gün Önce
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5 stroke-[2]" /> {diffDays} Gün Önce
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
    <div className="rounded-3xl bg-white border border-rose-100/80 p-5 flex flex-col gap-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-100/60 to-transparent rounded-bl-full opacity-60 -z-10 transition-transform group-hover:scale-110" />

      <div className="flex gap-4 items-center">
        {pet.avatar_url ? (
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0">
            <Image
              src={pet.avatar_url}
              alt={pet.name || 'Pet'}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-100 to-red-50 text-rose-600 flex items-center justify-center shadow-sm shrink-0">
            <AlertTriangle className="w-7 h-7 stroke-[1.75]" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-slate-900 text-lg truncate">{pet.name}</h3>
            {urgencyBadge}
          </div>
          
          <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
            <span>{speciesLabel}</span>
            {breedText && <span>• {breedText}</span>}
            {ageText && <span>• {ageText}</span>}
          </p>
        </div>
      </div>

      <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100/60 flex flex-col gap-1.5">
        <p className="text-xs text-slate-800 flex items-center gap-1.5 font-medium">
          <MapPin className="w-4 h-4 text-rose-600 shrink-0 stroke-[2]" />
          <span className="font-semibold text-rose-950">Son Görülme:</span> {report.last_seen_location}
        </p>
        {report.last_seen_at && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5 font-normal">
            <Clock className="w-4 h-4 text-slate-400 shrink-0 stroke-[2]" />
            <span className="font-medium text-slate-700">Zaman:</span> {new Date(report.last_seen_at).toLocaleString('tr-TR')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-1 pt-3.5 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
            {pet.city || 'Şehir belirtilmemiş'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-xs transition-all active:scale-[0.98] shrink-0"
            title="İlanı Paylaş"
          >
            <Share2 className="w-4 h-4 stroke-[2]" />
          </button>
          
          {hasPhone ? (
            <a
              href={`tel:${report.contact_phone}`}
              className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-sm shadow-rose-600/20 active:scale-[0.98] transition-all"
            >
              <Phone className="w-4 h-4 stroke-[2]" />
              İletişime Geç
            </a>
          ) : (
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-4 text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl cursor-not-allowed"
            >
              İletişim Yok
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

