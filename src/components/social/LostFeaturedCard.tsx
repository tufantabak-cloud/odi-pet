import React, { useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, Clock, MapPin, Share2, Phone } from 'lucide-react'
import { translateSpecies, getAge } from '@/lib/utils/petLabels'

export function LostFeaturedCard({ report }: { report: any }) {
  const pet = report.pet
  if (!pet) return null

  const ageText = pet.birth_date ? getAge(pet.birth_date) : ''
  const speciesLabel = translateSpecies(pet.species)
  const hasPhone = !!report.contact_phone?.trim()

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🚨 Acil Kayıp İlanı - ${pet.name}`,
          text: `🚨 Acil Kayıp İlanı\n\n${pet.name} kayboldu!\nTür: ${speciesLabel}\nSon Görüldüğü Yer: ${report.last_seen_location}\nİletişim: ${report.contact_phone || 'Belirtilmemiş'}\n\nOdi.Pet üzerinden detayları gör →\nhttps://app.odi.pet/owner/social?tab=lost`,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      alert('Tarayıcınız paylaşım özelliğini desteklemiyor.');
    }
  }

  return (
    <div className="relative w-[220px] sm:w-[260px] aspect-[3/4] rounded-3xl overflow-hidden shrink-0 group border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all hover:scale-[1.02] active:scale-[0.98]">
      {/* Background Image */}
      {pet.avatar_url ? (
        <Image
          src={pet.avatar_url}
          alt={pet.name || 'Pet'}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="260px"
        />
      ) : (
        <div className="w-full h-full bg-rose-50 flex items-center justify-center text-rose-300">
          <AlertTriangle className="w-12 h-12 stroke-[1.5]" />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Top Header: Badge & Share */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
        <span className="bg-rose-600/90 backdrop-blur-md text-white text-2xs font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 animate-pulse">
          <AlertTriangle className="w-3 h-3 stroke-[2.5]" /> Acil Kayıp
        </span>
        <button 
          type="button"
          onClick={handleShare}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <Share2 className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Bottom Content Info */}
      <div className="absolute bottom-3 left-3 right-3 text-white z-10 flex flex-col gap-1.5">
        <div>
          <h3 className="font-extrabold text-xl leading-tight drop-shadow-sm">{pet.name}</h3>
          <p className="text-xs text-white/90 font-medium truncate drop-shadow-sm">
            {[speciesLabel, pet.breed, ageText].filter(Boolean).join(' • ')}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/15 flex flex-col gap-0.5 text-2xs text-white/90">
          <p className="font-medium flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-rose-400 stroke-[2] shrink-0" />
            <span className="truncate">{report.last_seen_location}</span>
          </p>
          {report.last_seen_at && (
            <p className="text-white/70 font-normal flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/60 stroke-[2] shrink-0" />
              <span>{new Date(report.last_seen_at).toLocaleDateString('tr-TR')}</span>
            </p>
          )}
        </div>

        {hasPhone ? (
          <a
            href={`tel:${report.contact_phone}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-center py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mt-0.5"
          >
            <Phone className="w-3.5 h-3.5 stroke-[2.5]" /> Ara
          </a>
        ) : (
          <span className="w-full text-center py-2 bg-white/20 backdrop-blur-md text-white/80 font-semibold text-2xs rounded-xl text-center block">
            İletişim Belirtilmemiş
          </span>
        )}
      </div>
    </div>
  )
}
