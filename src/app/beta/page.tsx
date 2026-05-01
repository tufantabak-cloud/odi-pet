'use client'

import { useState } from 'react'

const SEGMENTS = [
  { value: 'pet_owner',  emoji: '🐾', label: 'Yoğun pet sahibi' },
  { value: 'family',     emoji: '👨‍👩‍👧', label: 'Aileli kullanıcı' },
  { value: 'vet',        emoji: '🏥', label: 'Veteriner' },
  { value: 'chronic_pet',emoji: '💊', label: 'Kronik hastalıklı pet sahibi' },
]

export default function BetaLanding() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/beta/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, segment }),
      })
      const json = await res.json()
      setMsg(json.success
        ? { ok: true, text: '✅ Kayıt alındı! En kısa sürede davet göndereceğiz.' }
        : { ok: false, text: `🚨 Hata: ${json.error}` }
      )
    } catch {
      setMsg({ ok: false, text: '🚨 Ağ hatası, tekrar dene.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / headline */}
        <div className="text-center mb-8">
          <p className="text-[36px] mb-3">🐾</p>
          <h1 className="text-3xl font-black text-white">ODI Pet — Closed Beta</h1>
          <p className="text-indigo-300 mt-2 leading-relaxed">
            Evcil hayvanınızın sağlık, bakım ve sigorta yönetimini tek platformda toplayın.
            Şu an sadece davetli kullanıcılar katılabiliyor.
          </p>
        </div>

        {/* Features teaser */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: '🏥', text: 'Sağlık timeline' },
            { icon: '🛡️', text: 'Sigorta skoru' },
            { icon: '📄', text: 'Vet raporu PDF' },
            { icon: '👨‍👩‍👧', text: 'Aile paylaşımı' },
          ].map(f => (
            <div key={f.text} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2 text-[13px] text-white">
              <span className="text-[18px]">{f.icon}</span>{f.text}
            </div>
          ))}
        </div>

        {/* Form */}
        {!msg?.ok ? (
          <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-black text-indigo-300 uppercase tracking-widest block mb-2">
                İsminiz
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Adınız Soyadınız"
                className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 px-4 py-2.5 text-[14px] outline-none focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-indigo-300 uppercase tracking-widest block mb-2">
                E-posta *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="isim@ornekmail.com"
                className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 px-4 py-2.5 text-[14px] outline-none focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-indigo-300 uppercase tracking-widest block mb-2">
                Sizi nasıl tanımlarsınız?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SEGMENTS.map(s => (
                  <button type="button" key={s.value} onClick={() => setSegment(s.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-[12px] font-semibold transition-all text-left ${segment === s.value ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`}
                  >
                    <span className="text-[18px]">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-[15px] transition-all disabled:opacity-60">
              {loading ? 'Gönderiliyor...' : 'Beta Daveti Talep Et →'}
            </button>
            <p className="text-[11px] text-white/40 text-center">
              İlk 30 kullanıcı ücretsiz Pro plan ile başlar.
            </p>
          </form>
        ) : (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <p className="text-[48px] mb-3">🎉</p>
            <p className="text-white font-black text-[18px]">{msg.text}</p>
            <p className="text-green-300 mt-2 text-[14px]">
              Davet e-postanızı kontrol edin. Beta açıldığında haber vereceğiz.
            </p>
          </div>
        )}

        {msg && !msg.ok && (
          <p className="text-red-400 text-center mt-3 text-[13px]">{msg.text}</p>
        )}
      </div>
    </div>
  )
}
