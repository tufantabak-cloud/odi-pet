'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, ShieldCheck, Heart, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function SharePetPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<'temporary' | 'permanent'>('temporary')
  const [duration, setDuration] = useState<number>(3) // days
  const [toastMsg, setToastMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMsg({ message, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  const handleCreateShare = async () => {
    setLoading(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + duration)

      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: id,
          accessType: selectedMode,
          expiresAt: selectedMode === 'temporary' ? expiresAt.toISOString() : null,
          canLogEntries: selectedMode === 'temporary'
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      setShareToken(data.token)
      showToast('Dijital Pet Kartı başarıyla oluşturuldu!', 'success')
    } catch (err: any) {
      showToast(err.message || 'Bir hata oluştu', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!shareToken) return
    const link = `${window.location.origin}/caregiver/${shareToken}`
    navigator.clipboard.writeText(link)
    showToast('Paylaşım bağlantısı kopyalandı!', 'success')
  }


  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/owner/pets/${id}`}>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Dijital Pet Kartı</h1>
      </div>

      <p className="text-muted-foreground text-sm">
        Can dostunuzu emanet edeceğiniz kişiyle kritik bilgileri (beslenme, sağlık, acil durum) güvenle paylaşın.
      </p>

      {!shareToken ? (
        <div className="space-y-6">
          <div className="grid gap-4">
            <div 
              className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMode === 'temporary' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'}`}
              onClick={() => setSelectedMode('temporary')}
            >
              <div className="flex flex-row items-start space-x-3">
                <Clock className="w-6 h-6 text-primary mt-1" />
                <div className="space-y-1 flex-1">
                  <h3 className="text-lg font-medium">Petini Emanet Et</h3>
                  <p className="text-sm text-slate-500">
                    Geçici pansiyon veya bakım için. Erişim süresi bittiğinde bağlantı otomatik kapanır.
                  </p>
                </div>
              </div>
              {selectedMode === 'temporary' && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col space-y-2 mt-2">
                    <label className="text-sm font-medium">Süre (Gün)</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={duration} 
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <span className="text-sm text-primary font-medium">{duration} Gün boyunca geçerli</span>
                  </div>
                </div>
              )}
            </div>

            <div 
              className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMode === 'permanent' ? 'border-destructive ring-1 ring-destructive bg-destructive/5' : 'border-slate-200 dark:border-slate-800 hover:border-destructive/50'}`}
              onClick={() => setSelectedMode('permanent')}
            >
              <div className="flex flex-row items-start space-x-3">
                <Heart className="w-6 h-6 text-destructive mt-1" />
                <div className="space-y-1 flex-1">
                  <h3 className="text-lg font-medium">Kalıcı Olarak Paylaş</h3>
                  <p className="text-sm text-slate-500">
                    Süresiz erişim izni verir. Aile üyeleri veya sahiplendirme durumları için idealdir.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-amber-800 dark:text-amber-400">
              <p className="font-medium">Profillerde Eksik Bilgiler Olabilir</p>
              <p>Güvenli bir emanet süreci için, alerjiler ve kritik veteriner bilgilerinin profilinizde eksiksiz olduğundan emin olun.</p>
            </div>
          </div>

          <button 
            className="w-full h-12 bg-primary text-white rounded-xl text-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            onClick={handleCreateShare} 
            disabled={loading}
          >
            {loading ? 'Oluşturuluyor...' : 'Bağlantı Oluştur'}
          </button>
        </div>
      ) : (
        <div className="p-6 border border-primary/50 shadow-lg ring-1 ring-primary/20 rounded-xl bg-white dark:bg-slate-900">
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold">Kart Hazır!</h3>
            <p className="text-base text-slate-500">
              Aşağıdaki bağlantıyı emanet alan kişiyle paylaşabilirsiniz. Uygulama indirmesine gerek yoktur.
            </p>
          </div>
          <div className="space-y-6">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between overflow-hidden">
              <span className="text-sm truncate mr-4 text-slate-700 dark:text-slate-300">
                {`${window.location.origin}/caregiver/${shareToken}`}
              </span>
            </div>
            <button className="w-full h-12 bg-primary text-white rounded-xl text-lg font-semibold hover:bg-primary/90 transition-colors" onClick={handleCopyLink}>
              Bağlantıyı Kopyala
            </button>
            <button className="w-full h-12 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => router.replace(`/owner/pets/${id}`)}>
              Panele Dön
            </button>
          </div>
        </div>
      )}
      {toastMsg && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 animate-in slide-in-from-bottom flex items-center space-x-2 text-white font-medium ${toastMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toastMsg.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toastMsg.message}</span>
        </div>
      )}
    </div>
  )
}


