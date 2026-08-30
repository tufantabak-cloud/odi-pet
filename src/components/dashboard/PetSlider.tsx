'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, AlertCircle, ChevronRight, Scale } from 'lucide-react'

type Pet = {
  id: string
  name: string
  avatar_url?: string | null
  overdueCount: number
  weightVal?: string | null
}

export function calculateSidePadding(containerWidth: number, cardWidth: number, minPadding = 16): number {
  if (containerWidth <= 0 || cardWidth <= 0) return minPadding
  return Math.max(minPadding, Math.floor((containerWidth - cardWidth) / 2))
}

export function calculateTargetScrollLeft(
  cardOffsetLeft: number,
  containerWidth: number,
  cardWidth: number
): number {
  const target = cardOffsetLeft - (containerWidth / 2) + (cardWidth / 2)
  return Math.max(0, Math.round(target))
}

export function findClosestCardIndex(
  scrollLeft: number,
  clientWidth: number,
  cards: Array<{ offsetLeft: number; clientWidth: number }>
): number {
  if (!cards || cards.length === 0) return 0
  const containerCenter = scrollLeft + clientWidth / 2
  let closestIndex = 0
  let minDistance = Infinity

  cards.forEach((card, i) => {
    if (!card) return
    const cardCenter = card.offsetLeft + card.clientWidth / 2
    const distance = Math.abs(containerCenter - cardCenter)
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = i
    }
  })

  return closestIndex
}

