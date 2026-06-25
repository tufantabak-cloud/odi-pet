import React from 'react'

type SkeletonVariant = 'text' | 'card' | 'metric' | 'list' | 'avatar'

interface SkeletonProps {
  variant?: SkeletonVariant
  lines?: number
  className?: string
}

const pulse = 'animate-pulse bg-[var(--color-surface-secondary)] rounded-[var(--radius-xs)]'

function SkeletonLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return <div className={`${pulse} ${w} ${h}`} />
}

export default function Skeleton({ variant = 'text', lines = 3, className = '' }: SkeletonProps) {
  if (variant === 'avatar') {
    return <div className={`${pulse} w-12 h-12 rounded-full ${className}`} />
  }

  if (variant === 'metric') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <SkeletonLine w="w-16" h="h-5" />
        <SkeletonLine w="w-10" h="h-2" />
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className={`flex flex-col ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <div className={`${pulse} w-9 h-9 rounded-[10px] shrink-0`} />
            <div className="flex-1 flex flex-col gap-2">
              <SkeletonLine w="w-3/4" h="h-3" />
              <SkeletonLine w="w-1/2" h="h-2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-[var(--space-4)] flex flex-col gap-3 border border-[var(--color-border)] ${className}`}>
        <SkeletonLine w="w-1/2" h="h-4" />
        <SkeletonLine w="w-full" h="h-3" />
        <SkeletonLine w="w-3/4" h="h-3" />
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} w={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  )
}