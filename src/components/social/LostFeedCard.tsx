import React from 'react'
import Image from 'next/image'
import { getAge, translateSpecies } from '@/lib/utils/petLabels'
import { AlertTriangle, Clock, MapPin, Share2, Phone } from 'lucide-react'

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
  const hasPhone = !!report.contact_phone?.trim()

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🚨 Kayıp Pet İlanı - ${pet.name}`,
          text: `🚨 Kayıp Pet İlanı\n\n${pet.name} kayboldu!\nTür: ${speciesLabel}\nSon Görüldüğü Yer: ${report.last_seen_location}\nİletişim: ${report.contact_phone || 'Belirtilmemiş'}\n\nOdi.Pet üzerinden görüntüle →\nhttps://app.odi.pet/owner/social?tab=lost`,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      alert('Tarayıcınız paylaşım özelliğini desteklemiyor.');
    }
  }

  const getUrgencyBadge = () => {
    if (!report.last_seen_at) return null
    const diffMs = Date.now() - new Date(report.last_seen_at).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-2xs font-bold animate-pulse">
          Bugün
        </span>
      )
    } else if (diffDays <= 3) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-2xs font-semibold">
          {diffDays} Gün Önce
        </span>
      )
    }
    return null
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-3 flex gap-3.5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden transition-all hover:shadow-md group items-center">
      
      {/* Left: Square Image */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-rose-50 shrink-0 overflow-hidden">
        {pet.avatar_url ? (
          <Image
            src={pet.avatar_url}
            alt={pet.name || 'Pet'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="112px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-rose-300">
            <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
          </div>
        )}

        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-lg bg-rose-600/90 text-white text-2xs font-extrabold shadow-sm">
            Kayıp
          </span>
        </div>
      </div>

      {/* Right: Details & Actions */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
        <div>
          {/* Top row: Name & Share */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-extrabold text-base text-slate-900 truncate">{pet.name}</h3>
              {getUrgencyBadge()}
            </div>
            <button 
              type="button"
              onClick={handleShare}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <Share2 className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
            {[speciesLabel, breedText, ageText].filter(Boolean).join(' • ')}
          </p>

          {/* Location */}
          <p className="text-2xs text-slate-600 font-medium flex items-center gap-1 mt-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-rose-500 stroke-[2] shrink-0" />
            <span className="truncate">{report.last_seen_location}</span>
          </p>
        </div>

        {/* Bottom row: Phone Action */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-50">
          {report.last_seen_at && (
            <span className="text-2xs text-slate-400 font-normal flex items-center gap-1">
              <Clock className="w-3 h-3 stroke-[2]" />
              {new Date(report.last_seen_at).toLocaleDateString('tr-TR')}
            </span>
          )}

          {hasPhone ? (
            <a
              href={`tel:${report.contact_phone}`}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl active:scale-[0.98] transition-all shadow-sm shadow-rose-600/20 shrink-0 flex items-center gap-1 ml-auto"
            >
              <Phone className="w-3.5 h-3.5 stroke-[2]" /> Ara
            </a>
          ) : (
            <span className="text-2xs font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded-lg ml-auto">
              İletişim Yok
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
