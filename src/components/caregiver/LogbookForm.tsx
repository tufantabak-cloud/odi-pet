'use client'

import React, { useState } from 'react'
import { Check, Edit3, ShieldCheck, AlertTriangle } from 'lucide-react'

const QUICK_ACTIONS = [
  'Mama yedirdim',
  'Su içti',
  'Tuvaletini yaptı',
  'İlacını verdim',
  'Dışarı çıktık',
  'Uyuyor'
]

export function LogbookForm({ shareToken }: { shareToken: string }) {
  const [loading, setLoading] = useState(false)
  const [customNote, setCustomNote] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMsg({ message, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  const handleQuickAction = async (action: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/logbook/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: shareToken, entryType: action })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      showToast(`${action} kaydedildi.`, 'success')
    } catch (err: any) {
      showToast(err.message || 'Kayıt başarısız oldu', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSubmit = async () => {
    if (!customNote.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/logbook/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: shareToken, entryType: 'Özel Not', notes: customNote })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      showToast('Notunuz kaydedildi.', 'success')
      setCustomNote('')
      setShowCustom(false)
    } catch (err: any) {
      showToast(err.message || 'Kayıt başarısız oldu', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Bugün Neler Oldu?</h3>
      
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(action => (
          <button 
            key={action} 
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-full shadow-sm hover:scale-[1.02] transition-transform disabled:opacity-50 text-sm font-medium"
            onClick={() => handleQuickAction(action)}
            disabled={loading}
          >
            {action}
          </button>
        ))}
        
        <button 
          className="px-4 py-2 flex items-center border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full transition-colors disabled:opacity-50 text-sm font-medium"
          onClick={() => setShowCustom(!showCustom)}
          disabled={loading}
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Not Ekle
        </button>
      </div>

      {showCustom && (
        <div className="pt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <textarea 
            placeholder="Diğer bir not ekle..." 
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full min-h-[100px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            disabled={loading}
          />
          <div className="flex justify-end">
            <button 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center transition-colors disabled:opacity-50 font-medium"
              onClick={handleCustomSubmit} 
              disabled={loading || !customNote.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              Kaydet
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

