'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics/track'

const STEPS = [
  {
    id: 'welcome',
    emoji: '👋',
    title: 'ODI\'ye Hoş Geldin!',
    subtitle: 'Evcil hayvanının sağlığını ve bakımını tek yerden yönet.',
    desc: 'Kurulum 2 dakika sürer. Hadi başlayalım.',
  },
  {
    id: 'pet',
    emoji: '🐾',
    title: 'İlk Petini Ekle',
    subtitle: 'Sadece temel bilgiler yeterli — her şeyi sonradan ekleyebilirsin.',
    desc: '',
  },
  {
    id: 'quickwin',
    emoji: '🎉',
    title: 'Harika! Profil Hazır.',
    subtitle: 'Bakım skoru ve sağlık özeti oluşturuldu.',
    desc: '',
  },
  {
    id: 'done',
    emoji: '🚀',
    title: 'Her Şey Hazır!',
    subtitle: 'Aktivasyon çeklist\'ini tamamladıkça +100 Care Points kazanırsın.',
    desc: '',
  },
]

const SPECIES_OPTIONS = [
  { value: 'dog', emoji: '🐕', label: 'Köpek' },
  { value: 'cat', emoji: '🐈', label: 'Kedi' },
  { value: 'bird', emoji: '🐦', label: 'Kuş' },
  { value: 'other', emoji: '🐾', label: 'Diğer' },
]

