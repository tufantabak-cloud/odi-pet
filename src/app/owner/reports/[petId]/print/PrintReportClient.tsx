'use client'

import { useEffect } from 'react'

const REPORT_TYPE_LABELS: Record<string, string> = {
  summary: 'Hızlı Özet Raporu',
  medical_timeline: 'Medikal Timeline Raporu',
  travel_pack: 'Seyahat Paketi',
}

const SPECIES_TR: Record<string, string> = { dog: 'Köpek', cat: 'Kedi', bird: 'Kuş', other: 'Diğer' }

function calcAge(birthDate: string): string {
  if (!birthDate) return '—'
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  return months < 12 ? `${months} ay` : `${Math.floor(months / 12)} yaş ${months % 12} ay`
}

export default function PrintReportClient({ data }: { data: any }) {
  useEffect(() => {
    document.title = `ODI Sağlık Raporu — ${data.pet?.name}`
  }, [data.pet?.name])

  const {
    pet, vaccines, diseases, medications, allergies, growthRecords,
    appointments, upcomingTasks, insight, reportType, verificationHash,
    generatedAt, ownerName, ownerEmail,
  } = data

  const careScore = insight?.risk_score != null ? Math.max(0, 100 - insight.risk_score) : null
  const totalEvents = (vaccines?.length ?? 0) + (diseases?.length ?? 0) + (medications?.length ?? 0) + (appointments?.length ?? 0)
  const preventiveScore = totalEvents === 0 ? 100 : Math.round(((vaccines?.length ?? 0) / Math.max(totalEvents, 1)) * 100)

  // Unified timeline
  const timeline = [
    ...(vaccines ?? []).map((r: any) => ({ date: r.applied_date, icon: '💉', title: r.vaccines?.name ?? 'Aşı', detail: r.vet_name ?? '', type: 'Aşı', status: 'Tamamlandı' })),
    ...(diseases ?? []).map((r: any) => ({ date: r.diagnosis_date, icon: '🩺', title: r.disease_name, detail: r.treatment ?? '', type: 'Hastalık', status: r.status ?? '—' })),
    ...(medications ?? []).map((r: any) => ({ date: r.start_date, icon: '💊', title: r.medication_name, detail: r.dosage ?? '', type: 'İlaç', status: r.end_date ? 'Tamamlandı' : 'Devam ediyor' })),
    ...(appointments ?? []).map((r: any) => ({ date: r.scheduled_at?.split('T')[0], icon: '🏥', title: (r as any).clinics?.name ?? 'Randevu', detail: '', type: 'Randevu', status: r.status ?? '—' })),
  ].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; color: #1a1a2e; background: #fff; font-size: 12px; line-height: 1.5; }

        .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
        .no-print { }

        /* Cover */
        .cover { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #6366f1; }
        .cover-left h1 { font-size: 28px; font-weight: 900; color: #6366f1; }
        .cover-left p { color: #64748b; margin-top: 2px; font-size: 12px; }
        .cover-right { text-align: right; }
        .cover-right .badge { display: inline-block; background: #6366f1; color: white; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-bottom: 6px; }
        .cover-right p { color: #64748b; font-size: 11px; }

        /* Pet card */
        .pet-card { display: grid; grid-template-columns: 80px 1fr; gap: 20px; background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 28px; border: 1px solid #e2e8f0; }
        .pet-avatar { width: 80px; height: 80px; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 900; color: #6366f1; }
        .pet-info h2 { font-size: 22px; font-weight: 900; }
        .pet-info .meta { color: #64748b; margin-top: 4px; font-size: 12px; }
        .pet-info .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .tag { background: #e0e7ff; color: #4338ca; border-radius: 6px; padding: 2px 10px; font-size: 11px; font-weight: 600; }

        /* Score row */
        .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        .score-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; }
        .score-box .num { font-size: 26px; font-weight: 900; }
        .score-box .lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
        .green { color: #16a34a; } .amber { color: #d97706; } .red { color: #dc2626; } .blue { color: #6366f1; }

        /* Section */
        .section { margin-bottom: 28px; }
        .section-title { font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }

        /* Table */
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; padding: 8px 10px; text-align: left; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        .type-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
        .type-aşı { background: #ede9fe; color: #6d28d9; }
        .type-hastalık { background: #fee2e2; color: #dc2626; }
        .type-ilaç { background: #fef3c7; color: #d97706; }
        .type-randevu { background: #dbeafe; color: #1d4ed8; }

        /* Allergy pills */
        .pill { display: inline-block; background: #fee2e2; color: #dc2626; border-radius: 6px; padding: 3px 10px; margin: 2px; font-size: 11px; font-weight: 600; }

        /* Footer */
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .footer p { font-size: 10px; color: #94a3b8; }
        .footer .hash { font-family: monospace; font-size: 9px; color: #cbd5e1; }

        /* Upcoming */
        .upcoming-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .upcoming-item:last-child { border-bottom: none; }

        /* Print styles */
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          .page { padding: 20px 28px; max-width: 100%; }
          .cover h1 { font-size: 22px; }
          .scores { gap: 8px; }
          .score-box .num { font-size: 20px; }
          @page { margin: 10mm 12mm; size: A4; }
        }
      `}</style>

      {/* Print trigger button */}
      <div className="no-print" style={{ background: '#6366f1', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'white', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 14 }}>ODI Sağlık Raporu — {pet?.name}</span>
        <button onClick={() => window.print()} style={{ background: 'white', color: '#6366f1', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          ⬇ PDF İndir / Yazdır
        </button>
      </div>

      <div className="page">

        {/* ── Cover ── */}
        <div className="cover">
          <div className="cover-left">
            <h1>ODI Pet OS</h1>
            <p>{REPORT_TYPE_LABELS[reportType] ?? 'Sağlık Raporu'}</p>
            <p style={{ marginTop: 8, color: '#94a3b8', fontSize: 11 }}>
              Sahip: {ownerName}{ownerEmail ? ` · ${ownerEmail}` : ''}
            </p>
          </div>
          <div className="cover-right">
            <div className="badge">ODI Verified</div>
            <p>Oluşturuldu: {new Date(generatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p style={{ marginTop: 4 }}>Rapor ID: <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{verificationHash}</span></p>
          </div>
        </div>

        {/* ── Pet Card ── */}
        <div className="pet-card">
          <div className="pet-avatar">{pet?.name?.charAt(0) ?? '🐾'}</div>
          <div className="pet-info">
            <h2>{pet?.name}</h2>
            <p className="meta">
              {SPECIES_TR[pet?.species] ?? pet?.species}
              {pet?.breed ? ` · ${pet.breed}` : ''}
              {pet?.gender === 'male' ? ' · Erkek' : pet?.gender === 'female' ? ' · Dişi' : ''}
            </p>
            <div className="tags">
              {pet?.birth_date && <span className="tag">🎂 {calcAge(pet.birth_date)}</span>}
              {pet?.microchip_no && <span className="tag">📡 {pet.microchip_no}</span>}
              {pet?.passport_no && <span className="tag">📘 {pet.passport_no}</span>}
              {allergies?.length > 0 && <span className="tag" style={{ background: '#fee2e2', color: '#dc2626' }}>⚠ {allergies.length} Alerji</span>}
            </div>
          </div>
        </div>

        {/* ── Scores ── */}
        <div className="scores">
          <div className="score-box">
            <div className={`num ${careScore != null && careScore >= 70 ? 'green' : careScore != null && careScore >= 40 ? 'amber' : 'red'}`}>
              {careScore ?? '—'}
            </div>
            <div className="lbl">Bakım Skoru</div>
          </div>
          <div className="score-box">
            <div className={`num ${preventiveScore >= 70 ? 'green' : preventiveScore >= 40 ? 'amber' : 'red'}`}>{preventiveScore}%</div>
            <div className="lbl">Koruyucu Uyum</div>
          </div>
          <div className="score-box">
            <div className="num blue">{vaccines?.length ?? 0}</div>
            <div className="lbl">Toplam Aşı</div>
          </div>
          <div className="score-box">
            <div className="num" style={{ color: diseases?.length > 0 ? '#d97706' : '#16a34a' }}>{diseases?.length ?? 0}</div>
            <div className="lbl">Hastalık Kaydı</div>
          </div>
        </div>

        {/* ── Allergies ── */}
        {allergies?.length > 0 && (
          <div className="section">
            <div className="section-title">⚠️ Alerjiler</div>
            <div>{allergies.map((a: any) => <span key={a.id} className="pill">{a.trigger_name}</span>)}</div>
          </div>
        )}

        {/* ── Timeline (Summary & Medical) ── */}
        {reportType !== 'travel_pack' && timeline.length > 0 && (
          <div className="section">
            <div className="section-title">
              {reportType === 'summary' ? '📋 Son Olaylar' : '📅 Sağlık Zaman Çizelgesi'}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th>Olay</th>
                  <th>Detay</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {(reportType === 'summary' ? timeline.slice(-8) : timeline).map((e, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>{e.date ? new Date(e.date).toLocaleDateString('tr-TR') : '—'}</td>
                    <td>
                      <span className={`type-badge type-${e.type.toLowerCase()}`}>{e.icon} {e.type}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.title}</td>
                    <td style={{ color: '#64748b' }}>{e.detail || '—'}</td>
                    <td style={{ color: e.status === 'Tamamlandı' ? '#16a34a' : '#d97706' }}>{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Travel Pack extras ── */}
        {reportType === 'travel_pack' && (
          <>
            <div className="section">
              <div className="section-title">✈️ Seyahat & Boarding Bilgileri</div>
              <table>
                <tbody>
                  <tr><td style={{ fontWeight: 700, width: 180 }}>Mikroçip No</td><td>{pet?.microchip_no ?? '—'}</td></tr>
                  <tr><td style={{ fontWeight: 700 }}>Pasaport No</td><td>{pet?.passport_no ?? '—'}</td></tr>
                  <tr><td style={{ fontWeight: 700 }}>Kuduz Aşısı</td>
                    <td>{vaccines?.find((v: any) => v.vaccines?.name?.toLowerCase().includes('kuduz') || v.vaccines?.name?.toLowerCase().includes('rabies'))
                      ? `✓ Uygulandı (${new Date(vaccines.find((v: any) => v.vaccines?.name?.toLowerCase().includes('kuduz') || v.vaccines?.name?.toLowerCase().includes('rabies'))?.applied_date).toLocaleDateString('tr-TR')})`
                      : '✗ Kayıt bulunamadı'}</td>
                  </tr>
                  <tr><td style={{ fontWeight: 700 }}>Veteriner</td><td>{pet?.vet_name ?? '—'}</td></tr>
                  <tr><td style={{ fontWeight: 700 }}>Vet Telefon</td><td>{pet?.vet_phone ?? '—'}</td></tr>
                  <tr><td style={{ fontWeight: 700 }}>Acil İletişim</td><td>{pet?.emergency_contact ?? ownerEmail}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="section">
              <div className="section-title">💉 Aşı Geçerliliği</div>
              <table>
                <thead><tr><th>Aşı</th><th>Tarih</th><th>Veteriner</th></tr></thead>
                <tbody>
                  {vaccines?.length > 0 ? vaccines.map((v: any) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>{v.vaccines?.name}</td>
                      <td>{v.applied_date ? new Date(v.applied_date).toLocaleDateString('tr-TR') : '—'}</td>
                      <td style={{ color: '#64748b' }}>{v.vet_name ?? '—'}</td>
                    </tr>
                  )) : <tr><td colSpan={3} style={{ color: '#94a3b8' }}>Aşı kaydı bulunamadı</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Growth (Medical) ── */}
        {reportType === 'medical_timeline' && growthRecords?.length > 0 && (
          <div className="section">
            <div className="section-title">📏 Büyüme Kayıtları</div>
            <table>
              <thead><tr><th>Tarih</th><th>Ağırlık (kg)</th><th>Boy (cm)</th></tr></thead>
              <tbody>
                {growthRecords.map((g: any) => (
                  <tr key={g.id}>
                    <td>{new Date(g.recorded_at).toLocaleDateString('tr-TR')}</td>
                    <td>{g.weight_kg ?? '—'}</td>
                    <td>{g.height_cm ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Upcoming Tasks ── */}
        {upcomingTasks?.length > 0 && (
          <div className="section">
            <div className="section-title">📌 Yaklaşan Görevler</div>
            {upcomingTasks.map((t: any) => {
              const days = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000)
              return (
                <div key={t.id} className="upcoming-item">
                  <span style={{ color: days < 0 ? '#dc2626' : days <= 7 ? '#d97706' : '#16a34a', fontWeight: 700, fontSize: 11 }}>
                    {days < 0 ? `${Math.abs(days)}g gecikmiş` : days === 0 ? 'Bugün' : `${days} gün`}
                  </span>
                  <span style={{ fontWeight: 600 }}>{t.title ?? 'Bakım'}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(t.due_date).toLocaleDateString('tr-TR')}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="footer">
          <div>
            <p>Bu rapor <strong>ODI Pet OS</strong> tarafından oluşturulmuştur.</p>
            <p>odi.pet · Otomatik rapor — Veteriner muayenesinin yerini tutmaz</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="hash">{verificationHash}</p>
            <p style={{ fontSize: 9, color: '#cbd5e1', marginTop: 2 }}>Doğrulama Kodu</p>
          </div>
        </div>

        {/* Viral CTA — sadece ekranda görünür, print'te yok */}
        <div className="no-print" style={{ marginTop: 32, padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#64748b' }}>
            Bu raporu <strong style={{ color: '#6366f1' }}>ODI Pet OS</strong> ile oluşturdun.
            Evcil hayvanının tüm sağlık geçmişini tek yerden yönet.
          </p>
          <a href="/" style={{ display: 'inline-block', marginTop: 10, background: '#6366f1', color: 'white', borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
            odi.pet'e Git →
          </a>
        </div>

      </div>
    </>
  )
}
