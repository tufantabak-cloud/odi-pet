'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import CoachMark from '@/components/ui/CoachMark'
import EmptyState from '@/components/ui/EmptyState'
import { Stethoscope, Sparkles } from 'lucide-react'
import { QuickUpdateModalProps, AIVetPet, QuickUpdateConfig, AIVetMessage, AIVetResponse } from './ai-vet-types'

function QuickUpdateModal({ petId, config, onClose, onDone }: QuickUpdateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [radioValues, setRadioValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    config?.fields?.forEach((f: any) => {
      if (f.type === 'radio' && f.defaultValue !== undefined) {
        initial[f.name] = String(f.defaultValue)
      }
    })
    return initial
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    try {
      const endpoint = config.endpoint || `/api/pets/${petId}`
      const method = config.method || 'PATCH'
      const res = await fetch(endpoint, { method, body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Hata oluştu')
      }
      onDone()
    } catch(err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-soft overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-text-primary mb-1">{config.title}</h3>
        <p className="text-xs text-text-secondary mb-5 leading-relaxed">{config.desc}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {config.fields.map((f) => (
             <div key={f.name} className="flex flex-col gap-1.5">
               <label className="text-xs font-black text-text-secondary uppercase tracking-wider">{f.label}</label>
               {f.type === 'file' ? (
                 <input name={f.name} type="file" accept="image/*" className="input-base py-2.5 text-xs" required={f.required} />
               ) : f.type === 'radio' ? (
                 <div className="flex gap-2.5 mt-1">
                   {f.options?.map((opt: any) => {
                     const valStr = String(opt.value)
                     const currentVal = radioValues[f.name] ?? String(f.defaultValue ?? '')
                     const isSelected = currentVal === valStr
                     return (
                       <label
                         key={valStr}
                         className={`flex-1 py-3 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer border active:scale-[0.98] ${
                           isSelected
                             ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                             : 'bg-surface border-border-main text-text-secondary hover:border-primary/40'
                         }`}
                       >
                         <input
                           type="radio"
                           name={f.name}
                           value={valStr}
                           checked={isSelected}
                           onChange={() => setRadioValues(prev => ({ ...prev, [f.name]: valStr }))}
                           className="sr-only"
                         />
                         {opt.label}
                       </label>
                     )
                   })}
                 </div>
               ) : (
                 <input name={f.name} type={f.type} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} className="input-base py-3 text-sm" required={f.required} />
               )}
             </div>
          ))}
          {error && <p className="text-xs text-error font-bold p-2 bg-error/10 rounded-lg text-center mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3.5 text-sm">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-sm">{loading ? 'Kaydediliyor...' : 'Kaydet ✓'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const SEV_CONFIG: Record<string, { label: string; color: string; bar: string; emoji: string; bg: string }> = {
  emergency: {
    label: 'ACİL DURUM',
    color: 'text-rose-700 dark:text-rose-500 font-extrabold',
    bar: 'bg-rose-600 dark:bg-rose-500',
    emoji: '🚨',
    bg: 'bg-rose-600/10 border-rose-600/30 text-rose-900',
  },
  critical: {
    label: 'Kritik Risk',
    color: 'text-rose-600 dark:text-rose-400 font-bold',
    bar: 'bg-rose-500 dark:bg-rose-400',
    emoji: '❗',
    bg: 'bg-rose-500/10 border-rose-500/20 text-rose-900',
  },
  medium: {
    label: 'Orta Risk',
    color: 'text-amber-600 dark:text-amber-400 font-bold',
    bar: 'bg-amber-500 dark:bg-amber-400',
    emoji: '⚠️',
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-900',
  },
  low: {
    label: 'Düşük Risk',
    color: 'text-emerald-600 dark:text-emerald-400 font-bold',
    bar: 'bg-emerald-500 dark:bg-emerald-400',
    emoji: '✅',
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900',
  },
  unknown: {
    label: 'Belirsiz',
    color: 'text-slate-600 dark:text-slate-400 font-bold',
    bar: 'bg-slate-400 dark:bg-slate-500',
    emoji: '❓',
    bg: 'bg-slate-500/10 border-slate-500/20 text-slate-900',
  }
}

const QUICK_PROMPTS = [
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><path d="M6 26l8-8M10 22l8-8" stroke="#EC4899" strokeWidth="2" strokeLinecap="round"/><path d="M14 14l4-4 4 4-4 4z" fill="url(#syr-grad)"/><defs><linearGradient id="syr-grad" x1="14" y1="14" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#F472B6"/><stop offset="1" stopColor="#BE185D"/></linearGradient></defs></svg>, text: 'Aşıları gecikti, sorun olur mu?' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><circle cx="16" cy="16" r="12" fill="url(#sad-grad)"/><path d="M11 12h2M19 12h2M11 22q5-3 10 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/><defs><linearGradient id="sad-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#10B981"/><stop offset="1" stopColor="#047857"/></linearGradient></defs></svg>, text: 'Bugün halsiz ve iştahsız' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><circle cx="16" cy="16" r="12" fill="url(#paw-grad)"/><path d="M12 12A2 2 0 1 1 12 11M20 12A2 2 0 1 1 20 11M16 8A2 2 0 1 1 16 7M16 20c-3 0-5-2-5-4s2-2 5-2 5 0 5 2-2 4-5 4z" fill="#fff"/><defs><linearGradient id="paw-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#5B21B6"/></linearGradient></defs></svg>, text: 'Sürekli kaşınıyor, tüy dökülüyor' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><rect x="12" y="4" width="8" height="20" rx="4" fill="url(#therm-grad)"/><circle cx="16" cy="24" r="6" fill="#EF4444"/><path d="M16 24v-10" stroke="#EF4444" strokeWidth="4" strokeLinecap="round"/><defs><linearGradient id="therm-grad" x1="12" y1="4" x2="20" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#FCA5A5"/><stop offset="1" stopColor="#F87171"/></linearGradient></defs></svg>, text: 'Ateşi var, sıcak hissediliyor' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><path d="M16 6c-4 0-6 4-6 8s2 6 6 8 8-2 8-8-2-8-8-8z" fill="url(#poop-grad)"/><defs><linearGradient id="poop-grad" x1="10" y1="6" x2="24" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#A16207"/><stop offset="1" stopColor="#713F12"/></linearGradient></defs></svg>, text: 'İshal ve kusma birlikte' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><path d="M10 16L18 8v8h8" stroke="url(#sleep-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/><defs><linearGradient id="sleep-grad" x1="10" y1="8" x2="26" y2="16" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#1D4ED8"/></linearGradient></defs></svg>, text: 'Normalden çok uyuyor, ilgisiz' },
]

import { AppActionId } from './ai-vet-types'

const ACTION_REGISTRY: Record<AppActionId, { label: string, icon: string, action: (router: any, pet: any, setModal: any) => void }> = {
  add_weight: {
    label: 'Kilo Güncelle',
    icon: '⚖️',
    action: (router, pet, setModal) => setModal({ title: 'Kilo Güncelle', desc: 'Güncel kiloyu girin.', fields: [{ name: 'weight', type: 'number', label: 'Kilo (kg)', required: true }] })
  },
  go_to_vaccines: {
    label: 'Aşı Takvimine Git',
    icon: '💉',
    action: (router, pet) => router.push(`/owner/pets/${pet.id}/health`)
  },
  go_to_parasites: {
    label: 'Parazit Bakımı',
    icon: '🦠',
    action: (router, pet) => router.push(`/owner/pets/${pet.id}/parasite`)
  },
  go_to_nutrition: {
    label: 'Beslenme Planı',
    icon: '🥣',
    action: (router, pet) => router.push(`/owner/pets/${pet.id}/nutrition`)
  },
  go_to_health: {
    label: 'Sağlık Geçmişi',
    icon: '❤️',
    action: (router, pet) => router.push(`/owner/pets/${pet.id}/health`)
  },
  find_vet: {
    label: 'Veteriner Bul',
    icon: '🏥',
    action: (router) => router.push(`/owner/veterinary`)
  }
}

export default function AIVetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<AIVetMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [pets, setPets] = useState<AIVetPet[]>([])
  const [selectedPet, setSelectedPet] = useState<AIVetPet | null>(null)
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<QuickUpdateConfig | null>(null)
  
  const [hasConsented, setHasConsented] = useState<boolean>(false)

  // Load consent state on mount
  useEffect(() => {
    const consent = localStorage.getItem('ai_vet_consent_given')
    if (consent === 'true') {
      setHasConsented(true)
    }
  }, [])

  const handleConsent = () => {
    localStorage.setItem('ai_vet_consent_given', 'true')
    setHasConsented(true)
  }

  const fetchPets = async () => {
    try {
      const supabase = createBrowserSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: petData } = await supabase
          .from('pets')
          .select(`
            id, name, species, breed, gender, birth_date, vet_name, vet_phone,
            vaccine_records_v2(vaccine_name, status),
            health_diseases(disease_name)
          `)
          .eq('owner_id', user.id)

        if (petData && petData.length > 0) {
          const formatted = petData.map((p: any) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            breed: p.breed,
            gender: p.gender,
            birth_date: p.birth_date,
            vet_name: p.vet_name,
            vet_phone: p.vet_phone,
            vaccines: p.vaccine_records_v2?.filter((v:any) => v.status === 'done' || v.status === 'completed').map((v:any) => v.vaccine_name) || [],
            diseases: p.health_diseases?.map((d:any) => d.disease_name) || []
          }))
          setPets(formatted)
          
          let defaultPet = formatted[0]
          const urlPetId = searchParams.get('petId')
          if (urlPetId) {
            const found = formatted.find((p: AIVetPet) => p.id === urlPetId)
            if (found) defaultPet = found
          }
          setSelectedPet(defaultPet)
        }
      } catch (err) {
        console.error('Pets fetch error:', err)
      }
  }

  useEffect(() => {
    fetchPets()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Build Gemini history from messages
  const buildHistory = (msgs: AIVetMessage[]) =>
    msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }))

  const send = async (overrideText?: string) => {
    const userText = (overrideText ?? input).trim()
    if (!userText || loading) return
    setInput('')

    const newMessages: AIVetMessage[] = [...messages, { role: 'user', text: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const history = buildHistory(newMessages)
      const res = await fetch('/api/ai-vet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, petId: selectedPet?.id }), // sending only petId
      })
      const data = await res.json()

      const responseObj: AIVetResponse = data.response
      
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: responseObj.summary || '',
          response: responseObj,
          poweredBy: data.powered_by,
          contextUsed: data.contextUsed,
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { 
          role: 'ai', 
          text: '⚠️ Odi şu anda güvenilir bir bağlantı kuramadı. Belirtiler ciddi ise veterinerinize başvurun.',
          response: {
            assessment_available: false,
            is_emergency: false,
            severity: 'unknown',
            risk_score: null,
            confidence_score: 0,
            summary: 'Bağlantı hatası.',
          }
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai' && m.response)
  const followupChips = lastAiMsg?.response?.follow_up_questions || []
  const showQuickPrompts = messages.length === 0

  // Render bold markdown (**text**)
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] max-h-[860px] w-full mx-auto">
      {/* Header */}
      <div className="border-b border-border-main pb-4 mb-4 shrink-0 flex items-start justify-between gap-3 relative">
        <CoachMark
          hintKey="ai_vet_intro"
          title="Pet seç, semptomları anlat"
          message="Üst kısımdan evcil hayvanını seç ve şikayetini yaz. AI, cinsine ve yaşına göre kişisel değerlendirme yapacak."
          icon="✨"
          position="bottom"
        />
        <div className="flex gap-4 items-start">
          <button type="button" onClick={() => router.back()}
            className="w-11 h-11 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-surface shrink-0 mt-0.5 shadow-sm hover:scale-[1.05] active:scale-[0.95]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 className="text-[24px] font-extrabold text-text-primary tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              AI Vet
            </h1>
            <p className="text-text-secondary text-[13px] mt-0.5">Belirtileri yazın — detaylı ön değerlendirme alın.</p>

            {pets.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">🐾 HASTA SEÇİMİ:</span>
                <select 
                  className="input-base py-1.5 px-3 text-[13px] font-bold min-w-[140px] bg-primary/5 border-primary/20 text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                  value={selectedPet?.id || ''}
                  onChange={(e) => {
                    const p = pets.find(x => x.id === e.target.value)
                    if(p) setSelectedPet(p)
                  }}
                >
                  {pets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full mt-1 shrink-0 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          Odi AI Vet
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 scrollbar-none">
        {messages.length === 0 && (
          <EmptyState
            illustrationId="ai-vet-assistant"
            title="Odi AI Vet"
            message="Petinizin sağlığı hakkında bilgi alın. Unutmayın, kesin tanı vermez ve her zaman bir veteriner hekime danışmanızı önerir."
          />
        )}
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const resp = msg.response
          const sev = resp?.severity || 'unknown'
          const cfg = SEV_CONFIG[sev]

          if (isUser) {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] flex flex-col gap-2">
                  <div className="p-4 rounded-[18px] shadow-soft bg-primary text-white rounded-br-[4px]">
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{renderText(msg.text)}</p>
                  </div>
                </div>
              </div>
            )
          }

          // Emergency UI State
          if (resp?.is_emergency) {
            return (
              <div key={i} className="flex justify-start w-full my-4">
                <div className="w-full bg-rose-600 rounded-3xl p-6 text-white shadow-soft animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[28px]">🚨</span>
                    <h3 className="text-[20px] font-black tracking-tight">ACİL DURUM</h3>
                  </div>
                  <p className="font-bold text-[15px] mb-3 leading-snug">{resp.emergency_reason}</p>
                  <p className="text-[14px] opacity-90 mb-6 leading-relaxed">{resp.emergency_action || resp.summary}</p>
                  
                  {resp.red_flags && resp.red_flags.length > 0 && (
                     <div className="bg-black/10 rounded-2xl p-4 mb-6">
                       <p className="text-[12px] font-black mb-2 uppercase opacity-80 tracking-wider">Şunları Gözlemleyin:</p>
                       <ul className="flex flex-col gap-2">
                         {resp.red_flags.map((rf, idx) => <li key={idx} className="text-[13px] flex gap-2"><span className="opacity-70">⚠️</span> {rf}</li>)}
                       </ul>
                     </div>
                  )}

                  <div className="flex flex-col gap-3">
                     <button onClick={() => selectedPet?.vet_phone ? (window.location.href=`tel:${selectedPet.vet_phone}`) : router.push('/owner/veterinary')} className="w-full bg-white text-rose-600 rounded-2xl py-3.5 font-black flex justify-center items-center gap-2 active:scale-[0.98] transition-all shadow-sm">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                       {selectedPet?.vet_phone ? `Veterineri Ara: ${selectedPet.vet_name}` : 'Acil Veteriner Bul'}
                     </button>
                  </div>
                </div>
              </div>
            )
          }

          // Normal AI Response Card
          return (
            <div key={i} className="flex justify-start my-2 w-full">
              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mr-2 mt-1 text-[13px] shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              
              <div className="flex flex-col gap-3 max-w-[90%] w-full">
                 {/* 1. Kısa Cevap / Summary */}
                 <div className="p-4 rounded-[18px] shadow-soft bg-surface border border-border-main rounded-bl-[4px]">
                   <p className="text-[14px] leading-relaxed text-text-primary whitespace-pre-wrap">{renderText(resp?.summary || msg.text)}</p>
                 </div>
                 
                 {resp && resp.assessment_available && (
                   <div className="flex flex-col gap-3">
                     {/* 2. Risk / Önem */}
                     <div className={`rounded-2xl border p-3.5 ${cfg.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[12px] font-bold flex items-center gap-1.5 ${cfg.color}`}>
                            <span>{cfg.emoji}</span> {cfg.label}
                          </span>
                          {resp.risk_score !== null && resp.risk_score !== undefined && (
                            <span className={`text-[13px] font-extrabold ${cfg.color}`}>
                              {resp.risk_score}<span className="text-[10px] font-normal opacity-70">/100</span>
                            </span>
                          )}
                        </div>
                        {/* Score bar */}
                        {resp.risk_score !== null && resp.risk_score !== undefined && (
                          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${resp.risk_score}%` }} />
                          </div>
                        )}
                        
                        {/* Possible Explanations */}
                        {resp.possible_explanations && resp.possible_explanations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-black/5">
                            <p className={`text-[11px] font-black uppercase mb-1.5 opacity-70 tracking-wider ${cfg.color}`}>Olası Durumlar</p>
                            <ul className="flex flex-col gap-1.5">
                              {resp.possible_explanations.map((exp, idx) => (
                                <li key={idx} className={`text-[12px] leading-snug opacity-90 ${cfg.color}`}>• {exp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                     </div>

                     {/* 3. Ne Yapmalısın? (Recommended Actions) */}
                     {resp.recommended_actions && resp.recommended_actions.length > 0 && (
                       <div className="bg-primary-soft/50 rounded-2xl p-4 border border-primary/10">
                         <h4 className="text-[12px] font-black text-primary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                           Ne Yapmalısınız?
                         </h4>
                         <ul className="flex flex-col gap-2">
                           {resp.recommended_actions.map((act, idx) => (
                             <li key={idx} className="text-[13px] text-text-secondary leading-snug flex items-start gap-2">
                               <span className="text-primary mt-0.5 font-black">•</span> <span>{act}</span>
                             </li>
                           ))}
                         </ul>
                       </div>
                     )}

                     {/* 4. Dikkat Etmen Gereken Belirtiler (Red Flags) */}
                     {resp.red_flags && resp.red_flags.length > 0 && (
                       <div className="bg-rose-50 dark:bg-rose-950/30 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/30">
                         <h4 className="text-[12px] font-black text-rose-700 dark:text-rose-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                           <span>⚠️</span> Dikkat Edilmesi Gerekenler
                         </h4>
                         <ul className="flex flex-col gap-2">
                           {resp.red_flags.map((flag, idx) => (
                             <li key={idx} className="text-[12px] text-rose-900 dark:text-rose-300 leading-snug flex items-start gap-2">
                               <span className="opacity-50 mt-0.5">-</span> <span>{flag}</span>
                             </li>
                           ))}
                         </ul>
                         {resp.when_to_see_vet && (
                           <div className="mt-3 pt-3 border-t border-rose-200/50 dark:border-rose-800/50">
                             <p className="text-[12px] font-bold text-rose-800 dark:text-rose-400">🕒 {resp.when_to_see_vet}</p>
                           </div>
                         )}
                       </div>
                     )}

                     {/* 5. Gerekirse Odi Pet Aksiyonu (Smart Actions) */}
                     {resp.suggested_app_actions && resp.suggested_app_actions.length > 0 && (
                       <div className="flex flex-wrap gap-2 mt-1">
                         {resp.suggested_app_actions.map(actId => {
                           const action = ACTION_REGISTRY[actId]
                           if (!action) return null
                           return (
                             <button key={actId} onClick={() => action.action(router, selectedPet, setQuickUpdateConfig)} className="flex items-center gap-1.5 bg-surface border border-primary/20 text-primary text-[12px] font-bold py-2 px-3.5 rounded-xl hover:bg-primary/5 active:scale-[0.98] transition-all shadow-sm">
                               <span>{action.icon}</span> {action.label}
                             </button>
                           )
                         })}
                       </div>
                     )}
                     
                     {/* 6. Context Badges */}
                     {msg.contextUsed && msg.contextUsed.length > 0 && (
                       <div className="flex flex-wrap gap-1.5 mt-1 border-t border-border-main pt-3">
                         <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-0.5">Bağlam:</span>
                         {msg.contextUsed.map((ctx, idx) => (
                           <span key={idx} className="text-[10px] font-bold text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                             ✓ {ctx}
                           </span>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
                 
                 {/* Assessment Available False Handling */}
                 {resp && !resp.assessment_available && (
                    <div className="mt-1 p-3 bg-slate-500/10 border border-slate-500/20 rounded-xl flex flex-col gap-2">
                      <p className="text-[11.5px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                        {resp.missing_critical_info && resp.missing_critical_info.length > 0 
                          ? `Eksik bilgi tespit edildi: ${resp.missing_critical_info.join(', ')}`
                          : 'Odi şu anda bu durum için güvenilir bir değerlendirme oluşturamadı.'}
                      </p>
                    </div>
                 )}
              </div>
            </div>
          )
        })}

        {/* Loading */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 mr-2 mt-1 text-[13px]">🐾</div>
            <div className="bg-surface border border-border-main p-4 rounded-[18px] rounded-bl-[4px] shadow-soft">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0ms]"/>
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:150ms]"/>
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:300ms]"/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Disclaimer Consent Overlay */}
      {!hasConsented && (
        <div className="absolute inset-0 z-50 bg-surface/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)] border border-slate-100 max-w-md w-full animate-fade-in flex flex-col gap-5 text-center">
            <div className="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center mb-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-extrabold text-text-primary">Yapay Zeka Asistanı</h2>
            <div className="text-[14px] text-text-secondary leading-relaxed flex flex-col gap-3 text-left">
              <p>Odi AI Vet, evcil hayvanınızın belirtilerine göre size <strong>ön bilgilendirme</strong> sağlayan bir yapay zeka asistanıdır.</p>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-900 mt-2">
                <p className="font-bold flex gap-2 items-start"><span className="text-lg leading-none">⚠️</span> <span>Tıbbi Sorumluluk Reddi</span></p>
                <p className="text-[13px] mt-2 opacity-90">Bu bir klinik teşhis aracı değildir ve hiçbir zaman profesyonel veteriner hekim muayenesi veya tedavisi yerine geçmez. Acil ve şüpheli durumlarda mutlaka lisanslı bir veteriner hekime başvurunuz.</p>
              </div>
            </div>
            <button 
              onClick={handleConsent}
              className="mt-4 w-full bg-purple-600 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform shadow-sm hover:bg-purple-700"
            >
              Anladım ve Onaylıyorum
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 pt-4 bg-surface relative z-10 border-t border-border-main mt-4 shrink-0 flex flex-col gap-3 pb-8 pb-safe">
        {/* Quick prompts (initial state) */}
        {showQuickPrompts && (
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => send(p.text)}
                className="text-[12px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
              >
                <span>{p.icon}</span> {p.text}
              </button>
            ))}
          </div>
        )}

        {/* Follow-up chips (after AI response with severity) */}
        {!showQuickPrompts && followupChips.length > 0 && !loading && (
          <div className="flex flex-wrap gap-2">
            {followupChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => send(chip)}
                className="text-[12px] font-bold text-text-secondary bg-surface hover:bg-primary/10 hover:text-primary border border-border-main px-3 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        <div className="flex gap-3">
          <input
            ref={inputRef}
            id="ai-vet-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Belirtileri detaylı yazın... (örn: 2 gündür kusma, ateş, iştahsız)"
            className="input-base flex-1 text-[14px]"
            disabled={loading}
          />
          <button
            id="ai-vet-send-btn"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            aria-label="Gönder"
            className="btn-primary min-h-[50px] flex items-center justify-center px-5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <p className="text-[11px] text-text-secondary/60 text-center mt-3 mb-1">
          Bu araç genel bilgi amaçlıdır, veteriner kararının yerini tutmaz.
        </p>
      </div>

      {quickUpdateConfig && selectedPet?.id && (
        <QuickUpdateModal
          petId={selectedPet.id}
          config={quickUpdateConfig}
          onClose={() => setQuickUpdateConfig(null)}
          onDone={() => {
            setQuickUpdateConfig(null)
            fetchPets()
          }}
        />
      )}
    </div>
  )
}
