'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Ensure cardRefs array size matches pets length
  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, pets.length)
  }, [pets])

  // Center active card smoothly inside container
  const centerActiveCard = useCallback((index: number, smooth = true) => {
    const container = containerRef.current
    const card = cardRefs.current[index]
    if (container && card) {
      const containerWidth = container.clientWidth
      const cardOffsetLeft = card.offsetLeft
      const cardWidth = card.clientWidth

      // Target scroll position to place card in exact horizontal center
      const targetScrollLeft = cardOffsetLeft - (containerWidth / 2) + (cardWidth / 2)

      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  }, [])

  // Selected pet callback & auto-centering
  useEffect(() => {
    if (pets[activeIndex]) {
      onActiveChange?.(pets[activeIndex].id)
    }
    const timer = setTimeout(() => {
      centerActiveCard(activeIndex, true)
    }, 50)
    return () => clearTimeout(timer)
  }, [activeIndex, pets, onActiveChange, centerActiveCard])

  // Dynamic scroll state check for side gradients
  const checkScrollState = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollLeft, scrollWidth, clientWidth } = container
    setCanScrollLeft(scrollLeft > 8)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    checkScrollState()
    container.addEventListener('scroll', checkScrollState, { passive: true })
    window.addEventListener('resize', checkScrollState, { passive: true })
    return () => {
      container.removeEventListener('scroll', checkScrollState)
      window.removeEventListener('resize', checkScrollState)
    }
  }, [checkScrollState, pets])

  const bgColors = [
    'linear-gradient(160deg,#c7bef7,#5D3FD3)',
    'linear-gradient(160deg,#ffc5c5,#FF6B6B)',
    'linear-gradient(160deg,#a8ede9,#4ECDC4)'
  ]
  const iconColors = ['#5D3FD3', '#FF6B6B', '#4ECDC4']
  const petCount = pets.length

  const cardWidth = petCount === 1 ? 200 : petCount === 2 ? 155 : 120
  const containerH = petCount === 1 ? 240 : petCount === 2 ? 240 : 255

  return (
    <div className="flex flex-col gap-2">
      {/* Kart slider container */}
      <div className="relative w-full">
        {/* Sol tarafta gölge/geçiş göstergesi */}
        {petCount >= 3 && canScrollLeft && (
          <div className="pointer-events-none absolute top-0 left-0 h-full w-8 z-30 bg-gradient-to-r from-bg-main to-transparent transition-opacity duration-300" />
        )}

        {/* Sağ tarafta gölge/geçiş göstergesi */}
        {petCount >= 3 && canScrollRight && (
          <div className="pointer-events-none absolute top-0 right-0 h-full w-8 z-30 bg-gradient-to-l from-bg-main to-transparent transition-opacity duration-300" />
        )}

        <div
          ref={containerRef}
          className={`relative flex items-end pb-2 ${
            petCount >= 3
              ? 'overflow-x-auto scrollbar-none scroll-smooth'
              : 'justify-center overflow-hidden px-4'
          }`}
          style={{ height: `${containerH}px` }}
        >
          {/* Sol dolgu / spacer */}
          {petCount >= 3 && <div className="w-4 flex-shrink-0 h-1 pointer-events-none" />}

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
                data-testid="pet-card"
                ref={(el) => { cardRefs.current[index] = el }}
                className="relative flex-shrink-0 flex flex-col cursor-pointer transition-all duration-300 ease-out active:scale-[0.98]"
                style={{
                  width: `${cardWidth}px`,
                  marginRight: index < pets.length - 1 ? '-28px' : '0',
                  zIndex: isActive ? 20 : 5 - Math.min(index, 4)
                }}
                onClick={() => {
                  setActiveIndex(index)
                  centerActiveCard(index, true)
                }}
              >
                {/* FOTOĞRAF — overlap olabilir */}
                <div
                  className="relative overflow-hidden rounded-t-[20px] border-[3px] border-b-0 flex items-center justify-center flex-shrink-0 transition-all duration-300"
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
                         background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
                         paddingTop: '40%'
                       }}>
                    <span className={`font-black text-white truncate block ${isActive ? 'text-[14px]' : 'text-[12px]'}`}>{pet.name}</span>
                  </div>

                  {/* Overdue badge */}
                  {pet.overdueCount > 0 && (
                    <div className="absolute top-[10px] left-[10px] w-[22px] h-[22px] 
                                    rounded-full bg-[var(--color-danger)] border-2 border-white
                                    flex items-center justify-center 
                                    text-white text-[10px] font-black z-20 shadow-sm">
                      {pet.overdueCount}
                    </div>
                  )}
                </div>

                {/* BİLGİ ALANI */}
                {isActive ? (
                  <Link
                    href={`/owner/pets/${pet.id}`}
                    className="relative bg-white rounded-b-[20px] border-[3px] border-t-0 flex flex-col gap-[5px] px-2.5 py-2 flex-1 shadow-md transition-all duration-300"
                    style={{
                      borderColor: 'var(--color-primary)',
                      borderTop: '2px solid var(--color-primary)',
                      zIndex: 25
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Satır 1: durum + ikon */}
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-[9px] font-semibold text-[var(--color-text-muted)] 
                                       flex-1 leading-tight truncate">
                        {pet.overdueCount > 0
                          ? 'Aşı zamanı'
                          : pet.weightVal
                          ? `${pet.weightVal.toString().replace(/kg/gi, '').trim()} kg`
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
                      <span className="text-[9px] font-bold" 
                            style={{color: 'var(--color-primary)'}}>
                        Profili Gör
                      </span>
                      <i className="ti ti-chevron-right text-[10px]" 
                         style={{color: 'var(--color-primary)'}} />
                    </div>
                  </Link>
                ) : (
                  <div
                    className="relative bg-white rounded-b-[20px] border-[3px] border-t-0 flex flex-col gap-[5px] px-2.5 py-2 flex-1"
                    style={{
                      borderColor: 'transparent',
                      zIndex: 25
                    }}
                  >
                    {/* Satır 1: durum + ikon */}
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-[9px] font-semibold text-[var(--color-text-muted)] 
                                       flex-1 leading-tight truncate">
                        {pet.overdueCount > 0
                          ? 'Aşı zamanı'
                          : pet.weightVal
                          ? `${pet.weightVal.toString().replace(/kg/gi, '').trim()} kg`
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

          {/* Sağ dolgu / spacer (en sağdaki kartın tam ortalanıp kesilmemesi için) */}
          {petCount >= 3 && <div className="w-16 flex-shrink-0 h-1 pointer-events-none" />}
        </div>
      </div>

      {/* Dot göstergesi */}
      {pets.length > 1 && (
        <div className="flex gap-[5px] justify-center pt-1">
          {pets.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Pet ${i + 1}`}
              className="h-[6px] rounded-full transition-all duration-300 
                         cursor-pointer border-0 p-0 focus:outline-none"
              style={{
                width: i === activeIndex ? '20px' : '6px',
                background: i === activeIndex ? 'var(--color-primary)' : '#e2e2e9'
              }}
              onClick={() => {
                setActiveIndex(i)
                centerActiveCard(i, true)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
