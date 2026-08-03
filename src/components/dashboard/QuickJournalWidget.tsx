'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface Pet {
  id: string
  name: string
  avatar_url?: string | null
}

interface QuickJournalWidgetProps {
  pets: Pet[]
  activePet?: { id: string; name: string; avatar_url?: string | null }
  onSuccess?: () => void
}

const APPETITE_OPTIONS = [
  { value: 'İyi', label: '😋 İyi' },
  { value: 'Orta', label: '😐 Orta' },
  { value: 'Kötü', label: '🤢 Kötü' }
]

const MOOD_OPTIONS = [
  { value: 'Mutlu', label: 'Mutlu 😄' },
  { value: 'Normal', label: 'Normal 😐' },
  { value: 'Yorgun', label: 'Yorgun 😴' },
  { value: 'Hırçın', label: 'Hırçın 😾' }
]

export default function QuickJournalWidget({ pets, activePet, onSuccess }: QuickJournalWidgetProps) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [appetite, setAppetite] = useState('')
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!pets || pets.length === 0) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePet?.id) return

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Oturum bulunamadı.')
      }

      const entriesToInsert = []
      if (appetite) {
        entriesToInsert.push({
          pet_id: activePet.id,
          user_id: session.user.id,
          entry_type: 'appetite',
          data: { level: appetite },
          note: notes || null
        })
      }
      if (mood) {
        entriesToInsert.push({
          pet_id: activePet.id,
          user_id: session.user.id,
          entry_type: 'mood',
          data: { mood: mood },
          note: appetite ? null : (notes || null)
        })
      }
      if (notes && !appetite && !mood) {
        entriesToInsert.push({
          pet_id: activePet.id,
          user_id: session.user.id,
          entry_type: 'note',
          data: {},
          note: notes
        })
      }

      const { error: insertError } = await supabase.from('pet_journal_entries').insert(entriesToInsert)

      if (insertError) throw insertError

      setSuccess(true)
      onSuccess?.()

      // Onboarding adımını tamamla
      try {
        await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'complete_step', 
            stepId: 'onb_journal' 
          })
        })
      } catch {
        // Onboarding hatası ana akışı engellemesin
      }

      setAppetite('')
      setMood('')
      setNotes('')
      setTimeout(() => {
        setSuccess(false)
        router.refresh()
      }, 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Günlük kaydedilirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-1.5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-[var(--color-border)]">
        {/* Pet avatar */}
        <div className="w-[34px] h-[34px] rounded-[10px] overflow-hidden flex-shrink-0"
             style={{background: 'linear-gradient(160deg,#c7bef7,#5D3FD3)'}}>
          {activePet?.avatar_url ? (
            <Image src={activePet.avatar_url} alt={activePet.name}
                   width={34} height={34} 
                   className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-[16px] font-black text-white/50">
              {activePet?.name?.charAt(0) || '?'}
            </span>
          )}
        </div>
        <div>
          <p className="text-[13px] font-800 text-[var(--color-text-primary)]">
            Sağlık Günlüğü
          </p>
          <p className="text-[10px] font-700 text-[var(--color-primary)]">
            {activePet?.name || 'Pet'} için
          </p>
        </div>
        <i className="ti ti-pencil ml-auto text-[var(--color-text-muted)] text-base" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* İştah Durumu */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">İştah Durumu</label>
          <div className="grid grid-cols-3 gap-2">
            {APPETITE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAppetite(opt.value)}
                className={`py-3 min-h-[44px] rounded-lg border text-xs font-bold transition-all ${
                  appetite === opt.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-extrabold scale-[1.03]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ruh Hali */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Ruh Hali</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMood(opt.value)}
                className={`py-3 min-h-[44px] rounded-lg border text-[11px] font-bold transition-all ${
                  mood === opt.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-extrabold scale-[1.03]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Not Alanı */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Kısa Notlar</label>
          <input
            type="text"
            placeholder="Bugün sıra dışı bir durum oldu mu? (İlaç, kusma vb.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs h-11 border border-[var(--color-border)] bg-[var(--color-surface)]/30 rounded-lg p-3 outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-text-muted)]"
          />
        </div>

        {/* Butonlar ve Mesajlar */}
        {error && <p className="text-[10px] text-danger font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={loading || success || (!appetite && !mood && !notes)}
          className={`w-full h-11 font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            success
              ? 'bg-[var(--color-success)] text-white'
              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
          }`}
        >
          {loading ? (
            'Kaydediliyor...'
          ) : success ? (
            <>
              <i className="ti ti-check text-[14px]" /> Kaydedildi!
            </>
          ) : (
            `${activePet?.name || 'Pet'}'in günlüğünü kaydet`
          )}
        </button>
      </form>
    </div>
  )
}