export function PetSlider({ pets, onActiveChange }: { pets: Pet[], onActiveChange?: (petId: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [sidePadding, setSidePadding] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const isProgrammaticScrollRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ensure cardRefs array size matches pets length
  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, pets.length)
  }, [pets])

  // Dinamik olarak container ve kart genişliğine göre merkezleme padding'i hesapla
  const updateDimensions = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const firstCard = cardRefs.current[0]
    const cardWidth = firstCard ? Math.round(firstCard.getBoundingClientRect().width) : 204

    const padding = calculateSidePadding(containerWidth, cardWidth)
    setSidePadding(padding)
  }, [])

  // Center active card smoothly inside container
  const centerActiveCard = useCallback((index: number, smooth = true) => {
    const container = containerRef.current
    const card = cardRefs.current[index]
    if (container && card) {
      const targetScrollLeft = calculateTargetScrollLeft(
        card.offsetLeft,
        container.clientWidth,
        card.clientWidth
      )

      isProgrammaticScrollRef.current = true
      container.scrollTo({
        left: targetScrollLeft,
        behavior: smooth ? 'smooth' : 'auto'
      })

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false
      }, smooth ? 450 : 50)
    }
  }, [])

  // ResizeObserver ve window resize dinleyici
  useEffect(() => {
    updateDimensions()
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    resizeObserver.observe(container)
    window.addEventListener('resize', updateDimensions)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [updateDimensions, pets.length])

  // Selected pet callback & auto-centering on mount / activeIndex change
  useEffect(() => {
    if (pets[activeIndex]) {
      onActiveChange?.(pets[activeIndex].id)
    }
    const timer = setTimeout(() => {
      centerActiveCard(activeIndex, true)
    }, 60)
    return () => clearTimeout(timer)
  }, [activeIndex, pets, onActiveChange, centerActiveCard])

  // Dynamic scroll state check and closest-card detection on swipe/scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)

    // Kullanıcı elle swipe ederken en yakın kartı aktif yap
    if (isProgrammaticScrollRef.current) return

    const validCards = cardRefs.current
      .map(card => card ? { offsetLeft: card.offsetLeft, clientWidth: card.clientWidth } : null)
      .filter((c): c is { offsetLeft: number; clientWidth: number } => c !== null)

    const closestIndex = findClosestCardIndex(scrollLeft, clientWidth, validCards)

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex)
      if (pets[closestIndex]) {
        onActiveChange?.(pets[closestIndex].id)
      }
    }
  }, [activeIndex, pets, onActiveChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    handleScroll()
  }, [handleScroll, sidePadding])

  const bgGradients = [
    'from-violet-500/80 to-purple-700/80',
    'from-amber-400/80 to-rose-500/80',
    'from-teal-400/80 to-emerald-600/80',
    'from-blue-400/80 to-indigo-600/80'
  ]

  const petCount = pets.length

  const dynamicPaddingStyle = sidePadding > 0
    ? `${sidePadding}px`
    : 'calc(50% - 100px)'

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Kart slider container */}
      <div className="relative w-[calc(100%+2rem)] -mx-4 sm:w-full sm:mx-0 overflow-hidden">
        {/* Sol tarafta gölge/geçiş göstergesi */}
        {petCount >= 2 && canScrollLeft && (
          <div className="pointer-events-none absolute top-0 left-0 h-full w-10 z-20 bg-gradient-to-r from-[var(--color-bg-main)] to-transparent transition-opacity duration-300" />
        )}

        {/* Sağ tarafta gölge/geçiş göstergesi */}
        {petCount >= 2 && canScrollRight && (
          <div className="pointer-events-none absolute top-0 right-0 h-full w-10 z-20 bg-gradient-to-l from-[var(--color-bg-main)] to-transparent transition-opacity duration-300" />
        )}

        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            paddingLeft: dynamicPaddingStyle,
            paddingRight: dynamicPaddingStyle,
            scrollPaddingLeft: dynamicPaddingStyle,
            scrollPaddingRight: dynamicPaddingStyle,
          }}
          className="flex items-stretch gap-4 pt-2 pb-4 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory"
        >
          {pets.map((pet, index) => {
            const isActive = index === activeIndex
            const gradient = bgGradients[index % bgGradients.length]

            return (
              <div
                key={pet.id}
                data-testid="pet-card"
                ref={(el) => { cardRefs.current[index] = el }}
                className={`snap-center flex-shrink-0 w-[200px] sm:w-[230px] rounded-[24px] transition-all duration-300 ease-out cursor-pointer select-none flex flex-col justify-between overflow-hidden bg-white border-2 ${
                  isActive
                    ? 'border-primary shadow-[0_12px_28px_-4px_rgba(93,63,211,0.22)] ring-4 ring-primary/10 scale-[1.02] z-10'
                    : 'border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] hover:border-slate-200 hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] opacity-90 hover:opacity-100'
                } active:scale-[0.98]`}
                onClick={() => {
                  if (!isActive) {
                    setActiveIndex(index)
                    centerActiveCard(index, true)
                  }
                }}
              >
                {/* Visual Header / Avatar Section */}
                <div className="relative h-[145px] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  {pet.avatar_url ? (
                    <Image
                      src={pet.avatar_url}
                      alt={pet.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 230px"
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <span className="text-4xl font-extrabold text-white/90 drop-shadow-sm">
                        {(pet.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Top-Right Overdue Badge */}
                  {pet.overdueCount > 0 ? (
                    <div className="absolute top-2.5 right-2.5 z-10 px-2 py-1 rounded-full bg-danger text-white text-2xs font-bold flex items-center gap-1 shadow-sm">
                      <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{pet.overdueCount} Aşı</span>
                    </div>
                  ) : (
                    <div className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-emerald-600 shadow-sm">
                      <Heart className="w-4 h-4 stroke-[2] fill-emerald-500/20" />
                    </div>
                  )}

                  {/* Gradient Overlay & Pet Name */}
                  <div className="absolute inset-x-0 bottom-0 pt-8 pb-2 px-3 bg-gradient-to-t from-black/75 via-black/30 to-transparent flex items-end">
                    <h3 className="text-base font-bold text-white tracking-tight truncate drop-shadow-md">
                      {pet.name}
                    </h3>
                  </div>
                </div>

                {/* Footer Info & Action Section */}
                <div className="p-3 flex flex-col justify-between gap-2 flex-1 bg-white">
                  {/* Status / Metric Row */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-text-secondary truncate">
                      {pet.overdueCount > 0
                        ? 'Aşı zamanı'
                        : pet.weightVal
                        ? `${pet.weightVal.toString().replace(/kg/gi, '').trim()} kg`
                        : 'Sağlıklı & Mutlu'}
                    </span>
                    {pet.weightVal && pet.overdueCount === 0 && (
                      <Scale className="w-3.5 h-3.5 text-text-tertiary stroke-[2] shrink-0" />
                    )}
                  </div>

                  {/* Navigation Link */}
                  <Link
                    href={`/owner/pets/${pet.id}`}
                    className={`mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold transition-colors ${
                      isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Profili Gör</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dot göstergesi */}
      {pets.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {pets.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Pet ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer border-0 p-0 focus:outline-none ${
                i === activeIndex
                  ? 'w-6 bg-primary shadow-sm'
                  : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
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

