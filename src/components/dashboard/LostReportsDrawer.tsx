'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Megaphone, X, Phone, MapPin } from 'lucide-react'

interface LostReport {
  id: string
  contact_phone: string
  last_seen_location: string
  pets: {
    name: string
    avatar_url: string | null
    species: string
    breed: string | null
  }
}

interface LostReportsDrawerProps {
  reports: LostReport[]
}

export default function LostReportsDrawer({ reports }: LostReportsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!reports || reports.length === 0) return null

  return (
    <>
      {/* Topbar Alarm İkonu */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center justify-center w-11 h-11 rounded-full bg-red-50 text-red-500 border border-red-100 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
        title="Bölgendeki Kayıp İlanları"
      >
        <Megaphone size={18} className="animate-bounce" />
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
          {reports.length}
        </span>
      </button>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative flex flex-col w-full max-w-[380px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-main">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xs bg-red-50 flex items-center justify-center text-red-500">
                  <Megaphone size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-text-primary leading-none">Bölgendeki Kayıp İlanları</h3>
                  <span className="text-[10px] text-text-secondary font-semibold mt-1 block">Bulunduğun şehirde aktif arama ilanları</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-main hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-red-50/40 border border-red-100 rounded-sm p-3 flex flex-col gap-2.5 shadow-sm hover:border-red-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 relative rounded-xs overflow-hidden border border-red-200 bg-white shrink-0">
                      {report.pets?.avatar_url ? (
                        <Image
                          src={report.pets.avatar_url}
                          alt={report.pets.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface text-red-400 font-bold text-sm">
                          {report.pets?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-text-primary truncate">{report.pets?.name}</h4>
                      <p className="text-[11px] text-text-secondary font-semibold truncate">
                        {report.pets?.species} {report.pets?.breed ? `• ${report.pets.breed}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xs p-2 border border-red-50 flex items-start gap-1.5">
                    <MapPin size={13} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Son Görülme</p>
                      <p className="text-[11px] font-semibold text-text-primary leading-tight mt-0.5">
                        {report.last_seen_location}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`tel:${report.contact_phone}`}
                    className="w-full h-10 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-xs rounded-btn flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/10"
                  >
                    <Phone size={13} /> İletişime Geç
                  </a>
                </div>
              ))}
            </div>

            {/* Bottom Warning */}
            <div className="p-4 border-t border-border-main bg-surface">
              <p className="text-[10px] text-text-secondary font-medium leading-relaxed text-center">
                Eğer bu evcil hayvanlardan birini gördüysen veya bilgi sahibiysen lütfen hemen iletişime geç. Can dostlarımızı birlikte bulalım!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
