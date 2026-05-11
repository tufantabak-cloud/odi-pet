'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

      window.location.href = '/'
    } catch {
      setError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5">
      <div className="w-full max-w-[420px] card-base p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary to-primary-hover shadow-xl shadow-primary/30 text-white font-black text-2xl mb-5 hover:scale-105 transition-transform">
            Odi
          </Link>
          <h1 className="text-[30px] font-black text-text-primary tracking-tighter">Tekrar Hoş Geldiniz</h1>
          <p className="text-[15px] font-bold text-text-secondary/80 mt-1 uppercase tracking-widest text-[10px]">Pati Dostlarınız Sizi Bekliyor</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in shake-in duration-300">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="email">
              E-posta Adresi
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@email.com"
              required
              autoComplete="email"
              className="input-base py-3 text-[15px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider" htmlFor="password">
                Şifre
              </label>
              <Link href="#" className="text-[12px] font-bold text-primary hover:text-primary-hover transition-colors">
                Şifremi Unuttum
              </Link>
            </div>
            <div className="relative group">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="input-base py-3 text-[15px] pr-12 w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-secondary hover:text-primary transition-colors"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-4 py-4 text-[15px] font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Giriş yapılıyor…
              </span>
            ) : 'Sisteme Güvenli Giriş Yap'}
          </button>

          <div className="text-center mt-6">
            <p className="text-[14px] text-text-secondary font-medium">
              Henüz hesabınız yok mu?{' '}
              <Link href="/register" className="font-black text-primary hover:text-primary-hover hover:underline transition-all">
                Hemen Kayıt Olun
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
