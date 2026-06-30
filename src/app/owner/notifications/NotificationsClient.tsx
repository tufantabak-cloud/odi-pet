'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useWebPush } from '@/hooks/useWebPush'
import { getTurkishGenitiveSuffix } from '@/lib/pets/utils'

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

function iconFor(type: string) {
  if (type === 'vaccine_overdue') return { icon: '🔴', bg: 'bg-error/10 text-error' }
  if (type === 'vaccine_reminder') return { icon: '💉', bg: 'bg-success/10 text-success' }
  if (type === 'general') return { icon: '📣', bg: 'bg-primary/10 text-primary' }
  return { icon: '🔔', bg: 'bg-border-main text-text-secondary' }
}

// ── Web Push Smart Card (Progressive Profiling) ─────────────────
function PushPermissionCard({ onDismiss, pets = [] }: { onDismiss: () => void, pets?: { id: string, name: string }[] }) {
  const { permission, isSubscribed, isLoading, subscribe } = useWebPush()
  const [result, setResult] = useState<'idle' | 'success' | 'denied'>('idle')
  const [testSending, setTestSending] = useState(false)

  const firstPet = pets && pets.length > 0 ? pets[0] : null
  const displayName = firstPet 
    ? `${firstPet.name}'${getTurkishGenitiveSuffix(firstPet.name)}`
    : 'Can dostunuzun'

  const triggerLocalTestNotification = async () => {
    if (!('serviceWorker' in navigator)) return;
    setTestSending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('🐾 Odi.Pet Test Bildirimi', {
        body: 'Harika! Telefon bildirimlerin ve Service Worker bağlantın başarıyla çalışıyor. 🌟',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification',
        data: {
          url: '/owner/notifications'
        }
      });
    } catch (err) {
      console.error('Test bildirimi gönderilemedi:', err);
    } finally {
      setTestSending(false);
    }
  };

  if (permission === 'unsupported') return null

  if (permission === 'denied') return (
    <div suppressHydrationWarning={true} className="p-4 bg-warning/10 border border-warning/20 rounded-2xl flex gap-3 items-start">
      <span className="text-[20px] shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-[13px] font-bold text-warning">Bildirimler engellenmiş</p>
        <p className="text-[12px] text-text-secondary mt-1">
          Tarayıcı ayarlarından Odi.Pet için bildirimlere izin verin.
        </p>
      </div>
      <button onClick={onDismiss} className="text-[12px] text-text-secondary hover:text-text-primary shrink-0">✕</button>
    </div>
  )

  if (isSubscribed || permission === 'granted' || result === 'success') return (
    <div className="p-5 bg-success/5 border border-success/20 rounded-2xl flex gap-4 items-start animate-in fade-in duration-300">
      <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center text-[24px] shrink-0">
        🎉
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[15px] text-success">Bildirimleriniz Aktif!</p>
        <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
          {firstPet ? `${displayName} aşı, ilaç ve beslenme hatırlatmaları artık telefonunuza anında gelecek.` : 'Can dostunuzun aşı, ilaç ve beslenme hatırlatmaları artık telefonunuza anında gelecek.'}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={triggerLocalTestNotification}
            disabled={testSending}
            className="px-4 py-2 bg-success text-white font-bold text-[13px] rounded-xl hover:bg-success/90 transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            {testSending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : '🔔'}
            Test Bildirimi Gönder
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div
      id="push-permission-card"
      className="p-5 bg-gradient-to-br from-primary/8 to-purple-500/5 border border-primary/20 rounded-2xl flex gap-4 items-start animate-in slide-in-from-top-2"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-[24px] shrink-0">
        🔔
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[15px] text-text-primary">Aşı hatırlatmaları almak ister misin?</p>
        <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
          {firstPet ? `"${displayName} Kuduz aşısına 3 gün kaldı" gibi bildirimleri tarayıcıya gönderelim.` : '"Can dostunuzun Kuduz aşısına 3 gün kaldı" gibi bildirimleri tarayıcıya gönderelim.'}
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            id="push-enable-btn"
            onClick={async () => {
              const result = await subscribe()
              setResult(result.success ? 'success' : 'denied')
            }}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 text-[13px]"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : '✓'}
            Bildirimleri Aç
          </button>
          <button
            onClick={onDismiss}
            className="btn-secondary text-[13px]"
          >
            Şimdi Değil
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Notifications Client ───────────────────────────────────
export default function NotificationsClient({
  initialNotifications,
  pets = []
}: {
  initialNotifications: Notification[]
  pets?: { id: string, name: string }[]
}) {
  const router = useRouter()
  const [list, setList] = useState(initialNotifications)
  const [showPushCard, setShowPushCard] = useState(true)
  const [, startTransition] = useTransition()

  const unreadCount = list.filter((n) => !n.is_read).length

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setList((prev) => prev.map((n) => ({ ...n, is_read: true })))
    router.refresh()
  }

  async function markOneRead(id: string) {
    await fetch('/api/notifications/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
    setList((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  return (
    <div className="flex flex-col gap-6 pb-10 w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-main pb-4">
        <div className="flex gap-4 items-center">
          <button type="button" onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-surface shrink-0 shadow-sm hover:scale-[1.05] active:scale-[0.95]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Bildirimler</h1>
            <p className="text-text-secondary mt-1 text-[15px] font-medium">
              {unreadCount > 0 ? `${unreadCount} okunmamış` : 'Tümü okundu'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            id="mark-all-read-btn"
            onClick={markAllRead}
            className="text-[13px] font-bold text-primary hover:underline"
          >
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {/* Progressive Profiling: Push Notification Smart Card */}
      {showPushCard && (
        <PushPermissionCard onDismiss={() => setShowPushCard(false)} pets={pets} />
      )}

      {/* Notification List */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-border-main/50 flex items-center justify-center text-[40px]">
            🔔
          </div>
          <p className="text-[18px] font-extrabold text-text-primary">Henüz bildirim yok</p>
          <p className="text-[14px] text-text-secondary max-w-[280px] leading-relaxed">
            Aşı hatırlatmaları, randevu güncellemeleri ve diğer önemli bildirimler burada görünecek.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((notif) => {
            const { icon, bg } = iconFor(notif.type)
            return (
              <button
                key={notif.id}
                onClick={async () => {
                  if (!notif.is_read) {
                    await markOneRead(notif.id)
                  }
                  if (notif.pet_id) {
                    const titleLower = notif.title.toLowerCase()
                    const msgLower = notif.message.toLowerCase()

                    if (notif.type.includes('vaccine') || titleLower.includes('aşı')) {
                      router.push(`/owner/dashboard?highlight=vaccine-${notif.pet_id}`)
                    } else if (titleLower.includes('parazit')) {
                      router.push(`/owner/dashboard?highlight=parasite-${notif.pet_id}`)
                    } else if (titleLower.includes('bakım') || msgLower.includes('(bakım)')) {
                      router.push(`/owner/pets/${notif.pet_id}/care`)
                    } else if (titleLower.includes('beslenme') || msgLower.includes('(beslenme)')) {
                      router.push(`/owner/pets/${notif.pet_id}/nutrition`)
                    } else if (titleLower.includes('sağlık') || msgLower.includes('(sağlık)') || titleLower.includes('veteriner') || msgLower.includes('(veteriner)')) {
                      router.push(`/owner/pets/${notif.pet_id}/treatments`)
                    } else {
                      router.push(`/owner/pets/${notif.pet_id}`)
                    }
                  } else {
                    router.push('/owner/dashboard')
                  }
                }}
                className={`card-base text-left flex gap-4 p-5 transition-all w-full ${
                  !notif.is_read ? 'border-l-4 border-l-primary' : 'opacity-70'
                }`}
              >
                <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center text-[20px] shrink-0 font-bold`}>
                  {icon}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-extrabold text-text-primary text-[15px] ${!notif.is_read ? '' : 'font-semibold'}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">{notif.message}</p>
                  <p className="text-[12px] text-text-secondary/60 font-semibold mt-2">{timeAgo(notif.created_at)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
