'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface PetDetails {
  name: string;
  avatar_url: string | null;
  species: string;
  breed: string | null;
  city: string;
}

interface LostReport {
  id: string;
  status: string;
  last_seen_location: string;
  contact_phone: string | null;
  created_at: string;
  pets: PetDetails;
}

export default function FloatingLostPets({ userCities }: { userCities: string[] }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lostReports, setLostReports] = useState<LostReport[]>([])
  const [loaded, setLoaded] = useState(false)
  const [hasMyActiveReport, setHasMyActiveReport] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (userCities.length === 0) {
      setLoaded(true)
      return
    }

    const supabase = createBrowserSupabaseClient()

    Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('lost_reports')
        .select('*, pets!inner(name, avatar_url, species, breed, city, owner_id)')
        .eq('status', 'active')
        .in('pets.city', userCities)
        .order('created_at', { ascending: false })
        .limit(10)
    ]).then(([userRes, reportsRes]) => {
      const currentUser = userRes.data?.user
      const data = reportsRes.data
      const error = reportsRes.error

      if (!error && data) {
        setLostReports(data as any)
        if (currentUser) {
          const hasOwn = data.some((r: any) => r.pets?.owner_id === currentUser.id && r.status === 'active')
          setHasMyActiveReport(hasOwn)
        }
      }
      setLoaded(true)
    })
  }, [userCities])

  if (!loaded || lostReports.length === 0) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:items-end"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-surface rounded-[28px] p-7 shadow-2xl mb-0 sm:mb-20 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(255,107,107,0.12)' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '20px', color: 'var(--color-danger)' }} />
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-text-primary">Kayıp İlanları</h2>
            <p className="text-[13px] text-text-secondary">Çevrenizdeki dostlarımıza yardım edin</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto scrollbar-none pb-2">
          {lostReports.map((report) => (
            <div
              key={report.id}
              className="border border-[var(--color-danger)]/20 rounded-[20px] p-4 flex flex-col gap-3 relative shadow-sm"
              style={{ background: 'rgba(255,107,107,0.04)' }}
            >
              <div className="absolute top-4 right-4 w-3 h-3 bg-[var(--color-danger)] rounded-full animate-ping opacity-75" />
              <div className="flex items-center gap-3">
                {report.pets?.avatar_url ? (
                  <div className="w-12 h-12 relative rounded-[14px] bg-white shadow-sm overflow-hidden border border-[var(--color-danger)]/10 shrink-0">
                    <Image src={report.pets.avatar_url} alt={report.pets.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[16px] shrink-0"
                       style={{background: 'linear-gradient(160deg, #ffb3b3, #FF6B6B)'}}>
                    {(report.pets?.name || '?').charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-extrabold text-text-primary text-[15px] truncate">{report.pets?.name}</p>
                  <p className="text-[11px] text-text-secondary font-medium truncate">
                    {report.pets?.species} • {report.pets?.breed || 'Bilinmiyor'}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-[12px] p-2.5 border border-[var(--color-danger)]/10">
                <p className="text-[11px] text-text-secondary mb-0.5">Son Görülme</p>
                <p className="text-[13px] font-bold text-text-primary leading-tight line-clamp-2">
                  {report.last_seen_location}
                </p>
              </div>
              {report.contact_phone && (
                <a
                  href={`tel:${report.contact_phone}`}
                  className="w-full bg-[var(--color-danger)] text-white font-bold text-[13px] rounded-xl py-2.5 text-center flex items-center justify-center gap-2 hover:bg-[var(--color-danger)]/90 active:scale-[0.98] transition-all animate-none"
                >
                  <i className="ti ti-phone" style={{ fontSize: '13px' }} />
                  Hemen Ara
                </a>
              )}
            </div>
          ))}
        </div>

        <button onClick={() => setOpen(false)} className="btn-secondary w-full mt-4 py-3 text-[14px]">
          Kapat
        </button>
      </div>
    </div>
  )

  return (
    <>
      {open && mounted && createPortal(modalContent, document.body)}

      <button
        onClick={() => setOpen(true)}
        className="relative w-[38px] h-[38px] rounded-full flex items-center justify-center shadow-md focus:outline-none transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: hasMyActiveReport ? '#dc2626' : 'var(--color-danger)' }}
        aria-label="Kayıp İlanları"
      >
        {/* Sürekli pulse — aktif ilan var demek */}
        <span
          className="absolute inset-[-3px] rounded-full border-2 opacity-50 animate-ping"
          style={{ borderColor: hasMyActiveReport ? '#dc2626' : 'var(--color-danger)' }}
        />

        <i className="ti ti-alert-triangle text-white text-[18px] relative z-10" />

        {/* Birden fazla ilan varsa sayı badge'i */}
        {lostReports.length > 1 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-surface z-10">
            {lostReports.length > 9 ? '9+' : lostReports.length}
          </span>
        )}
      </button>
    </>
  )
}
