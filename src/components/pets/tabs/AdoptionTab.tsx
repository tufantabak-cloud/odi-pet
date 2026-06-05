'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface Adoption {
  id: string
  pet_id: string
  user_id: string
  status: 'active' | 'completed' | 'cancelled'
  story: string | null
  created_at: string
}

export default function AdoptionTab({ pet }: { pet: any }) {
  const [adoption, setAdoption] = useState<Adoption | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isActive = adoption?.status === 'active'

  const fetchAdoption = useCallback(async () => {
    try {
      const res = await fetch(`/api/pets/${pet.id}/adoption`)
      const data = await res.json()
      if (res.ok) setAdoption(data.adoption ?? null)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [pet.id])

  useEffect(() => { fetchAdoption() }, [fetchAdoption])

  async function handleToggle() {
    setToggling(true)
    setError(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/adoption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isActive ? 'cancel' : 'activate' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      fetchAdoption()
    } finally { setToggling(false) }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-fadeInUp">
        <div className="card-base p-8 text-center text-text-secondary text-[14px]">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeInUp">
      <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${
          isActive
            ? 'bg-gradient-to-tr from-green-100 to-emerald-50'
            : 'bg-gradient-to-tr from-amber-100 to-orange-50'
        }`}>
          <span className="text-2xl">{isActive ? '✅' : '🏠'}</span>
        </div>
        <div>
          <h3 className="font-extrabold text-text-primary text-[17px] mb-1">
            {isActive ? 'İlan Aktif' : 'Yeni Bir Yuva Bul'}
          </h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            {isActive
              ? `${pet.name} şu anda sahiplendirme için listeleniyor.`
              : `${pet.name} için sahiplendirme ilanı oluşturun. İlan ${pet.species} sahiplenmek isteyen kullanıcılara gösterilir.`}
          </p>
          {isActive && adoption?.created_at && (
            <p className="text-[11px] text-text-secondary mt-2">
              İlan tarihi: {new Date(adoption.created_at).toLocaleDateString('tr-TR')}
            </p>
          )}
        </div>

        {error && (
          <div className="w-full p-3 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`w-full py-3.5 text-[14px] font-black rounded-2xl transition-all active:scale-95 disabled:opacity-60 ${
            isActive
              ? 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              : 'btn-primary bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {toggling
            ? (isActive ? 'Kapatılıyor...' : 'Oluşturuluyor...')
            : (isActive ? 'İlanı Kapat' : 'İlan Oluştur')
          }
        </button>
      </div>
    </div>
  )
}
