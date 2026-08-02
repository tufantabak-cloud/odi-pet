'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function EditProfileForm({ profile }: { profile: any }) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setSuccessToast(true)
      router.refresh()
      setTimeout(() => setSuccessToast(false), 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Profil güncellenirken bir hata oluştu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-12">
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-xl animate-scaleIn"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Bilgiler başarıyla güncellendi.
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 rounded-xl bg-rose-50 text-error text-xs font-semibold border border-rose-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-text-secondary ml-1">Adınız</label>
        <input
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
          className="input-base rounded-2xl"
          placeholder="Adınız"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-text-secondary ml-1">Soyadınız</label>
        <input
          type="text"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required
          className="input-base rounded-2xl"
          placeholder="Soyadınız"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-text-secondary ml-1">Telefon Numarası</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="input-base rounded-2xl"
          placeholder="0555 555 5555"
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1 min-h-[48px] rounded-2xl flex items-center justify-center text-sm font-semibold active:scale-[0.98]"
          disabled={isSubmitting}
        >
          İptal
        </button>
        <button
          type="submit"
          className="btn-primary flex-1 min-h-[48px] rounded-2xl flex items-center justify-center text-sm font-semibold active:scale-[0.98]"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  )
}
