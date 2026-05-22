'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  pet: any
  age: { text: string }
  healthScore: number
  overdueVaccines: number
  schedules: any[]
  diseases: any[]
  allergies: any[]
  medications: any[]
  growthRecords: any[]
  appointments: any[]
  nutritionLogs: any[]
  payments: any[]
}

const TABS = [
  { id: 'summary', label: 'Özet', icon: '📋' },
  { id: 'health', label: 'Sağlık', icon: '⚕️' },
  { id: 'vaccines', label: 'Aşı', icon: '💉' },
  { id: 'nutrition', label: 'Beslenme', icon: '🥣' },
  { id: 'care', label: 'Bakım & Hijyen', icon: '🛁' },
  { id: 'activity', label: 'Aktivite', icon: '🎾' },
  { id: 'vet', label: 'Veteriner', icon: '🩺' },
  { id: 'other', label: 'Diğer (Ödemeler vb.)', icon: '📁' },
]

export default function AdminPetDetailClient({
  pet, age, healthScore, overdueVaccines,
  schedules, diseases, allergies, medications,
  growthRecords, appointments, nutritionLogs,
  payments
}: Props) {
  const [activeTab, setActiveTab] = useState('summary')

  const owner = pet.profiles || {}
  const ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ') || owner.email || 'Bilinmiyor'

  return (
    <div className="space-y-6">
      
      {/* 1. Üst Profil Kartı */}
      <div className="card-base p-6 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10" />
        
        {/* Avatar */}
        <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-primary-soft to-white border border-border-main flex items-center justify-center text-[40px] shadow-sm shrink-0 overflow-hidden relative">
          {pet.avatar_url ? (
            <Image src={pet.avatar_url} alt={pet.name} fill className="object-cover" />
          ) : (
            pet.species === 'cat' ? '🐱' : '🐶'
          )}
        </div>

        {/* Pet Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-text-primary leading-none">{pet.name || 'İsimsiz'}</h2>
            <span className="px-2 py-0.5 bg-bg-main border border-border-main rounded-md text-[11px] font-bold text-text-secondary">
              {pet.species === 'cat' ? 'Kedi' : 'Köpek'}
            </span>
            {pet.gender && (
              <span className="px-2 py-0.5 bg-bg-main border border-border-main rounded-md text-[11px] font-bold text-text-secondary">
                {pet.gender === 'male' ? 'Erkek' : 'Dişi'}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-text-secondary font-medium">
            <span className="flex items-center gap-1">🏷️ Irk: <strong className="text-text-primary">{pet.breed || '-'}</strong></span>
            <span className="flex items-center gap-1">🎂 Yaş: <strong className="text-text-primary">{age.text}</strong></span>
            <span className="flex items-center gap-1">⚖️ Kilo: <strong className="text-text-primary">{pet.weight ? `${pet.weight} kg` : '-'}</strong></span>
            <span className="flex items-center gap-1">📍 Şehir: <strong className="text-text-primary">{pet.city || '-'}</strong></span>
          </div>
          
          {/* Kimlik No'ları */}
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border-main/50">
            {pet.microchip_no && <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-mono border border-blue-100">Çip: {pet.microchip_no}</span>}
            {pet.passport_no && <span className="text-[11px] bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-mono border border-purple-100">Pasaport: {pet.passport_no}</span>}
          </div>
        </div>

        {/* Owner Info */}
        <div className="md:w-64 w-full bg-bg-main rounded-2xl p-4 border border-border-main">
          <p className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-2">Pet Sahibi</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center font-bold overflow-hidden relative border border-primary/20">
              {owner.avatar_url ? (
                <Image src={owner.avatar_url} alt={ownerName} fill className="object-cover" />
              ) : (
                ownerName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/admin/users/${pet.owner_id}`} className="text-[14px] font-bold text-text-primary hover:text-primary transition-colors truncate block">
                {ownerName}
              </Link>
              <p className="text-[11px] text-text-secondary truncate">{owner.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sekmeler (Tabs) */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-border-main">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-[13px] font-bold transition-colors whitespace-nowrap border-b-2
              ${activeTab === tab.id 
                ? 'bg-surface border-primary text-primary shadow-[0_-4px_10px_rgba(0,0,0,0.02)]' 
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface/50'}`}
          >
            <span className="text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Tab İçerikleri */}
      <div className="min-h-[400px]">
        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-base p-4 flex flex-col justify-center border-l-4 border-l-primary">
                <span className="text-[11px] font-bold text-text-secondary uppercase">Sağlık Skoru</span>
                <span className={`text-2xl font-black mt-1 ${healthScore >= 80 ? 'text-green-600' : healthScore >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                  {healthScore}/100
                </span>
              </div>
              <div className={`card-base p-4 flex flex-col justify-center border-l-4 ${overdueVaccines > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
                <span className="text-[11px] font-bold text-text-secondary uppercase">Gecikmiş Aşı</span>
                <span className={`text-2xl font-black mt-1 ${overdueVaccines > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {overdueVaccines} adet
                </span>
              </div>
              <div className="card-base p-4 flex flex-col justify-center border-l-4 border-l-blue-500">
                <span className="text-[11px] font-bold text-text-secondary uppercase">Toplam Randevu</span>
                <span className="text-2xl font-black mt-1 text-blue-600">{appointments.length}</span>
              </div>
              <div className="card-base p-4 flex flex-col justify-center border-l-4 border-l-purple-500">
                <span className="text-[11px] font-bold text-text-secondary uppercase">Aktif Görevler</span>
                <span className="text-2xl font-black mt-1 text-purple-600">{schedules.filter((s: any) => s.status !== 'done').length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-base p-5">
                <h3 className="font-bold text-[15px] mb-4 text-text-primary border-b border-border-main pb-2">Son Eklenen Görevler / Planlar</h3>
                {schedules.slice(0, 5).map((plan: any) => (
                  <div key={plan.id} className="py-2 border-b border-border-main/50 last:border-0 flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-bold text-text-primary">{plan.title || (plan.vaccines && plan.vaccines.name) || 'Görev'}</p>
                      <p className="text-[11px] text-text-secondary">{plan.sub_category || plan.category || '-'}</p>
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-1 rounded ${plan.status === 'done' ? 'text-green-700 bg-green-100' : 'text-primary bg-primary/5'}`}>
                      {plan.status === 'done' ? 'Tamamlandı' : new Date(plan.due_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {schedules.length === 0 && <p className="text-[12px] text-text-secondary py-4">Kayıtlı görev bulunamadı.</p>}
              </div>
              <div className="card-base p-5">
                <h3 className="font-bold text-[15px] mb-4 text-text-primary border-b border-border-main pb-2">Son Randevular</h3>
                {appointments.slice(0, 5).map(app => (
                  <div key={app.id} className="py-2 border-b border-border-main/50 last:border-0">
                    <p className="text-[13px] font-bold text-text-primary">{app.clinics?.name || 'Klinik Bilinmiyor'}</p>
                    <p className="text-[11px] text-text-secondary">{new Date(app.scheduled_at).toLocaleString()} • {app.status}</p>
                  </div>
                ))}
                {appointments.length === 0 && <p className="text-[12px] text-text-secondary py-4">Kayıtlı randevu bulunamadı.</p>}
              </div>
            </div>
          </div>
        )}

        {/* HEALTH TAB */}
        {activeTab === 'health' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="card-base p-5">
              <h3 className="font-bold text-[15px] mb-4 text-text-primary flex items-center gap-2"><span className="text-red-500">🤒</span> Hastalık Geçmişi</h3>
              {diseases.map(d => (
                <div key={d.id} className="p-3 bg-red-50/50 rounded-xl mb-2 border border-red-100">
                  <div className="flex justify-between items-start">
                    <p className="text-[13px] font-bold text-red-800">{d.name}</p>
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">{new Date(d.diagnosis_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[12px] text-red-600 mt-1">{d.notes || 'Detay yok'}</p>
                </div>
              ))}
              {diseases.length === 0 && <p className="text-[12px] text-text-secondary italic">Kayıtlı hastalık bulunamadı.</p>}
            </div>

            <div className="card-base p-5">
              <h3 className="font-bold text-[15px] mb-4 text-text-primary flex items-center gap-2"><span className="text-orange-500">🤧</span> Alerjiler</h3>
              {allergies.map(a => (
                <div key={a.id} className="p-3 bg-orange-50/50 rounded-xl mb-2 border border-orange-100">
                  <p className="text-[13px] font-bold text-orange-800">{a.allergen}</p>
                  <p className="text-[12px] text-orange-600 mt-1">Şiddet: {a.severity || 'Bilinmiyor'} • Belirtiler: {a.reactions || '-'}</p>
                </div>
              ))}
              {allergies.length === 0 && <p className="text-[12px] text-text-secondary italic">Kayıtlı alerji bulunamadı.</p>}
            </div>

            <div className="card-base p-5 md:col-span-2">
              <h3 className="font-bold text-[15px] mb-4 text-text-primary flex items-center gap-2"><span className="text-blue-500">💊</span> Kullanılan İlaçlar</h3>
              {medications.map(m => (
                <div key={m.id} className="p-3 bg-blue-50/50 rounded-xl mb-2 border border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-[13px] font-bold text-blue-800">{m.name}</p>
                    <p className="text-[12px] text-blue-600 mt-0.5">Dozaj: {m.dosage} • Sıklık: {m.frequency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-blue-500 font-mono">Başlangıç: {new Date(m.start_date).toLocaleDateString()}</p>
                    {m.end_date && <p className="text-[10px] text-blue-500 font-mono">Bitiş: {new Date(m.end_date).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
              {medications.length === 0 && <p className="text-[12px] text-text-secondary italic">Kayıtlı ilaç bulunamadı.</p>}
            </div>
          </div>
        )}

        {/* VACCINES TAB */}
        {activeTab === 'vaccines' && (
          <div className="card-base p-6 animate-fadeIn">
            <h3 className="font-bold text-[16px] mb-6 text-text-primary">Aşı ve Parazit Takvimi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-widest uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Aşı/İşlem Adı</th>
                    <th className="p-3">Son Tarih (Due)</th>
                    <th className="p-3">Durum</th>
                    <th className="p-3">Uygulayan Klinik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {schedules.filter((s: any) => s.category === 'Medikal').map((s: any) => {
                    const isOverdue = s.status !== 'done' && new Date(s.due_date) < new Date()
                    return (
                      <tr key={s.id} className="hover:bg-bg-main/50 transition-colors">
                        <td className="p-3 font-bold text-text-primary">{s.vaccines?.name || s.title || 'Bilinmeyen Aşı'}</td>
                        <td className="p-3 font-mono text-text-secondary">{new Date(s.due_date).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-[11px] font-bold
                            ${s.status === 'done' ? 'bg-green-100 text-green-700' : 
                              isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {s.status === 'done' ? 'Yapıldı' : isOverdue ? 'Gecikti' : 'Bekliyor'}
                          </span>
                        </td>
                        <td className="p-3 text-text-secondary">{s.administered_by || '-'}</td>
                      </tr>
                    )
                  })}
                  {schedules.filter((s: any) => s.category === 'Medikal').length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary">Aşı kaydı bulunamadı.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === 'nutrition' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="card-base p-5">
              <h3 className="font-bold text-[15px] mb-4 text-text-primary">Beslenme Günlüğü</h3>
              {nutritionLogs.map(n => (
                <div key={n.id} className="p-3 bg-bg-main rounded-xl mb-2 border border-border-main">
                  <div className="flex justify-between">
                    <p className="text-[13px] font-bold text-text-primary">{n.food_type || 'Kuru Mama'}</p>
                    <span className="text-[10px] text-text-secondary font-mono">{new Date(n.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[12px] text-text-secondary mt-1">Porsiyon: {n.portion_amount}g • Not: {n.notes || '-'}</p>
                </div>
              ))}
              {nutritionLogs.length === 0 && <p className="text-[12px] text-text-secondary italic">Beslenme kaydı bulunamadı.</p>}
            </div>

            <div className="card-base p-5">
              <h3 className="font-bold text-[15px] mb-4 text-text-primary">Kilo ve Gelişim Tablosu</h3>
              {growthRecords.map(g => (
                <div key={g.id} className="flex justify-between items-center p-3 bg-bg-main rounded-xl mb-2 border border-border-main">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px]">⚖️</div>
                    <p className="text-[15px] font-black text-text-primary">{g.weight} kg</p>
                  </div>
                  <span className="text-[11px] text-text-secondary font-mono">{new Date(g.recorded_at).toLocaleDateString()}</span>
                </div>
              ))}
              {growthRecords.length === 0 && <p className="text-[12px] text-text-secondary italic">Kilo kaydı bulunamadı.</p>}
            </div>
          </div>
        )}

        {/* CARE & HYGIENE TAB */}
        {activeTab === 'care' && (
          <div className="card-base p-6 animate-fadeIn">
            <h3 className="font-bold text-[16px] mb-4 text-text-primary">Bakım ve Hijyen Planları</h3>
            <p className="text-[13px] text-text-secondary mb-6">Yıkanma, tırnak kesimi, tüy bakımı, diş temizliği gibi rutin bakım kayıtları.</p>
            <div className="space-y-3">
              {schedules.filter((c: any) => c.category === 'Bakım' || c.category === 'Hijyen' || c.category === 'Temizlik').map((c: any) => (
                <div key={c.id} className="p-4 border border-border-main rounded-xl flex justify-between items-center bg-surface hover:bg-bg-main transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛁</span>
                    <div>
                      <p className="text-[14px] font-bold text-text-primary">{c.title || 'Görev'}</p>
                      <p className="text-[12px] text-text-secondary">{c.sub_category || 'Detay yok'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-text-secondary uppercase">Planlanan Tarih</p>
                    <p className={`text-[13px] font-mono font-bold ${c.status === 'done' ? 'text-green-600' : 'text-primary'}`}>
                      {c.status === 'done' ? 'Tamamlandı' : new Date(c.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {schedules.filter((c: any) => c.category === 'Bakım' || c.category === 'Hijyen' || c.category === 'Temizlik').length === 0 && <p className="text-[12px] text-text-secondary italic">Kayıtlı bakım/hijyen planı bulunamadı.</p>}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="card-base p-6 animate-fadeIn">
            <h3 className="font-bold text-[16px] mb-4 text-text-primary">Aktivite ve Egzersiz Takibi</h3>
            <p className="text-[13px] text-text-secondary mb-6">Günlük yürüyüşler, oyun seansları ve harcanan efor kayıtları.</p>
            <div className="space-y-3">
              {schedules.filter((c: any) => c.category === 'Aktiviteler').map((c: any) => (
                <div key={c.id} className="p-4 border border-border-main rounded-xl flex justify-between items-center bg-surface hover:bg-bg-main transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎾</span>
                    <div>
                      <p className="text-[14px] font-bold text-text-primary">{c.title || 'Aktivite'}</p>
                      <p className="text-[12px] text-text-secondary">{c.sub_category || 'Detay yok'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-text-secondary uppercase">Planlanan Tarih</p>
                    <p className={`text-[13px] font-mono font-bold ${c.status === 'done' ? 'text-green-600' : 'text-primary'}`}>
                      {c.status === 'done' ? 'Tamamlandı' : new Date(c.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {schedules.filter((c: any) => c.category === 'Aktiviteler').length === 0 && <p className="text-[12px] text-text-secondary italic">Kayıtlı aktivite planı bulunamadı.</p>}
            </div>
          </div>
        )}

        {/* VET TAB */}
        {activeTab === 'vet' && (
          <div className="card-base p-6 animate-fadeIn">
            <h3 className="font-bold text-[16px] mb-6 text-text-primary">Veteriner ve Klinik Randevuları</h3>
            <div className="space-y-4">
              {appointments.map(app => (
                <div key={app.id} className="p-4 border border-border-main rounded-xl flex flex-col md:flex-row gap-4 justify-between bg-surface">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shrink-0">🏥</div>
                    <div>
                      <h4 className="text-[15px] font-bold text-text-primary">{app.clinics?.name || 'Klinik Bilinmiyor'}</h4>
                      <p className="text-[13px] text-text-secondary mt-1">Sebep: <strong className="text-text-primary">{app.reason || 'Belirtilmedi'}</strong></p>
                      {app.notes && <p className="text-[12px] text-text-secondary mt-1 bg-bg-main p-2 rounded-lg border border-border-main">Not: {app.notes}</p>}
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2">
                    <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase
                      ${app.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        app.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {app.status === 'completed' ? 'Tamamlandı' : app.status === 'cancelled' ? 'İptal Edildi' : 'Bekliyor'}
                    </span>
                    <span className="text-[13px] font-mono text-text-primary bg-bg-main px-2 py-1 border border-border-main rounded-lg">
                      {new Date(app.scheduled_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
              {appointments.length === 0 && <p className="text-[12px] text-text-secondary italic">Kayıtlı randevu bulunamadı.</p>}
            </div>
          </div>
        )}

        {/* OTHER / PAYMENTS TAB */}
        {activeTab === 'other' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="card-base p-5">
              <h3 className="font-bold text-[15px] mb-4 text-text-primary">Diğer Görevler (Diger, Saglik vb.)</h3>
              <div className="space-y-2">
                {schedules.filter((c: any) => !['Bakım', 'Hijyen', 'Temizlik', 'Aktiviteler', 'Medikal'].includes(c.category)).map((c: any) => (
                  <div key={c.id} className="p-3 bg-bg-main rounded-xl border border-border-main">
                    <div className="flex justify-between items-center">
                      <p className="text-[13px] font-bold text-text-primary">{c.title || 'Görev'}</p>
                      <span className={`text-[10px] font-mono ${c.status === 'done' ? 'text-green-600' : 'text-text-secondary'}`}>
                        {c.status === 'done' ? 'Tamamlandı' : new Date(c.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-1">Kategori: {c.category || '-'} • Alt Kategori: {c.sub_category || '-'}</p>
                  </div>
                ))}
                {schedules.filter((c: any) => !['Bakım', 'Hijyen', 'Temizlik', 'Aktiviteler', 'Medikal'].includes(c.category)).length === 0 && <p className="text-[12px] text-text-secondary italic">Kayıt bulunamadı.</p>}
              </div>
            </div>

            <div className="card-base p-5">
              <h3 className="font-bold text-[15px] mb-4 text-text-primary">Ödeme İşlemleri</h3>
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-main">
                    <div>
                      <p className="text-[13px] font-bold text-text-primary">{p.description || 'Ödeme'}</p>
                      <p className="text-[11px] text-text-secondary font-mono">{new Date(p.payment_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[15px] font-black text-primary">₺{p.amount}</span>
                  </div>
                ))}
                {payments.length === 0 && <p className="text-[12px] text-text-secondary italic">Ödeme kaydı bulunamadı.</p>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
