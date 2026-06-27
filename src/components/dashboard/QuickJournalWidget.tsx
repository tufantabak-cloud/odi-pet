'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Pencil, Check } from 'lucide-react'

interface Pet {
  id: string
  name: string
}

interface QuickJournalWidgetProps {
  pets: Pet[]
}

const APPETITE_OPTIONS = [
  { value: 'İyi', label: '😋 İyi' },
  { value: 'Orta', label: '😐 Orta' },
  { value: 'Kötü', label: '🤢 Kötü' }
]

const MOOD_OPTIONS = [
  { value: 'Mutlu', label: '😸 Mutlu' },
  { value: 'Normal', label: '😐 Normal' },
  { value: 'Yorgun', label: '😴 Yorgun' },
  { value: 'Hırçın', label: '😾 Hırçın' }
]

export default function QuickJournalWidget({ pets }: QuickJournalWidgetProps) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id || '')
  const [appetite, setAppetite] = useState('')
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!pets || pets.length === 0) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPetId) return

    setLoading(true)
    setError('')

    try {
      const { error: insertError } = await supabase.from('journal_entries').insert({
        pet_id: selectedPetId,
        date: new Date().toISOString().split('T')[0],
        appetite: appetite || null,
        mood: mood || null,
        notes: notes || null
      })

      if (insertError) throw insertError

      setSuccess(true)

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
    <div className="mx-4 p-4 rounded-xl bg-white border border-teal-100 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Pencil size={15} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 leading-none">Bugünkü Günlük</h3>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">Hızlı iştah, ruh hali ve not girişi</span>
          </div>
        </div>

        {/* Pet Seçici */}
        {pets.length > 1 && (
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 outline-none"
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* İştah Durumu */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">İştah Durumu</label>
          <div className="grid grid-cols-3 gap-2">
            {APPETITE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAppetite(opt.value)}
                className={`py-3 min-h-[44px] rounded-lg border text-xs font-bold transition-all ${
                  appetite === opt.value
                    ? 'border-teal-600 bg-teal-50/50 text-teal-700 font-extrabold scale-[1.03]'
                    : 'border-gray-100 bg-gray-50/30 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ruh Hali */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ruh Hali</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMood(opt.value)}
                className={`py-3 min-h-[44px] rounded-lg border text-[11px] font-bold transition-all ${
                  mood === opt.value
                    ? 'border-teal-600 bg-teal-50/50 text-teal-700 font-extrabold scale-[1.03]'
                    : 'border-gray-100 bg-gray-50/30 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Not Alanı */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kısa Notlar</label>
          <input
            type="text"
            placeholder="Bugün sıra dışı bir durum oldu mu? (İlaç, kusma vb.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs h-11 border border-gray-100 bg-gray-50/30 rounded-lg p-3 outline-none focus:border-teal-600 transition-colors placeholder:text-gray-400"
          />
        </div>

        {/* Butonlar ve Mesajlar */}
        {error && <p className="text-[10px] text-red-500 font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={loading || success || (!appetite && !mood && !notes)}
          className={`w-full h-11 font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            success
              ? 'bg-green-600 text-white'
              : 'bg-teal-600 hover:bg-teal-700 text-white active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
          }`}
        >
          {loading ? (
            'Kaydediliyor...'
          ) : success ? (
            <>
              <Check size={14} /> Kaydedildi!
            </>
          ) : (
            'Günlüğü Kaydet'
          )}
        </button>
      </form>
    </div>
  )
}
