'use client'

import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  /** Error heading. Defaults to "Bir sorun oluştu." */
  title?: string
  /** Optional explanatory message */
  message?: string
  /** If provided, renders a "Tekrar dene" button */
  onRetry?: () => void
  /** 'page' centers on screen, 'inline' is compact. Defaults to 'page' */
  variant?: 'inline' | 'page'
}

/**
 * Reusable error state for pages and inline sections.
 * Non-alarming, empathetic copy — never blames the user.
 *
 * @example
 * ```tsx
 * // Full-page error with retry
 * <ErrorState
 *   message="Lütfen birkaç dakika sonra tekrar deneyin."
 *   onRetry={() => router.refresh()}
 * />
 *
 * // Inline compact error
 * <ErrorState variant="inline" message="Veriler yüklenemedi." />
 * ```
 */
export default function ErrorState({
  title = 'Bir sorun oluştu.',
  message,
  onRetry,
  variant = 'page',
}: ErrorStateProps) {
  const isPage = variant === 'page'

  return (
    <div
      role="alert"
      className={
        isPage
          ? 'flex flex-col items-center justify-center text-center px-6 py-16 min-h-[240px]'
          : 'flex flex-col items-center text-center px-4 py-6'
      }
    >
      <AlertCircle
        className={`${isPage ? 'w-10 h-10' : 'w-7 h-7'} text-text-secondary/50 mb-3`}
        aria-hidden="true"
      />

      <h3
        className={`${
          isPage ? 'text-lg' : 'text-base'
        } font-medium text-text-primary leading-snug`}
      >
        {title}
      </h3>

      {message && (
        <p className="text-sm text-text-secondary mt-1.5 max-w-xs leading-relaxed">
          {message}
        </p>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary text-sm px-5 py-2 mt-5"
        >
          Tekrar dene
        </button>
      )}
    </div>
  )
}
