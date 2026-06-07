'use client'

import { useRouter } from 'next/navigation'

export default function SmartBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter()

  const handleBack = () => {
    // If we have history, go back (e.g. to Dashboard where the modal was opened)
    // If no history (e.g. direct link), go to the fallback list page
    if (window.history.length > 2) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button 
      onClick={handleBack}
      className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center shadow-sm border border-border-main text-text-secondary hover:text-text-primary transition-colors shrink-0"
      aria-label="Geri Dön"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </button>
  )
}
