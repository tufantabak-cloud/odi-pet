'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { User, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react'

export function AdoptionApplicationsManager({ petId, listingId }: { petId?: string; listingId?: string }) {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  
  const [incomingApps, setIncomingApps] = useState<any[]>([])
  const [loadingIncoming, setLoadingIncoming] = useState(true)

  const [outgoingApps, setOutgoingApps] = useState<any[]>([])
  const [loadingOutgoing, setLoadingOutgoing] = useState(true)

  useEffect(() => {
    if (activeTab === 'incoming' && listingId) {
      fetchIncoming()
    } else if (activeTab === 'outgoing') {
      fetchOutgoing()
    }
  }, [activeTab, listingId])

  const fetchIncoming = async () => {
    setLoadingIncoming(true)
    try {
      const res = await fetch(`/api/adoption-applications?listing_id=${listingId}`)
      const data = await res.json()
      if (res.ok) {
        setIncomingApps(data.applications || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingIncoming(false)
    }
  }

  const fetchOutgoing = async () => {
    setLoadingOutgoing(true)
    try {
      const res = await fetch(`/api/adoption-applications`)
      const data = await res.json()
      if (res.ok) {
        setOutgoingApps(data.applications || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOutgoing(false)
    }
  }

  const handleUpdateStatus = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/adoption-applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        setIncomingApps(apps => apps.map(app => app.id === appId ? { ...app, status } : app))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleWithdraw = async (appId: string) => {
    if (!confirm('Başvurunuzu geri çekmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/adoption-applications/${appId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setOutgoingApps(apps => apps.filter(app => app.id !== appId))
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex bg-slate-100/70 p-1 rounded-2xl border border-slate-200/60">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'incoming' 
              ? 'bg-white text-violet-700 shadow-sm border border-violet-100' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Gelen Başvurular
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'outgoing' 
              ? 'bg-white text-violet-700 shadow-sm border border-violet-100' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Başvurularım
        </button>
      </div>

      {activeTab === 'incoming' && (
        <div className="flex flex-col gap-3">
          {loadingIncoming ? (
            <div className="p-6 text-center text-xs text-slate-400 animate-pulse font-normal">Başvurular yükleniyor...</div>
          ) : incomingApps.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
              <p className="text-xs text-slate-500 font-normal">Henüz gelen bir başvuru yok.</p>
            </div>
          ) : (
            incomingApps.map(app => {
              const profile = app.profiles
              const isPending = app.status === 'pending'
              const isApproved = app.status === 'approved'
              const isRejected = app.status === 'rejected'

              return (
                <div key={app.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative flex items-center justify-center text-slate-500">
                        {profile?.avatar_url ? (
                          <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
                        ) : (
                          <User className="w-5 h-5 stroke-[1.75]" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-slate-900">{profile?.full_name || 'İsimsiz'}</h4>
                        <p className="text-2xs text-slate-400">
                          {new Date(app.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    {isPending && <span className="bg-amber-50 text-amber-700 border border-amber-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><Clock className="w-3 h-3 stroke-[2]" /> Bekliyor</span>}
                    {isApproved && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3 h-3 stroke-[2]" /> Onaylandı</span>}
                    {isRejected && <span className="bg-rose-50 text-rose-700 border border-rose-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><XCircle className="w-3 h-3 stroke-[2]" /> Reddedildi</span>}
                  </div>

                  {app.message && (
                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 italic border border-slate-100">
                      "{app.message}"
                    </div>
                  )}

                  {isPending && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleUpdateStatus(app.id, 'rejected')}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5 stroke-[2] text-rose-500" />
                        Reddet
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(app.id, 'approved')}
                        className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
                        Onayla
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'outgoing' && (
        <div className="flex flex-col gap-3">
          {loadingOutgoing ? (
            <div className="p-6 text-center text-xs text-slate-400 animate-pulse font-normal">Başvurular yükleniyor...</div>
          ) : outgoingApps.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
              <p className="text-xs text-slate-500 font-normal">Henüz bir sahiplendirme başvurusunda bulunmadınız.</p>
            </div>
          ) : (
            outgoingApps.map(app => {
              const isPending = app.status === 'pending'
              const isApproved = app.status === 'approved'
              const isRejected = app.status === 'rejected'

              return (
                <div key={app.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900">İlan ID: #{app.listing_id?.slice(0, 8)}</h4>
                      <p className="text-2xs text-slate-400">
                        {new Date(app.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    {isPending && <span className="bg-amber-50 text-amber-700 border border-amber-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><Clock className="w-3 h-3 stroke-[2]" /> Bekliyor</span>}
                    {isApproved && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3 h-3 stroke-[2]" /> Onaylandı</span>}
                    {isRejected && <span className="bg-rose-50 text-rose-700 border border-rose-200/60 text-2xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"><XCircle className="w-3 h-3 stroke-[2]" /> Reddedildi</span>}
                  </div>

                  {app.message && (
                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 italic border border-slate-100">
                      "{app.message}"
                    </div>
                  )}

                  {isPending && (
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        className="py-1.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-2xs active:scale-[0.98] transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3 stroke-[2]" />
                        Başvuruyu Geri Çek
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

