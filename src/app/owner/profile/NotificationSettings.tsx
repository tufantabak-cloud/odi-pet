'use client'

import { useWebPush } from '@/hooks/useWebPush'

export default function NotificationSettings() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = useWebPush()

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">Akıllı Bildirimler</h2>
      <div className="card-base divide-y divide-border-main">
        <div className="p-5 flex justify-between items-center group hover:bg-bg-main/30 transition-colors">
          <div>
            <p className="text-[15px] font-bold text-text-primary">Tarayıcı & Push Bildirimleri</p>
            <p className="text-[13px] text-text-secondary">
              {permission === 'denied' 
                ? 'Tarayıcı ayarlarından izin vermeniz gerekiyor' 
                : 'Aşı, parazit ve mama hatırlatmaları alın'}
            </p>
          </div>
          <button 
            disabled={isLoading || permission === 'denied'}
            onClick={handleToggle}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors disabled:opacity-50 ${isSubscribed ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isSubscribed ? 'translate-x-6' : 'translate-x-0'}`}/>
          </button>
        </div>
        
        <div className="p-5 flex justify-between items-center group hover:bg-bg-main/30 transition-colors opacity-70 pointer-events-none">
          <div>
            <p className="text-[15px] font-bold text-text-primary">E-posta Bildirimleri</p>
            <p className="text-[13px] text-text-secondary">Önemli güncellemeler ve hatırlatmalar (Varsayılan Açık)</p>
          </div>
          <div className="w-12 h-6 rounded-full relative bg-primary">
            <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full translate-x-6"/>
          </div>
        </div>

        <div className="p-4 bg-bg-main/50 flex justify-between items-center text-[13px] font-semibold">
          <span className="text-text-secondary">Durum: <span className="text-primary">{isLoading ? 'Güncelleniyor...' : isSubscribed ? 'Aktif' : 'Pasif'}</span></span>
          <span className="text-text-secondary">Kanal: <span className="text-primary">Push & Email</span></span>
        </div>
      </div>
    </section>
  )
}
