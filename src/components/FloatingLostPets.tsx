'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { AlertTriangle, Phone } from 'lucide-react'

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
        className="w-full max-w-sm bg-surface rounded-[24px] p-7 shadow-soft border border-white/60 mb-0 sm:mb-20 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Kayıp İlanları</h2>
            <p className="text-xs text-text-secondary">Çevrenizdeki dostlarımıza yardım edin</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto scrollbar-none pb-2">
          {lostReports.map((report) => (
            <div
              key={report.id}
              className="border border-red-200 bg-red-50/50 rounded-[20px] p-4 flex flex-col gap-3 relative shadow-sm"
            >
              <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
              <div className="flex items-center gap-3">
                {report.pets?.avatar_url ? (
                  <div className="w-12 h-12 relative rounded-[14px] bg-white shadow-sm overflow-hidden border border-red-100 shrink-0">
                    <Image src={report.pets.avatar_url} alt={report.pets.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 bg-gradient-to-br from-red-400 to-red-600">
                    {(report.pets?.name || '?').charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-text-primary text-sm truncate">{report.pets?.name}</p>
                  <p className="text-xs text-text-secondary font-medium truncate">
                    {report.pets?.species} • {report.pets?.breed || 'Bilinmiyor'}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-[12px] p-2.5 border border-red-100">
                <p className="text-2xs text-text-secondary mb-0.5">Son Görülme</p>
                <p className="text-xs font-semibold text-text-primary leading-tight line-clamp-2">
                  {report.last_seen_location}
                </p>
              </div>
              {report.contact_phone && (
                <a
                  href={`tel:${report.contact_phone}`}
                  className="w-full bg-red-600 text-white font-semibold text-xs rounded-xl py-2.5 text-center flex items-center justify-center gap-2 hover:bg-red-700 active:scale-[0.98] transition-all"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  Hemen Ara
                </a>
              )}
            </div>
          ))}
        </div>

        <button onClick={() => setOpen(false)} className="btn-secondary w-full mt-4 py-3 text-sm">
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
        className="relative w-[38px] h-[38px] rounded-full flex items-center justify-center bg-red-600 shadow-md focus:outline-none transition-all duration-300 hover:scale-105 active:scale-95"
        aria-label="Kayıp İlanları"
      >
        {/* Sürekli pulse — aktif ilan var demek */}
        <span
          className="absolute inset-[-3px] rounded-full border-2 border-red-600 opacity-50 animate-ping"
        />

        <AlertTriangle className="w-4 h-4 text-white relative z-10 shrink-0" />

        {/* Birden fazla ilan varsa sayı badge'i */}
        {lostReports.length > 1 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-2xs font-bold rounded-full flex items-center justify-center border-2 border-surface z-10">
            {lostReports.length > 9 ? '9+' : lostReports.length}
          </span>
        )}
      </button>
    </>
  )
}
