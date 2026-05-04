'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SocialComposePage() {
  const router = useRouter()
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const MAX = 280

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caption.trim() || submitting) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      })
      if (res.ok) {
        router.push('/owner/social')
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-10">
      <div className="flex items-center justify-between mb-8 border-b border-border-main pb-4">
        <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Yeni Paylaşım</h1>
        <button onClick={() => router.back()} className="text-[14px] font-bold text-text-secondary hover:text-text-primary transition-colors">
          Vazgeç
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card-base p-6 sm:p-8 flex flex-col gap-6">

        {/* Caption */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-text-primary">Ne paylaşmak istiyorsunuz?</label>
          <textarea
            rows={5}
            maxLength={MAX}
            placeholder="Pati dostunuzla bir an, sağlık güncellemesi veya toplulukla paylaşmak istediğiniz bir şey..."
            className="input-base resize-none leading-relaxed"
            value={caption}
            onChange={e => {
              setCaption(e.target.value)
              setCharCount(e.target.value.length)
            }}
            required
          />
          <div className="flex justify-end">
            <span className={`text-[12px] font-bold ${charCount > MAX * 0.85 ? 'text-warning' : 'text-text-secondary'}`}>
              {charCount}/{MAX}
            </span>
          </div>
        </div>

        {/* Image placeholder */}
        <div className="border-2 border-dashed border-border-main rounded-[16px] p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-primary-soft/20 transition-all group">
          <div className="w-12 h-12 bg-primary-soft rounded-[14px] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-text-secondary group-hover:text-primary transition-colors">Fotoğraf Ekle (Yakında)</p>
        </div>

        <button
          type="submit"
          disabled={submitting || !caption.trim()}
          className="btn-primary w-full shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15"/></svg>
              Paylaşılıyor...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Paylaş
            </span>
          )}
        </button>
      </form>
    </div>
  )
}
