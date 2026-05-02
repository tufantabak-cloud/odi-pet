'use client'

import Link from 'next/link'
import FamilyTab from './FamilyTab'
import ReportsTab from './ReportsTab'
import InsuranceWidget from '@/components/insurance/InsuranceWidget'
import { useState } from 'react'

const genderLabel: Record<string, string> = { male: 'Erkek', female: 'Dişi', unknown: 'Bilinmiyor' }

const TABS = ['Özet', 'Sağlık Geçmişi', 'Beslenme', 'Veteriner', 'Belgeler', 'Aile', 'Raporlar'] as const
type Tab = typeof TABS[number]

export default function PetDetailClient({ pet, age, score, overdue, upcoming, schedules, vaccineRecords, diseases, allergies, medications, growthRecords, appointments, nutritionLogs, payments, subscription }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('Özet')
  const [timelineFilter, setTimelineFilter] = useState('Tümü')

  const riskLevel = score >= 80 ? 'Düşük' : score >= 50 ? 'Orta' : 'Yüksek'
  const riskColor = score >= 80 ? 'text-green-600 bg-green-50' : score >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'

  // Build unified timeline
  const timeline: any[] = [
    ...(vaccineRecords ?? []).map((r: any) => ({ type: 'vaccine', date: r.applied_date, label: r.vaccines?.name || 'Aşı', sub: r.vet_name, icon: '💉' })),
    ...(diseases ?? []).map((r: any) => ({ type: 'disease', date: r.diagnosis_date, label: r.disease_name, sub: r.status, icon: '🩺' })),
    ...(medications ?? []).map((r: any) => ({ type: 'medication', date: r.start_date, label: r.medication_name, sub: r.dosage, icon: '💊' })),
    ...(appointments ?? []).map((r: any) => ({ type: 'vet', date: r.scheduled_at?.split('T')[0], label: r.clinics?.name || 'Randevu', sub: r.status, icon: '🏥' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const filterMap: Record<string, string[]> = {
    'Tümü': ['vaccine', 'disease', 'medication', 'vet'],
    'Aşılar': ['vaccine'],
    'Tedaviler': ['disease', 'medication'],
    'Veteriner': ['vet'],
  }

  const filteredTimeline = timeline.filter(e => filterMap[timelineFilter]?.includes(e.type))

  return (
    <div className="flex flex-col gap-6 pb-20 w-full max-w-3xl mx-auto">

      {/* Back */}
      <Link href="/owner/pets" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group -mb-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Listeye Dön
      </Link>

      {/* ── Hero Card ── */}
      <div className="card-base overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover"/>
        <div className="p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-primary-soft to-white flex items-center justify-center text-primary text-[40px] font-black shadow-sm ring-2 ring-border-main shrink-0">
            {pet.avatar_url ? <img src={pet.avatar_url} className="w-full h-full rounded-[22px] object-cover" alt={pet.name}/> : pet.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-[28px] font-extrabold text-text-primary">{pet.name}</h1>
              <span className={`text-[11px] font-black px-3 py-1 rounded-full ${riskColor}`}>Risk: {riskLevel}</span>
              {overdue > 0 && (
                <Link href={`/owner/pets/${pet.id}/vaccines`} className="text-[11px] font-black px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 hover:-translate-y-0.5 transition-all shadow-sm">
                  ⚠ {overdue} Gecikmiş
                </Link>
              )}
            </div>
            <p className="text-text-secondary font-medium text-[14px]">{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}{pet.gender ? ` • ${genderLabel[pet.gender] ?? ''}` : ''}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pet.birth_date && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">🎂 {age.text} ({age.label})</span>}
              {pet.microchip_no && <span className="text-[12px] bg-bg-main border border-border-main px-3 py-1 rounded-lg font-semibold text-text-secondary">📡 {pet.microchip_no}</span>}
            </div>
          </div>
          <Link href={`/owner/pets/${pet.id}/edit`} className="btn-secondary text-[13px] shrink-0">Düzenle</Link>
        </div>
      </div>

      {/* ── Care Score Dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Care Score', value: `${score}`, sub: score >= 80 ? 'Mükemmel' : score >= 50 ? 'İyi' : 'Dikkat', color: score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500' },
          { label: 'Gecikmiş Görev', value: `${overdue}`, sub: overdue === 0 ? 'Harika!' : 'İşlem gerekli', color: overdue === 0 ? 'text-green-600' : 'text-red-500' },
          { label: 'Aşı Kaydı', value: `${vaccineRecords?.length ?? 0}`, sub: 'Toplam kayıt', color: 'text-primary' },
          { label: 'Sağlık Olayı', value: `${diseases?.length ?? 0}`, sub: 'Kayıtlı', color: 'text-text-primary' },
        ].map(w => (
          <div key={w.label} className="card-base p-4 flex flex-col items-center text-center">
            <p className={`text-[28px] font-black ${w.color}`}>{w.value}</p>
            <p className="text-[11px] font-black text-text-secondary uppercase tracking-wide mt-0.5">{w.label}</p>
            <p className="text-[11px] text-text-secondary mt-1">{w.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Upcoming Actions ── */}
      {upcoming.length > 0 && (
        <div className="card-base p-5">
          <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Yaklaşan Görevler</h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((s: any) => {
              const daysLeft = Math.ceil((new Date(s.due_date).getTime() - Date.now()) / 86400000)
              const cls = daysLeft <= 3 ? 'bg-red-50 border-red-200 text-red-700' : daysLeft <= 7 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border-main bg-bg-main/50">
                  <div>
                    <p className="font-bold text-text-primary text-[14px]">{s.title || s.vaccines?.name || 'Bakım'}</p>
                    <p className="text-[12px] text-text-secondary">{new Date(s.due_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${cls}`}>
                    {daysLeft === 0 ? 'Bugün' : `${daysLeft} gün`}
                  </span>
                </div>
              )
            })}
          </div>
          <Link href={`/owner/pets/${pet.id}/vaccines`} className="block text-center text-primary text-[13px] font-bold mt-4 hover:underline">Tümünü Görüntüle →</Link>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-bg-main p-1 rounded-2xl border border-border-main overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: Özet ── */}
      {activeTab === 'Özet' && (
        <div className="flex flex-col gap-4">
          {/* Allergies */}
          {allergies && allergies.length > 0 && (
            <div className="card-base p-5">
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Alerjiler</h3>
              <div className="flex flex-wrap gap-2">
                {allergies.map((a: any) => <span key={a.id} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-[12px] font-bold border border-red-100">{a.trigger_name}</span>)}
              </div>
            </div>
          )}
          {/* Growth */}
          {growthRecords && growthRecords.length > 0 && (
            <div className="card-base p-5">
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Son Büyüme Kaydı</h3>
              <div className="flex gap-6">
                {growthRecords[0].weight_kg && <div className="text-center"><p className="text-[28px] font-black text-primary">{growthRecords[0].weight_kg}</p><p className="text-[11px] text-text-secondary font-bold uppercase">kg</p></div>}
                {growthRecords[0].height_cm && <div className="text-center"><p className="text-[28px] font-black text-primary">{growthRecords[0].height_cm}</p><p className="text-[11px] text-text-secondary font-bold uppercase">cm</p></div>}
              </div>
              <p className="text-[12px] text-text-secondary mt-2">{new Date(growthRecords[0].recorded_at).toLocaleDateString('tr-TR')}</p>
            </div>
          )}
          {/* Vet quick info */}
          {(pet.vet_name || pet.vet_phone) && (
            <div className="card-base p-5">
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Veteriner</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-[20px] shrink-0">🩺</div>
                <div>
                  {pet.vet_name && <p className="font-bold text-text-primary">{pet.vet_name}</p>}
                  {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-[14px] text-primary font-semibold hover:underline">{pet.vet_phone}</a>}
                </div>
              </div>
            </div>
          )}

          {/* Insurance Readiness */}
          <InsuranceWidget petId={pet.id} plan={subscription?.plan ?? 'free'} />
        </div>
      )}

      {/* ── Tab: Sağlık Geçmişi ── */}
      {activeTab === 'Sağlık Geçmişi' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.keys(filterMap).map(f => (
              <button key={f} onClick={() => setTimelineFilter(f)}
                className={`px-4 py-2 rounded-full text-[12px] font-bold border transition-all shrink-0 ${timelineFilter === f ? 'bg-primary text-white border-primary' : 'bg-bg-main text-text-secondary border-border-main hover:border-primary/40'}`}>
                {f}
              </button>
            ))}
          </div>
          {filteredTimeline.length === 0 ? (
            <div className="card-base p-8 text-center text-text-secondary">Bu kategoride kayıt bulunamadı.</div>
          ) : (
            <div className="card-base divide-y divide-border-main overflow-hidden">
              {filteredTimeline.map((e, i) => (
                <div key={i} className="flex items-start gap-4 p-4 hover:bg-bg-main/50 transition-colors">
                  <span className="text-[24px] shrink-0 mt-0.5">{e.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-[14px]">{e.label}</p>
                    {e.sub && <p className="text-[12px] text-text-secondary capitalize">{e.sub}</p>}
                  </div>
                  <p className="text-[12px] text-text-secondary font-medium shrink-0">{e.date ? new Date(e.date).toLocaleDateString('tr-TR') : '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Beslenme ── */}
      {activeTab === 'Beslenme' && (
        <div className="flex flex-col gap-4">
          <div className="card-base p-5">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Beslenme Özeti</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 bg-bg-main rounded-xl text-center border border-border-main">
                <p className="text-[28px] font-black text-primary">{nutritionLogs?.filter((l:any)=>l.food_logged).length ?? 0}</p>
                <p className="text-[11px] text-text-secondary font-bold uppercase mt-1">Son 7 gün mama</p>
              </div>
              <div className="p-4 bg-bg-main rounded-xl text-center border border-border-main">
                <p className="text-[28px] font-black text-blue-500">{nutritionLogs?.filter((l:any)=>l.water_logged).length ?? 0}</p>
                <p className="text-[11px] text-text-secondary font-bold uppercase mt-1">Son 7 gün su</p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-dashed border-border-main text-center">
              <p className="text-[22px] mb-1">🛒</p>
              <p className="text-[14px] font-bold text-text-primary mb-1">Otomatik Yenileme</p>
              <p className="text-[12px] text-text-secondary mb-3">Mama stoğu azaldığında otomatik sipariş ver</p>
              <button className="btn-secondary text-[13px] py-2 px-4">Ayarla (Pro)</button>
            </div>
          </div>
          <Link href={`/owner/pets/${pet.id}/nutrition`} className="card-base p-4 text-center text-primary font-bold text-[14px] hover:bg-bg-main transition-colors">
            Tam Beslenme Modülü →
          </Link>
        </div>
      )}

      {/* ── Tab: Veteriner ── */}
      {activeTab === 'Veteriner' && (
        <div className="flex flex-col gap-4">
          <div className="card-base p-5">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Klinik Veterinerim</h3>
            {pet.vet_name || pet.vet_phone ? (
              <div className="flex items-center gap-4 p-4 bg-bg-main rounded-xl border border-border-main mb-4">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-[28px] shrink-0">🩺</div>
                <div className="flex-1">
                  {pet.vet_name && <p className="font-bold text-text-primary text-[16px]">{pet.vet_name}</p>}
                  {pet.vet_phone && <a href={`tel:${pet.vet_phone}`} className="text-primary font-semibold hover:underline text-[14px]">{pet.vet_phone}</a>}
                </div>
                <a href={`tel:${pet.vet_phone}`} className="btn-primary text-[13px] py-2 px-4 shrink-0">Ara</a>
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-border-main rounded-xl mb-4">
                <p className="text-text-secondary text-[14px]">Veteriner bilgisi eklenmemiş</p>
                <Link href={`/owner/pets/${pet.id}/edit`} className="text-primary font-bold text-[13px] mt-2 block hover:underline">Ekle →</Link>
              </div>
            )}
            {appointments && appointments.length > 0 && (
              <>
                <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-widest mb-3">Son Randevular</h4>
                <div className="flex flex-col gap-2">
                  {appointments.map((apt: any) => (
                    <div key={apt.id} className="flex justify-between items-center p-3 rounded-xl border border-border-main">
                      <div>
                        <p className="font-bold text-text-primary text-[14px]">{apt.clinics?.name || 'Klinik'}</p>
                        <p className="text-[12px] text-text-secondary">{new Date(apt.scheduled_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-primary-soft text-primary capitalize">{apt.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Link href={`/owner/ai-vet`} className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-white font-bold text-[14px] hover:bg-primary-hover transition-colors">
              🤖 AI Vet Chat'e Sor
            </Link>
          </div>
        </div>
      )}

      {/* ── Tab: Belgeler ── */}
      {activeTab === 'Belgeler' && (
        <div className="card-base p-6">
          <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-5">Belge Kasası</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {['Pasaport', 'Aşı Kartı', 'Lab Sonuçları', 'Reçeteler'].map(doc => (
              <label key={doc} className="border-2 border-dashed border-border-main rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files?.length) {
                    alert(`${doc} belgesi seçildi: ${e.target.files[0].name}\n(Sistem notu: Supabase Storage modülü bağlandığında dosyalar buluta aktarılacaktır.)`)
                  }
                }} />
                <span className="text-[28px] group-hover:scale-110 transition-transform">📄</span>
                <p className="text-[13px] font-bold text-text-secondary group-hover:text-primary text-center">{doc}</p>
                <span className="text-[11px] font-bold bg-bg-main px-2 py-1 rounded-md text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
                  + Dosya Seç
                </span>
              </label>
            ))}
          </div>
          <button onClick={() => window.print()} className="btn-primary w-full py-3 text-[14px] flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform shadow-sm hover:shadow-primary/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3"/></svg>
            PDF Sağlık Raporu Çıkar
          </button>
          <p className="text-center text-[11px] text-text-secondary mt-2">Tüm sağlık geçmişini cihazınıza PDF olarak kaydetmek için tıklayın.</p>
        </div>
      )}

      {/* ── Tab: Aile ── */}
      {activeTab === 'Aile' && (
        <FamilyTab
          petId={pet.id}
          petName={pet.name}
          plan={subscription?.plan ?? 'free'}
        />
      )}

      {/* ── Tab: Raporlar ── */}
      {activeTab === 'Raporlar' && (
        <ReportsTab
          petId={pet.id}
          petName={pet.name}
          plan={subscription?.plan ?? 'free'}
        />
      )}

      {payments && payments.length > 0 && (
        <div className="card-base p-5">
          <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-3">Son Harcamalar</h3>
          <div className="flex flex-col gap-2">
            {payments.slice(0, 3).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center text-[13px]">
                <span className="text-text-primary font-medium">{p.description || 'Ödeme'}</span>
                <span className="font-bold text-text-primary">₺{p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: `/owner/pets/${pet.id}/vaccines`, label: 'Aşı OS', icon: '💉' },
          { href: `/owner/care?pet=${pet.id}`, label: 'Bakım Rutini', icon: '❤️' },
          { href: `/owner/pets/${pet.id}/nutrition`, label: 'Beslenme', icon: '🍽️' },
          { href: `/owner/ai-vet`, label: 'AI Vet', icon: '🤖' },
        ].map(m => (
          <Link key={m.href} href={m.href} className="card-base p-4 flex items-center gap-3 hover:bg-bg-main transition-colors group">
            <span className="text-[24px]">{m.icon}</span>
            <span className="font-bold text-text-primary text-[14px] group-hover:text-primary transition-colors">{m.label}</span>
          </Link>
        ))}
      </div>

    </div>
  )
}
