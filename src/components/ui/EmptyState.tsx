import Link from 'next/link'

interface EmptyStateCta {
  label: string
  onClick?: () => void
  href?: string
}

interface EmptyStateProps {
  /** Optional icon element (e.g. a lucide-react icon) */
  icon?: React.ReactNode
  /** Short, descriptive title */
  title: string
  /** Optional explanatory message */
  message?: string
  /** Optional call-to-action button */
  cta?: EmptyStateCta
}

/**
 * Reusable empty-state placeholder for pages/sections with no data.
 *
 * @example
 * ```tsx
 * import { PackageOpen } from 'lucide-react'
 *
 * <EmptyState
 *   icon={<PackageOpen />}
 *   title="Henüz bir pet eklemediniz."
 *   message="İlk petinizi eklemek için aşağıdaki butona dokunun."
 *   cta={{ label: "Pet Ekle", href: "/owner/pets/add" }}
 * />
 * ```
 */
export default function EmptyState({ icon, title, message, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 min-h-[240px]">
      {icon && (
        <div className="w-12 h-12 text-text-secondary/40 mb-4 [&>svg]:w-full [&>svg]:h-full" aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-medium text-text-primary leading-snug">
        {title}
      </h3>

      {message && (
        <p className="text-sm text-text-secondary mt-2 max-w-xs leading-relaxed">
          {message}
        </p>
      )}

      {cta && (
        <div className="mt-6">
          {cta.href ? (
            <Link href={cta.href} className="btn-primary text-sm px-6 py-2.5">
              {cta.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={cta.onClick}
              className="btn-primary text-sm px-6 py-2.5"
            >
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
