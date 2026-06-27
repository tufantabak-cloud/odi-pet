'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

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
      <div className="flex bg-slate-50 p-1 rounded-xl border border-border-main">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${
            activeTab === 'incoming' 
              ? 'bg-white text-violet-700 shadow-sm border border-violet-100' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Gelen Başvurular
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${
            activeTab === 'outgoing' 
              ? 'bg-white text-violet-700 shadow-sm border border-violet-100' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Başvurularım
        </button>
      </div>

      {activeTab === 'incoming' && (
        <div className="flex flex-col gap-3">
          {loadingIncoming ? (
            <div className="p-4 text-center text-[12px] text-text-secondary animate-pulse">Yükleniyor...</div>
          ) : incomingApps.length === 0 ? (
            <div className="bg-surface border border-border-main rounded-xl p-6 text-center">
              <p className="text-[13px] text-text-secondary">Henüz gelen bir başvuru yok.</p>
            </div>
          ) : (
            incomingApps.map(app => {
              const profile = app.profiles
              const isPending = app.status === 'pending'
              const isApproved = app.status === 'approved'
              const isRejected = app.status === 'rejected'

              return (
                <div key={app.id} className="bg-white border border-border-main rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative">
                        {profile?.avatar_url ? (
                          <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-lg">👤</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-[13px] text-text-primary">{profile?.full_name || 'İsimsiz'}</h4>
                        <p className="text-[11px] text-text-secondary">
                          {new Date(app.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    {isPending && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md">⏳ Bekliyor</span>}
                    {isApproved && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md">✅ Onaylandı</span>}
                    {isRejected && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md">❌ Reddedildi</span>}
                  </div>

                  {app.message && (
                    <div className="bg-slate-50 p-2.5 rounded-lg text-[12px] text-text-primary italic border border-slate-100">
                      "{app.message}"
                    </div>
                  )}

                  {isApproved && profile?.phone && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex justify-between items-center mt-1">
                      <span className="text-[13px] font-bold text-green-800">📱 {profile.phone}</span>
                      <a href={`tel:${profile.phone}`} className="text-[11px] bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">
                        Ara
                      </a>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex gap-2 mt-2 border-t border-border-main pt-3">
                      <button 
                        onClick={() => handleUpdateStatus(app.id, 'rejected')}
                        className="flex-1 py-2 text-[12px] font-bold border border-border-main rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        ❌ Reddet
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(app.id, 'approved')}
                        className="flex-1 py-2 text-[12px] font-bold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        ✅ Onayla
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
            <div className="p-4 text-center text-[12px] text-text-secondary animate-pulse">Yükleniyor...</div>
          ) : outgoingApps.length === 0 ? (
            <div className="bg-surface border border-border-main rounded-xl p-6 text-center">
              <p className="text-[13px] text-text-secondary">Henüz yaptığınız bir başvuru yok.</p>
            </div>
          ) : (
            outgoingApps.map(app => {
              const pet = app.pet_adoptions?.pets
              const isPending = app.status === 'pending'
              const isApproved = app.status === 'approved'
              const isRejected = app.status === 'rejected'

              return (
                <div key={app.id} className="bg-white border border-border-main rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden relative shrink-0">
                      {pet?.avatar_url ? (
                        <Image src={pet.avatar_url} alt="Pet" fill className="object-cover" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-lg">🐾</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[13px] text-text-primary truncate">{pet?.name || 'Bilinmeyen'}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-text-secondary">
                          {new Date(app.created_at).toLocaleDateString('tr-TR')}
                        </span>
                        {isPending && <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Bekliyor</span>}
                        {isApproved && <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Onaylandı</span>}
                        {isRejected && <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Reddedildi</span>}
                      </div>
                    </div>
                  </div>
                  
                  {isPending && (
                    <button 
                      onClick={() => handleWithdraw(app.id)}
                      className="px-3 py-1.5 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg shrink-0 transition-colors"
                    >
                      Geri Çek
                    </button>
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
