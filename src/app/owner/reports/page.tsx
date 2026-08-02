'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, AlertTriangle, Search, Filter, Calendar, ChevronRight } from 'lucide-react'
import { DefaultCatAvatar, DefaultDogAvatar } from '@/components/icons/PetIcons'

export default function LostReportsListPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<string>('Hepsi')
  const [provinces, setProvinces] = useState<string[]>([])

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true)
        const res = await fetch('/api/reports/lost')
        const data = await res.json()
        if (res.ok && data.reports) {
          setReports(data.reports)
          // Extract unique provinces
          const provs = Array.from(new Set(data.reports.map((r: any) => r.province || r.pets?.city).filter(Boolean))) as string[]
          setProvinces(provs.sort((a, b) => a.localeCompare(b, 'tr')))
        } else {
          // Fallback or empty
          setReports([])
        }
      } catch (err) {
        console.error('Fetch lost reports error:', err)
        setError('Kayıp ilanları yüklenirken bir hata oluştu.')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const filteredReports = reports.filter((r) => {
    if (selectedProvince === 'Hepsi') return true
    const itemProvince = r.province || r.pets?.city
    return itemProvince === selectedProvince
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-[24px] p-6 text-white shadow-[0_4px_20px_-2px_rgba(244,63,94,0.3)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-sans tracking-tight">Kayıp İlanları & Topluluk Arama</h1>
          </div>
          <p className="text-rose-50 text-sm max-w-xl font-normal">
            Bölgenizdeki kayıp evcil hayvan ilanlarını görüntüleyin, bulduğunuz veya gördüğünüz kayıp patileri sahiplerine ulaştırın.
          </p>
        </div>

        {/* Filter Chips (07.19 Search standard) */}
        {provinces.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Şehir:
            </span>
            <button
              onClick={() => setSelectedProvince('Hepsi')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.98] shrink-0 ${
                selectedProvince === 'Hepsi'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tüm Şehirler ({reports.length})
            </button>
            {provinces.map((prov) => (
              <button
                key={prov}
                onClick={() => setSelectedProvince(prov)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.98] shrink-0 ${
                  selectedProvince === prov
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        )}

        {/* Content List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-[24px]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-[24px] text-center text-rose-600 dark:text-rose-400">
            {error}
          </div>
        ) : filteredReports.length === 0 ? (
          /* 07.13 Empty State Standard */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-8 text-center shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-full flex items-center gap-1 justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Henüz Aktif Kayıp İlanı Bulunmuyor</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedProvince !== 'Hepsi'
                  ? `${selectedProvince} şehri için verilmiş aktif kayıp ilanı bulunmuyor.`
                  : 'Sistemde kayıtlı aktif bir kayıp ilanı bulunmamaktadır. Evcil hayvanınız kaybolduysa profilinden kayıp ilanı oluşturabilirsiniz.'}
              </p>
            </div>
            <Link
              href="/owner/pets"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-rose-500/20"
            >
              Petlerime Git
            </Link>
          </div>
        ) : (
          /* Reports Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report) => {
              const pet = report.pets || {}
              const isCat = pet.species === 'cat' || pet.species?.toLowerCase() === 'kedi'
              const locationText = report.province
                ? `${report.province}${report.district ? ` / ${report.district}` : ''}`
                : report.last_seen_location

              return (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:scale-[1.02] transition-all duration-200 group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-rose-500/30 shrink-0">
                          {pet.photo_url ? (
                            <Image src={pet.photo_url} alt={pet.name || 'Pet'} fill className="object-cover" />
                          ) : isCat ? (
                            <DefaultCatAvatar className="w-full h-full" />
                          ) : (
                            <DefaultDogAvatar className="w-full h-full" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{pet.name || 'İsimsiz'}</h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                              Kayıp İlanı
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {pet.breed || (isCat ? 'Kedi' : 'Köpek')} • {pet.gender === 'male' ? 'Erkek' : 'Dişi'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-medium truncate">{locationText}</span>
                      </div>
                      {report.last_seen_at && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Son görülme: {new Date(report.last_seen_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {report.contact_phone ? (
                      <a
                        href={`tel:${report.contact_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors active:scale-[0.98]"
                      >
                        <Phone className="w-3.5 h-3.5" /> Sahibini Ara
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Telefon Belirtilmedi</span>
                    )}

                    <Link
                      href={`/owner/reports/${report.id}/print`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors group-hover:translate-x-0.5"
                    >
                      İlanı Gör <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
