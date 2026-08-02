'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { User, Activity, Clock, CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

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
    return <div className="p-6 text-center text-slate-400 text-xs animate-pulse font-normal">Başvurular yükleniyor...</div>
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center flex flex-col items-center gap-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
          <FileText className="w-6 h-6 stroke-[1.75]" />
        </div>
        <p className="text-xs text-slate-500 font-normal">İlanınıza henüz başvuru gelmedi.</p>
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
          <div key={app.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden relative shrink-0">
                {pet?.avatar_url ? (
                  <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">🐾</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-slate-900 text-base truncate">{pet?.name}</h4>
                  {isApproved && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3 h-3 stroke-[2]" /> Onaylandı</span>}
                  {isRejected && <span className="bg-rose-50 text-rose-700 border border-rose-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><XCircle className="w-3 h-3 stroke-[2]" /> Reddedildi</span>}
                  {isPending && <span className="bg-amber-50 text-amber-700 border border-amber-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><Clock className="w-3 h-3 stroke-[2]" /> Bekliyor</span>}
                </div>
                <p className="text-xs text-slate-500 font-normal">
                  {pet?.breed || pet?.species} {pet?.birth_date && ` • ${getAge(pet.birth_date)}`}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-400 stroke-[2]" /> {profile?.full_name || 'İsimsiz Kullanıcı'}
                </p>
              </div>
            </div>

            {app.message && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-700 italic">
                "{app.message}"
              </div>
            )}

            <button 
              onClick={() => toggleHealthSummary(app.id)}
              className="text-left w-full flex items-center justify-between p-3 bg-violet-50/70 hover:bg-violet-100/60 rounded-2xl transition-colors border border-violet-100/60"
            >
              <span className="text-xs font-semibold text-violet-700 flex items-center gap-2">
                <Activity className="w-4 h-4 stroke-[2]" /> Sağlık Özeti
              </span>
              <span className="text-violet-500 text-xs font-semibold flex items-center gap-1">
                {expandedHealth === app.id ? <>Gizle <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" /></> : <>Gör <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" /></>}
              </span>
            </button>

            {expandedHealth === app.id && (
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 flex flex-col gap-2.5 animate-fadeIn">
                <h5 className="text-2xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 pb-1">AŞI GEÇMİŞİ</h5>
                {healthLoading ? (
                  <div className="animate-pulse flex flex-col gap-2">
                    <div className="h-4 bg-slate-200/60 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-slate-200/60 rounded-lg w-1/2"></div>
                  </div>
                ) : healthData && healthData.length > 0 ? (
                  healthData.map((v: any, idx: number) => {
                    const isOverdue = v.next_due_at && new Date(v.next_due_at) < new Date()
                    const isUpcoming = v.next_due_at && !isOverdue && new Date(v.next_due_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    return (
                      <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                        <div className="flex gap-2 items-start">
                          {isOverdue ? <XCircle className="w-4 h-4 text-rose-500 stroke-[2] shrink-0 mt-0.5" /> : isUpcoming ? <AlertTriangle className="w-4 h-4 text-amber-500 stroke-[2] shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[2] shrink-0 mt-0.5" />}
                          <div>
                            <p className="font-semibold text-slate-900">{v.vaccine_name}</p>
                            {v.next_due_at && (
                              <p className={`text-2xs ${isOverdue ? 'text-rose-600 font-semibold' : isUpcoming ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                                Sonraki: {new Date(v.next_due_at).toLocaleDateString('tr-TR')}
                              </p>
                            )}
                          </div>
                        </div>
                        {v.administered_at && <span className="text-slate-400 text-xs font-normal">{new Date(v.administered_at).toLocaleDateString('tr-TR')}</span>}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-slate-500 font-normal">Bu pet için aşı kaydı bulunmuyor.</p>
                )}
              </div>
            )}

            {isApproved && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2]" /> 
                  Başvuru Onaylandı
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed font-normal">
                  Güvenli iletişim özelliği sonraki aşamada açılacaktır. Çift taraflı onay sistemi hazır olduğunda karşılıklı iletişim kurabileceksiniz.
                </p>
              </div>
            )}

            {isPending && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button 
                  onClick={() => handleUpdateStatus(app.id, 'rejected')}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                >
                  <XCircle className="w-4 h-4 stroke-[2] text-rose-500" /> Reddet
                </button>
                <button 
                  onClick={() => handleUpdateStatus(app.id, 'approved')}
                  className="flex-1 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs active:scale-[0.98] transition-all shadow-sm shadow-violet-600/20 flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2]" /> Onayla
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

