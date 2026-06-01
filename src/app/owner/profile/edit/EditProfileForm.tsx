'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function EditProfileForm({ profile }: { profile: any }) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      router.replace('/owner/profile')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Profil güncellenirken bir hata oluştu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-error/10 text-error text-[13px] font-medium border border-error/20">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-secondary ml-1">Adınız</label>
        <input 
          autoFocus
          type="text" 
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required 
          className="input-base"
          placeholder="Adınız"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-secondary ml-1">Soyadınız</label>
        <input 
          type="text" 
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required 
          className="input-base"
          placeholder="Soyadınız"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-secondary ml-1">Telefon Numarası</label>
        <input 
          type="tel" 
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="input-base"
          placeholder="0555 555 5555"
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button 
          type="button" 
          onClick={() => router.back()}
          className="btn-secondary flex-1 py-3"
          disabled={isSubmitting}
        >
          İptal
        </button>
        <button 
          type="submit" 
          className="btn-primary flex-1 py-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  )
}
