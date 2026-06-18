'use client'

import { useState, useEffect } from 'react'
import { useWebPush } from '@/hooks/useWebPush'
import { useOnboarding } from '@/lib/onboarding/useOnboarding'

export default function PushNotificationPrompt() {
  const { permission, subscribe, isLoading } = useWebPush()
  const { completeStepByTrigger } = useOnboarding()
  const [showPrompt, setShowPrompt] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('push_prompt_dismissed') === 'true'
    }
    return false
  })

  useEffect(() => {
    if (dismissed) return;

    const forcePrompt = typeof window !== 'undefined' && window.location.search.includes('forcePrompt=true');
    
    if (permission === 'default' || forcePrompt) {
      const timer = setTimeout(() => setShowPrompt(true), 2500)
      return () => clearTimeout(timer)
    }
  }, [permission, dismissed])

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true')
    setDismissed(true)
    setShowPrompt(false)
    completeStepByTrigger('action:notification_permission')
    
    setToastType('success')
    setToastMsg('Sorun değil, ayarlardan açabilirsin')
    setTimeout(() => setToastMsg(null), 3000)
  }

  const handleSubscribe = async () => {
    const result = await subscribe()
    if (result.success) {
      setShowPrompt(false)
      completeStepByTrigger('action:notification_permission')
      setToastType('success')
      setToastMsg('Bildirimler başarıyla etkinleştirildi!')
      setTimeout(() => setToastMsg(null), 3000)
    } else if (result.error) {
      setToastType('error')
      setToastMsg(result.error)
      setTimeout(() => setToastMsg(null), 5000)
    } else {
      setShowPrompt(false)
      completeStepByTrigger('action:notification_permission')
      setToastType('success')
      setToastMsg('Sorun değil, ayarlardan açabilirsin')
      setTimeout(() => setToastMsg(null), 3000)
    }
  }

  const forcePrompt = typeof window !== 'undefined' && window.location.search.includes('forcePrompt=true');
  const shouldRenderPrompt = showPrompt && !dismissed && (permission === 'default' || forcePrompt) && permission !== 'unsupported';

  return (
    <>
      {toastMsg && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-[999999] animate-in slide-in-from-bottom flex items-center space-x-2 text-white font-medium ${toastType === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          <span>{toastMsg}</span>
        </div>
      )}

      {shouldRenderPrompt && (
        <div id="onb-notifications" className="bg-primary-soft/30 border border-primary/20 rounded-[20px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mb-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-border-main text-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-text-primary text-[15px]">Bildirimlere İzin Verin</h3>
              <p className="text-[13px] text-text-secondary mt-0.5 leading-snug max-w-sm">
                Hatırlatıcıları ve görevleri zamanında alabilmek için cihaz bildirimlerinizi açın.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto z-10 shrink-0">
            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-text-secondary text-[13px] bg-white border border-border-main hover:bg-bg-main transition-colors"
            >
              Daha Sonra
            </button>
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-white text-[13px] bg-primary hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading && (
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              )}
              İzin Ver
            </button>
          </div>
        </div>
      )}
    </>
  )
}
