'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'ai'
  text: string
  score?: number
  severity?: string
}

const SEVERITY_CONFIG: Record<string, { label: string; cls: string; emoji: string }> = {
  critical: { label: 'Kritik',    cls: 'bg-error/10 text-error border-error/20',     emoji: '🚨' },
  medium:   { label: 'Orta Risk', cls: 'bg-warning/10 text-warning border-warning/20', emoji: '⚠️' },
  low:      { label: 'Düşük Risk', cls: 'bg-success/10 text-success border-success/20', emoji: '✅' },
}

export default function AIVetPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Merhaba! Ben Odi AI Vet. Kediniz veya kopeg\u0307inizin belirtilerini yaz\u0131n, anlık deg\u0307erlendirme yapay\u0131m. \ud83d\udc3e" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (overrideText?: string) => {
    const userText = (typeof overrideText === 'string' ? overrideText : input).trim()
    if (!userText || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: userText }),
      })
      const data = await res.json()

      const sev = data.severity ?? 'low'
      const cfg = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.low

      const aiText = sev === 'critical'
        ? `${cfg.emoji} Belirtiler ciddi görünüyor! Lütfen vakit kaybetmeden acil veterinerinize başvurun. Risk Skoru: ${data.score}/100`
        : sev === 'medium'
        ? `${cfg.emoji} Dikkat gerektiren belirtiler var. Veteriner kontrolü önerilir. Risk Skoru: ${data.score}/100`
        : `${cfg.emoji} Belirtiler şu an düşük riskli görünüyor. Günlük takip yeterli olabilir. Risk Skoru: ${data.score}/100`

      setMessages(prev => [...prev, { role: 'ai', text: aiText, score: data.score, severity: sev }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Bağlantı hatası. Lütfen tekrar deneyin.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[700px] w-full mx-auto">
      {/* Header */}
      <div className="border-b border-border-main pb-4 mb-4 shrink-0">
        <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zM12 8v4m0 4h.01"/></svg>
          </div>
          AI Vet
        </h1>
        <p className="text-text-secondary text-[14px] mt-1">Belirtileri yazın, anlık ön değerlendirme alın.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 scrollbar-none">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const cfg = msg.severity ? SEVERITY_CONFIG[msg.severity] : null
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-[18px] ${isUser
                ? 'bg-primary text-white rounded-br-[4px]'
                : 'bg-surface border border-border-main rounded-bl-[4px]'} shadow-soft`}>
                <p className={`text-[14px] leading-relaxed ${isUser ? 'text-white' : 'text-text-primary'}`}>{msg.text}</p>
                {cfg && (
                  <span className={`inline-block mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {loading && (
          <div className="flex justify-start">
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

      {/* Input */}
      <div className="pt-4 border-t border-border-main mt-4 shrink-0">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              "💉 Aşıları gecikti, sorun olur mu?",
              "🤢 Bugün halsiz ve iştahsız",
              "🐾 Sürekli kaşınıyor",
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                className="text-[12px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Belirtileri yazın... (örn: kusma, ateş, iştahsızlık)"
            className="input-base flex-1"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label="Gönder"
            title="Gönder"
            className="btn-primary px-5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <p className="text-[11px] text-text-secondary/60 mt-2 text-center">
          Bu araç genel bilgi amaçlıdır. Veteriner kararının yerini tutmaz.
        </p>
      </div>
    </div>
  )
}
