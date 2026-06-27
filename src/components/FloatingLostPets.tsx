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

  // Veriler yüklenmeden veya şehirde eşleşen ilan yoksa (veya kendi ilanı varsa)
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
          <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
            <span className="text-[24px]">🚨</span>
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
              className="bg-warning/5 border border-warning/20 rounded-[20px] p-4 flex flex-col gap-3 relative shadow-sm"
            >
              <div className="absolute top-4 right-4 w-3 h-3 bg-warning rounded-full animate-ping opacity-75" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 relative rounded-[14px] bg-white shadow-sm overflow-hidden border border-warning/10 shrink-0 flex items-center justify-center text-warning">
                  {report.pets?.avatar_url ? (
                    <Image src={report.pets.avatar_url} alt={report.pets.name} fill className="object-cover" />
                  ) : (
                    <span className="text-[20px] font-black">{(report.pets?.name || '?').charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-text-primary text-[15px] truncate">{report.pets?.name}</p>
                  <p className="text-[11px] text-text-secondary font-medium truncate">
                    {report.pets?.species} • {report.pets?.breed || 'Bilinmiyor'}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-[12px] p-2.5 border border-warning/10">
                <p className="text-[11px] text-text-secondary mb-0.5">Son Görülme</p>
                <p className="text-[13px] font-bold text-text-primary leading-tight line-clamp-2">
                  {report.last_seen_location}
                </p>
              </div>
              {report.contact_phone && (
                <a
                  href={`tel:${report.contact_phone}`}
                  className="w-full bg-warning text-white font-bold text-[13px] rounded-xl py-2.5 text-center flex items-center justify-center gap-2 hover:bg-warning/90 active:scale-[0.98] transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z" />
                  </svg>
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
        className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md focus:outline-none transition-all duration-300 hover:scale-105 active:scale-95 ${
          hasMyActiveReport ? 'bg-red-600 hover:bg-red-700' : 'bg-warning hover:bg-warning/90'
        }`}
        aria-label="Kayıp İlanları"
      >
        {/* Sürekli pulse — aktif ilan var demek */}
        <span className={`absolute inline-flex w-full h-full rounded-full opacity-50 animate-ping ${
          hasMyActiveReport ? 'bg-red-600' : 'bg-warning'
        }`} />

        <span className="relative text-white text-[10px] font-black tracking-tight pt-[1px]">KAYIP</span>

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
