'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  initialCount: number
}

export default function NotificationBell({ initialCount }: Props) {
  const [count, setCount] = useState(initialCount)
  const router = useRouter()

  // Poll every 60s for new notifications while page is open
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/notifications/read', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setCount(data.count ?? 0)
        }
      } catch {
        // silent
      }
    }

    const interval = setInterval(poll, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Update when page becomes visible again
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/notifications/read', { cache: 'no-store' })
          .then(r => r.json())
          .then(d => setCount(d.count ?? 0))
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <Link
      href="/owner/notifications"
      id="notification-bell-btn"
      className="relative w-11 h-11 rounded-full flex items-center justify-center border border-border-main bg-surface hover:bg-bg-main transition-colors"
      aria-label={count > 0 ? `${count} okunmamış bildirim` : 'Bildirimler'}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text-secondary"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-error text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
