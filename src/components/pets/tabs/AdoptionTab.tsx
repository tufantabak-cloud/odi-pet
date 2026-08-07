'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Database } from '@/types'
import { ShieldCheck, AlertTriangle, MapPin, Heart, Info, CheckCircle2, Home } from 'lucide-react'
import { getSpeciesLabel } from '@/lib/species'
import { TURKIYE_ILLER } from '@/lib/utils/turkiyeIller'

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

  // Form states
  const [storyInput, setStoryInput] = useState('')
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([])
  const [cityInput, setCityInput] = useState<string>(pet.city || '')

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

  useEffect(() => {
    if (adoption?.story) {
      setStoryInput(adoption.story)
    }
    if (adoption?.requirements) {
      setSelectedRequirements(adoption.requirements)
    }
    if (pet.city) {
      setCityInput(pet.city)
    }
  }, [adoption?.story, adoption?.requirements, pet.city, isEditing])

  const getAgeText = (birthDate?: string | null) => {
    if (!birthDate) return ''
    const ageInMs = Date.now() - new Date(birthDate).getTime()
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12)
      return `${months} Aylık`
    }
    return `${Math.floor(ageInYears)} Yaşında`
  }

  const speciesName = getSpeciesLabel(pet.species)
  const speciesLower = speciesName.toLowerCase()

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
          requirements: isActive ? null : selectedRequirements,
          city: cityInput
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
          requirements: selectedRequirements,
          city: cityInput
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
        <div className="h-[200px] w-full bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeInUp relative">
      {/* 1. Pet Bilgi Kartı Özeti */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex gap-4 items-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 relative overflow-hidden shrink-0">
          {pet.avatar_url ? (
            <Image src={pet.avatar_url} alt={pet.name} fill sizes="64px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl font-bold">🐾</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-extrabold text-slate-900 text-base truncate">{pet.name}</h4>
            {pet.gender === 'male' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">♂ Erkek</span>}
            {pet.gender === 'female' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 shrink-0">♀ Dişi</span>}
          </div>
          <p className="text-xs text-slate-500 font-medium truncate">
            {[pet.breed || speciesName, getAgeText(pet.birth_date)].filter(Boolean).join(' • ')}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {(cityInput || pet.city) && (
              <span className="inline-flex items-center gap-1 text-2xs text-slate-500 font-medium">
                <MapPin className="w-3 h-3 text-violet-500 stroke-[2]" /> {cityInput || pet.city}
              </span>
            )}
            {pet.is_neutered && (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                ✓ Kısırlaştırılmış
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. İlan Yönetim Kartı */}
      <div className="p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] rounded-3xl flex flex-col items-center text-center gap-5">
        
        {isActive && !isEditing && (
          <div className="w-full flex justify-end">
            <button 
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold text-violet-700 bg-violet-50 px-3.5 py-1.5 rounded-xl hover:bg-violet-100 transition-colors"
            >
              Düzenle
            </button>
          </div>
        )}

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${
          isActive
            ? 'bg-gradient-to-tr from-emerald-100 to-teal-50 text-emerald-600'
            : 'bg-gradient-to-tr from-violet-100 to-indigo-50 text-violet-600'
        }`}>
          {isActive ? <CheckCircle2 className="w-7 h-7 stroke-[2]" /> : <Home className="w-7 h-7 stroke-[2]" />}
        </div>
        
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg mb-1">
            {isActive ? 'İlan Aktif' : 'Yeni Bir Yuva Bul'}
          </h3>
          <p className="text-xs text-slate-500 font-normal leading-relaxed max-w-sm mx-auto">
            {isActive
              ? `${pet.name} şu anda sahiplendirme sekmesinde yuva arıyor.`
              : `${pet.name} için sahiplendirme ilanı oluşturun. İlan ${speciesLower} sahiplenmek isteyen tüm kullanıcılara gösterilecektir.`}
          </p>
          
          {isActive && !isEditing && adoption?.created_at && (
            <p className="text-2xs text-slate-400 font-medium mt-2">
              İlan tarihi: {new Date(adoption.created_at).toLocaleDateString('tr-TR')}
            </p>
          )}
          
          {isActive && !isEditing && adoption?.story && (
            <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-left">
              <p className="text-xs text-slate-600 italic">"{adoption.story}"</p>
            </div>
          )}
          
          {isActive && !isEditing && adoption?.requirements && adoption.requirements.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {adoption.requirements.map(req => (
                <span key={req} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-2xs font-semibold rounded-lg border border-violet-100">
                  {req}
                </span>
              ))}
            </div>
          )}
        </div>

        {(!isActive || isEditing) && (
          <div className="w-full text-left mt-1 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 ml-1">İlan Şehri / Konum</label>
              <select
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="w-full mt-1.5 p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="">Şehir Seçin...</option>
                {Object.keys(TURKIYE_ILLER).sort().map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 ml-1">İlan Hikayesi (Opsiyonel)</label>
              <textarea
                value={storyInput}
                onChange={(e) => setStoryInput(e.target.value)}
                placeholder="Sahiplenecek kişi için küçük bir not..."
                className="w-full min-h-[90px] mt-1.5 p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-xs font-normal text-slate-900 placeholder:text-slate-400"
                maxLength={500}
              />
              <span className="text-2xs text-slate-400 ml-1 mt-1 block">
                {isEditing ? 'En az 20, en fazla 500 karakter' : 'En fazla 500 karakter'}
              </span>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-700 ml-1">Sahiplenme Şartları (Opsiyonel)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_REQUIREMENTS.map(req => {
                  const isSelected = selectedRequirements.includes(req)
                  return (
                    <button
                      key={req}
                      type="button"
                      onClick={() => {
                        if (isSelected) setSelectedRequirements(prev => prev.filter(r => r !== req))
                        else setSelectedRequirements(prev => [...prev, req])
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected 
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
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
          <div className="w-full p-3 rounded-2xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {!isEditing ? (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`w-full py-3.5 text-xs font-extrabold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60 shadow-sm ${
              isActive
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
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
              className="flex-1 py-3.5 text-xs font-bold rounded-2xl transition-all active:scale-[0.98] bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              İptal
            </button>
            <button
              onClick={handleUpdate}
              disabled={toggling}
              className="flex-1 py-3.5 text-xs font-extrabold rounded-2xl transition-all active:scale-[0.98] bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/20 disabled:opacity-60"
            >
              {toggling ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-2xl shadow-lg z-50 animate-in slide-in-from-bottom flex items-center space-x-2 text-white text-xs font-bold ${toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toastMsg.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMsg.message}</span>
        </div>
      )}
    </div>
  )
}
