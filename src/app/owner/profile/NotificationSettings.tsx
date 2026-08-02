'use client'

import { useWebPush } from '@/hooks/useWebPush'
import { Bell, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function NotificationSettings() {
  const { permission, isSubscribed, isLoading, error, subscribe, unsubscribe } = useWebPush()

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-2">Akıllı Bildirimler</h2>
      <div className="bg-white rounded-3xl divide-y divide-border-main border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-5 flex justify-between items-center group hover:bg-bg-main/30 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Tarayıcı & Push Bildirimleri</p>
              <p suppressHydrationWarning={true} className="text-xs text-text-secondary mt-0.5">
                {permission === 'denied'
                  ? 'Tarayıcı ayarlarından izin vermeniz gerekiyor'
                  : 'Aşı, parazit ve mama hatırlatmaları alın'}
              </p>
            </div>
          </div>
          <button
            disabled={isLoading || permission === 'denied'}
            onClick={handleToggle}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors disabled:opacity-50 active:scale-[0.95] ${
              isSubscribed ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <div
              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                isSubscribed ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-5 flex justify-between items-center group hover:bg-bg-main/30 transition-colors opacity-70">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">E-posta Bildirimleri</p>
              <p className="text-xs text-text-secondary mt-0.5">Önemli güncellemeler ve hatırlatmalar (Varsayılan Açık)</p>
            </div>
          </div>
          <div className="w-12 h-6 rounded-full relative bg-primary">
            <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full translate-x-6" />
          </div>
        </div>

        <div className="p-4 bg-bg-main/50 flex justify-between items-center text-xs font-semibold">
          <span className="text-text-secondary">
            Tarayıcı Bildirimleri:{' '}
            <span className="text-primary font-bold">
              {isLoading ? 'Güncelleniyor...' : isSubscribed ? 'Aktif' : 'Pasif'}
            </span>
          </span>
          <span className="text-text-secondary">
            Kanal: <span className="text-primary font-bold">Push & Email</span>
          </span>
        </div>
        {error && (
          <div role="alert" className="p-4 bg-rose-50 text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </section>
  )
}
