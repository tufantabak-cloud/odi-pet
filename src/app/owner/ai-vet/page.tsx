'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import CoachMark from '@/components/ui/CoachMark'
import EmptyState from '@/components/ui/EmptyState'
import { Stethoscope } from 'lucide-react'
import { QuickUpdateModalProps, AIVetPet, QuickUpdateConfig } from './ai-vet-types'

function QuickUpdateModal({ petId, config, onClose, onDone }: QuickUpdateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
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
      <div className="bg-surface w-full max-w-sm rounded-[28px] p-6 shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-[17px] font-extrabold text-text-primary mb-1">{config.title}</h3>
        <p className="text-[13px] text-text-secondary mb-5 leading-relaxed">{config.desc}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {config.fields.map((f) => (
             <div key={f.name} className="flex flex-col gap-1.5">
               <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">{f.label}</label>
               {f.type === 'file' ? (
                 <input name={f.name} type="file" accept="image/*" className="input-base py-2.5 text-[13px]" required={f.required} />
               ) : (
                 <input name={f.name} type={f.type} step={f.type === 'number' ? 'any' : undefined} placeholder={f.placeholder} className="input-base py-3 text-[14px]" required={f.required} />
               )}
             </div>
          ))}
          {error && <p className="text-[12px] text-error font-bold p-2 bg-error/10 rounded-lg text-center mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-[14px]">{loading ? 'Kaydediliyor...' : 'Kaydet ✓'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface Message {
  role: 'user' | 'ai'
  text: string
  score?: number
  severity?: string
  poweredBy?: string
}

const SEV_CONFIG: Record<string, { label: string; color: string; bar: string; emoji: string; bg: string }> = {
  critical: {
    label: 'Kritik',
    color: 'text-error',
    bar: 'bg-error',
    emoji: '🚨',
    bg: 'bg-error/10 border-error/20',
  },
  medium: {
    label: 'Orta Risk',
    color: 'text-warning',
    bar: 'bg-warning',
    emoji: '⚠️',
    bg: 'bg-warning/10 border-warning/20',
  },
  low: {
    label: 'Düşük Risk',
    color: 'text-success',
    bar: 'bg-success',
    emoji: '✅',
    bg: 'bg-success/10 border-success/20',
  },
}

const QUICK_PROMPTS = [
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><path d="M6 26l8-8M10 22l8-8" stroke="#EC4899" strokeWidth="2" strokeLinecap="round"/><path d="M14 14l4-4 4 4-4 4z" fill="url(#syr-grad)"/><defs><linearGradient id="syr-grad" x1="14" y1="14" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#F472B6"/><stop offset="1" stopColor="#BE185D"/></linearGradient></defs></svg>, text: 'Aşıları gecikti, sorun olur mu?' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><circle cx="16" cy="16" r="12" fill="url(#sad-grad)"/><path d="M11 12h2M19 12h2M11 22q5-3 10 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/><defs><linearGradient id="sad-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#10B981"/><stop offset="1" stopColor="#047857"/></linearGradient></defs></svg>, text: 'Bugün halsiz ve iştahsız' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><circle cx="16" cy="16" r="12" fill="url(#paw-grad)"/><path d="M12 12A2 2 0 1 1 12 11M20 12A2 2 0 1 1 20 11M16 8A2 2 0 1 1 16 7M16 20c-3 0-5-2-5-4s2-2 5-2 5 0 5 2-2 4-5 4z" fill="#fff"/><defs><linearGradient id="paw-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#5B21B6"/></linearGradient></defs></svg>, text: 'Sürekli kaşınıyor, tüy dökülüyor' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><rect x="12" y="4" width="8" height="20" rx="4" fill="url(#therm-grad)"/><circle cx="16" cy="24" r="6" fill="#EF4444"/><path d="M16 24v-10" stroke="#EF4444" strokeWidth="4" strokeLinecap="round"/><defs><linearGradient id="therm-grad" x1="12" y1="4" x2="20" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#FCA5A5"/><stop offset="1" stopColor="#F87171"/></linearGradient></defs></svg>, text: 'Ateşi var, sıcak hissediliyor' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><path d="M16 6c-4 0-6 4-6 8s2 6 6 8 8-2 8-8-2-8-8-8z" fill="url(#poop-grad)"/><defs><linearGradient id="poop-grad" x1="10" y1="6" x2="24" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#A16207"/><stop offset="1" stopColor="#713F12"/></linearGradient></defs></svg>, text: 'İshal ve kusma birlikte' },
  { icon: <svg viewBox="0 0 32 32" className="w-4 h-4 drop-shadow-sm"><path d="M10 16L18 8v8h8" stroke="url(#sleep-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/><defs><linearGradient id="sleep-grad" x1="10" y1="8" x2="26" y2="16" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#1D4ED8"/></linearGradient></defs></svg>, text: 'Normalden çok uyuyor, ilgisiz' },
]

const FOLLOWUP_CHIPS: Record<string, string[]> = {
  critical: ['Bu ne kadar acil?', 'Hangi kliniğe gideyim?', 'Yolda ne yapmalıyım?'],
  medium:   ['Belirtiler ne zaman geçer?', 'Evde ne yapabilirim?', 'Neden olmuş olabilir?'],
  low:      ['Ne zaman endişelenmeliyim?', 'Beslenmeyi değiştireyim mi?', 'Takip için ne izlemeliyim?'],
}

export default function AIVetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [pets, setPets] = useState<AIVetPet[]>([])
  const [selectedPet, setSelectedPet] = useState<AIVetPet | null>(null)
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<QuickUpdateConfig | null>(null)

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

  // Build Gemini history from messages (skip welcome)
  const buildHistory = (msgs: Message[]) =>
    msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }))

  const send = async (overrideText?: string) => {
    const userText = (overrideText ?? input).trim()
    if (!userText || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', text: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const history = buildHistory(newMessages)
      const res = await fetch('/api/ai-vet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, petContext: selectedPet }),
      })
      const data = await res.json()

      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: data.text,
          score: typeof data.score === 'number' ? data.score : undefined,
          severity: data.severity,
          poweredBy: data.powered_by,
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: '⚠️ Bağlantı hatası oluştu. Lütfen tekrar deneyin.' },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai' && m.severity)
  const followupChips = lastAiMsg?.severity ? FOLLOWUP_CHIPS[lastAiMsg.severity] : []
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
          icon="🤖"
          position="bottom"
        />
        <div className="flex gap-4 items-start">
          <button type="button" onClick={() => router.back()}
            className="w-11 h-11 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-surface shrink-0 mt-0.5 shadow-sm hover:scale-[1.05] active:scale-[0.95]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 className="text-[24px] font-extrabold text-text-primary tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
                </svg>
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
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary/70 bg-primary/10 px-2.5 py-1 rounded-full mt-1 shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          Gemini AI
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 scrollbar-none">
        {messages.length === 0 && (
          <EmptyState
            icon={
              <svg viewBox="0 0 32 32" className="w-12 h-12 drop-shadow-sm mx-auto mb-2 text-primary">
                <path d="M12 4h8v4h-8z" fill="#D1D5DB" />
                <path d="M8 8h16v18a4 4 0 01-4 4H12a4 4 0 01-4-4V8z" fill="url(#ai-steth-grad)" />
                <path d="M16 12v10M11 17h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="ai-steth-grad" x1="8" y1="8" x2="24" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6" /><stop offset="1" stopColor="#1D4ED8" /></linearGradient>
                </defs>
              </svg>
            }
            title="Odi AI Vet"
            message="Petinizin sağlığı hakkında bilgi alın. Unutmayın, kesin tanı vermez ve her zaman bir veteriner hekime danışmanızı önerir."
          />
        )}
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const cfg = msg.severity ? SEV_CONFIG[msg.severity] : null

          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 mr-2 mt-1 text-[13px]">
                  🐾
                </div>
              )}
              <div className={`max-w-[85%] flex flex-col gap-2`}>
                <div
                  className={`p-4 rounded-[18px] shadow-soft ${
                    isUser
                      ? 'bg-primary text-white rounded-br-[4px]'
                      : 'bg-surface border border-border-main rounded-bl-[4px]'
                  }`}
                >
                  <p className={`text-[14px] leading-relaxed whitespace-pre-wrap ${isUser ? 'text-white' : 'text-text-primary'}`}>
                    {renderText(msg.text)}
                  </p>
                </div>

                {/* Risk card — only for AI messages with a score */}
                {cfg && typeof msg.score === 'number' && (
                  <div className={`rounded-2xl border p-3.5 ${cfg.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[12px] font-bold flex items-center gap-1.5 ${cfg.color}`}>
                        <span>{cfg.emoji}</span> {cfg.label}
                      </span>
                      <span className={`text-[13px] font-extrabold ${cfg.color}`}>
                        {msg.score}<span className="text-[10px] font-normal opacity-70">/100</span>
                      </span>
                    </div>
                    {/* Score bar */}
                    <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                        style={{ width: `${msg.score}%` }}
                      />
                    </div>
                    {msg.poweredBy === 'heuristic' && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2">
                        <p className="text-[11px] font-medium text-amber-800 leading-snug">
                          <span className="font-bold">⚠️ Sistem Yoğunluğu:</span> Şu an AI sunucularımızda aşırı yoğunluk yaşanıyor. Bu yüzden size yapay zeka ile kişiselleştirilmiş bir yanıt veremedik. Lütfen sorunuzu birazdan tekrar gönderin.
                        </p>
                        <button 
                          onClick={() => {
                            const prevUserMsg = messages[i - 1]?.text;
                            if (prevUserMsg) send(prevUserMsg);
                          }}
                          className="text-[11px] font-bold text-amber-700 bg-amber-100/50 hover:bg-amber-200 py-1.5 px-3 rounded-lg transition-colors self-start flex items-center gap-1.5"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                          Yapay Zeka ile Tekrar Dene
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA and Disclaimer */}
                {!isUser && msg.severity && (
                  <div className="mt-4 flex flex-col items-start w-full">
                    <p className="text-[11px] font-medium text-text-secondary/80 leading-snug mb-6">
                      Bu araç genel bilgi amaçlıdır, veteriner kararının yerini tutmaz.
                    </p>
                    
                    <div className="w-full flex flex-col gap-3">
                      {selectedPet?.vet_name ? (
                        <button
                          onClick={() => {
                            if (selectedPet?.vet_phone) {
                              window.location.href = `tel:${selectedPet.vet_phone}`;
                            } else {
                              router.push('/owner/veterinary');
                            }
                          }}
                          className={`w-full min-h-[50px] flex items-center justify-center gap-2 px-5 rounded-2xl font-black text-[13px] transition-all hover:scale-[1.03] active:scale-[0.98] ${
                            msg.severity === 'critical' ? 'btn-primary shadow-sm' : 'bg-primary-soft text-primary hover:bg-primary/20'
                          }`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          Veterineriniz {selectedPet.vet_name}&apos;e Soralım
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (selectedPet?.id) {
                              setQuickUpdateConfig({ 
                                title: 'Veteriner Bilgisi', 
                                desc: 'Size en doğru yönlendirmeyi yapabilmemiz için veterinerinizin adını girin.', 
                                fields: [
                                  { name: 'vet_name', type: 'text', label: 'Veteriner Adı', placeholder: 'Örn: Dr. Ali Yılmaz', required: true }, 
                                  { name: 'vet_phone', type: 'tel', label: 'Telefon (Opsiyonel)', placeholder: '05xx xxx xx xx' }
                                ] 
                              })
                            } else {
                              router.push('/owner/dashboard');
                            }
                          }}
                          className={`w-full min-h-[50px] flex items-center justify-center gap-2 px-5 rounded-2xl font-black text-[13px] transition-all hover:scale-[1.03] active:scale-[0.98] ${
                            msg.severity === 'critical' ? 'btn-primary shadow-sm' : 'bg-primary-soft text-primary hover:bg-primary/20 shadow-sm'
                          }`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                          Veterinerinize Soralım
                        </button>
                      )}

                      <button
                        onClick={() => router.push('/owner/veterinary')}
                        className="w-full min-h-[50px] flex items-center justify-center gap-2 px-5 rounded-2xl font-black text-[13px] transition-all hover:scale-[1.03] active:scale-[0.98] border-2 border-border-main bg-surface hover:bg-bg-main text-text-secondary hover:text-text-primary shadow-sm"
                      >
                        {msg.severity === 'critical' ? (
                          <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 3-10h6"/></svg>
                            Yakındaki Kliniklere Göz Atın
                          </>
                        ) : (
                          <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            Kliniklere Göz Atın
                          </>
                        )}
                      </button>
                    </div>
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

      {/* Input area */}
      <div className="pt-4 border-t border-border-main mt-4 shrink-0 flex flex-col gap-3 pb-8 pb-safe">
        {/* Quick prompts (initial state) */}
        {showQuickPrompts && (
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => send(p.text)}
                className="text-[12px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
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
                className="text-[12px] font-semibold text-text-secondary bg-surface hover:bg-primary/10 hover:text-primary border border-border-main px-3 py-1.5 rounded-full transition-colors"
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
