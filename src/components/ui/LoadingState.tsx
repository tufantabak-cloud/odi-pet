import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  /** Short loading message. Defaults to "Yükleniyor..." */
  message?: string
  /** Icon and text size. Defaults to 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** If true, renders inline instead of centered on the page */
  inline?: boolean
}

const sizeMap = {
  sm: { icon: 'w-4 h-4', text: 'text-xs', gap: 'gap-2' },
  md: { icon: 'w-5 h-5', text: 'text-sm', gap: 'gap-2.5' },
  lg: { icon: 'w-6 h-6', text: 'text-sm', gap: 'gap-3' },
} as const

/**
 * Reusable loading indicator for pages and inline sections.
 *
 * @example
 * ```tsx
 * // Full-page centered loader
 * <LoadingState />
 *
 * // Inline loader with context-specific message
 * <LoadingState message="Pet bilgileri yükleniyor..." size="sm" inline />
 * ```
 */
export default function LoadingState({
  message = 'Yükleniyor...',
  size = 'md',
  inline = false,
}: LoadingStateProps) {
  const s = sizeMap[size]

  const content = (
    <div role="status" aria-live="polite" className={`flex items-center ${s.gap}`}>
      <Loader2 className={`${s.icon} animate-spin text-text-secondary/60`} aria-hidden="true" />
      <span className={`${s.text} text-text-secondary`}>{message}</span>
    </div>
  )

  if (inline) {
    return content
  }

  return (
    <div className="flex items-center justify-center min-h-[240px] px-6 py-16">
      {content}
    </div>
  )
}
