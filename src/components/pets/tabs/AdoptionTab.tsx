'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Database } from '@/types'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

type PetRow = Database['public']['Tables']['pets']['Row']

interface Adoption {
  id: string
  pet_id: string
  user_id: string
  status: 'active' | 'completed' | 'cancelled'
  story: string | null
  requirements: string[] | null
  created_at: string
}

const AVAILABLE_REQUIREMENTS = [
  'Bahçeli Ev',
  'Deneyimli Sahip',
  'Çocuksuz Aile',
  'Tek Evcil Hayvan',
  'Aşı Karnesi Şartı',
  'Sözleşme Şartı',
  'Düzenli Veteriner Kontrolü'
]

export default function AdoptionTab({ pet }: { pet: PetRow }) {
  const [adoption, setAdoption] = useState<Adoption | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)

  // Toast state
  const [toastMsg, setToastMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMsg({ message, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  const isActive = adoption?.status === 'active'

  const fetchAdoption = useCallback(async () => {
    try {
      const res = await fetch(`/api/pets/${pet.id}/adoption`)
      const data = await res.json()
      if (res.ok) setAdoption(data.adoption ?? null)
      else setError('İlan bilgileri yüklenirken bir hata oluştu.')
    } catch { 
      setError('Bağlantı hatası: İlan yüklenemedi.')
    } finally { setLoading(false) }
  }, [pet.id])

  useEffect(() => { fetchAdoption() }, [fetchAdoption])

  const [storyInput, setStoryInput] = useState('')
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([])

  useEffect(() => {
    if (adoption?.story) {
      setStoryInput(adoption.story)
    }
    if (adoption?.requirements) {
      setSelectedRequirements(adoption.requirements)
    }
  }, [adoption?.story, adoption?.requirements, isEditing])

  async function handleToggle() {
    setToggling(true)
    setError(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/adoption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: isActive ? 'cancel' : 'activate',
          story: isActive ? null : storyInput,
          requirements: isActive ? null : selectedRequirements
        }),
      })
      const data = await res.json()
      if (!res.ok) { 
        setError(data.error)
        showToast('Bir hata oluştu.', 'error')
        return 
      }
      if (isActive) {
        showToast('İlan kapatıldı.', 'success')
      } else {
        showToast('İlan yayınlandı! 🎉', 'success')
      }
      fetchAdoption()
    } finally { setToggling(false) }
  }

  async function handleUpdate() {
    setToggling(true)
    setError(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/adoption`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          story: storyInput,
          requirements: selectedRequirements
        }),
      })
      const data = await res.json()
      if (!res.ok) { 
        setError(data.details ? 'Geçersiz veri: Hikaye 20-500 karakter arası olmalı.' : data.error)
        showToast('Bir hata oluştu.', 'error')
        return 
      }
      showToast('İlan güncellendi ✓', 'success')
      setIsEditing(false)
      fetchAdoption()
    } catch (err) {
      showToast('Bağlantı hatası.', 'error')
    } finally { 
      setToggling(false) 
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-fadeInUp">
        <div className="h-[200px] w-full bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeInUp relative">
      <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
        
        {isActive && !isEditing && (
          <div className="w-full flex justify-end">
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[13px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
            >
              Düzenle
            </button>
          </div>
        )}

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
          
          {isActive && !isEditing && adoption?.created_at && (
            <p className="text-[11px] text-text-secondary mt-2">
              İlan tarihi: {new Date(adoption.created_at).toLocaleDateString('tr-TR')}
            </p>
          )}
          
          {isActive && !isEditing && adoption?.story && (
            <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-left">
              <p className="text-[12px] text-text-secondary italic">"{adoption.story}"</p>
            </div>
          )}
          
          {isActive && !isEditing && adoption?.requirements && adoption.requirements.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {adoption.requirements.map(req => (
                <span key={req} className="px-2 py-1 bg-violet-50 text-violet-700 text-[11px] font-bold rounded-lg border border-violet-100/50">
                  {req}
                </span>
              ))}
            </div>
          )}
        </div>

        {(!isActive || isEditing) && (
          <div className="w-full text-left mt-2 flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-bold text-text-secondary ml-1">İlan Hikayesi (Opsiyonel)</label>
              <textarea
                value={storyInput}
                onChange={(e) => setStoryInput(e.target.value)}
                placeholder="Sahiplenecek kişi için küçük bir not..."
                className="input-base w-full min-h-[80px] mt-1.5 resize-none text-[13px]"
                maxLength={500}
              />
              <span className="text-[10px] text-text-tertiary ml-1 mt-1 block">
                {isEditing ? 'En az 20, en fazla 500 karakter' : 'En fazla 500 karakter'}
              </span>
            </div>
            
            <div>
              <label className="text-[12px] font-bold text-text-secondary ml-1">Sahiplenme Şartları (Opsiyonel)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_REQUIREMENTS.map(req => {
                  const isSelected = selectedRequirements.includes(req)
                  return (
                    <button
                      key={req}
                      onClick={() => {
                        if (isSelected) setSelectedRequirements(prev => prev.filter(r => r !== req))
                        else setSelectedRequirements(prev => [...prev, req])
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
                        isSelected 
                          ? 'bg-violet-100 text-violet-700 border-violet-200 shadow-inner'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      } border`}
                    >
                      {req}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="w-full p-3 rounded-lg text-[13px] font-medium bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {!isEditing ? (
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
        ) : (
          <div className="w-full flex gap-3">
             <button
              onClick={() => setIsEditing(false)}
              disabled={toggling}
              className="flex-1 py-3.5 text-[14px] font-black rounded-2xl transition-all active:scale-95 bg-slate-100 text-text-secondary hover:bg-slate-200 disabled:opacity-60"
            >
              İptal
            </button>
            <button
              onClick={handleUpdate}
              disabled={toggling}
              className="flex-1 py-3.5 text-[14px] font-black rounded-2xl transition-all active:scale-95 btn-primary bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
            >
              {toggling ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 animate-in slide-in-from-bottom flex items-center space-x-2 text-white font-medium ${toastMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toastMsg.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toastMsg.message}</span>
        </div>
      )}
    </div>
  )
}
