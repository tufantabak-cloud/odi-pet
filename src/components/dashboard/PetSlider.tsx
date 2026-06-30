'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Pet = {
  id: string
  name: string
  avatar_url?: string | null
  overdueCount: number
  weightVal?: string | null
}

export function PetSlider({ pets, onActiveChange }: { pets: Pet[], onActiveChange?: (petId: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (pets[activeIndex]) {
      onActiveChange?.(pets[activeIndex].id)
    }
  }, [activeIndex, pets, onActiveChange])

  const bgColors = [
    'linear-gradient(160deg,#c7bef7,#5D3FD3)',
    'linear-gradient(160deg,#ffc5c5,#FF6B6B)',
    'linear-gradient(160deg,#a8ede9,#4ECDC4)'
  ]
  const iconColors = ['#5D3FD3', '#FF6B6B', '#4ECDC4']
  const petCount = pets.length

  const cardWidth = petCount === 1 ? 200 : petCount === 2 ? 155 : 120
  const containerH = petCount === 1 ? 240 : petCount === 2 ? 240 : 250

  return (
    <div className="flex flex-col gap-2">
      {/* Kart slider */}
      <div
        className={`relative flex items-end gap-0 pb-2 px-4 ${
          petCount >= 3
            ? 'overflow-x-auto scrollbar-none'
            : 'justify-center overflow-hidden'
        }`}
        style={{ height: `${containerH}px` }}
      >
        {petCount >= 3 && (
          <div className="pointer-events-none absolute top-0 right-0 
                          h-full w-10 z-20 bg-gradient-to-r 
                          from-transparent to-bg-main" />
        )}

        {pets.map((pet, index) => {
          const isActive = index === activeIndex
          const bg = bgColors[index % 3]
          const iconColor = iconColors[index % 3]
          const activeH = petCount === 1 ? 220 : petCount === 2 ? 220 : 205
          const sideH = petCount === 2 ? 185 : 172
          const photoActiveH = petCount === 1 ? 170 : petCount === 2 ? 172 : 160
          const photoSideH = petCount === 2 ? 142 : 130

          return (
            <div
              key={pet.id}
              className="relative flex-shrink-0 flex flex-col cursor-pointer transition-all duration-200"
              style={{
                width: `${cardWidth}px`,
                marginRight: index < pets.length - 1 ? '-28px' : '0',
                zIndex: isActive ? 10 : 3
              }}
              onClick={() => setActiveIndex(index)}
            >
              {/* FOTOĞRAF — overlap olabilir */}
              <div
                className="relative overflow-hidden rounded-t-[20px] border-[3px] border-b-0 flex items-center justify-center flex-shrink-0"
                style={{
                  height: isActive ? `${photoActiveH}px` : `${photoSideH}px`,
                  background: bg,
                  borderColor: isActive ? 'var(--color-primary)' : 'transparent'
                }}
              >
                {pet.avatar_url ? (
                  <Image
                    src={pet.avatar_url}
                    alt={pet.name}
                    fill
                    sizes={`${cardWidth}px`}
                    className="object-cover object-center"
                  />
                ) : (
                  <span className="block w-full text-center text-[68px] 
                                   font-black text-white/35 mt-3 leading-none">
                    {(pet.name || '?').charAt(0)}
                  </span>
                )}

                {/* İsim overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 z-10"
                     style={{
                       background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 45%)',
                       paddingTop: '40%'
                     }}>
                  <span className={`font-black text-white ${isActive ? 'text-[14px]' : 'text-[12px]'}`}>{pet.name}</span>
                </div>

                {/* Overdue badge */}
                {pet.overdueCount > 0 && (
                  <div className="absolute top-[10px] left-[10px] w-[22px] h-[22px] 
                                  rounded-full bg-[var(--color-danger)] border-2 border-white
                                  flex items-center justify-center 
                                  text-white text-[10px] font-black z-20">
                    {pet.overdueCount}
                  </div>
                )}
              </div>

              {/* BİLGİ ALANI — kendi z-index'i ile net, overlap'ten etkilenmesin */}
              {isActive ? (
                <Link
                  href={`/owner/pets/${pet.id}`}
                  className="relative bg-white rounded-b-[20px] border-[3px] border-t-0 flex flex-col gap-[5px] px-2.5 py-2 flex-1"
                  style={{
                    borderColor: 'var(--color-primary)',
                    borderTop: '2px solid var(--color-primary)',
                    zIndex: 20
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Satır 1: durum + ikon */}
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-[9px] font-600 text-[var(--color-text-muted)] 
                                     flex-1 leading-tight truncate">
                      {pet.overdueCount > 0
                        ? 'Aşı zamanı'
                        : pet.weightVal
                        ? `${pet.weightVal} kg`
                        : 'Sağlıklı ve Mutlu'}
                    </span>
                    <div
                      className="w-[18px] h-[18px] rounded-full flex items-center 
                                 justify-center flex-shrink-0"
                      style={{
                        background: pet.overdueCount > 0 ? 'var(--color-danger)' : iconColor
                      }}
                    >
                      <i className={`text-white text-[9px] 
                        ${pet.overdueCount > 0 
                          ? 'ti ti-alert-circle' 
                          : 'ti ti-heart'}`} />
                    </div>
                  </div>

                  {/* Satır 2: Profili Gör — SADECE aktif kartta */}
                  <div className="flex items-center justify-center gap-[3px] 
                                  pt-1 border-t border-[#f4f3fa] w-full">
                    <span className="text-[9px] font-700" 
                          style={{color: 'var(--color-primary)'}}>
                      Profili Gör
                    </span>
                    <i className="ti ti-chevron-right" 
                       style={{fontSize: '10px', color: 'var(--color-primary)'}} />
                  </div>
                </Link>
              ) : (
                <div
                  className="relative bg-white rounded-b-[20px] border-[3px] border-t-0 flex flex-col gap-[5px] px-2.5 py-2 flex-1"
                  style={{
                    borderColor: 'transparent',
                    zIndex: 20
                  }}
                >
                  {/* Satır 1: durum + ikon */}
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-[9px] font-600 text-[var(--color-text-muted)] 
                                     flex-1 leading-tight truncate">
                      {pet.overdueCount > 0
                        ? 'Aşı zamanı'
                        : pet.weightVal
                        ? `${pet.weightVal} kg`
                        : 'Sağlıklı ve Mutlu'}
                    </span>
                    <div
                      className="w-[18px] h-[18px] rounded-full flex items-center 
                                 justify-center flex-shrink-0"
                      style={{
                        background: pet.overdueCount > 0 ? 'var(--color-danger)' : iconColor
                      }}
                    >
                      <i className={`text-white text-[9px] 
                        ${pet.overdueCount > 0 
                          ? 'ti ti-alert-circle' 
                          : 'ti ti-heart'}`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dot göstergesi */}
      {pets.length > 1 && (
        <div className="flex gap-[5px] justify-center">
          {pets.map((_, i) => (
            <div
              key={i}
              className="h-[6px] rounded-full transition-all duration-200 
                         cursor-pointer"
              style={{
                width: i === activeIndex ? '20px' : '6px',
                background: i === activeIndex ? 'var(--color-primary)' : '#e2e2e9'
              }}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