// Dog age scale from AGENTS.md
const getAgeGroup = (species: string, birthDate: string) => {
  if (!birthDate) return ''
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  const years = months / 12
  if (species === 'dog' || species === 'cat') {
    if (years < 1) return 'Yavru (0–1 yaş)'
    if (years < 7) return 'Yetişkin (1–7 yaş)'
    if (years < 12) return 'Yaşlı (7–12 yaş)'
    return 'Yaşlı (12+ yaş)'
  }
  return ''
}

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', birth_date: '' })
  const [createdPet, setCreatedPet] = useState<any>(null)
  const router = useRouter()

  async function createPet() {
    setSaving(true)
    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const pet = await res.json()
      if (pet.id) {
        setCreatedPet(pet)
        // Track
        await Promise.all([
          trackEvent('pet_created', { petId: pet.id, species: form.species }),
          trackEvent('quick_win_seen', { petId: pet.id }),
        ])
        // Mark onboarding step
        await fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ has_added_pet: true, wizard_step: 2, first_pet_at: new Date().toISOString() }),
        })
        setStep(2)
      }
    } finally { setSaving(false) }
  }

  async function finish() {
    await trackEvent('onboarding_completed')
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wizard_completed: true, wizard_step: 3 }),
    })
    onComplete()
    router.refresh()
    if (createdPet?.id) router.push(`/owner/pets/${createdPet.id}`)
  }

  const currentStep = STEPS[step]
  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}/>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pt-5 px-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-primary w-6' : 'bg-gray-200 w-3'}`}/>
          ))}
        </div>

        <div className="px-8 py-7">

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="text-[64px] mb-4">{currentStep.emoji}</div>
              <h2 className="text-[24px] font-black text-text-primary">{currentStep.title}</h2>
              <p className="text-text-secondary mt-2 leading-relaxed">{currentStep.subtitle}</p>
              <p className="text-[13px] text-text-secondary mt-1">{currentStep.desc}</p>

              <div className="flex flex-col gap-3 mt-8">
                <button onClick={async () => { await trackEvent('onboarding_started'); setStep(1) }} className="btn-primary py-3.5 text-[15px] font-bold">
                  Başlayalım →
                </button>
                <button
                  onClick={async () => {
                    setSaving(true)
                    await trackEvent('demo_enabled')
                    await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enable_demo' }) })
                    setSaving(false)
                    onComplete()
                    router.refresh()
                  }}
                  disabled={saving}
                  className="btn-secondary py-3 text-[14px] font-semibold text-text-secondary"
                >
                  {saving ? 'Yükleniyor...' : '🐾 Demo ile Keşfet'}
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Pet form */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-[48px] mb-3">{currentStep.emoji}</div>
                <h2 className="text-[20px] font-black text-text-primary">{currentStep.title}</h2>
                <p className="text-[13px] text-text-secondary mt-1">{currentStep.subtitle}</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Species */}
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-2">Tür</label>
                  <div className="grid grid-cols-4 gap-2">
                    {SPECIES_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => setForm(f => ({ ...f, species: s.value }))}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-[11px] font-bold transition-all ${form.species === s.value ? 'border-primary bg-primary-soft text-primary' : 'border-gray-200 text-text-secondary hover:border-gray-300'}`}>
                        <span className="text-[24px]">{s.emoji}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-2">İsim</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={form.species === 'dog' ? 'Örn: Bella, Max...' : form.species === 'cat' ? 'Örn: Minnoş, Cleo...' : 'Pet ismi'}
                    className="input-base w-full"
                  />
                </div>

                {/* Breed */}
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-2">
                    Irk <span className="text-text-secondary font-normal normal-case">(opsiyonel)</span>
                  </label>
                  <input
                    value={form.breed}
                    onChange={e => setForm(f => ({ ...f, breed: e.target.value }))}
                    placeholder={form.species === 'dog' ? 'Golden Retriever, Labrador...' : 'Melez, British Shorthair...'}
                    className="input-base w-full"
                  />
                </div>

                {/* Birth date */}
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-2">
                    Doğum Tarihi <span className="text-text-secondary font-normal normal-case">(yaklaşık olabilir)</span>
                  </label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className="input-base w-full"
                  />
                  {form.birth_date && (
                    <p className="text-[11px] text-primary font-bold mt-1">
                      {getAgeGroup(form.species, form.birth_date)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)} className="btn-secondary px-4 py-3">←</button>
                <button
                  onClick={createPet}
                  disabled={!form.name || saving}
                  className="btn-primary flex-1 py-3 text-[14px] font-bold disabled:opacity-50"
                >
                  {saving ? 'Oluşturuluyor...' : 'Pet Profili Oluştur →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Quick Win */}
          {step === 2 && (
            <div className="text-center">
              <div className="text-[64px] mb-2">{currentStep.emoji}</div>
              <h2 className="text-[22px] font-black text-text-primary">{currentStep.title}</h2>
              <p className="text-text-secondary mt-1">{currentStep.subtitle}</p>

              {createdPet && (
                <div className="mt-6 p-4 rounded-2xl bg-primary-soft border border-primary/20">
                  <p className="font-black text-primary text-[15px]">{createdPet.name}</p>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    {form.breed || form.species} {form.birth_date ? `• ${getAgeGroup(form.species, form.birth_date)}` : ''}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[['🎯', 'Bakım Skoru', '--'], ['🛡️', 'Risk Taraması', 'Hazır'], ['📋', 'İlk Görev', 'Oluşturuldu']].map(([emoji, label, val]) => (
                      <div key={label} className="bg-white rounded-xl p-2.5 border border-primary/10">
                        <p className="text-[18px]">{emoji}</p>
                        <p className="text-[10px] font-bold text-text-secondary mt-0.5">{label}</p>
                        <p className="text-[11px] font-black text-primary">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[12px] text-text-secondary mt-4">
                Şimdi aktivasyon çeklist'ini tamamladıkça daha fazla özellik açılacak.
              </p>

              <button onClick={() => setStep(3)} className="btn-primary w-full py-3.5 mt-5 text-[15px] font-bold">
                Devam Et →
              </button>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <div className="text-center">
              <div className="text-[64px] mb-2">{currentStep.emoji}</div>
              <h2 className="text-[22px] font-black text-text-primary">{currentStep.title}</h2>
              <p className="text-text-secondary mt-1 leading-relaxed">{currentStep.subtitle}</p>

              <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="text-[13px] font-bold text-amber-800">
                  🏆 Çeklistini tamamla → <span className="font-black">+100 Care Points</span> kazan
                </p>
                <div className="mt-3 flex flex-col gap-1.5 text-left">
                  {[
                    'İlk pet eklendi ✓',
                    'Aşı kaydı ekle',
                    'Günlük mama girişi yap',
                    'Aile üyesi davet et',
                    'İlk raporu oluştur',
                  ].map((item, i) => (
                    <p key={i} className={`text-[12px] flex items-center gap-2 ${i === 0 ? 'text-green-700 font-bold' : 'text-text-secondary'}`}>
                      <span>{i === 0 ? '✅' : '⬜'}</span>{item}
                    </p>
                  ))}
                </div>
              </div>

              <button onClick={finish} disabled={saving} className="btn-primary w-full py-3.5 mt-5 text-[15px] font-bold">
                {saving ? 'Yükleniyor...' : 'Dashboard\'a Git →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
