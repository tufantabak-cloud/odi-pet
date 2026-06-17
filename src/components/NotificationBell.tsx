'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  pet_id: string | null
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  if (mins < 1440) return `${Math.floor(mins / 60)} saat önce`
  return `${Math.floor(mins / 1440)} gün önce`
}

export default function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/read', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCount(data.count ?? 0)
        setNotifications(data.notifications ?? [])
      }
    } catch {
      // silent
    }
  }

  // Poll every 60s for new notifications
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Update when page becomes visible again
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch('/api/notifications/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    router.refresh()
  }

  const handleNotificationClick = async (notif: Notification) => {
    setIsOpen(false)
    if (!notif.is_read) {
      await fetch('/api/notifications/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [notif.id] }) })
      setCount(prev => Math.max(0, prev - 1))
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }
    
    if (notif.pet_id) {
      if (notif.type.includes('vaccine')) {
        router.push(`/owner/dashboard?highlight=vaccine-${notif.pet_id}`)
      } else {
        router.push(`/owner/dashboard?highlight=parasite-${notif.pet_id}`)
      }
    } else {
      router.push('/owner/dashboard')
    }
    router.refresh()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => {
          setIsOpen(!isOpen)
          fetchNotifications()
        }}
        className={`relative w-11 h-11 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-sm active:scale-95
          ${isOpen ? 'border-primary/30 bg-primary-soft text-primary' : 'border-border-main bg-surface hover:bg-bg-main text-text-secondary'}`}
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
          className={isOpen ? 'text-primary' : 'text-text-secondary'}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-error text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[330px] sm:w-[360px] bg-white rounded-2xl border border-border-main shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-50 animate-in fade-in slide-in-from-top-3 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-main/60 bg-slate-50/50">
            <span className="text-[14px] font-extrabold text-text-primary">Son Bildirimler</span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Tümünü Okundu Yap
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border-main/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                <span className="text-[28px] block mb-2">🔔</span>
                <p className="text-[13px] font-semibold">Henüz bildiriminiz yok</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-3.5 hover:bg-bg-main/60 transition-colors flex gap-3 items-start cursor-pointer
                    ${!notif.is_read ? 'bg-primary-soft/10 border-l-2 border-l-primary' : 'opacity-80'}`}
                >
                  <div className="text-[16px] mt-0.5 shrink-0">
                    {notif.type.includes('vaccine') ? '💉' : '📣'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-extrabold text-text-primary leading-tight truncate ${!notif.is_read ? '' : 'font-semibold text-text-secondary'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[12px] text-text-secondary mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-text-secondary/60 font-semibold mt-1.5 block">
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                  {!notif.is_read && (
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border-main/60 text-center bg-slate-50/30">
            <Link
              href="/owner/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[12px] font-bold text-primary hover:underline inline-flex items-center gap-1.5"
            >
              Tüm Bildirimleri Gör →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
