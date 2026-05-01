'use client'

import { useState, FormEvent } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)

    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Giriş yapılamadı.')
        return
      }

      // Tam sayfa yenileme — sunucu cookie'si ayarlandıktan sonra layout yönlendirir
      window.location.href = '/'
    } catch {
      setError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main">
      <div className="w-full max-w-[400px] card-base p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/30 text-white font-extrabold text-xl mb-4 select-none">
            Odi
          </div>
          <h1 className="text-[28px] font-bold text-text-primary tracking-tight">Odi Pet</h1>
          <p className="text-[15px] text-text-secondary mt-1">Pati dostlarınıza premium takip</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-[12px] bg-error/10 border border-error/20 text-error text-[13px] font-semibold text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text-primary" htmlFor="email">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@email.com"
              required
              autoComplete="email"
              className="input-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text-primary" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="input-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Giriş yapılıyor…
              </span>
            ) : 'Sisteme Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
