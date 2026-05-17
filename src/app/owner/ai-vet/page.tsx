'use client'

import { useState, useRef, useEffect } from 'react'

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
    color: 'text-red-500',
    bar: 'bg-red-500',
    emoji: '🚨',
    bg: 'bg-red-50 border-red-200',
  },
  medium: {
    label: 'Orta Risk',
    color: 'text-amber-500',
    bar: 'bg-amber-400',
    emoji: '⚠️',
    bg: 'bg-amber-50 border-amber-200',
  },
  low: {
    label: 'Düşük Risk',
    color: 'text-emerald-500',
    bar: 'bg-emerald-400',
    emoji: '✅',
    bg: 'bg-emerald-50 border-emerald-200',
  },
}

const QUICK_PROMPTS = [
  { icon: '💉', text: 'Aşıları gecikti, sorun olur mu?' },
  { icon: '🤢', text: 'Bugün halsiz ve iştahsız' },
  { icon: '🐾', text: 'Sürekli kaşınıyor, tüy dökülüyor' },
  { icon: '🌡️', text: 'Ateşi var, sıcak hissediliyor' },
  { icon: '💩', text: 'İshal ve kusma birlikte' },
  { icon: '😴', text: 'Normalden çok uyuyor, ilgisiz' },
]

const FOLLOWUP_CHIPS: Record<string, string[]> = {
  critical: ['Bu ne kadar acil?', 'Hangi kliniğe gideyim?', 'Yolda ne yapmalıyım?'],
  medium:   ['Belirtiler ne zaman geçer?', 'Evde ne yapabilirim?', 'Neden olmuş olabilir?'],
  low:      ['Ne zaman endişelenmeliyim?', 'Beslenmeyi değiştireyim mi?', 'Takip için ne izlemeliyim?'],
}

export default function AIVetPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Merhaba! Ben **Odi AI Vet**. Evcil dostunuzun belirtilerini ayrıntılı anlatın — aciliyet değerlendirmesi yapıp olası nedenler hakkında bilgi vereyim. 🐾',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Build Gemini history from messages (skip welcome)
  const buildHistory = (msgs: Message[]) =>
    msgs
      .slice(1) // skip welcome AI message
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }))

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
        body: JSON.stringify({ history }),
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
  const showQuickPrompts = messages.length === 1

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
      <div className="border-b border-border-main pb-4 mb-4 shrink-0 flex items-start justify-between gap-3">
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
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary/70 bg-primary/10 px-2.5 py-1 rounded-full mt-1 shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          Gemini AI
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 scrollbar-none">
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
                      <p className="text-[10px] text-text-secondary/60 mt-2 italic">
                        ⚡ Hızlı analiz (çevrimdışı mod) — AI bağlantısı kurulamadı
                      </p>
                    )}
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
      <div className="pt-4 border-t border-border-main mt-4 shrink-0 flex flex-col gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
            className="btn-primary px-5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <p className="text-[11px] text-text-secondary/60 text-center">
          Bu araç genel bilgi amaçlıdır, veteriner kararının yerini tutmaz.
        </p>
      </div>
    </div>
  )
}
