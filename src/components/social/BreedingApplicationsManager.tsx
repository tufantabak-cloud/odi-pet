'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function BreedingApplicationsManager({ listingId }: { listingId: string }) {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedHealth, setExpandedHealth] = useState<string | null>(null)
  const [healthData, setHealthData] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [listingId])

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/breeding-listings/${listingId}/applications`)
      const data = await res.json()
      if (res.ok) {
        setApplications(data.applications || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleHealthSummary = async (appId: string) => {
    if (expandedHealth === appId) {
      setExpandedHealth(null)
      return
    }
    setExpandedHealth(appId)
    setHealthLoading(true)
    setHealthData(null)
    try {
      const res = await fetch(`/api/breeding-applications/${appId}/health-summary`)
      const data = await res.json()
      if (res.ok) {
        setHealthData(data.vaccines || [])
      } else {
        setHealthData([])
      }
    } catch (err) {
      setHealthData([])
    } finally {
      setHealthLoading(false)
    }
  }

  const handleUpdateStatus = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/breeding-applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        setApplications(apps => apps.map(app => app.id === appId ? { ...app, status } : app))
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-text-secondary text-sm animate-pulse">Başvurular yükleniyor...</div>
  }

  if (applications.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
        <span className="text-3xl grayscale opacity-50">📬</span>
        <p className="text-[14px] text-slate-500 font-medium">İlanınıza henüz başvuru gelmedi.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {applications.map(app => {
        const pet = app.pets
        const profile = app.profiles
        const isApproved = app.status === 'approved'
        const isRejected = app.status === 'rejected'
        const isPending = app.status === 'pending'
        
        const getAge = (birthDate: string) => {
          const ageInMs = Date.now() - new Date(birthDate).getTime()
          const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
          if (ageInYears < 1) return `${Math.floor(ageInYears * 12)} aylık`
          return `${Math.floor(ageInYears)} yaşında`
        }

        return (
          <div key={app.id} className="bg-white border border-border-main rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden relative shrink-0">
                {pet?.avatar_url ? (
                  <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="56px" className="object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-2xl">🐾</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-black text-text-primary text-[16px] truncate">{pet?.name}</h4>
                  {isApproved && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Onaylandı</span>}
                  {isRejected && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Reddedildi</span>}
                  {isPending && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Bekliyor</span>}
                </div>
                <p className="text-[12px] text-text-secondary font-medium">
                  {pet?.breed || pet?.species} {pet?.birth_date && ` • ${getAge(pet.birth_date)}`}
                </p>
                <p className="text-[12px] text-text-secondary">👤 {profile?.full_name || 'İsimsiz Kullanıcı'}</p>
              </div>
            </div>

            {app.message && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[13px] text-text-primary italic">
                "{app.message}"
              </div>
            )}

            <button 
              onClick={() => toggleHealthSummary(app.id)}
              className="text-left w-full flex items-center justify-between p-3 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors border border-violet-100"
            >
              <span className="text-[13px] font-bold text-violet-700 flex items-center gap-2">
                <span>🏥</span> Sağlık Özeti
              </span>
              <span className="text-violet-500 text-xs">{expandedHealth === app.id ? 'Gizle ▲' : 'Gör ▼'}</span>
            </button>

            {expandedHealth === app.id && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2 animate-fadeIn">
                <h5 className="text-[12px] font-bold text-text-secondary border-b border-slate-200 pb-1 mb-1">AŞI GEÇMİŞİ</h5>
                {healthLoading ? (
                  <div className="animate-pulse flex flex-col gap-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ) : healthData && healthData.length > 0 ? (
                  healthData.map((v: any, idx: number) => {
                    const isOverdue = v.next_due_at && new Date(v.next_due_at) < new Date()
                    const isUpcoming = v.next_due_at && !isOverdue && new Date(v.next_due_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    return (
                      <div key={idx} className="flex justify-between items-start gap-2 text-[12px]">
                        <div className="flex gap-1.5 items-start">
                          <span className="mt-0.5">{isOverdue ? '❌' : isUpcoming ? '⚠️' : '✅'}</span>
                          <div>
                            <p className="font-bold text-text-primary">{v.vaccine_name}</p>
                            {v.next_due_at && (
                              <p className={`text-[10px] ${isOverdue ? 'text-red-600 font-bold' : isUpcoming ? 'text-amber-600 font-bold' : 'text-text-secondary'}`}>
                                ⏰ Sonraki: {new Date(v.next_due_at).toLocaleDateString('tr-TR')}
                              </p>
                            )}
                          </div>
                        </div>
                        {v.administered_at && <span className="text-text-secondary">{new Date(v.administered_at).toLocaleDateString('tr-TR')}</span>}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-[12px] text-slate-500">Bu pet için aşı kaydı bulunmuyor.</p>
                )}
              </div>
            )}

            {isApproved && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-[14px]">
                    <span className="text-lg">📱</span> 
                    {profile?.phone ? profile.phone : 'Telefon numarası gizli veya yok'}
                  </div>
                  {profile?.phone && (
                    <a href={`tel:${profile.phone}`} className="btn-primary bg-blue-600 hover:bg-blue-700 py-2 px-4 text-xs">
                      Ara
                    </a>
                  )}
                </div>
                {!profile?.phone && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-2">
                    <span>🔒</span> 
                    <span>Karşı taraf iletişim bilgilerini gizlemiş veya henüz telefon numarası eklememiş. Bu işlem için Premium plana geçmeniz gerekebilir.</span>
                  </div>
                )}
                <p className="text-[10px] text-blue-600/70 text-center mt-1">Bu iletişim bilgisi yalnızca eşleşme amacıyla paylaşılmaktadır.</p>
                
                <div className="mt-2 pt-2 border-t border-blue-100/50">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('Eşleşme Sözleşmesi Şablonu yakında eklenecektir!')
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-violet-600 font-bold hover:text-violet-800 transition-colors"
                  >
                    📄 Eşleşme Sözleşmesi Şablonunu İndir (Çok Yakında)
                  </a>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    Taraflar arasında imzalanması önerilir.
                  </p>
                </div>
              </div>
            )}

            {isPending && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button 
                  onClick={() => handleUpdateStatus(app.id, 'rejected')}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-500 font-bold text-[13px] hover:bg-slate-50 transition-colors"
                >
                  ❌ Reddet
                </button>
                <button 
                  onClick={() => handleUpdateStatus(app.id, 'approved')}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-[13px] hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                >
                  ✅ Onayla
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
